from fastapi import FastAPI, HTTPException, Depends, status, Query, BackgroundTasks, Response, Request, APIRouter
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
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
import asyncio
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
    from .database import init_database, get_db_connection, collect_daily_player_stats, collect_daily_player_stats_multi_cycle
except ImportError:
    from database import init_database, get_db_connection, collect_daily_player_stats, collect_daily_player_stats_multi_cycle

load_dotenv()

app = FastAPI(title="Stormlight Clan API", version="1.0.0")

prisma = Prisma() if PRISMA_AVAILABLE else None

app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET_KEY", "fallback-secret"))

# Create API router for all API endpoints
api_router = APIRouter(prefix="/api")

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

EXPECTED_ROSTER_COUNT = 245

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

clan_members_cache = {
    'data': [],
    'timestamp': 0,
    'ttl': 600  # 10 minutes
}

def compute_profile_signature(stats: Dict[str, Any], quest_points: int) -> str:
    """
    Deterministic signature of a player's profile based on skill levels, XP, and quest points.
    Matches when profiles are exactly identical (strict equality).
    """
    try:
        parts: List[str] = []
        ov = stats.get('overall') or {}
        parts.append(f"overall:{int(ov.get('level', 0))}:{int(ov.get('xp', 0))}")
        for name in sorted(k for k in stats.keys() if k != 'overall'):
            s = stats.get(name) or {}
            parts.append(f"{name}:{int(s.get('level', 0))}:{int(s.get('xp', 0))}")
        parts.append(f"qp:{int(quest_points)}")
        return "|".join(parts)
    except Exception as e:
        print(f"[NameChange] signature error: {e}")
        return ""

async def log_clan_event_if_new(username: str, event_type: str, old_rank: str = None, new_rank: str = None, window_minutes: int = 5):
    """Log clan event only if no similar event exists within the time window"""
    try:
        now = datetime.now()
        cutoff = now - timedelta(minutes=window_minutes)
        
        exact_duplicate = await prisma.clanlog.find_first(
            where={
                'username': username,
                'eventType': event_type,
                'oldRank': old_rank,
                'newRank': new_rank,
            },
            order={'timestamp': 'desc'}
        )
        
        if exact_duplicate:
            time_diff = (now - exact_duplicate.timestamp).total_seconds() / 60
            if time_diff < window_minutes:
                print(f"🔁 Skipping duplicate {event_type} for {username} ({old_rank}→{new_rank}) - last logged {time_diff:.1f}m ago")
                return None
            
        recent_event = await prisma.clanlog.find_first(
            where={
                'username': username,
                'eventType': event_type,
                'timestamp': {'gte': cutoff},
            },
            order={'timestamp': 'desc'}
        )
        
        if recent_event and recent_event.oldRank == old_rank and recent_event.newRank == new_rank:
            print(f"🔁 Skipping duplicate {event_type} for {username} ({old_rank}→{new_rank}) within {window_minutes}m window")
            return None
            
        print(f"📝 Logging new {event_type} for {username} ({old_rank}→{new_rank})")
        return await prisma.clanlog.create(data={
            'username': username,
            'eventType': event_type,
            'oldRank': old_rank,
            'newRank': new_rank,
            'timestamp': now,
        })
    except Exception as e:
        print(f"⚠️ Failed to log clan event for {username}: {e}")
        import traceback
        traceback.print_exc()
        return None


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

HISCORE_SKILL_ORDER = [name for name, idx in sorted(SKILL_TABLE_MAPPING.items(), key=lambda kv: kv[1])]


async def fetch_player_stats(username: str, max_retries: int = 3) -> Optional[Dict[str, Any]]:
    """Fetch player stats from RuneScape Runemetrics API with rate limiting"""
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                runemetrics_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={username}&activities=20"
                response = await client.get(runemetrics_url)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if 'error' in data:
                        error_msg = data.get('error')
                        print(f"Runemetrics API error for {username}: {error_msg}")
                        if error_msg in ['PROFILE_PRIVATE', 'NOT_A_MEMBER']:
                            raise Exception(f"Non-retryable error: {error_msg}")
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
                    
                    try:
                        hiscore_ranks = await fetch_hiscore_ranks(username, client)
                        for skill_name, rnk in hiscore_ranks.items():
                            if skill_name in stats:
                                stats[skill_name]['rank'] = rnk
                        if 'overall' in hiscore_ranks and hiscore_ranks['overall'] is not None:
                            stats['overall']['rank'] = hiscore_ranks['overall']
                    except Exception as e:
                        print(f"[Hiscores] Overlay failed for {username}: {e}")
                    
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
                    raise Exception("Non-retryable error: 404 not found or private profile")
                else:
                    print(f"Runemetrics API error for {username}: {response.status_code}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1.5 ** attempt)
                        continue
                    return None
                    
        except Exception as e:
            err_str = str(e)
            if "Non-retryable error:" in err_str:
                print(f"Error fetching stats for {username} (attempt {attempt + 1}): {e}")
                raise e
            print(f"Error fetching stats for {username} (attempt {attempt + 1}): {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(1.5 ** attempt)
                continue
            return None
    
    print(f"Failed to fetch stats for {username} after {max_retries} attempts")
    return None

async def fetch_hiscore_ranks(username: str, client: httpx.AsyncClient, timeout: float = 6.0) -> Dict[str, Optional[int]]:
    """
    Returns map of skill_name -> rank (int) using index_lite.ws (rank,level,xp); 
    Missing/unranked (-1/0) -> None. Includes 'overall'.
    """
    ranks: Dict[str, Optional[int]] = {}
    try:
        url = f"https://secure.runescape.com/m=hiscore/index_lite.ws?player={username}"
        resp = await client.get(url, timeout=timeout, follow_redirects=True)
        if resp.status_code != 200:
            return ranks
        lines = resp.text.strip().splitlines()
        count = min(len(lines), len(HISCORE_SKILL_ORDER))
        for i in range(count):
            parts = lines[i].split(',')
            if len(parts) < 3:
                continue
            try:
                r = int(parts[0])
            except:
                r = -1
            rank_val = r if r and r > 0 else None
            skill = HISCORE_SKILL_ORDER[i]
            ranks[skill] = rank_val
        return ranks
    except Exception as e:
        print(f"[Hiscores] Failed to fetch ranks for {username}: {e}")
        return ranks

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
        current_usernames_set = {m['username'] for m in clan_data}

        db_signature_map: Dict[str, str] = {}
        current_db_members = {}
        try:
            db_members = await prisma.clanmember.find_many()
            current_db_members = {member.username: member.clanRank for member in db_members}
            print(f"📊 Loaded {len(current_db_members)} existing members for change detection")

            for m in db_members:
                if m.username not in current_usernames_set and m.stats:
                    try:
                        m_stats = json.loads(m.stats)
                        sig = compute_profile_signature(m_stats, m.questPoints or 0)
                        if sig:
                            db_signature_map[sig] = m.username
                    except Exception as e:
                        print(f"[NameChange] failed to prep DB signature for {m.username}: {e}")
        except Exception as e:
            print(f"⚠️ Could not fetch current members for change detection: {e}")
        
        successful_syncs = 0
        failed_syncs = 0
        
        for i, member_data in enumerate(clan_data):
            try:
                if i > 0:
                    await asyncio.sleep(random.uniform(1.0, 2.0))
                
                stats_data = await fetch_player_stats(member_data['username'], max_retries=2)
                
                quest_data = None
                try:
                    async with httpx.AsyncClient() as client:
                        profile_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={member_data['username']}"
                        profile_response = await client.get(profile_url)
                        
                        if profile_response.status_code == 200:
                            profile_data = profile_response.json()
                            quest_data = {
                                'quest_summary': {
                                    'questsstarted': profile_data.get('questsstarted', 0),
                                    'questscomplete': profile_data.get('questscomplete', 0),
                                    'questsnotstarted': profile_data.get('questsnotstarted', 0)
                                }
                            }
                except Exception as e:
                    print(f"⚠️ Failed to fetch quest data for {member_data['username']}: {e}")
                
                if stats_data is None:
                    failed_member_queue.append({
                        'member_data': member_data,
                        'retry_count': 0,
                        'last_attempt': datetime.now()
                    })
                    failed_syncs += 1
                    print(f"⚠️ Queued {member_data['username']} for retry (stats fetch failed)")
                    continue
                
                badges = []
                try:
                    from .badge_utils import compute_member_badges
                    badges = compute_member_badges(stats_data, quest_data, member_data['clan_rank'], member_data['username'])
                except Exception as e:
                    print(f"⚠️ Failed to compute badges for {member_data['username']}: {e}")
                    badges = []
                
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
                    'questData': json.dumps(quest_data) if quest_data else None,
                    'badges': json.dumps(badges),
                    'lastUpdated': datetime.now()
                }
                
                try:
                    if member_data['username'] not in current_db_members and stats_data and stats_data.get('stats'):
                        new_sig = compute_profile_signature(stats_data['stats'], stats_data.get('quest_points', 0) or 0)
                        old_username = db_signature_map.get(new_sig)
                        if old_username and old_username not in current_usernames_set:
                            print(f"[NameChange] Detected rename: {old_username} -> {member_data['username']}")
                            rename_data = {**clan_member_data, 'username': member_data['username']}
                            await prisma.clanmember.update(
                                where={'username': old_username},
                                data=rename_data
                            )
                            try:
                                await log_clan_event_if_new(
                                    member_data['username'], 
                                    'name_change', 
                                    old_rank=old_username, 
                                    new_rank=member_data['username']
                                )
                                print(f"📝 Logged name change: {old_username} → {member_data['username']}")
                            except Exception as log_error:
                                print(f"⚠️ Failed to log name change for {old_username} -> {member_data['username']}: {log_error}")

                            current_db_members.pop(old_username, None)
                            current_db_members[member_data['username']] = member_data['clan_rank']
                            db_signature_map.pop(new_sig, None)
                except Exception as e:
                    print(f"[NameChange] Error while processing rename detection for {member_data['username']}: {e}")
                
                await prisma.clanmember.upsert(
                    where={'username': member_data['username']},
                    data={
                        'update': clan_member_data,
                        'create': clan_member_data
                    }
                )
                
                try:
                    if member_data['username'] not in current_db_members:
                        await log_clan_event_if_new(
                            member_data['username'], 
                            'join', 
                            old_rank=None, 
                            new_rank=member_data['clan_rank']
                        )
                        print(f"📝 Logged join event for {member_data['username']}")
                    elif current_db_members[member_data['username']] != member_data['clan_rank']:
                        await log_clan_event_if_new(
                            member_data['username'], 
                            'rank_up', 
                            old_rank=current_db_members[member_data['username']], 
                            new_rank=member_data['clan_rank']
                        )
                        print(f"📝 Logged rank change for {member_data['username']}: {current_db_members[member_data['username']]} → {member_data['clan_rank']}")
                        current_db_members[member_data['username']] = member_data['clan_rank']
                except Exception as log_error:
                    print(f"⚠️ Failed to log clan event for {member_data['username']}: {log_error}")
                
                successful_syncs += 1
                if successful_syncs % 10 == 0:
                    print(f"✅ Synced {successful_syncs}/{len(clan_data)} members with badges...")
                
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
        
        current_usernames = {member['username'] for member in clan_data}
        for db_username in current_db_members:
            if db_username not in current_usernames:
                try:
                    await log_clan_event_if_new(
                        db_username, 
                        'leave', 
                        old_rank=current_db_members[db_username], 
                        new_rank=None
                    )
                    print(f"📝 Logged leave event for {db_username}")
                except Exception as log_error:
                    print(f"⚠️ Failed to log leave event for {db_username}: {log_error}")
        
        try:
            total_entries = await prisma.clanlog.count()
            if total_entries > 1000:
                entries_to_keep = await prisma.clanlog.find_many(
                    take=1,
                    skip=999
                )
                if entries_to_keep:
                    cutoff_timestamp = entries_to_keep[0].timestamp
                    deleted_result = await prisma.clanlog.delete_many(
                        where={'timestamp': {'lt': cutoff_timestamp}}
                    )
                    print(f"🗑️ Pruned {deleted_result.count if hasattr(deleted_result, 'count') else 'some'} old clan log entries")
        except Exception as prune_error:
            print(f"⚠️ Failed to prune old clan log entries: {prune_error}")
        
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

@api_router.get("/auth/discord")
async def discord_login():
    """Initiate Discord OAuth login"""
    redirect_uri = os.environ.get("DISCORD_REDIRECT_URI")
    if not redirect_uri:
        # Fallback to production if not set, but prefer secret to avoid mismatches
        redirect_uri = "https://stormlight.fly.dev/api/auth/callback/discord"
    return {
        "auth_url": f"https://discord.com/api/oauth2/authorize?client_id={os.getenv('DISCORD_CLIENT_ID')}&redirect_uri={redirect_uri}&response_type=code&scope=identify%20email"
    }

@api_router.get("/auth/callback/discord")
async def discord_callback(code: str = Query(None)):
    """Handle Discord OAuth callback with performance optimizations"""
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")
        
    start = time_module.time()
    
    client_id = os.getenv('DISCORD_CLIENT_ID')
    client_secret = os.getenv('DISCORD_CLIENT_SECRET')
    redirect_uri = os.getenv('DISCORD_REDIRECT_URI')
    jwt_secret = os.getenv('JWT_SECRET_KEY')
    
    global used_oauth_codes
    with oauth_code_lock:
        if code in used_oauth_codes:
            print(f"❌ OAUTH ERROR: Code already used: {code[:10]}...")
            raise HTTPException(status_code=400, detail="Authorization code already used")
        
        used_oauth_codes.add(code)
        
        if len(used_oauth_codes) > 1000:
            cleanup_oauth_codes()
    
    try:
        timeout = httpx.Timeout(connect=3.0, read=5.0, write=5.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            token_data = {
                'client_id': client_id,
                'client_secret': client_secret,
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': redirect_uri,
            }
            
            token_response = await client.post(
                'https://discord.com/api/oauth2/token',
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            t_token = time_module.time()
            
            if token_response.status_code != 200:
                error_detail = token_response.text
                print(f"❌ OAUTH ERROR: Token exchange failed: {error_detail}")
                raise HTTPException(status_code=400, detail=f"Failed to get access token: {error_detail}")
            
            token_json = token_response.json()
            access_token = token_json['access_token']
            
            user_response = await client.get(
                'https://discord.com/api/users/@me',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            t_user = time_module.time()
            
            if user_response.status_code != 200:
                error_detail = user_response.text
                print(f"❌ OAUTH ERROR: Failed to get user info: {error_detail}")
                raise HTTPException(status_code=400, detail=f"Failed to get user info: {error_detail}")
            
            user_data = user_response.json()
            user_id = user_data['id']
            
            if user_id in users_db:
                del users_db[user_id]
            
            try:
                user = await prisma.user.upsert(
                    where={'discordId': user_id},
                    data={
                        'create': {
                            'discordId': user_id,
                            'username': user_data['username'],
                            'discriminator': user_data.get('discriminator', '0'),
                            'email': user_data.get('email'),
                            'avatar': user_data.get('avatar')
                        },
                        'update': {
                            'username': user_data['username'],
                            'discriminator': user_data.get('discriminator', '0'),
                            'email': user_data.get('email'),
                            'avatar': user_data.get('avatar'),
                            'updatedAt': datetime.now()
                        }
                    },
                    select={'discordId': True}
                )
                
                linked_member = await prisma.clanmember.find_first(
                    where={'discordId': user_id},
                    select={'username': True, 'displayName': True, 'clanRank': True}
                )
                
                if linked_member:
                    user_dict = {
                        'id': user_id,
                        'username': linked_member['username'],
                        'displayName': linked_member['displayName'] or linked_member['username'],
                        'clanRank': linked_member['clanRank'],
                        'isLinked': True,
                        'requiresLinking': False,
                        'discordId': user_id
                    }
                else:
                    user_dict = {
                        'id': user_id,
                        'username': user_data['username'],
                        'displayName': user_data['username'],
                        'clanRank': None,
                        'isLinked': False,
                        'requiresLinking': True,
                        'discordId': user_id
                    }
                
            except Exception as db_error:
                print(f"❌ DATABASE ERROR: User operations failed: {db_error}")
                users_db[user_id] = {
                    'id': user_id,
                    'username': user_data['username'],
                    'displayName': user_data['username'],
                    'clanRank': None,
                    'isLinked': False,
                    'requiresLinking': True,
                    'discordId': user_id
                }
                user_dict = users_db[user_id]
            
            t_db = time_module.time()
            users_db[user_id] = user_dict
            
            jwt_token = create_access_token({"sub": user_id})
            
            total_ms = int((time_module.time() - start) * 1000)
            print(f"🔐 OAUTH SUMMARY: token={int((t_token-start)*1000)}ms, userinfo={int((t_user-t_token)*1000)}ms, db={int((t_db-t_user)*1000)}ms, total={total_ms}ms")
            
            redirect_url = "/"
            if not user_dict['isLinked'] and user_dict['requiresLinking']:
                redirect_url = "/?linking=required"
            
            response = RedirectResponse(url=redirect_url, status_code=302)
            
            response.set_cookie(
                key="access_token",
                value=jwt_token,
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=86400  # 24 hours
            )
            
            return response
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ OAUTH CRITICAL ERROR: {str(e)}")
        import traceback
        print(f"❌ OAUTH TRACEBACK: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")


@api_router.post("/auth/link-account")
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
                                'requiresLinking': False,
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
                        'requiresLinking': False,
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
                                'requiresLinking': False,
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
                        'requiresLinking': False,
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

@api_router.get("/user/me")
async def get_current_user(
    refresh: bool = Query(False, description="Bypass in-memory cache"),
    user_id: str = Depends(verify_token)
):
    """Get current user info"""
    if not refresh and user_id in users_db:
        cached = users_db[user_id]
        if cached.get('isLinked') and cached.get('requiresLinking') is False:
            return cached
    
    try:
        user = await prisma.user.find_unique(
            where={'discordId': user_id},
            select={'discordId': True, 'username': True, 'discriminator': True, 'email': True, 'avatar': True}
        )
        
        if user:
            linked_member = await prisma.clanmember.find_first(
                where={'discordId': user_id},
                select={'username': True, 'displayName': True, 'clanRank': True}
            )
            
            if linked_member:
                result = {
                    'id': user_id,
                    'username': linked_member['username'],
                    'displayName': linked_member['displayName'] or linked_member['username'],
                    'clanRank': linked_member['clanRank'],
                    'isLinked': True,
                    'requiresLinking': False,
                    'discordId': user_id
                }
                users_db[user_id] = result
                return result
            else:
                result = {
                    'id': user['discordId'],
                    'username': user['username'],
                    'discriminator': user['discriminator'],
                    'email': user['email'],
                    'avatar': user['avatar'],
                    'isLinked': False,
                    'requiresLinking': True,
                    'discordId': user_id
                }
                users_db[user_id] = result
                return result
    except Exception as e:
        print(f"❌ get_current_user Prisma error: {e}")
    
    # Fallback to direct database connection
    try:
        from .database import get_db_connection
        conn = await get_db_connection()
        async with conn:
            user_cursor = await conn.execute(
                "SELECT discord_id, username, discriminator, email, avatar FROM users WHERE discord_id = %s",
                (user_id,)
            )
            user_row = await user_cursor.fetchone()
            
            if user_row:
                member_cursor = await conn.execute(
                    "SELECT username, display_name, clan_rank FROM clan_members WHERE discord_id = %s",
                    (user_id,)
                )
                member_row = await member_cursor.fetchone()
                
                if member_row:
                    result = {
                        'id': user_id,
                        'username': member_row[0],
                        'displayName': member_row[1] or member_row[0],
                        'clanRank': member_row[2],
                        'isLinked': True,
                        'requiresLinking': False,
                        'discordId': user_id
                    }
                    users_db[user_id] = result
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
                    users_db[user_id] = result
                    return result
    except Exception as e:
        print(f"❌ Direct database error in get_current_user: {e}")
    
    if user_id in users_db:
        user_data = users_db[user_id].copy()
        if 'isLinked' not in user_data:
            user_data['isLinked'] = False
            user_data['requiresLinking'] = True
        user_data['discordId'] = user_id
        users_db[user_id] = user_data
        return user_data
    
    fallback_result = {
        'id': user_id,
        'username': f'User_{user_id[:8]}',
        'displayName': f'User_{user_id[:8]}',
        'clanRank': None,
        'isLinked': False,
        'requiresLinking': True,
        'discordId': user_id
    }
    users_db[user_id] = fallback_result
    return fallback_result


@api_router.get("/player/{username}/stats")
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

@api_router.get("/hiscores")
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

@api_router.get("/clan/hiscores")
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

@api_router.post("/competitions")
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

@api_router.get("/competitions")
async def get_competitions():
    """Get all competitions"""
    return {"competitions": list(competitions_db.values())}

@api_router.get("/competitions/{competition_id}")
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
        current_time = time_module.time()
        if (clan_members_cache['data'] and
            current_time - clan_members_cache['timestamp'] < clan_members_cache['ttl']):
            return clan_members_cache['data']

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
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
                
                clan_members_cache['data'] = members
                clan_members_cache['timestamp'] = current_time
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

async def verify_admin_access(user_id: str = Depends(verify_token)):
    """Verify user has admin access (Owner, Deputy Owner, or Overseer rank only)"""
    print(f"🔐 ADMIN ACCESS: Verifying admin access for user: {user_id}")
    
    try:
        if prisma and prisma.is_connected():
            print(f"🔐 ADMIN ACCESS: Checking Prisma for user: {user_id}")
            linked_member = await prisma.clanmember.find_first(
                where={'discordId': user_id}
            )
            if linked_member and linked_member.clanRank:
                clan_rank = linked_member.clanRank
                print(f"🔐 ADMIN ACCESS: Found clan rank from Prisma: {clan_rank}")
                rank_priority = get_rank_priority(clan_rank)
                if rank_priority <= 3:  # Owner=1, Deputy Owner=2, Overseer=3
                    print(f"✅ ADMIN ACCESS: User {user_id} has admin access with rank {clan_rank}")
                    return user_id
                else:
                    print(f"❌ ADMIN ACCESS: User {user_id} has insufficient rank: {clan_rank} (priority {rank_priority})")
                    raise HTTPException(status_code=403, detail=f"Admin access required. Your rank: {clan_rank}. Required: Owner, Deputy Owner, or Overseer.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ADMIN ACCESS: Prisma error: {e}")
    
    # Fallback to direct database
    try:
        print(f"🔐 ADMIN ACCESS: Checking direct database for user: {user_id}")
        from .database import get_db_connection
        conn = await get_db_connection()
        async with conn:
            cursor = await conn.execute(
                "SELECT clan_rank FROM clan_members WHERE discord_id = %s",
                (user_id,)
            )
            result = await cursor.fetchone()
            if result and result[0]:
                clan_rank = result[0]
                print(f"🔐 ADMIN ACCESS: Found clan rank from direct DB: {clan_rank}")
                rank_priority = get_rank_priority(clan_rank)
                if rank_priority <= 3:  # Owner=1, Deputy Owner=2, Overseer=3
                    print(f"✅ ADMIN ACCESS: User {user_id} has admin access with rank {clan_rank}")
                    return user_id
                else:
                    print(f"❌ ADMIN ACCESS: User {user_id} has insufficient rank: {clan_rank} (priority {rank_priority})")
                    raise HTTPException(status_code=403, detail=f"Admin access required. Your rank: {clan_rank}. Required: Owner, Deputy Owner, or Overseer.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ADMIN ACCESS: Direct DB error: {e}")
    
    print(f"❌ ADMIN ACCESS: User {user_id} not found or not linked to clan member")
    raise HTTPException(status_code=403, detail="Admin access required. Please link your Discord account to a clan member with Owner, Deputy Owner, or Overseer rank.")

@api_router.get("/clan/members")
async def get_clan_members_paginated(
    page: int = 1,
    limit: int = 15,
    search: Optional[str] = None,
    sort_by: str = "rank"
):
    """Get clan members with pagination and search"""
    if limit not in [15, 30, 50]:
        limit = 15
    
    t0 = time_module.time()
    try:
        db_members = await prisma.clanmember.find_many()
        t_db = time_module.time()
        if db_members and len(db_members) > 0:
            members = []
            for member in db_members:
                badges = []
                if member.badges:
                    try:
                        badges = json.loads(member.badges)
                    except:
                        badges = []
                
                members.append({
                    'username': member.username,
                    'clan_rank': member.clanRank,
                    'total_xp': int(member.totalXp),
                    'total_level': member.totalLevel,
                    'combat_level': member.combatLevel,
                    'kills': member.kills,
                    'last_updated': member.lastUpdated.isoformat(),
                    'badges': badges
                })
            t_transform = time_module.time()
            print(f"[Perf] /api/clan/members DB={int((t_db - t0)*1000)}ms transform={int((t_transform - t_db)*1000)}ms rows={len(db_members)}")
        else:
            raise Exception("No members found in database")
            
    except Exception as db_error:
        print(f"❌ Database error, falling back to API: {db_error}")
        t_api0 = time_module.time()
        members = await fetch_clan_members()
        t_api = time_module.time()
        print(f"[Perf] /api/clan/members FALLBACK external fetch={int((t_api - t_api0)*1000)}ms count={len(members)}")
    
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
    
    t_sort0 = time_module.time()
    if sort_by == "xp":
        members.sort(key=lambda x: x['total_xp'], reverse=True)
    else:
        members.sort(key=lambda x: (get_rank_priority(x['clan_rank']), x['username']))
    
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_members = members[start_idx:end_idx]
    t_done = time_module.time()
    print(f"[Perf] /api/clan/members sort+paginate={int((t_done - t_sort0)*1000)}ms page={page} limit={limit} total={len(members)}")
    
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

@api_router.get("/clan/stats")
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

@api_router.get("/clan/activities")
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

@api_router.get("/clan/log/test")
async def test_clan_log():
    """Test clan log database access"""
    try:
        # Test basic connection
        member_count = await prisma.clanmember.count()
        
        try:
            log_count = await prisma.clanlog.count()
            return {
                "status": "success", 
                "member_count": member_count,
                "log_count": log_count,
                "clanlog_accessible": True
            }
        except Exception as log_error:
            return {
                "status": "partial_success",
                "member_count": member_count,
                "clanlog_accessible": False,
                "clanlog_error": str(log_error),
                "clanlog_error_type": str(type(log_error))
            }
        
    except Exception as e:
        return {"error": str(e), "type": str(type(e))}

@api_router.get("/clan/log")
async def get_clan_log(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    response: Response = None,
    request: Request = None,
):
    """Get recent clan log events with pagination"""
    offset = (page - 1) * limit

    if response is not None:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

    print(f"🔄 [ClanLog API] page={page} limit={limit} offset={offset} url={getattr(request, 'url', None)}")

    try:
        entries = []
        total_count = 0
        used_fallback = False
        
        if prisma:
            try:
                import asyncio
                log_entries = await asyncio.wait_for(
                    prisma.clanlog.find_many(
                        skip=offset,
                        take=limit,
                        order_by={'timestamp': 'desc'}
                    ),
                    timeout=2.0
                )
                prisma_total = await asyncio.wait_for(
                    prisma.clanlog.count(),
                    timeout=2.0
                )
                
                entries = [
                    {
                        'id': e.id,
                        'username': e.username,
                        'event_type': e.eventType,
                        'old_rank': e.oldRank,
                        'new_rank': e.newRank,
                        'timestamp': e.timestamp.isoformat(),
                    }
                    for e in log_entries
                ]
                total_count = prisma_total
                print(f"✅ [ClanLog API] Prisma OK: returned={len(entries)} total={total_count}")
            except Exception as pe:
                print(f"❌ [ClanLog API] Prisma error: {type(pe)} {pe} - falling back to SQL")
                used_fallback = True
        else:
            used_fallback = True
        
        if used_fallback:
            try:
                from .database import get_db_connection
            except ImportError:
                from database import get_db_connection
            
            conn = await get_db_connection()
            async with conn:
                cnt_cur = await conn.execute("SELECT COUNT(*) FROM clan_log")
                cnt_row = await cnt_cur.fetchone()
                total_count = cnt_row[0] if cnt_row else 0
                
                cur = await conn.execute(
                    """
                    SELECT id, username, event_type, old_rank, new_rank, timestamp
                    FROM clan_log
                    ORDER BY timestamp DESC
                    LIMIT %s OFFSET %s
                    """,
                    (limit, offset)
                )
                rows = await cur.fetchall()
                entries = [
                    {
                        'id': r[0],
                        'username': r[1],
                        'event_type': r[2],
                        'old_rank': r[3],
                        'new_rank': r[4],
                        'timestamp': r[5].isoformat() if hasattr(r[5], "isoformat") else str(r[5]),
                    }
                    for r in rows
                ]
                print(f"✅ [ClanLog API] SQL OK: returned={len(entries)} total={total_count}")
        
        seen = set()
        deduped = []
        for e in entries:
            t = e['timestamp']
            minute_key = t[:16] if isinstance(t, str) else e['timestamp'].isoformat()[:16]
            key = f"{e['username']}|{e['event_type']}|{e.get('old_rank','')}|{e.get('new_rank','')}|{minute_key}"
            if key in seen:
                continue
            seen.add(key)
            deduped.append(e)
        
        first = deduped[0] if deduped else None
        print(f"📊 [ClanLog API] Returning {len(deduped)} entries (deduped from {len(entries)}); first={first['username'] if first else 'none'} ts={first['timestamp'] if first else 'n/a'}")
        
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        
        return {
            "log_entries": deduped,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_entries": total_count,
                "has_next": offset + limit < total_count,
            },
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ [ClanLog API] Error fetching clan log: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch clan log")

@api_router.get("/player/{username}/activities")
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

@api_router.get("/player/{username}/log")
async def get_player_log(
    username: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Get log events for a specific player with pagination"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    decoded_username = decoded_username.replace('\xa0', ' ').strip()
    
    offset = (page - 1) * limit
    
    try:
        entries = []
        total_count = 0
        used_fallback = False
        
        if not prisma:
            used_fallback = True
        else:
            try:
                import asyncio
                log_entries = await asyncio.wait_for(
                    prisma.clanlog.find_many(
                        where={'username': decoded_username},
                        skip=offset,
                        take=limit,
                        order_by={'timestamp': 'desc'}
                    ),
                    timeout=2.0
                )
                prisma_total = await asyncio.wait_for(
                    prisma.clanlog.count(where={'username': decoded_username}),
                    timeout=2.0
                )
                
                entries = [
                    {
                        'id': e.id,
                        'username': e.username,
                        'event_type': e.eventType,
                        'old_rank': e.oldRank,
                        'new_rank': e.newRank,
                        'timestamp': e.timestamp.isoformat(),
                    }
                    for e in log_entries
                ]
                total_count = prisma_total
            except Exception as pe:
                print(f"[PlayerLog] Prisma error for '{decoded_username}': {type(pe)} {pe} - falling back to SQL")
                used_fallback = True
        
        if used_fallback:
            try:
                from .database import get_db_connection
            except ImportError:
                from database import get_db_connection
            
            conn = await get_db_connection()
            async with conn:
                cnt_cur = await conn.execute(
                    "SELECT COUNT(*) FROM clan_log WHERE username = %s",
                    (decoded_username,)
                )
                cnt_row = await cnt_cur.fetchone()
                total_count = cnt_row[0] if cnt_row else 0
                
                cur = await conn.execute(
                    """
                    SELECT id, username, event_type, old_rank, new_rank, timestamp
                    FROM clan_log
                    WHERE username = %s
                    ORDER BY timestamp DESC
                    LIMIT %s OFFSET %s
                    """,
                    (decoded_username, limit, offset)
                )
                rows = await cur.fetchall()
                entries = [
                    {
                        'id': r[0],
                        'username': r[1],
                        'event_type': r[2],
                        'old_rank': r[3],
                        'new_rank': r[4],
                        'timestamp': r[5].isoformat() if hasattr(r[5], "isoformat") else str(r[5]),
                    }
                    for r in rows
                ]
        
        entries.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return {
            "log_entries": entries,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_entries": total_count,
                "has_next": offset + limit < total_count,
            },
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"❌ Error fetching player log for '{decoded_username}': {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch player log")


@api_router.get("/player/{username}/quests")
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

@api_router.get("/player/{username}/xp-analytics")
async def get_player_xp_analytics(
    username: str,
    skill: str | None = Query(None, description="Skill name; default overall"),
    range: str = Query("day", pattern="^(day|month)$", description="day or month"),
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12)
):
    """
    XP analytics time-series from daily snapshots.
    - range=day requires year and month; returns daily gains for that month.
    - range=month requires year; returns monthly gains for that year.
    """
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    from datetime import date
    today = date.today()
    if range == "day":
        y = year or today.year
        m = month or today.month
    else:
        y = year or today.year
        m = None

    try:
        try:
            from .database import get_db_connection, get_xp_timeseries
        except ImportError:
            from database import get_db_connection, get_xp_timeseries

        conn = await get_db_connection()
        async with conn:
            data = await get_xp_timeseries(conn, decoded_username, skill, range, y, m)
        return data
    except Exception as e:
        print(f"[XP Analytics] Error for {decoded_username}: {e}")
        raise HTTPException(status_code=500, detail="Failed to compute XP analytics")

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
        
        print(f"[History] Live API fetched for {decoded_username} (overall xp={current_stats['stats']['overall']['xp']:,})")
        
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
                    from .database import ensure_today_snapshot, get_player_stats_for_periods, get_period_window, get_snapshot_json_on_date, get_snapshot_json_on_or_before
                except ImportError:
                    from database import ensure_today_snapshot, get_player_stats_for_periods, get_period_window, get_snapshot_json_on_date, get_snapshot_json_on_or_before
                
                print(f"[History] Live API fetched for {decoded_username} (overall xp={current_stats['stats']['overall']['xp']:,})")
                
                await ensure_today_snapshot(conn, decoded_username, current_stats)
                changes_data = await get_player_stats_for_periods(conn, decoded_username, period1, period2)
                
                today = date.today()
                p1_start, p1_end = get_period_window(period1)
                p2_start, p2_end = get_period_window(period2)
                
                print(f"[History] Period window check: p1_end={p1_end}, today={today}, condition_met={p1_end == today}")
                if p1_end == today:
                    print(f"[History] Recomputing live gains for period1={period1} ending today")
                    
                    if period1.lower() == 'today':
                        baseline_json = await get_snapshot_json_on_date(conn, decoded_username, today)
                        cnt = len(baseline_json or {})
                        print(f"[History] Found {cnt} baseline skills in today's snapshot")
                        if baseline_json:
                            sample_skill = list(baseline_json.keys())[0]
                            sample_data = baseline_json[sample_skill]
                            print(f"[History] Sample baseline: {sample_skill} = level:{sample_data.get('level')}, xp:{sample_data.get('xp'):,}, rank:{sample_data.get('rank')}")
                    else:
                        baseline_json = await get_snapshot_json_on_or_before(conn, decoded_username, p1_start)
                        print(f"[History] Found {len(baseline_json or {})} baseline skills on/before {p1_start}")
                    
                    for skill_name in current_stats['stats'].keys():
                        cur_level = current_stats['stats'][skill_name].get('level', 0)
                        cur_xp = current_stats['stats'][skill_name].get('xp', 0)
                        cur_rank = current_stats['stats'][skill_name].get('rank') or 0
                        
                        baseline_data = baseline_json.get(skill_name) if baseline_json else None
                        
                        if baseline_data:
                            base_level = baseline_data.get('level', 0)
                            base_xp = baseline_data.get('xp', 0)
                            base_rank = baseline_data.get('rank') or 0
                            
                            xp_gain_p1 = max(cur_xp - base_xp, 0)
                            level_delta = max(cur_level - base_level, 0)
                            rank_delta = base_rank - cur_rank
                            
                            print(f"[History] {skill_name}: live_rank={cur_rank} baseline_rank={base_rank} rank_delta={rank_delta}")
                            print(f"[History] {skill_name}: live_xp={cur_xp:,} baseline_xp={base_xp:,} gain={xp_gain_p1:,}")
                            
                            cd = changes_data.get(skill_name, {})
                            cd.update({
                                'xp_period1': cur_xp,
                                'xp_gain_period1': xp_gain_p1,
                                'level_change': level_delta,
                                'xp_change': cur_xp - base_xp,
                                'rank_change': rank_delta
                            })
                            changes_data[skill_name] = cd
                        else:
                            print(f"[History] No baseline snapshot found for {skill_name}, showing 0 gains")
                            cd = changes_data.get(skill_name, {})
                            cd.update({
                                'xp_period1': cur_xp,
                                'xp_gain_period1': 0,
                                'level_change': 0,
                                'xp_change': 0,
                                'rank_change': 0
                            })
                            changes_data[skill_name] = cd
                        
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
                skill_data['xp_today'] = changes_data[skill_name].get('xp_period1', skill_data['xp'])
                skill_data['xp_yesterday'] = changes_data[skill_name].get('xp_period2', 0)
            else:
                skill_data.update({
                    'level_change': 0,
                    'xp_change': 0,
                    'rank_change': 0,
                    'xp_today': skill_data['xp'],
                    'xp_yesterday': 0,
                    'xp_period1': skill_data['xp'],
                    'xp_period2': 0,
                    'xp_gain_period1': 0,
                    'xp_gain_period2': 0
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

@app.post("/api/admin/collect-snapshots")
async def collect_snapshots_now(
    concurrency: int = 1,
    limit: int | None = None,
    user_id: str = Depends(verify_admin_access),
):
    """Manual trigger for bulk snapshot collection (background task) - Admin only"""
    try:
        print(f"🔍 Manual snapshot collection triggered by admin user: {user_id} (concurrency={concurrency}, limit={limit})")
        async def run():
            try:
                from .database import collect_daily_player_stats_multi_cycle
            except ImportError:
                from database import collect_daily_player_stats_multi_cycle
            await collect_daily_player_stats_multi_cycle()
        asyncio.create_task(run())
        return {"status": "queued", "message": "Started multi-cycle collection (~60 members x 4-5 cycles, 3min delays). Check /api/admin/check-snapshots."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/migrate-snapshots")
async def migrate_snapshots(user_id: str = Depends(verify_admin_access)):
    """One-time migration from legacy player_stats_history to consolidated snapshots - Admin only"""
    try:
        print(f"🔍 Snapshot migration triggered by admin user: {user_id}")
        try:
            from .database import migrate_history_to_daily_snapshots, get_db_connection
        except ImportError:
            from database import migrate_history_to_daily_snapshots, get_db_connection
        conn = await get_db_connection()
        async with conn:
            await migrate_history_to_daily_snapshots(conn)
        return {"status": "success", "message": "Migration completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/check-snapshots")
async def check_snapshots():
    """Temporary endpoint to check today's snapshot count without authentication"""
    try:
        from datetime import date
        today = date.today()
        
        try:
            from .database import get_db_connection
        except ImportError:
            from database import get_db_connection
        
        conn = await get_db_connection()
        async with conn:
            cursor = await conn.execute(
                "SELECT COUNT(*) FROM player_daily_snapshots WHERE snapshot_date = %s",
                (today,)
            )
            count_result = await cursor.fetchone()
            today_count = count_result[0] if count_result else 0
            
            cursor = await conn.execute(
                "SELECT COUNT(DISTINCT username) FROM player_daily_snapshots WHERE snapshot_date = %s",
                (today,)
            )
            unique_result = await cursor.fetchone()
            unique_count = unique_result[0] if unique_result else 0
            
            cursor = await conn.execute(
                "SELECT COUNT(*) FROM player_daily_snapshots"
            )
            total_result = await cursor.fetchone()
            total_count = total_result[0] if total_result else 0
            
        try:
            from .main import fetch_clan_members as _fetch
        except ImportError:
            from main import fetch_clan_members as _fetch
        members = await _fetch()
        expected_members = len(members)
        
        return {
            "status": "success",
            "date": today.isoformat(),
            "snapshots_today": today_count,
            "unique_members_today": unique_count,
            "total_snapshots_all_time": total_count,
            "expected_members": expected_members,
            "message": f"Found {today_count} snapshots for {unique_count} unique members today (expected ~{expected_members})"
        }
    except Exception as e:
        print(f"Error checking snapshots: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/trigger-bulk-collection-temp")
async def trigger_bulk_collection_temp():
    """TEMPORARY: Trigger bulk collection without auth for testing - REMOVE AFTER USE"""
    try:
        print("🔍 TEMPORARY: Manual bulk snapshot collection triggered without auth")
        async def run():
            try:
                from .database import collect_daily_player_stats_multi_cycle
            except ImportError:
                from database import collect_daily_player_stats_multi_cycle
            await collect_daily_player_stats_multi_cycle()
        asyncio.create_task(run())
        return {"status": "queued", "message": "Started multi-cycle collection (~60 members x 4-5 cycles, 3min delays). Check /api/admin/check-snapshots."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/cleanup-clan-log-duplicates")
async def cleanup_clan_log_duplicates_endpoint():
    """Remove duplicate clan log entries from database"""
    try:
        conn = await get_db_connection()
        async with conn:
            try:
                from .database import cleanup_clan_log_duplicates
            except ImportError:
                from database import cleanup_clan_log_duplicates
            await cleanup_clan_log_duplicates(conn)
        return {"status": "ok", "message": "Duplicate clan logs removed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/trigger-snapshots")
async def trigger_snapshots_get():
    """TEMPORARY: GET endpoint to trigger multi-cycle collection without auth for testing"""
    try:
        print("[Trigger] TEMPORARY: GET multi-cycle snapshot collection triggered without auth")
        
        lock = getattr(app.state, "snapshot_lock", None)
        if lock and lock.locked():
            print("[Manual Trigger] Another snapshot run is in progress; skipping.")
            return {"status": "skipped", 
                    "message": "Another snapshot collection is already in progress. Check /api/admin/check-snapshots."}
        
        async def run():
            try:
                try:
                    from .database import collect_daily_player_stats_multi_cycle
                except ImportError:
                    from database import collect_daily_player_stats_multi_cycle
                
                if lock:
                    async with lock:
                        await collect_daily_player_stats_multi_cycle()
                else:
                    await collect_daily_player_stats_multi_cycle()
            except Exception as e:
                print(f"❌ [Manual Trigger] Error in snapshot collection: {e}")
                import traceback
                traceback.print_exc()
        
        asyncio.create_task(run())
        return {"status": "queued", 
                "message": "Started multi-cycle collection (sequential processing: 1 member at a time, 8s delays). Check /api/admin/check-snapshots."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/api/admin/trigger-clan-members")
async def trigger_clan_members_get(debug: bool = False):
    """GET endpoint to trigger clan member refresh with detailed reporting"""
    if debug:
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                clan_url = "https://secure.runescape.com/m=clan-hiscores/members_lite.ws?clanName=Stormlight"
                response = await client.get(clan_url)
                
                if response.status_code != 200:
                    return {"debug_mode": True, "error": f"HTTP {response.status_code}"}
                
                content = response.content.decode('latin-1')
                lines = content.strip().split('\n')
                
                existing_count = await prisma.clanmember.count() if PRISMA_AVAILABLE and prisma else 0
                
                return {
                    "debug_mode": True,
                    "fetched_from_api": len(lines) - 1 if len(lines) > 1 else 0,
                    "existing_in_db": existing_count,
                    "sample_lines": lines[:3] if lines else []
                }
        except Exception as e:
            return {"debug_mode": True, "error": str(e)}
    
    try:
        if not PRISMA_AVAILABLE or not prisma:
            return {
                "status": "error",
                "message": "Database client not available",
                "members_fetched": 0,
                "members_updated": 0
            }
        
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            clan_url = "https://secure.runescape.com/m=clan-hiscores/members_lite.ws?clanName=Stormlight"
            response = await client.get(clan_url)
            
            if response.status_code != 200:
                return {
                    "status": "error",
                    "message": f"Failed to fetch clan roster: HTTP {response.status_code}",
                    "members_fetched": 0,
                    "members_updated": 0
                }
            
            content = response.content.decode('latin-1')
            lines = content.strip().split('\n')
            
            if len(lines) < 2:
                return {
                    "status": "error",
                    "message": "Invalid CSV response: insufficient data",
                    "members_fetched": 0,
                    "members_updated": 0
                }
            
            members_fetched = len(lines) - 1  # Exclude header
            processed_count = 0
            error_count = 0
            errors = []
            
            for i, line in enumerate(lines[1:]):  # Skip header
                if line.strip():
                    try:
                        parts = line.split(',')
                        if len(parts) >= 4:
                            username = parts[0].strip().replace('\u00A0', ' ')
                            clan_rank = parts[1].strip()
                            total_xp = int(parts[2]) if parts[2].isdigit() else 0
                            kills = int(parts[3]) if parts[3].isdigit() else 0
                            
                            from datetime import datetime
                            now = datetime.now()
                            
                            await prisma.clanmember.upsert(
                                where={'username': username},
                                data={
                                    'update': {
                                        'clanRank': clan_rank,
                                        'totalXp': total_xp,
                                        'kills': kills,
                                        'lastUpdated': now,
                                    },
                                    'create': {
                                        'username': username,
                                        'displayName': username,
                                        'clanRank': clan_rank,
                                        'totalXp': total_xp,
                                        'totalLevel': 0,
                                        'combatLevel': 0,
                                        'questPoints': 0,
                                        'kills': kills,
                                        'lastUpdated': now,
                                    }
                                }
                            )
                            processed_count += 1
                        else:
                            error_count += 1
                            if len(errors) < 5:  # Limit error samples
                                errors.append(f"Line {i+1}: insufficient CSV fields")
                    except Exception as e:
                        error_count += 1
                        if len(errors) < 5:  # Limit error samples
                            errors.append(f"Line {i+1} ({username if 'username' in locals() else 'unknown'}): {str(e)}")
            
            final_count = await prisma.clanmember.count()
            
            return {
                "status": "success",
                "members_fetched": members_fetched,
                "members_updated": processed_count,
                "errors": error_count,
                "error_samples": errors,
                "total_in_db": final_count
            }
            
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "members_fetched": 0,
            "members_updated": 0
        }



async def daily_clan_member_refresh():
    """Daily clan member refresh: upsert all CSV data while preserving Discord IDs"""
    try:
        global prisma, PRISMA_AVAILABLE
        if not PRISMA_AVAILABLE or not prisma:
            print("❌ Daily clan refresh: Database client not available")
            return
        
        print("🔄 Fetching clan roster from RuneScape CSV API...")
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            clan_url = "https://secure.runescape.com/m=clan-hiscores/members_lite.ws?clanName=Stormlight"
            response = await client.get(clan_url)
            
            if response.status_code != 200:
                print(f"❌ Failed to fetch clan roster: HTTP {response.status_code}")
                return
            
            content = response.content.decode('latin-1')
            lines = content.strip().split('\n')
            
            if len(lines) < 2:
                print("❌ Invalid CSV response: insufficient data")
                return
            
            print(f"📊 Processing {len(lines) - 1} members from CSV (preserving Discord IDs)")
            
            processed_count = 0
            for line in lines[1:]:  # Skip header, process ALL lines
                if line.strip():
                    parts = line.split(',')
                    if len(parts) >= 4:
                        username = parts[0].strip().replace('\u00A0', ' ')
                        clan_rank = parts[1].strip()
                        total_xp = int(parts[2]) if parts[2].isdigit() else 0
                        kills = int(parts[3]) if parts[3].isdigit() else 0
                        
                        from datetime import datetime
                        clan_member_data = {
                            'username': username,
                            'displayName': username,
                            'clanRank': clan_rank,
                            'totalXp': total_xp,
                            'totalLevel': 0,
                            'combatLevel': 0,
                            'questPoints': 0,
                            'kills': kills,
                            'stats': None,
                            'questData': None,
                            'lastUpdated': datetime.now(),
                        }
                        
                        try:
                            await prisma.clanmember.upsert(
                                where={'username': username},
                                data={
                                    'update': {
                                        'clanRank': clan_rank,
                                        'totalXp': total_xp,
                                        'kills': kills,
                                        'lastUpdated': datetime.now(),
                                    },
                                    'create': clan_member_data
                                }
                            )
                            processed_count += 1
                        except Exception as e:
                            print(f"❌ Failed to upsert member {username}: {e}")
            
            final_count = await prisma.clanmember.count()
            print(f"✅ Daily clan refresh completed: {processed_count} members processed, {final_count} total in database")
            
    except Exception as e:
        print(f"❌ Error in daily clan member refresh: {e}")
        import traceback
        traceback.print_exc()


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
        
        app.state.snapshot_lock = asyncio.Lock()
        app.state.sync_lock = asyncio.Lock()
        app.state.last_snapshot_date_utc = None
        
        async def hourly_scheduler():
            """Single 1-hour scheduler for all clan data updates"""
            await asyncio.sleep(120)
            
            while True:
                try:
                    from datetime import timezone
                    now = datetime.now(timezone.utc)
                    today = now.date()
                    has_run_today = (getattr(app.state, "last_snapshot_date_utc", None) == today)
                    
                    if (now.hour == 0 and now.minute < 5) or (not has_run_today and now.hour >= 1 and now.hour <= 6):
                        print(f"🔄 Starting daily clan member refresh at {now.isoformat()}...")
                        
                        async with app.state.sync_lock:
                            await daily_clan_member_refresh()
                        print("✅ Daily clan member refresh completed")
                        
                        print(f"[Scheduler] 🚀 Starting daily multi-cycle snapshot collection at {now.isoformat()}")
                        async with app.state.snapshot_lock:
                            done_count, remaining_count = await collect_daily_player_stats_multi_cycle()
                        app.state.last_snapshot_date_utc = today
                        print(f"[Scheduler] ✅ Daily snapshot job finished for {today.isoformat()}: done={done_count}, remaining={remaining_count}")
                        
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
                    print(f"❌ Error in hourly scheduler: {e}")
                    
                await asyncio.sleep(3600)
        
        asyncio.create_task(hourly_scheduler())
        
    except Exception as e:
        print(f"Error during startup: {e}")
        import traceback
        traceback.print_exc()

app.include_router(api_router)

app.mount("/", StaticFiles(directory="static", html=True), name="static")

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
