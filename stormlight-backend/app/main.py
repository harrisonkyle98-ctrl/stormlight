from fastapi import FastAPI, HTTPException, Depends, status, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg
import httpx
import os
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta, date
import jwt
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
import asyncio
import random
import time as time_module
from datetime import time as datetime_time
from collections import defaultdict
import threading
try:
    from prisma import Prisma
    PRISMA_AVAILABLE = True
    print("✅ Prisma import successful")
except Exception as e:
    print(f"❌ Prisma not available: {e}")
    print("Run 'poetry run prisma generate' to generate the Prisma client")
    PRISMA_AVAILABLE = False
    Prisma = None
try:
    from .database import init_database, get_db_connection, collect_daily_player_stats
except ImportError:
    from database import init_database, get_db_connection, collect_daily_player_stats

load_dotenv()

app = FastAPI(title="Stormlight Clan API", version="1.0.0")

prisma = Prisma() if PRISMA_AVAILABLE else None

app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET_KEY", "fallback-secret"))

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    """Rate limiting middleware for profile endpoints"""
    client_ip = request.client.host if request.client else "unknown"
    endpoint = request.url.path
    
    if is_rate_limited(client_ip, endpoint):
        print(f"Rate limited request from {client_ip} to {endpoint}")
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please try again later."}
        )
    
    response = await call_next(request)
    return response

oauth = OAuth()
oauth.register(
    name='discord',
    client_id=os.getenv('DISCORD_CLIENT_ID'),
    client_secret=os.getenv('DISCORD_CLIENT_SECRET'),
    server_metadata_url='https://discord.com/.well-known/openid_configuration',
    client_kwargs={
        'scope': 'identify email'
    }
)

security = HTTPBearer()

users_db = {}
clan_members_db = {}

RUNEMETRICS_SKILL_MAPPING = {
    0: 'attack',
    1: 'defence',
    2: 'strength',
    3: 'constitution',
    4: 'ranged',
    5: 'prayer',
    6: 'magic',
    7: 'cooking',
    8: 'woodcutting',
    9: 'fletching',
    10: 'fishing',
    11: 'firemaking',
    12: 'crafting',
    13: 'smithing',
    14: 'mining',
    15: 'herblore',
    16: 'agility',
    17: 'thieving',
    18: 'slayer',
    19: 'farming',
    20: 'runecrafting',
    21: 'hunter',
    22: 'construction',
    23: 'summoning',
    24: 'dungeoneering',
    25: 'divination',
    26: 'invention',
    27: 'archaeology',
    28: 'necromancy'
}

XP_TABLE = [
    0, 83, 174, 276, 388, 512, 650, 801, 969, 1154, 1358, 1584, 1833, 2107, 2411, 2746, 3115, 3523, 3973, 4470, 5018, 5624, 6291, 7028, 7842, 8740, 9730, 10824, 12031, 13363, 14833, 16456, 18247, 20224, 22406, 24815, 27473, 30408, 33648, 37224, 41171, 45529, 50339, 55649, 61512, 67983, 75127, 83014, 91721, 101333, 111945, 123660, 136594, 150872, 166636, 184040, 203254, 224466, 247886, 273742, 302288, 333804, 368599, 407015, 449428, 496254, 547953, 605032, 668051, 737627, 814445, 899257, 992895, 1096278, 1210421, 1336443, 1475581, 1629200, 1798808, 1986068, 2192818, 2421087, 2673114, 2951373, 3258594, 3597792, 3972294, 4385776, 4842295, 5346332, 5902831, 6517253, 7195629, 7944614, 8771558, 9684577, 10692629, 11805606, 13034431, 14391160, 15889109, 17542976, 19368992, 21385073, 23611006, 26068632, 28782069, 31777943, 35085654, 38737661, 42769801, 47221641, 52136869, 57563718, 63555443, 70170840, 77474828, 85539082, 94442737, 104273167, 115126838, 127110260, 140341028, 154948977, 171077457, 188884740, 200000000
]

ELITE_XP_TABLE = [
    0, 830, 1861, 2902, 3980, 5126, 6380, 7787, 9400, 11275, 13605, 16372, 19656, 23546, 28134, 33520, 39809, 47109, 55535, 65209, 77190, 90811, 106221, 123573, 143025, 164742, 188893, 215651, 245196, 277713, 316311, 358547, 404634, 454796, 509259, 568254, 632019, 700797, 774834, 854383, 946227, 1044569, 1149696, 1261903, 1381488, 1508756, 1644015, 1787581, 1939773, 2100917, 2283490, 2476369, 2679917, 2894505, 3120508, 3358307, 3608290, 3870846, 4146374, 4435275, 4758122, 5096111, 5449685, 5819299, 6205407, 6608473, 7028964, 7467354, 7924122, 8399751, 8925664, 9472665, 10041285, 10632061, 11245538, 11882262, 12542789, 13227679, 13937496, 14672812, 15478994, 16313404, 17176661, 18069395, 18992239, 19945833, 20930821, 21947856, 22997593, 24080695, 25259906, 26475754, 27728955, 29020233, 30350318, 31719944, 33129852, 34580790, 36073511, 37608773, 39270442, 40978509, 42733789, 44537107, 46389292, 48291180, 50243611, 52247435, 54303504, 56412678, 58575824, 60793812, 63067521, 65397835, 67785643, 70231841, 72737330, 75303019, 77929820, 80618654, 83370445, 86186124, 89066630, 92012904, 95025896, 98106559, 101255855, 104474750, 107764216, 111125230, 114558777, 118065845, 121647430, 125304532, 129038159, 132849323, 136739041, 140708338, 144758242, 148889790, 153104021, 157401983, 161784728, 166253312, 170808801, 175452262, 180184770, 185007406, 189921255, 194927409
]

def calculate_virtual_level(xp: int) -> int:
    """Calculate virtual level (1-120) based on displayed XP using RuneScape experience table"""
    if xp <= 0:
        return 1
    
    displayed_xp = xp // 10
    
    for level in range(120, 0, -1):
        if level <= len(XP_TABLE) and displayed_xp >= XP_TABLE[level - 1]:
            return level
    
    return 1

def calculate_elite_virtual_level(xp: int) -> int:
    """Calculate elite virtual level (1-150) for elite skills like Invention using elite skill table"""
    if xp <= 0:
        return 1
    
    displayed_xp = xp // 10
    
    for level in range(150, 0, -1):
        if level <= len(ELITE_XP_TABLE) and displayed_xp >= ELITE_XP_TABLE[level - 1]:
            return level
    
    return 1

used_oauth_codes = set()
oauth_code_lock = threading.Lock()

def cleanup_oauth_codes():
    """Clean up old OAuth codes to prevent memory leaks"""
    global used_oauth_codes
    with oauth_code_lock:
        if len(used_oauth_codes) > 1000:  # Keep only recent 1000 codes
            used_oauth_codes = set(list(used_oauth_codes)[-500:])  # Keep latest 500
            print(f"🔐 CLEANUP: OAuth codes cleaned up, now tracking {len(used_oauth_codes)} codes")

competitions_db = {}

activities_cache = {
    'data': [],
    'timestamp': 0,
    'ttl': 3600  # 1 hour cache
}

profile_cache = {
    'data': {},  # username -> profile data mapping
    'timestamps': {},  # username -> timestamp mapping
    'ttl': 3600  # 1 hour cache
}

progressive_cache = {
    'activities': [],
    'processed_members': 0,
    'total_members': 0,
    'is_complete': False,
    'timestamp': 0,
    'ttl': 3600
}

rate_limit_storage = defaultdict(list)
RATE_LIMIT_REQUESTS = 30  # requests per minute for profile endpoints
RATE_LIMIT_WINDOW = 60  # seconds

refresh_rate_limit_storage = defaultdict(list)
REFRESH_RATE_LIMIT_REQUESTS = 1  # 1 refresh per 5 minutes
REFRESH_RATE_LIMIT_WINDOW = 300  # 5 minutes in seconds

profile_history_cache = {
    'data': {},  # cache_key -> response data mapping
    'timestamps': {},  # cache_key -> timestamp mapping
    'ttl': 3600  # 1 hour cache (same as profile_cache)
}

def is_rate_limited(client_ip: str, endpoint: str) -> bool:
    """Check if client is rate limited for profile endpoints"""
    if not endpoint.startswith('/api/player/'):
        return False
    
    current_time = time_module.time()
    key = f"{client_ip}:{endpoint}"
    
    rate_limit_storage[key] = [
        req_time for req_time in rate_limit_storage[key] 
        if current_time - req_time < RATE_LIMIT_WINDOW
    ]
    
    if len(rate_limit_storage[key]) >= RATE_LIMIT_REQUESTS:
        return True
    
    rate_limit_storage[key].append(current_time)
    return False

def is_refresh_rate_limited(client_ip: str, username: str) -> bool:
    """Check if client is rate limited for refresh requests"""
    current_time = time_module.time()
    key = f"{client_ip}:{username}:refresh"
    
    refresh_rate_limit_storage[key] = [
        req_time for req_time in refresh_rate_limit_storage[key] 
        if current_time - req_time < REFRESH_RATE_LIMIT_WINDOW
    ]
    
    if len(refresh_rate_limit_storage[key]) >= REFRESH_RATE_LIMIT_REQUESTS:
        return True
    
    refresh_rate_limit_storage[key].append(current_time)
    return False

def get_history_cache_key(username: str, period1: str, period2: str) -> str:
    """Generate cache key for history endpoint"""
    return f"{username}:{period1}:{period2}"

SKILL_TABLE_MAPPING = {
    'overall': 0, 'attack': 1, 'defence': 2, 'strength': 3, 'constitution': 4,
    'ranged': 5, 'prayer': 6, 'magic': 7, 'cooking': 8, 'woodcutting': 9,
    'fletching': 10, 'fishing': 11, 'firemaking': 12, 'crafting': 13, 'smithing': 14,
    'mining': 15, 'herblore': 16, 'agility': 17, 'thieving': 18, 'slayer': 19,
    'farming': 20, 'runecrafting': 21, 'hunter': 22, 'construction': 23, 'summoning': 24,
    'dungeoneering': 25, 'divination': 26, 'invention': 27, 'archaeology': 28, 'necromancy': 29
}


async def fetch_player_stats(username: str, max_retries: int = 3) -> Optional[Dict[str, Any]]:
    """Fetch player stats from RuneScape Runemetrics API with rate limiting"""
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient() as client:
                runemetrics_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={username}&activities=20"
                response = await client.get(runemetrics_url)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if 'error' in data:
                        print(f"Runemetrics API error for {username}: {data.get('error')}")
                        return None
                    
                    stats = {}
                    
                    total_virtual_level = 0
                    skill_stats = {}
                    
                    for skill_data in data.get('skillvalues', []):
                        skill_id = skill_data.get('id')
                        skill_name = RUNEMETRICS_SKILL_MAPPING.get(skill_id)
                        
                        if skill_name:
                            xp = skill_data.get('xp', 0)
                            api_level = skill_data.get('level', 1)
                            
                            if skill_name == 'invention':
                                virtual_level = calculate_elite_virtual_level(xp)
                            else:
                                virtual_level = calculate_virtual_level(xp)
                            
                            total_virtual_level += virtual_level
                            
                            if xp > 100000000:  # 100M+ XP
                                print(f"DEBUG: {skill_name} - API Level: {api_level}, XP: {xp:,}, Virtual Level: {virtual_level}")
                            
                            displayed_xp = xp // 10
                            
                            skill_stats[skill_name] = {
                                'rank': skill_data.get('rank'),
                                'level': virtual_level,
                                'xp': displayed_xp
                            }
                    
                    stats['overall'] = {
                        'rank': int(data.get('rank', '0').replace(',', '')) if data.get('rank') and data.get('rank') != '0' else None,
                        'level': total_virtual_level,
                        'xp': data.get('totalxp', 0),
                        'combatlevel': data.get('combatlevel', 0)
                    }
                    
                    stats.update(skill_stats)
                    
                    all_skills = ['overall'] + list(RUNEMETRICS_SKILL_MAPPING.values())
                    for skill_name in all_skills:
                        if skill_name not in stats:
                            stats[skill_name] = {
                                'rank': None,
                                'level': 1,
                                'xp': 0
                            }
                    
                    try:
                        quest_points = data.get('questpoints', 0)
                    except:
                        quest_points = 0

                    try:
                        quests_url = f"https://apps.runescape.com/runemetrics/quests?user={username}"
                        quest_response = await client.get(quests_url)
                        if quest_response.status_code == 200:
                            quest_data = quest_response.json()
                            quest_points = sum(quest.get('questPoints', 0) for quest in quest_data.get('quests', []) if quest.get('status') == 'COMPLETED')
                            print(f"DEBUG: Fetched quest_points for {username}: {quest_points}")
                        else:
                            quest_points = 0
                            print(f"DEBUG: Quest API failed for {username}, status: {quest_response.status_code}")
                    except Exception as e:
                        quest_points = 0
                        print(f"DEBUG: Quest API exception for {username}: {e}")

                    print(f"DEBUG: Returning quest_points for {username}: {quest_points}")
                    return {
                        'stats': stats,
                        'quest_points': quest_points,
                        'last_updated': datetime.now(),
                        'username': data.get('name', username)
                    }
                elif response.status_code == 429:
                    base_delay = 2.0
                    max_delay = 20.0
                    jitter = random.uniform(0.8, 1.2)
                    delay = min(base_delay * (2 ** attempt) * jitter, max_delay)
                    
                    print(f"Rate limited for {username}, waiting {delay:.2f}s before retry {attempt + 1}/{max_retries}")
                    await asyncio.sleep(delay)
                    continue
                elif response.status_code == 404:
                    print(f"Player {username} not found or has private profile")
                    return None
                else:
                    print(f"Runemetrics API error for {username}: {response.status_code}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1.5 ** attempt)
                        continue
                    return None
                    
        except Exception as e:
            print(f"Error fetching stats for {username} (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(1.5 ** attempt)
                continue
            return None
    
    print(f"Failed to fetch stats for {username} after {max_retries} attempts")
    return None

async def fetch_top_players(skill: str = 'overall', size: int = 50) -> List[Dict[str, Any]]:
    """Fetch top players from RuneScape ranking API"""
    try:
        print(f"Fetching top players for skill: {skill}")
        table_id = SKILL_TABLE_MAPPING.get(skill.lower(), 0)
        async with httpx.AsyncClient(timeout=10.0) as client:
            ranking_url = f"{os.getenv('RUNESCAPE_API_BASE')}/m=hiscore/ranking.json?table={table_id}&category=0&size={size}"
            print(f"Requesting: {ranking_url}")
            response = await client.get(ranking_url)
            
            if response.status_code == 200:
                data = response.json()
                print(f"Got {len(data)} players from ranking API")
                players = []
                for i, player_data in enumerate(data[:5]):
                    username = player_data['name']
                    print(f"Fetching stats for player {i+1}: {username}")
                    stats = await fetch_player_stats(username)
                    if stats:
                        players.append(stats)
                print(f"Successfully fetched {len(players)} player stats")
                return players
            else:
                print(f"Ranking API returned status: {response.status_code}")
            return []
    except Exception as e:
        print(f"Error fetching top players for {skill}: {e}")
        return []

async def get_clan_members() -> List[str]:
    """Get list of clan members - using well-known RuneScape players for testing"""
    return [
        "Zezima", "Suomi", "Drumgun", "The Old Nite", "Gertjaars",
        "Kingduffy", "Lilyuffie88", "Bluerose13x", "N0valyfe", "Forsberg888"
    ]

failed_member_queue = []

async def sync_clan_members_to_database():
    """Sync clan members from RuneScape API to database"""
    try:
        clan_data = await fetch_clan_members()
        
        for member_data in clan_data:
            try:
                stats_data = await fetch_player_stats(member_data['username'])
                
                clan_member_data = {
                    'username': member_data['username'],
                    'displayName': member_data.get('display_name', member_data['username']),
                    'clanRank': member_data['clan_rank'],
                    'totalXp': member_data['total_xp'],
                    'totalLevel': stats_data.get('total_level', 0) if stats_data else 0,
                    'combatLevel': stats_data.get('combat_level', 0) if stats_data else 0,
                    'questPoints': 0,
                    'kills': member_data.get('kills', 0),
                    'stats': json.dumps(stats_data.get('stats')) if stats_data and stats_data.get('stats') else None,
                    'lastUpdated': datetime.now()
                }
                
                await prisma.clanmember.upsert(
                    where={'username': member_data['username']},
                    data={
                        'update': clan_member_data,
                        'create': clan_member_data
                    }
                )
                
                print(f"✅ Synced {member_data['username']} to database")
                
            except Exception as e:
                print(f"❌ Error syncing {member_data['username']}: {e}")
                continue
                
    except Exception as e:
        print(f"❌ Error in sync_clan_members_to_database: {e}")
        raise

async def sync_clan_members_to_database_with_queue():
    """Enhanced sync with queue for failed requests and retry logic"""
    try:
        if failed_member_queue:
            print(f"🔄 Processing {len(failed_member_queue)} queued failed members...")
            await process_failed_member_queue()
        
        clan_data = await fetch_clan_members()
        print(f"📥 Fetched {len(clan_data)} clan members for sync")
        
        successful_syncs = 0
        failed_syncs = 0
        
        for i, member_data in enumerate(clan_data):
            try:
                if i > 0:
                    await asyncio.sleep(random.uniform(1.0, 2.0))
                
                stats_data = await fetch_player_stats(member_data['username'], max_retries=2)
                
                if stats_data is None:
                    failed_member_queue.append({
                        'member_data': member_data,
                        'retry_count': 0,
                        'last_attempt': datetime.now()
                    })
                    failed_syncs += 1
                    print(f"⚠️ Queued {member_data['username']} for retry (stats fetch failed)")
                    continue
                
                clan_member_data = {
                    'username': member_data['username'],
                    'displayName': member_data.get('display_name', member_data['username']),
                    'clanRank': member_data['clan_rank'],
                    'totalXp': member_data['total_xp'],
                    'totalLevel': stats_data.get('total_level', 0) if stats_data else 0,
                    'combatLevel': stats_data.get('combat_level', 0) if stats_data else 0,
                    'questPoints': stats_data.get('quest_points', 0) if stats_data else 0,
                    'kills': member_data.get('kills', 0),
                    'stats': json.dumps(stats_data.get('stats')) if stats_data and stats_data.get('stats') else None,
                    'lastUpdated': datetime.now()
                }
                
                await prisma.clanmember.upsert(
                    where={'username': member_data['username']},
                    data={
                        'update': clan_member_data,
                        'create': clan_member_data
                    }
                )
                
                successful_syncs += 1
                if successful_syncs % 10 == 0:
                    print(f"✅ Synced {successful_syncs}/{len(clan_data)} members...")
                
            except Exception as e:
                failed_member_queue.append({
                    'member_data': member_data,
                    'retry_count': 0,
                    'last_attempt': datetime.now(),
                    'error': str(e)
                })
                failed_syncs += 1
                print(f"❌ Error syncing {member_data['username']}, queued for retry: {e}")
                continue
        
        print(f"📊 Sync complete: {successful_syncs} successful, {failed_syncs} failed, {len(failed_member_queue)} in queue")
        
    except Exception as e:
        print(f"❌ Error in sync_clan_members_to_database_with_queue: {e}")
        raise

async def process_failed_member_queue():
    """Process members in the failed queue with exponential backoff"""
    if not failed_member_queue:
        return
    
    processed = 0
    max_retries = 3
    
    members_to_process = failed_member_queue[:10]
    
    for queued_member in members_to_process:
        try:
            member_data = queued_member['member_data']
            retry_count = queued_member['retry_count']
            
            if retry_count >= max_retries:
                print(f"⚠️ Removing {member_data['username']} from queue after {max_retries} failed attempts")
                failed_member_queue.remove(queued_member)
                continue
            
            base_delay = 2.0
            delay = base_delay * (2 ** retry_count)
            await asyncio.sleep(delay)
            
            stats_data = await fetch_player_stats(member_data['username'], max_retries=1)
            
            if stats_data is not None:
                clan_member_data = {
                    'username': member_data['username'],
                    'displayName': member_data.get('display_name', member_data['username']),
                    'clanRank': member_data['clan_rank'],
                    'totalXp': member_data['total_xp'],
                    'totalLevel': stats_data.get('total_level', 0),
                    'combatLevel': stats_data.get('combat_level', 0),
                    'questPoints': stats_data.get('quest_points', 0),
                    'kills': member_data.get('kills', 0),
                    'stats': json.dumps(stats_data.get('stats')) if stats_data.get('stats') else None,
                    'lastUpdated': datetime.now()
                }
                
                await prisma.clanmember.upsert(
                    where={'username': member_data['username']},
                    data={
                        'update': clan_member_data,
                        'create': clan_member_data
                    }
                )
                
                print(f"✅ Successfully synced queued member: {member_data['username']}")
                failed_member_queue.remove(queued_member)
                processed += 1
            else:
                queued_member['retry_count'] += 1
                queued_member['last_attempt'] = datetime.now()
                print(f"⚠️ Retry {retry_count + 1}/{max_retries} failed for {member_data['username']}")
                
        except Exception as e:
            queued_member['retry_count'] += 1
            queued_member['last_attempt'] = datetime.now()
            print(f"❌ Error processing queued member {member_data['username']}: {e}")
    
    if processed > 0:
        print(f"✅ Processed {processed} members from failed queue")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    secret_key = os.getenv("JWT_SECRET_KEY", "fallback-secret")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=algorithm)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        print(f"🔍 TOKEN VERIFY: Starting token verification")
        print(f"🔍 TOKEN VERIFY: Token prefix: {credentials.credentials[:20]}...")
        
        secret_key = os.getenv("JWT_SECRET_KEY", "fallback-secret")
        algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        print(f"🔍 TOKEN VERIFY: Using secret key prefix: {secret_key[:10]}... and algorithm: {algorithm}")
        
        payload = jwt.decode(credentials.credentials, secret_key, algorithms=[algorithm])
        user_id = payload.get("sub")
        print(f"🔍 TOKEN VERIFY: Decoded payload: {payload}")
        
        if user_id is None:
            print("❌ TOKEN VERIFY: No 'sub' field in token payload")
            raise HTTPException(status_code=401, detail="Invalid token")
        print(f"✅ Token verification successful for user: {user_id}")
        return str(user_id)
    except jwt.PyJWTError as e:
        print(f"❌ JWT decode error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"❌ Unexpected error in token verification: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/api/auth/discord")
async def discord_login():
    """Initiate Discord OAuth login"""
    redirect_uri = os.getenv("DISCORD_REDIRECT_URI", "https://runescape-clan-website-q4g9hn1a.devinapps.com/api/auth/callback/discord")
    return {
        "auth_url": f"https://discord.com/api/oauth2/authorize?client_id={os.getenv('DISCORD_CLIENT_ID')}&redirect_uri={redirect_uri}&response_type=code&scope=identify%20email"
    }

@app.post("/api/auth/callback/discord")
async def discord_callback(code: str):
    """Handle Discord OAuth callback with comprehensive logging"""
    print(f"🔐 OAUTH START: Discord callback received")
    print(f"🔐 OAUTH: Code received: {code[:10]}...{code[-10:] if len(code) > 20 else code}")
    
    client_id = os.getenv('DISCORD_CLIENT_ID')
    client_secret = os.getenv('DISCORD_CLIENT_SECRET')
    redirect_uri = os.getenv('DISCORD_REDIRECT_URI')
    database_url = os.getenv('DATABASE_URL')
    jwt_secret = os.getenv('JWT_SECRET_KEY')
    
    print(f"🔐 ENV CHECK: CLIENT_ID loaded: {'✅' if client_id else '❌'}")
    print(f"🔐 ENV CHECK: CLIENT_SECRET loaded: {'✅' if client_secret else '❌'}")
    print(f"🔐 ENV CHECK: REDIRECT_URI: {redirect_uri}")
    print(f"🔐 ENV CHECK: DATABASE_URL loaded: {'✅' if database_url else '❌'}")
    print(f"🔐 ENV CHECK: JWT_SECRET loaded: {'✅' if jwt_secret else '❌'}")
    
    global used_oauth_codes
    with oauth_code_lock:
        if code in used_oauth_codes:
            print(f"❌ OAUTH ERROR: Code already used: {code[:10]}...")
            raise HTTPException(status_code=400, detail="Authorization code already used")
        
        used_oauth_codes.add(code)
        print(f"🔐 OAUTH: Code validated and marked as used")
        
        if len(used_oauth_codes) > 1000:
            cleanup_oauth_codes()
    
    try:
        print(f"🔐 CACHE: Checking for OAuth session conflicts...")
        
        print(f"🔐 OAUTH: Starting token exchange with Discord")
        async with httpx.AsyncClient() as client:
            token_data = {
                'client_id': client_id,
                'client_secret': client_secret,
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': redirect_uri,
            }
            
            print(f"🔐 OAUTH: Sending token exchange request to Discord")
            token_response = await client.post(
                'https://discord.com/api/oauth2/token',
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            print(f"🔐 OAUTH: Token exchange response status: {token_response.status_code}")
            
            if token_response.status_code != 200:
                error_detail = token_response.text
                print(f"❌ OAUTH ERROR: Token exchange failed: {error_detail}")
                raise HTTPException(status_code=400, detail=f"Failed to get access token: {error_detail}")
            
            token_json = token_response.json()
            access_token = token_json['access_token']
            print(f"🔐 OAUTH: Access token received successfully")
            
            print(f"🔐 OAUTH: Fetching user info from Discord")
            user_response = await client.get(
                'https://discord.com/api/users/@me',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            print(f"🔐 OAUTH: User info response status: {user_response.status_code}")
            
            if user_response.status_code != 200:
                error_detail = user_response.text
                print(f"❌ OAUTH ERROR: Failed to get user info: {error_detail}")
                raise HTTPException(status_code=400, detail=f"Failed to get user info: {error_detail}")
            
            user_data = user_response.json()
            user_id = user_data['id']
            print(f"🔐 OAUTH: User info retrieved - ID: {user_id}, Username: {user_data['username']}")
            
            if user_id in users_db:
                print(f"🔐 CACHE: Clearing existing in-memory user data for {user_id}")
                del users_db[user_id]
            
            print(f"🔐 DATABASE: Starting user upsert for Discord ID: {user_id}")
            try:
                async with asyncio.Lock():
                    print(f"🔐 DATABASE: Acquired database lock for user upsert")
                    user = await prisma.user.upsert(
                        where={'discordId': user_id},
                        data={
                            'discordId': user_id,
                            'username': user_data['username'],
                            'discriminator': user_data.get('discriminator', '0'),
                            'email': user_data.get('email'),
                            'avatar': user_data.get('avatar'),
                            'updatedAt': datetime.now()
                        },
                        create={
                            'discordId': user_id,
                            'username': user_data['username'],
                            'discriminator': user_data.get('discriminator', '0'),
                            'email': user_data.get('email'),
                            'avatar': user_data.get('avatar')
                        }
                    )
                    print(f"🔐 DATABASE: User upsert successful: {user.discordId}")
                    
                    print(f"🔐 DATABASE: Checking for clan member linkage")
                    linked_member = await prisma.clanmember.find_first(
                        where={'discordId': user_id}
                    )
                    
                    if linked_member:
                        print(f"🔐 DATABASE: User {user_id} is linked to clan member: {linked_member.username}")
                        user_dict = {
                            'id': user_id,
                            'username': linked_member.username,
                            'displayName': linked_member.displayName or linked_member.username,
                            'clanRank': linked_member.clanRank,
                            'isLinked': True,
                            'discordId': user_id
                        }
                    else:
                        print(f"🔐 DATABASE: User {user_id} is not linked to any clan member")
                        user_dict = {
                            'id': user_id,
                            'username': user_data['username'],
                            'discriminator': user_data.get('discriminator', '0'),
                            'email': user_data.get('email'),
                            'avatar': user_data.get('avatar'),
                            'isLinked': False,
                            'requiresLinking': True,
                            'discordId': user_id
                        }
                
            except Exception as db_error:
                print(f"❌ DATABASE ERROR: User operations failed: {db_error}")
                users_db[user_id] = {
                    'id': user_id,
                    'username': user_data['username'],
                    'discriminator': user_data.get('discriminator', '0'),
                    'email': user_data.get('email'),
                    'avatar': user_data.get('avatar'),
                    'created_at': datetime.now(),
                    'isLinked': False,
                    'requiresLinking': True,
                    'discordId': user_id
                }
                user_dict = users_db[user_id]
                print(f"🔐 FALLBACK: User stored in memory: {user_id}")
            
            print(f"🔐 JWT: Creating JWT token for user: {user_id}")
            try:
                jwt_token = create_access_token({"sub": user_id})
                print(f"🔐 JWT: Token created successfully")
            except Exception as jwt_error:
                print(f"❌ JWT ERROR: Token creation failed: {jwt_error}")
                raise HTTPException(status_code=500, detail=f"Token creation failed: {str(jwt_error)}")
            
            response_data = {
                "access_token": jwt_token,
                "token_type": "bearer",
                "user": user_dict
            }
            
            print(f"✅ OAUTH SUCCESS: Authentication completed for user: {user_id}")
            return response_data
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ OAUTH CRITICAL ERROR: {str(e)}")
        print(f"❌ OAUTH ERROR TYPE: {type(e).__name__}")
        import traceback
        print(f"❌ OAUTH TRACEBACK: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@app.post("/api/auth/link-account")
async def link_discord_to_clan_member(
    request: dict,
    user_id: str = Depends(verify_token)
):
    """Link Discord account to clan member"""
    print(f"🔗 ENTRY: Account linking function called")
    print(f"🔗 ENTRY: Request type: {type(request)}")
    print(f"🔗 ENTRY: Request content: {request}")
    print(f"🔗 ENTRY: User ID: {user_id}")
    
    try:
        async with asyncio.Lock():
            print(f"🔗 CONCURRENCY: Acquired account linking lock for user: {user_id}")
            print(f"🔗 Account linking attempt for user: {user_id}")
            runescape_username = request.get('username')
            print(f"🔗 Requested username: {runescape_username}")
            if not runescape_username:
                raise HTTPException(status_code=400, detail="Username required")
        
        if PRISMA_AVAILABLE and prisma:
            print("🔗 Using Prisma client for account linking")
            try:
                clan_member = await prisma.clanmember.find_unique(
                    where={'username': runescape_username}
                )
                print(f"🔗 Found clan member: {clan_member is not None}")
                
                if not clan_member:
                    raise HTTPException(status_code=404, detail="Clan member not found")
                
                if clan_member.discordId:
                    print(f"🔗 Member already linked to Discord ID: {clan_member.discordId}")
                    if clan_member.discordId == user_id:
                        return {
                            'success': True,
                            'user': {
                                'id': user_id,
                                'username': clan_member.username,
                                'displayName': clan_member.displayName or clan_member.username,
                                'clanRank': clan_member.clanRank,
                                'isLinked': True,
                                'discordId': user_id
                            }
                        }
                    raise HTTPException(status_code=400, detail="This account is already linked to another Discord user")
                
                updated_member = await prisma.clanmember.update(
                    where={'username': runescape_username},
                    data={'discordId': user_id}
                )
                print(f"✅ Successfully linked {runescape_username} to Discord user {user_id} via Prisma")
                print(f"🔗 CONCURRENCY: Releasing account linking lock for user: {user_id} (Prisma Success)")
                
                return {
                    'success': True,
                    'user': {
                        'id': user_id,
                        'username': updated_member.username,
                        'displayName': updated_member.displayName or updated_member.username,
                        'clanRank': updated_member.clanRank,
                        'isLinked': True,
                        'discordId': user_id
                    }
                }
            except Exception as prisma_error:
                print(f"❌ Prisma account linking failed: {prisma_error}")
                print("🔄 Falling back to direct database connection...")
        
        try:
            from .database import get_db_connection
            print(f"🔗 FALLBACK: Using direct database connection for account linking")
            conn = await get_db_connection()
            
            async with conn.cursor() as cursor:
                print(f"🔗 FALLBACK: Looking up clan member in database: {runescape_username}")
                await cursor.execute(
                    "SELECT username, display_name, clan_rank, discord_id FROM clan_members WHERE username = %s",
                    (runescape_username,)
                )
                clan_member_row = await cursor.fetchone()
                print(f"🔗 FALLBACK: Found clan member: {clan_member_row is not None}")
                
                if not clan_member_row:
                    print(f"❌ FALLBACK ERROR: Clan member not found: {runescape_username}")
                    raise HTTPException(status_code=404, detail=f"RuneScape account '{runescape_username}' is not a member of the Stormlight clan")
                
                username, display_name, clan_rank, existing_discord_id = clan_member_row
                if existing_discord_id:
                    print(f"🔗 Member already linked to Discord ID: {existing_discord_id}")
                    if existing_discord_id == user_id:
                        return {
                            'success': True,
                            'user': {
                                'id': user_id,
                                'username': username,
                                'displayName': display_name or username,
                                'clanRank': clan_rank,
                                'isLinked': True,
                                'discordId': user_id
                            }
                        }
                    raise HTTPException(status_code=400, detail="This account is already linked to another Discord user")
                
                print(f"🔗 FALLBACK: Updating clan member with Discord ID: {user_id}")
                await cursor.execute(
                    "UPDATE clan_members SET discord_id = %s WHERE username = %s",
                    (user_id, runescape_username)
                )
                await conn.commit()
                
                response_data = {
                    'success': True,
                    'user': {
                        'id': user_id,
                        'username': clan_member_row[0],
                        'displayName': clan_member_row[1] or clan_member_row[0],
                        'clanRank': clan_member_row[2],
                        'isLinked': True,
                        'discordId': user_id
                    }
                }
                
                print(f"✅ FALLBACK SUCCESS: Successfully linked {runescape_username} to Discord user {user_id}")
                print(f"🔗 CONCURRENCY: Releasing account linking lock for user: {user_id}")
                return response_data
                
        except HTTPException:
            print(f"🔗 CONCURRENCY: Releasing account linking lock for user: {user_id} (HTTPException)")
            raise
        except Exception as db_error:
            print(f"❌ FALLBACK ERROR: Database connection failed: {db_error}")
            print(f"🔗 CONCURRENCY: Releasing account linking lock for user: {user_id} (DB Error)")
            raise HTTPException(status_code=500, detail="Database connection failed")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ACCOUNT LINK CRITICAL ERROR: {str(e)}")
        print(f"❌ ACCOUNT LINK ERROR TYPE: {type(e).__name__}")
        import traceback
        print(f"❌ ACCOUNT LINK TRACEBACK: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Linking failed: {str(e)}")

@app.get("/api/user/me")
async def get_current_user(user_id: str = Depends(verify_token)):
    """Get current user info"""
    print(f"🔍 get_current_user called for user_id: {user_id}")
    
    try:
        print(f"🔍 Attempting Prisma query for user: {user_id}")
        user = await prisma.user.find_unique(where={'discordId': user_id})
        print(f"🔍 Prisma user query result: {user}")
        
        if user:
            linked_member = await prisma.clanmember.find_first(
                where={'discordId': user_id}
            )
            print(f"🔍 Prisma linked_member query result: {linked_member}")
            
            if linked_member:
                result = {
                    'id': user_id,
                    'username': linked_member.username,
                    'displayName': linked_member.displayName or linked_member.username,
                    'clanRank': linked_member.clanRank,
                    'isLinked': True,
                    'discordId': user_id
                }
                print(f"✅ Returning linked user data: {result}")
                return result
            else:
                result = {
                    'id': user.discordId,
                    'username': user.username,
                    'discriminator': user.discriminator,
                    'email': user.email,
                    'avatar': user.avatar,
                    'isLinked': False,
                    'requiresLinking': True,
                    'discordId': user_id
                }
                print(f"✅ Returning unlinked user data: {result}")
                return result
    except Exception as e:
        print(f"❌ Prisma database error in get_current_user: {e}")
    
    # Fallback to direct database connection
    try:
        print(f"🔍 Attempting direct database connection for user: {user_id}")
        from .database import get_db_connection
        conn = await get_db_connection()
        async with conn:
            user_cursor = await conn.execute(
                "SELECT discord_id, username, discriminator, email, avatar FROM users WHERE discord_id = %s",
                (user_id,)
            )
            user_row = await user_cursor.fetchone()
            print(f"🔍 Direct DB user query result: {user_row}")
            
            if user_row:
                member_cursor = await conn.execute(
                    "SELECT username, display_name, clan_rank FROM clan_members WHERE discord_id = %s",
                    (user_id,)
                )
                member_row = await member_cursor.fetchone()
                print(f"🔍 Direct DB member query result: {member_row}")
                
                if member_row:
                    result = {
                        'id': user_id,
                        'username': member_row[0],
                        'displayName': member_row[1] or member_row[0],
                        'clanRank': member_row[2],
                        'isLinked': True,
                        'discordId': user_id
                    }
                    print(f"✅ Returning linked user data from direct DB: {result}")
                    return result
                else:
                    result = {
                        'id': user_row[0],
                        'username': user_row[1],
                        'discriminator': user_row[2],
                        'email': user_row[3],
                        'avatar': user_row[4],
                        'isLinked': False,
                        'requiresLinking': True,
                        'discordId': user_id
                    }
                    print(f"✅ Returning unlinked user data from direct DB: {result}")
                    return result
    except Exception as e:
        print(f"❌ Direct database error in get_current_user: {e}")
    
    print(f"🔍 Checking in-memory users_db for user: {user_id}")
    if user_id not in users_db:
        print(f"❌ User {user_id} not found in users_db")
        raise HTTPException(status_code=404, detail="User not found")
    
    user_data = users_db[user_id].copy()
    if 'isLinked' not in user_data:
        user_data['isLinked'] = False
        user_data['requiresLinking'] = True
        user_data['discordId'] = user_id
    
    print(f"✅ Returning enhanced in-memory user data: {user_data}")
    return user_data


@app.get("/api/player/{username}/stats")
async def get_player_stats(username: str, refresh: bool = Query(False, description="Force refresh from API")):
    """Get player stats from RuneScape API with clan rank if available"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    
    current_time = time_module.time()
    
    if refresh:
        client_ip = "unknown"  # In production, extract from request
        if is_refresh_rate_limited(client_ip, decoded_username):
            raise HTTPException(status_code=429, detail="Refresh rate limit exceeded. Please wait 5 minutes.")
        print(f"Forcing refresh for {decoded_username}")
    elif (decoded_username in profile_cache['data'] and 
        decoded_username in profile_cache['timestamps'] and
        current_time - profile_cache['timestamps'][decoded_username] < profile_cache['ttl']):
        print(f"Returning cached profile data for {decoded_username}")
        return profile_cache['data'][decoded_username]
    
    clan_members = await fetch_clan_members()
    clan_rank = None
    print(f"Looking for player: '{decoded_username}'")
    print(f"Available clan members: {[m['username'] for m in clan_members[:5]]}")
    
    for member in clan_members:
        if member['username'].lower().replace('\xa0', ' ') == decoded_username.lower().replace('\xa0', ' '):
            clan_rank = member['clan_rank']
            print(f"Found clan rank: {clan_rank}")
            break
    
    stats = await fetch_player_stats(decoded_username)
    
    if stats:
        if clan_rank:
            stats['clan_rank'] = clan_rank
        
        profile_cache['data'][decoded_username] = stats
        profile_cache['timestamps'][decoded_username] = current_time
        print(f"Cached profile data for {decoded_username} for {profile_cache['ttl']} seconds")
        
        return stats
    
    if clan_rank:
        fallback_data = {
            "username": decoded_username,
            "stats": {
                "overall": {
                    "rank": None,
                    "level": 0,
                    "xp": 0
                }
            },
            "last_updated": datetime.now().isoformat(),
            "clan_rank": clan_rank
        }
        
        profile_cache['data'][decoded_username] = fallback_data
        profile_cache['timestamps'][decoded_username] = current_time
        print(f"Cached fallback profile data for {decoded_username} for {profile_cache['ttl']} seconds")
        
        return fallback_data
    
    raise HTTPException(status_code=404, detail="Player not found or stats unavailable")

@app.get("/api/hiscores")
async def get_global_hiscores(
    skill: str = 'overall',
    page: int = 1,
    limit: int = 15,
    search: Optional[str] = None
):
    """Get global hiscores with pagination"""
    if limit not in [15, 30, 50]:
        limit = 15
    
    players = []
    
    if search:
        stats = await fetch_player_stats(search)
        if stats:
            players = [stats]
    else:
        top_players = await fetch_top_players(skill, 50)
        
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        players = top_players[start_idx:end_idx]
    
    return {
        "hiscores": players,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_players": 50,
            "has_next": len(players) == limit
        },
        "skill": skill
    }

@app.get("/api/clan/hiscores")
async def get_clan_hiscores():
    """Get clan hiscores (legacy endpoint)"""
    members = await get_clan_members()
    hiscores = []
    
    for member in members:
        stats = await fetch_player_stats(member)
        if stats:
            hiscores.append(stats)
    
    hiscores.sort(key=lambda x: x['stats'].get('overall', {}).get('xp', 0), reverse=True)
    
    return {"hiscores": hiscores, "clan_name": os.getenv("CLAN_NAME", "Stormlight")}

@app.post("/api/competitions")
async def create_competition(
    competition_data: dict,
    user_id: str = Depends(verify_token)
):
    """Create a new competition (admin only for now)"""
    competition_id = len(competitions_db) + 1
    competition = {
        "id": competition_id,
        "name": competition_data["name"],
        "description": competition_data.get("description", ""),
        "skill": competition_data.get("skill", "overall"),
        "start_date": datetime.fromisoformat(competition_data["start_date"]),
        "end_date": datetime.fromisoformat(competition_data["end_date"]),
        "created_by": user_id,
        "created_at": datetime.now(),
        "participants": []
    }
    
    competitions_db[competition_id] = competition
    return competition

@app.get("/api/competitions")
async def get_competitions():
    """Get all competitions"""
    return {"competitions": list(competitions_db.values())}

@app.get("/api/competitions/{competition_id}")
async def get_competition(competition_id: int):
    """Get specific competition with leaderboard"""
    if competition_id not in competitions_db:
        raise HTTPException(status_code=404, detail="Competition not found")
    
    competition = competitions_db[competition_id]
    
    members = await get_clan_members()
    leaderboard = []
    
    for member in members:
        stats = await fetch_player_stats(member)
        if stats:
            skill_data = stats['stats'].get(competition['skill'], {})
            leaderboard.append({
                'username': member,
                'xp': skill_data.get('xp', 0),
                'level': skill_data.get('level', 1),
                'rank': skill_data.get('rank')
            })
    
    leaderboard.sort(key=lambda x: x['xp'], reverse=True)
    
    return {
        **competition,
        "leaderboard": leaderboard
    }

async def fetch_clan_members() -> List[Dict[str, Any]]:
    """Fetch clan members from RuneScape Clan API"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            clan_url = "https://secure.runescape.com/m=clan-hiscores/members_lite.ws?clanName=Stormlight"
            response = await client.get(clan_url)
            
            if response.status_code == 200:
                content = response.content.decode('latin-1')
                lines = content.strip().split('\n')
                members = []
                
                for line in lines[1:]:
                    if line.strip():
                        parts = line.split(',')
                        if len(parts) >= 4:
                            username = parts[0].strip()
                            username = username.replace('\u00A0', ' ')
                            clan_rank = parts[1].strip()
                            
                            members.append({
                                'username': username,
                                'clan_rank': clan_rank,
                                'total_xp': int(parts[2]) if parts[2].isdigit() else 0,
                                'kills': int(parts[3]) if parts[3].isdigit() else 0,
                                'last_updated': datetime.now().isoformat()
                            })
                
                return members
            return []
    except Exception as e:
        print(f"Error fetching clan members: {e}")
        return []

def get_rank_priority(rank: str) -> int:
    """Get rank priority for sorting (lower number = higher rank)"""
    rank_priority = {
        'Owner': 1,
        'Deputy Owner': 2,
        'Overseer': 3,
        'Coordinator': 4,
        'Organiser': 5,
        'Admin': 6,
        'General': 7,
        'Captain': 8,
        'Lieutenant': 9,
        'Sergeant': 10,
        'Corporal': 11,
        'Recruit': 12
    }
    return rank_priority.get(rank, 999)

@app.get("/api/clan/members")
async def get_clan_members_paginated(
    page: int = 1,
    limit: int = 15,
    search: Optional[str] = None,
    sort_by: str = "rank"
):
    """Get clan members with pagination and search"""
    if limit not in [15, 30, 50]:
        limit = 15
    
    try:
        db_members = await prisma.clanmember.find_many()
        if db_members and len(db_members) > 0:
            members = []
            for member in db_members:
                members.append({
                    'username': member.username,
                    'clan_rank': member.clanRank,
                    'total_xp': int(member.totalXp),
                    'total_level': member.totalLevel,
                    'combat_level': member.combatLevel,
                    'kills': member.kills,
                    'last_updated': member.lastUpdated.isoformat()
                })
            print(f"✅ Retrieved {len(members)} members from database")
        else:
            raise Exception("No members found in database")
            
    except Exception as db_error:
        print(f"❌ Database error, falling back to API: {db_error}")
        members = await fetch_clan_members()
    
    if search:
        search_lower = search.lower()
        search_normalized = search_lower.replace('%20', ' ').replace('+', ' ')
        
        filtered_members = []
        for m in members:
            username_lower = m['username'].lower()
            username_normalized = username_lower.replace('\u00A0', ' ')
            
            if search_normalized in username_normalized:
                filtered_members.append(m)
        
        members = filtered_members
    
    if sort_by == "xp":
        members.sort(key=lambda x: x['total_xp'], reverse=True)
    else:
        members.sort(key=lambda x: (get_rank_priority(x['clan_rank']), x['username']))
    
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_members = members[start_idx:end_idx]
    
    return {
        "members": paginated_members,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_members": len(members),
            "has_next": end_idx < len(members)
        },
        "clan_name": "Stormlight"
    }

@app.get("/api/clan/stats")
async def get_clan_stats():
    """Get clan statistics including rank and total XP from RuneScape members_lite.ws API"""
    try:
        clan_url = "https://secure.runescape.com/m=clan-hiscores/members_lite.ws?clanName=Stormlight"
        
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(clan_url)
            response.raise_for_status()
            clan_data_text = response.content.decode('latin-1')
        
        print(f"Clan API response: {clan_data_text[:200]}...")  # Debug logging
        
        lines = clan_data_text.strip().split('\n')
        total_xp = 0
        member_count = 0
        clan_rank = "Unknown"  # Default fallback
        highest_rank_member = None
        
        for line in lines[1:]:  # Skip header line
            if line.strip():
                parts = line.split(',')
                if len(parts) >= 4:
                    try:
                        member_name = parts[0].strip()
                        member_clan_rank = parts[1].strip()
                        member_xp_str = parts[2].strip()
                        
                        if member_xp_str.isdigit():
                            member_xp = int(member_xp_str)
                        else:
                            print(f"Warning: Invalid XP value '{member_xp_str}' for member '{member_name}'")
                            continue
                        
                        total_xp += member_xp
                        member_count += 1
                        
                        if highest_rank_member is None or get_rank_priority(member_clan_rank) < get_rank_priority(highest_rank_member):
                            highest_rank_member = member_clan_rank
                            
                        print(f"Member: {member_name}, Rank: {member_clan_rank}, XP: {member_xp}")
                    except (ValueError, IndexError) as e:
                        print(f"Error parsing line '{line}': {e}")
                        continue
                else:
                    print(f"Warning: Line has insufficient columns ({len(parts)}): '{line}'")
        
        if highest_rank_member:
            clan_rank = highest_rank_member
            print(f"Using highest rank member's position: {clan_rank}")
        
        print(f"Calculated total XP: {total_xp}, member count: {member_count}, clan rank: {clan_rank}")  # Debug logging
        
        return {
            "clan_name": "Stormlight",
            "total_members": member_count,
            "total_xp": total_xp,
            "clan_rank": clan_rank,
            "last_updated": datetime.now().isoformat()
        }
            
    except Exception as e:
        print(f"Error fetching clan stats: {e}")
        try:
            clan_members = await fetch_clan_members()
            total_xp = sum(member.get('total_xp', 0) for member in clan_members)
            
            return {
                "clan_name": "Stormlight",
                "total_members": len(clan_members),
                "total_xp": total_xp,
                "clan_rank": "Unknown",
                "last_updated": datetime.now().isoformat()
            }
        except:
            return {
                "clan_name": "Stormlight", 
                "total_members": 0,
                "total_xp": 0,
                "clan_rank": "Unknown",
                "last_updated": datetime.now().isoformat()
            }

@app.get("/api/clan/activities")
async def get_clan_activities(
    background_tasks: BackgroundTasks,
    page: int = 1,
    limit: int = 10
):
    """Get recent activities from all clan members with pagination and progressive loading"""
    print(f"=== API REQUEST: get_clan_activities with page={page}, limit={limit} ===")
    print(f"Progressive cache state: {progressive_cache['processed_members']} members, {len(progressive_cache['activities'])} activities, complete={progressive_cache['is_complete']}")
    
    current_time = time_module.time()
    
    stored_activities = []
    total_stored_count = 0
    try:
        conn = await get_db_connection()
        async with conn:
            try:
                from .database import get_stored_activities, get_activity_count
            except ImportError:
                from database import get_stored_activities, get_activity_count
            
            stored_activities = await get_stored_activities(conn, limit=50)
            total_stored_count = await get_activity_count(conn)
            print(f"Retrieved {len(stored_activities)} stored activities from database")
    except Exception as db_error:
        print(f"Database error retrieving activities: {db_error}")
    
    if (activities_cache['data'] and 
        current_time - activities_cache['timestamp'] < activities_cache['ttl']):
        print("Returning cached activities data")
        all_activities = activities_cache['data']
        
        combined_activities = stored_activities + all_activities
        seen_activities = set()
        unique_activities = []
        for activity in combined_activities:
            activity_key = (activity['username'], activity['text'], activity['timestamp'])
            if activity_key not in seen_activities:
                seen_activities.add(activity_key)
                unique_activities.append(activity)
        
        unique_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_activities = unique_activities[start_idx:end_idx]
        
        return {
            "activities": paginated_activities,
            "pagination": {
                "page": page,
                "limit": 10,
                "total_activities": len(unique_activities),
                "has_next": end_idx < len(unique_activities)
            },
            "loading_status": {
                "is_complete": True,
                "processed_members": progressive_cache.get('total_members', len(unique_activities)),
                "total_members": progressive_cache.get('total_members', len(unique_activities))
            }
        }
    
    if (progressive_cache['processed_members'] > 0 or len(progressive_cache['activities']) > 0):
        print(f"Returning progressive cache with {len(progressive_cache['activities'])} activities from {progressive_cache['processed_members']} members")
        
        all_activities = progressive_cache['activities']
        combined_activities = stored_activities + all_activities
        seen_activities = set()
        unique_activities = []
        for activity in combined_activities:
            activity_key = (activity['username'], activity['text'], activity['timestamp'])
            if activity_key not in seen_activities:
                seen_activities.add(activity_key)
                unique_activities.append(activity)
        
        unique_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_activities = unique_activities[start_idx:end_idx]
        
        return {
            "activities": paginated_activities,
            "pagination": {
                "page": page,
                "limit": 10,
                "total_activities": len(unique_activities),
                "has_next": end_idx < len(unique_activities)
            },
            "loading_status": {
                "is_complete": progressive_cache['is_complete'],
                "processed_members": progressive_cache['processed_members'],
                "total_members": progressive_cache['total_members']
            }
        }
    
    try:
        print("Cache miss - starting fresh clan activities fetch...")
        print("Fetching clan members...")
        members = await fetch_clan_members()
        print(f"Found {len(members)} clan members")
        
        # Only reset progressive cache if not already processing
        if progressive_cache['processed_members'] == 0:
            progressive_cache['activities'] = stored_activities.copy()
            progressive_cache['processed_members'] = 0
            progressive_cache['total_members'] = len(members)
            progressive_cache['is_complete'] = False
            progressive_cache['timestamp'] = current_time
        
        async def background_fetch_activities():
            """Background task to fetch all member activities"""
            all_activities = []
            batch_size = 3
            
            async def fetch_member_activities(member, client, max_retries=3):
                """Fetch activities for a single member with exponential backoff retry"""
                runemetrics_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={member['username']}&activities=1"
                
                for attempt in range(max_retries):
                    try:
                        print(f"Fetching activities for {member['username']} (attempt {attempt + 1}/{max_retries})")
                        response = await client.get(runemetrics_url)
                        
                        if response.status_code == 200:
                            data = response.json()
                            activities = data.get('activities', [])
                            print(f"Found {len(activities)} activities for {member['username']}")
                            
                            member_activities = []
                            two_days_ago = datetime.now().timestamp() - (2 * 24 * 60 * 60)
                            
                            for activity in activities:
                                try:
                                    activity_date_str = activity['date']
                                    
                                    try:
                                        activity_date = datetime.strptime(activity_date_str, '%d-%b-%Y %H:%M')
                                    except ValueError:
                                        try:
                                            activity_date = datetime.strptime(activity_date_str, '%d-%b-%Y')
                                            activity_date = activity_date.replace(hour=0, minute=0)
                                        except ValueError:
                                            print(f"Could not parse date format '{activity_date_str}' for {member['username']}")
                                            continue
                                    
                                    activity_timestamp = int(activity_date.timestamp())
                                    
                                    current_time = datetime.now().timestamp()
                                    if activity_timestamp < 0 or activity_timestamp > current_time + 86400:
                                        print(f"Invalid timestamp {activity_timestamp} for {member['username']}: {activity_date_str}")
                                        continue
                                    
                                    if activity_timestamp >= two_days_ago:
                                        member_activities.append({
                                            'username': member['username'],
                                            'text': activity['text'],
                                            'details': activity['details'],
                                            'date': activity['date'],
                                            'timestamp': activity_timestamp
                                        })
                                except (ValueError, KeyError) as e:
                                    print(f"Error parsing activity date for {member['username']}: {e}")
                                    continue
                            return member_activities
                        
                        elif response.status_code == 429:
                            base_delay = 3.0
                            max_delay = 30.0
                            jitter = random.uniform(0.8, 1.2)
                            delay = min(base_delay * (2 ** attempt) * jitter, max_delay)
                            
                            print(f"Rate limited for {member['username']}, waiting {delay:.2f}s before retry {attempt + 1}/{max_retries}")
                            await asyncio.sleep(delay)
                            continue
                        
                        else:
                            print(f"Failed to fetch activities for {member['username']}: {response.status_code}")
                            if attempt < max_retries - 1:
                                await asyncio.sleep(1.5 ** attempt)
                                continue
                            return []
                            
                    except Exception as e:
                        print(f"Error fetching activities for {member['username']} (attempt {attempt + 1}): {e}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(1.5 ** attempt)
                            continue
                        return []
                
                print(f"Failed to fetch activities for {member['username']} after {max_retries} attempts")
                return []
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                for i in range(0, len(members), batch_size):
                    batch = members[i:i + batch_size]
                    batch_num = i//batch_size + 1
                    total_batches = (len(members) + batch_size - 1)//batch_size
                    print(f"Processing batch {batch_num}/{total_batches} ({len(batch)} members)")
                    
                    for j, member in enumerate(batch):
                        if j > 0:
                            if batch_num <= 5:
                                delay = random.uniform(1.5, 2.5)
                            elif batch_num <= 15:
                                delay = random.uniform(2.0, 3.0)
                            else:
                                delay = random.uniform(3.0, 5.0)
                            print(f"Waiting {delay:.2f}s before next request...")
                            await asyncio.sleep(delay)
                        
                        result = await fetch_member_activities(member, client)
                        progressive_cache['processed_members'] += 1
                        
                        if isinstance(result, list):
                            all_activities.extend(result)
                            
                            try:
                                conn = await get_db_connection()
                                async with conn:
                                    try:
                                        from .database import store_clan_activity
                                    except ImportError:
                                        from database import store_clan_activity
                                    
                                    for activity in result:
                                        await store_clan_activity(
                                            conn, 
                                            activity['username'], 
                                            activity['text'], 
                                            activity['details'], 
                                            activity['date'], 
                                            activity['timestamp']
                                        )
                            except Exception as db_error:
                                print(f"Error storing activities to database: {db_error}")
                            
                            combined_activities = stored_activities + all_activities
                            seen_activities = set()
                            unique_activities = []
                            for activity in combined_activities:
                                activity_key = (activity['username'], activity['text'], activity['timestamp'])
                                if activity_key not in seen_activities:
                                    seen_activities.add(activity_key)
                                    unique_activities.append(activity)
                            
                            progressive_cache['activities'] = unique_activities
                            progressive_cache['activities'].sort(key=lambda x: x['timestamp'], reverse=True)
                            print(f"Updated progressive cache: {len(progressive_cache['activities'])} activities from {progressive_cache['processed_members']} members")
                    
                    if i + batch_size < len(members):
                        if batch_num <= 3:
                            batch_delay = random.uniform(3.0, 5.0)
                        elif batch_num <= 10:
                            batch_delay = random.uniform(5.0, 8.0)
                        else:
                            batch_delay = random.uniform(8.0, 12.0)
                        print(f"Batch complete. Waiting {batch_delay:.2f}s before next batch...")
                        await asyncio.sleep(batch_delay)
            
            print(f"Background processing complete: {len(all_activities)} total activities")
            all_activities.sort(key=lambda x: x['timestamp'], reverse=True)
            
            combined_activities = stored_activities + all_activities
            seen_activities = set()
            unique_all_activities = []
            for activity in combined_activities:
                activity_key = (activity['username'], activity['text'], activity['timestamp'])
                if activity_key not in seen_activities:
                    seen_activities.add(activity_key)
                    unique_all_activities.append(activity)
            
            unique_all_activities.sort(key=lambda x: x['timestamp'], reverse=True)
            
            activities_cache['data'] = unique_all_activities
            activities_cache['timestamp'] = time_module.time()
            progressive_cache['activities'] = unique_all_activities
            progressive_cache['is_complete'] = True
            print(f"Cached {len(unique_all_activities)} activities for {activities_cache['ttl']} seconds")
        
        # Start background processing
        background_tasks.add_task(background_fetch_activities)
        
        return {
            "activities": [],
            "pagination": {
                "page": page,
                "limit": 10,
                "total_activities": 0,
                "has_next": False
            },
            "loading_status": {
                "is_complete": False,
                "processed_members": 0,
                "total_members": len(members)
            }
        }
    
    except Exception as e:
        print(f"Error fetching clan activities: {e}")
        import traceback
        traceback.print_exc()
        return {
            "activities": [],
            "pagination": {
                "page": 1,
                "limit": 10,
                "total_activities": 0,
                "has_next": False
            },
            "loading_status": {
                "is_complete": True,
                "processed_members": 0,
                "total_members": 0
            }
        }

@app.get("/api/player/{username}/activities")
async def get_player_activities(username: str, page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=50)):
    """Get recent activities for a specific player with pagination"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    
    async def fetch_single_player_activities(username: str, max_retries: int = 3):
        """Fetch activities for a single player with exponential backoff retry"""
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient() as client:
                    runemetrics_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={username}&activities=20"
                    response = await client.get(runemetrics_url)
                    
                    if response.status_code == 200:
                        data = response.json()
                        activities = data.get('activities', [])
                        
                        player_activities = []
                        
                        for activity in activities:
                            try:
                                activity_date_str = activity['date']
                                
                                try:
                                    activity_date = datetime.strptime(activity_date_str, '%d-%b-%Y %H:%M')
                                except ValueError:
                                    try:
                                        activity_date = datetime.strptime(activity_date_str, '%d-%b-%Y')
                                        activity_date = activity_date.replace(hour=0, minute=0)
                                    except ValueError:
                                        continue
                                
                                activity_timestamp = int(activity_date.timestamp())
                                
                                current_time = datetime.now().timestamp()
                                if activity_timestamp < 0 or activity_timestamp > current_time + 86400:
                                    continue
                                
                                player_activities.append({
                                    'username': username,
                                    'text': activity['text'],
                                    'details': activity['details'],
                                    'date': activity['date'],
                                    'timestamp': activity_timestamp
                                })
                            except (ValueError, KeyError):
                                continue
                        
                        player_activities.sort(key=lambda x: x['timestamp'], reverse=True)
                        return player_activities
                    
                    elif response.status_code == 429:
                        base_delay = 3.0
                        max_delay = 30.0
                        jitter = random.uniform(0.8, 1.2)
                        delay = min(base_delay * (2 ** attempt) * jitter, max_delay)
                        await asyncio.sleep(delay)
                        continue
                    
                    else:
                        if attempt < max_retries - 1:
                            await asyncio.sleep(1.5 ** attempt)
                            continue
                        return []
                        
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(1.5 ** attempt)
                    continue
                return []
        
        return []
    
    try:
        all_activities = await fetch_single_player_activities(decoded_username)
        
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_activities = all_activities[start_idx:end_idx]
        
        return {
            "activities": paginated_activities,
            "player": decoded_username,
            "total_activities": len(all_activities),
            "page": page,
            "limit": limit,
            "has_more": end_idx < len(all_activities)
        }
    except Exception as e:
        print(f"Error fetching player activities for {decoded_username}: {e}")
        return {
            "activities": [],
            "player": decoded_username,
            "total_activities": 0
        }

@app.get("/api/player/{username}/quests")
async def get_player_quests(username: str):
    """Get player quest data from RuneScape RuneMetrics API"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    
    try:
        async with httpx.AsyncClient() as client:
            profile_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={decoded_username}"
            profile_response = await client.get(profile_url)
            
            quest_summary = {}
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                quest_summary = {
                    'questsstarted': profile_data.get('questsstarted', 0),
                    'questscomplete': profile_data.get('questscomplete', 0),
                    'questsnotstarted': profile_data.get('questsnotstarted', 0)
                }
            
            quests_url = f"https://apps.runescape.com/runemetrics/quests?user={decoded_username}"
            quests_response = await client.get(quests_url)
            
            if quests_response.status_code == 200:
                quests_data = quests_response.json()
                
                total_quest_points = sum(quest.get('questPoints', 0) for quest in quests_data.get('quests', []) if quest.get('status') == 'COMPLETED')
                
                return {
                    'quest_summary': quest_summary,
                    'total_quest_points': total_quest_points,
                    'quests': quests_data.get('quests', []),
                    'username': decoded_username
                }
            else:
                raise HTTPException(status_code=404, detail="Quest data not found")
                
    except Exception as e:
        print(f"Error fetching quest data for {decoded_username}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch quest data")

@app.get("/api/player/{username}/stats/history")
async def get_player_stats_with_history(
    username: str, 
    period1: str = Query("today", description="First time period for comparison"),
    period2: str = Query("yesterday", description="Second time period for comparison"),
    refresh: bool = Query(False, description="Force refresh from API")
):
    """Get player stats with historical changes"""
    try:
        from urllib.parse import unquote
        decoded_username = unquote(username).replace('-', ' ')
        
        current_time = time_module.time()
        cache_key = get_history_cache_key(decoded_username, period1, period2)
        
        if refresh:
            client_ip = "unknown"  # In production, extract from request
            if is_refresh_rate_limited(client_ip, decoded_username):
                raise HTTPException(status_code=429, detail="Refresh rate limit exceeded. Please wait 5 minutes.")
            print(f"Forcing refresh for {decoded_username} history ({period1} vs {period2})")
        elif (cache_key in profile_history_cache['data'] and 
            cache_key in profile_history_cache['timestamps'] and
            current_time - profile_history_cache['timestamps'][cache_key] < profile_history_cache['ttl']):
            print(f"Returning cached history data for {decoded_username} ({period1} vs {period2})")
            return profile_history_cache['data'][cache_key]
        
        current_stats = await fetch_player_stats(decoded_username)
        if not current_stats:
            raise HTTPException(status_code=404, detail="Player not found")
        
        clan_members = await fetch_clan_members()
        clan_rank = None
        print(f"Looking for player in history endpoint: '{decoded_username}'")
        
        for member in clan_members:
            if member['username'].lower().replace('\xa0', ' ') == decoded_username.lower().replace('\xa0', ' '):
                clan_rank = member['clan_rank']
                print(f"Found clan rank in history endpoint: {clan_rank}")
                break
        
        changes_data = {}
        try:
            conn = await get_db_connection()
            
            async with conn:
                try:
                    from .database import get_player_stats_for_periods
                except ImportError:
                    from database import get_player_stats_for_periods
                changes_data = await get_player_stats_for_periods(conn, decoded_username, period1, period2)
        except Exception as db_error:
            print(f"Database error fetching changes (historical tracking disabled): {db_error}")
        
        enhanced_stats = current_stats.copy()
        
        if clan_rank:
            enhanced_stats['clan_rank'] = clan_rank
        
        if 'quest_points' in current_stats:
            enhanced_stats['quest_points'] = current_stats['quest_points']
            print(f"DEBUG: Preserved quest_points in enhanced_stats for {decoded_username}: {current_stats['quest_points']}")
        else:
            print(f"DEBUG: No quest_points found in current_stats for {decoded_username}")
        
        for skill_name, skill_data in enhanced_stats['stats'].items():
            if skill_name in changes_data:
                skill_data.update(changes_data[skill_name])
            else:
                skill_data.update({
                    'level_change': 0,
                    'xp_change': 0,
                    'rank_change': 0,
                    'xp_today': skill_data['xp'],
                    'xp_yesterday': 0,  # Show 0 instead of current XP
                    'xp_period1': skill_data['xp'],
                    'xp_period2': 0  # Show 0 instead of current XP
                })
        
        profile_history_cache['data'][cache_key] = enhanced_stats
        profile_history_cache['timestamps'][cache_key] = current_time
        print(f"Cached history data for {decoded_username} ({period1} vs {period2}) for {profile_history_cache['ttl']} seconds")
        
        return enhanced_stats
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching player history: {e}")
        raise HTTPException(status_code=500, detail="Error fetching player history")

@app.on_event("startup")
async def startup_event():
    """Initialize database and start scheduled tasks"""
    print("🔐 STARTUP: Verifying OAuth environment variables...")
    oauth_vars = {
        'DISCORD_CLIENT_ID': os.getenv('DISCORD_CLIENT_ID'),
        'DISCORD_CLIENT_SECRET': os.getenv('DISCORD_CLIENT_SECRET'), 
        'DISCORD_REDIRECT_URI': os.getenv('DISCORD_REDIRECT_URI'),
        'JWT_SECRET_KEY': os.getenv('JWT_SECRET_KEY'),
        'DATABASE_URL': os.getenv('DATABASE_URL')
    }
    
    for var_name, var_value in oauth_vars.items():
        status = '✅ LOADED' if var_value else '❌ MISSING'
        if var_name == 'DISCORD_REDIRECT_URI' and var_value:
            print(f"🔐 STARTUP: {var_name}: {status} - {var_value}")
        else:
            print(f"🔐 STARTUP: {var_name}: {status}")
    
    missing_vars = [name for name, value in oauth_vars.items() if not value]
    if missing_vars:
        print(f"⚠️ STARTUP WARNING: Missing critical environment variables: {missing_vars}")
    else:
        print(f"✅ STARTUP: All OAuth environment variables loaded successfully")
    
    global prisma, PRISMA_AVAILABLE
    
    try:
        print(f"🔍 Startup debugging - Initial PRISMA_AVAILABLE: {PRISMA_AVAILABLE}")
        print(f"🔍 Startup debugging - Initial prisma object: {prisma}")
        
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL environment variable not set")
        else:
            print(f"✅ DATABASE_URL found: {database_url[:50]}...")
        
        if PRISMA_AVAILABLE:
            print("🔍 PRISMA_AVAILABLE is True, attempting to initialize...")
            try:
                if not prisma:
                    print("🔍 Creating new Prisma instance...")
                    prisma = Prisma()
                    print(f"🔍 Prisma instance created: {prisma}")
                else:
                    print("🔍 Using existing Prisma instance")
                
                print("🔍 Attempting Prisma connection...")
                await prisma.connect()
                print("✅ Prisma database connected successfully")
                PRISMA_AVAILABLE = True
                print(f"🔍 Final PRISMA_AVAILABLE: {PRISMA_AVAILABLE}")
                print(f"🔍 Final prisma object: {prisma}")
            except Exception as e:
                print(f"❌ Prisma database connection failed: {e}")
                print(f"❌ Exception type: {type(e)}")
                import traceback
                traceback.print_exc()
                print("Falling back to legacy database connection...")
                PRISMA_AVAILABLE = False
                prisma = None
                print(f"🔍 After failure - PRISMA_AVAILABLE: {PRISMA_AVAILABLE}")
                print(f"🔍 After failure - prisma object: {prisma}")
        else:
            print("⚠️ Prisma not available at startup, attempting to use pre-generated client...")
            print(f"🔍 PRISMA_AVAILABLE is False - trying to import pre-generated client")
            
            try:
                import sys
                import importlib
                
                if 'prisma' in sys.modules:
                    importlib.reload(sys.modules['prisma'])
                
                from prisma import Prisma
                print("✅ Successfully imported pre-generated Prisma client")
                PRISMA_AVAILABLE = True
                prisma = Prisma()
                print("✅ Prisma import successful using pre-generated client")
                
                print("🔍 Attempting Prisma connection with pre-generated client...")
                await prisma.connect()
                print("✅ Prisma database connected successfully with pre-generated client")
            except Exception as import_error:
                print(f"❌ Failed to import pre-generated Prisma client: {import_error}")
                PRISMA_AVAILABLE = False
                prisma = None
            
            if not PRISMA_AVAILABLE:
                print("⚠️ Prisma client not available - database operations will be disabled")
        
        await init_database()
        
        async def daily_scheduler():
            while True:
                try:
                    now = datetime.now()
                    next_run = now.replace(hour=2, minute=0, second=0, microsecond=0)
                    if now.time() > datetime_time(2, 0):
                        next_run += timedelta(days=1)
                    
                    sleep_seconds = (next_run - now).total_seconds()
                    print(f"Next daily stats collection scheduled in {sleep_seconds/3600:.1f} hours")
                    await asyncio.sleep(sleep_seconds)
                    await collect_daily_player_stats()
                    
                    try:
                        await sync_clan_members_to_database()
                        print("✅ Clan members synced to database")
                    except Exception as e:
                        print(f"❌ Error syncing clan members: {e}")
                    
                    try:
                        conn = await get_db_connection()
                        async with conn:
                            try:
                                from .database import cleanup_old_activities
                            except ImportError:
                                from database import cleanup_old_activities
                            await cleanup_old_activities(conn, days_to_keep=30)
                    except Exception as e:
                        print(f"Error cleaning up activities: {e}")
                except Exception as e:
                    print(f"Error in daily scheduler: {e}")
                    await asyncio.sleep(3600)

        async def frequent_scheduler():
            """Scheduler for frequent clan data updates every 20 minutes"""
            await asyncio.sleep(120)
            
            while True:
                try:
                    print("🔄 Starting frequent clan data update...")
                    await sync_clan_members_to_database_with_queue()
                    print("✅ Frequent clan data update completed")
                    
                except Exception as e:
                    print(f"❌ Error in frequent scheduler: {e}")
                    import traceback
                    traceback.print_exc()
                
                print("⏰ Next frequent update scheduled in 20 minutes")
                await asyncio.sleep(1200)
        
        asyncio.create_task(daily_scheduler())
        asyncio.create_task(frequent_scheduler())
        
    except Exception as e:
        print(f"Error during startup: {e}")
        import traceback
        traceback.print_exc()

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup database connections"""
    try:
        if PRISMA_AVAILABLE and prisma:
            await prisma.disconnect()
            print("✅ Prisma database disconnected")
        else:
            print("⚠️ Prisma not available, skipping disconnect")
    except Exception as e:
        print(f"❌ Error disconnecting Prisma: {e}")
