from fastapi import FastAPI, HTTPException, Depends, status, Query, BackgroundTasks, Response, Request, APIRouter, Cookie, Form, UploadFile, File, Header
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pathlib import Path
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
import time
import asyncio
from datetime import time as datetime_time
from collections import defaultdict
import threading
import re
import uuid
import shutil
from pathlib import Path
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
    from .database import init_database, get_db_connection, collect_daily_player_stats, collect_daily_player_stats_multi_cycle, collect_daily_activities_and_drops
    from .admin_utils import log_admin_action, calculate_rank_needed, get_site_health_status, create_competition_snapshot
except ImportError:
    from database import init_database, get_db_connection, collect_daily_player_stats, collect_daily_player_stats_multi_cycle, collect_daily_activities_and_drops
    from admin_utils import log_admin_action, calculate_rank_needed, get_site_health_status, create_competition_snapshot

BOSS_DROPS_DATASET = {}
ITEM_TO_BOSSES_LOOKUP = {}
IMAGE_MANIFEST = {}

def load_boss_drops_dataset():
    global BOSS_DROPS_DATASET, ITEM_TO_BOSSES_LOOKUP, IMAGE_MANIFEST
    try:
        dataset_path = Path(__file__).parent / 'data' / 'boss_drops.json'
        with open(dataset_path, 'r') as f:
            BOSS_DROPS_DATASET = json.load(f)
        print(f"✅ Loaded boss drops dataset with {len(BOSS_DROPS_DATASET)} bosses")
        
        ITEM_TO_BOSSES_LOOKUP = {}
        for boss_name, items in BOSS_DROPS_DATASET.items():
            for item in items:
                item_lower = item.lower()
                if item_lower not in ITEM_TO_BOSSES_LOOKUP:
                    ITEM_TO_BOSSES_LOOKUP[item_lower] = []
                ITEM_TO_BOSSES_LOOKUP[item_lower].append(boss_name)
        
        print(f"✅ Built item lookup index with {len(ITEM_TO_BOSSES_LOOKUP)} unique items")
        
        production_manifest = Path('/app/static/assets/drops/manifest.json')
        dev_manifest = Path(__file__).parent.parent.parent / 'stormlight-frontend' / 'public' / 'assets' / 'drops' / 'manifest.json'
        
        manifest_path = production_manifest if production_manifest.exists() else dev_manifest
        
        if manifest_path.exists():
            with open(manifest_path, 'r') as f:
                manifest_data = json.load(f)
                for item in manifest_data:
                    IMAGE_MANIFEST[item['item_name'].lower()] = item['file']
            print(f"✅ Loaded image manifest with {len(IMAGE_MANIFEST)} items")
        else:
            print(f"⚠️ Image manifest not found at {manifest_path}")
            
    except Exception as e:
        print(f"❌ Error loading boss drops dataset: {e}")
        BOSS_DROPS_DATASET = {}
        ITEM_TO_BOSSES_LOOKUP = {}
        IMAGE_MANIFEST = {}

def get_item_image_from_manifest(item_name: str) -> str:
    """Get local image path for an item from the manifest"""
    item_lower = item_name.lower()
    if item_lower in IMAGE_MANIFEST:
        return IMAGE_MANIFEST[item_lower]
    return "/assets/drops/unknown_drop.png"

load_boss_drops_dataset()


load_dotenv()

app = FastAPI(title="Stormlight Clan API", version="1.0.0")

prisma = Prisma() if PRISMA_AVAILABLE else None

app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET_KEY", "fallback-secret"))

uploads_dir = "/app/uploads"
badges_dir = f"{uploads_dir}/badges"

try:
    os.makedirs(badges_dir, exist_ok=True)
    print(f"✅ Successfully created uploads directory: {uploads_dir}")
    print(f"✅ Badge uploads directory: {badges_dir}")
    
    test_file = f"{badges_dir}/.write_test"
    with open(test_file, 'w') as f:
        f.write('test')
    os.remove(test_file)
    print(f"✅ Uploads directory is writable")
    
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
    print(f"✅ Successfully mounted uploads directory for static file serving")
except Exception as e:
    print(f"❌ CRITICAL: Failed to set up uploads directory: {e}")
    print(f"❌ Badge uploads will not work until this is resolved")
    raise

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

def validate_midnight_utc(dt: datetime) -> bool:
    """Validate that a datetime is at midnight UTC (00:00:00)"""
    return dt.hour == 0 and dt.minute == 0 and dt.second == 0 and dt.microsecond == 0

competitions_db = {
    1: {
        "id": 1,
        "name": "Woodcutting XP Week",
        "description": "See who can gain the most Woodcutting XP in one week!",
        "type": "xp",
        "skill": "woodcutting",
        "start_date": datetime(2024, 8, 25),
        "end_date": datetime(2024, 9, 1),
        "created_by": "admin",
        "created_at": datetime.now(),
        "participants": []
    },
    2: {
        "id": 2,
        "name": "Slayer Showdown",
        "description": "Monthly Slayer XP competition - who will be the ultimate slayer?",
        "type": "xp",
        "skill": "slayer",
        "start_date": datetime(2024, 9, 1),
        "end_date": datetime(2024, 9, 30),
        "created_by": "admin",
        "created_at": datetime.now(),
        "participants": []
    },
    3: {
        "id": 3,
        "name": "Boss Drop Challenge",
        "description": "Who can get the most boss drops this month?",
        "type": "drops",
        "boss": "",
        "start_date": datetime(2024, 8, 1),
        "end_date": datetime(2024, 8, 31),
        "created_by": "admin",
        "created_at": datetime.now(),
        "participants": []
    }
}

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

def invalidate_player_cache(username: str):
    """Invalidate all cached entries for a specific player"""
    keys_to_remove = []
    for key in list(profile_history_cache['data'].keys()):
        if key.startswith(f"{username}:"):
            keys_to_remove.append(key)
    
    for key in keys_to_remove:
        profile_history_cache['data'].pop(key, None)
        profile_history_cache['timestamps'].pop(key, None)
        print(f"🗑️ Cache invalidated for key: {key}")

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
                    
                    hiscores_extended = {}
                    try:
                        hiscores_extended = await fetch_hiscores_extended(username, client)
                    except Exception as e:
                        print(f"[Hiscores Extended] Failed for {username}: {e}")
                    
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
                        'username': data.get('name', username),
                        'hiscores': hiscores_extended
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

async def fetch_hiscores_extended(username: str, client: httpx.AsyncClient, timeout: float = 6.0) -> Dict[str, Any]:
    """
    Fetch extended hiscores data including RuneScore, Clue Scrolls, League Points, and League Rank.
    Returns dict with runescore, clue_scrolls dict, league_points, and league_rank.
    """
    result = {
        'runescore': None,
        'clue_scrolls': {
            'easy': None,
            'medium': None,
            'hard': None,
            'elite': None,
            'master': None
        },
        'league_points': None,
        'league_rank': None
    }
    
    try:
        url = f"https://secure.runescape.com/m=hiscore/index_lite.ws?player={username}"
        resp = await client.get(url, timeout=timeout, follow_redirects=True)
        if resp.status_code == 200:
            lines = resp.text.strip().splitlines()
            
            if len(lines) > 54:
                parts = lines[54].split(',')
                if len(parts) >= 2:
                    try:
                        score = int(parts[1])
                        result['runescore'] = score if score > 0 else None
                    except:
                        pass
            
            clue_indices = {'easy': 55, 'medium': 56, 'hard': 57, 'elite': 58, 'master': 59}
            for difficulty, idx in clue_indices.items():
                if len(lines) > idx:
                    parts = lines[idx].split(',')
                    if len(parts) >= 2:
                        try:
                            count = int(parts[1])
                            result['clue_scrolls'][difficulty] = count if count > 0 else None
                        except:
                            pass
            
    except Exception as e:
        print(f"[Hiscores Extended] Failed to fetch standard hiscores for {username}: {e}")
    
    try:
        leagues_url = f"https://secure.runescape.com/m=hiscore_leagues/index_lite.ws?player={username}"
        leagues_resp = await client.get(leagues_url, timeout=timeout, follow_redirects=True)
        if leagues_resp.status_code == 200:
            leagues_lines = [l for l in leagues_resp.text.splitlines() if l.strip()]
            
            if len(leagues_lines) >= 1:
                last_line = leagues_lines[-1]
                parts = last_line.split(',')
                
                if len(parts) >= 2:
                    try:
                        rank = int(parts[0])
                        points = int(parts[1])
                        result['league_rank'] = rank if rank > 0 else None
                        result['league_points'] = points if points > 0 else None
                        print(f"[Hiscores Extended] {username} League data: Rank={rank}, Points={points} (from line: {last_line})")
                    except Exception as parse_error:
                        print(f"[Hiscores Extended] Failed to parse league data for {username}: {parse_error}")
    except Exception as e:
        print(f"[Hiscores Extended] Failed to fetch leagues hiscores for {username}: {e}")
    
    return result


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
                
                # Separate update vs create data to preserve non-API fields like discord_id (important-comment)
                update_data = {
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
                
                create_data = {
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
                        'update': update_data,
                        'create': create_data
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
    """Simplified batch sync focused on core repopulation without complex features"""
    try:
        global prisma, PRISMA_AVAILABLE
        if not PRISMA_AVAILABLE or not prisma:
            print("❌ Database client not available for repopulation")
            return {
                'status': 'error',
                'error': 'Database client not available',
                'successful_syncs': 0,
                'failed_syncs': 0
            }
        
        if not prisma.is_connected():
            print("🔄 Connecting to database...")
            await prisma.connect()
            print("✅ Database connected successfully")
        
        clan_data = await fetch_clan_members()
        print(f"📥 Fetched {len(clan_data)} clan members from RuneScape API (expected: {EXPECTED_ROSTER_COUNT})")
        print(f"📊 Member count comparison: API={len(clan_data)}, Expected={EXPECTED_ROSTER_COUNT}, Difference={len(clan_data) - EXPECTED_ROSTER_COUNT}")
        
        successful_syncs = 0
        failed_syncs = 0
        
        batch_size = 10
        total_batches = (len(clan_data) + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min(start_idx + batch_size, len(clan_data))
            batch_members = clan_data[start_idx:end_idx]
            
            print(f"🔄 Processing batch {batch_num + 1}/{total_batches} ({len(batch_members)} members)")
            batch_successful = 0
            batch_failed = 0
            
            for i, member_data in enumerate(batch_members):
                try:
                    if i > 0:
                        await asyncio.sleep(0.5)  # Reduced delay for faster processing
                    
                    if not prisma.is_connected():
                        print("⚠️ Database disconnected, reconnecting...")
                        await prisma.connect()
                    
                    # Separate update vs create data to preserve non-API fields like discord_id
                    update_data = {
                        'displayName': member_data.get('display_name', member_data['username']),
                        'clanRank': member_data['clan_rank'],
                        'totalXp': member_data['total_xp'],
                        'kills': member_data.get('kills', 0),
                        'lastUpdated': datetime.now(),
                        'lastSeenInApi': datetime.now(),
                        'active': True
                    }
                    
                    create_data = {
                        'username': member_data['username'],
                        'displayName': member_data.get('display_name', member_data['username']),
                        'clanRank': member_data['clan_rank'],
                        'totalXp': member_data['total_xp'],
                        'totalLevel': 0,
                        'combatLevel': 0,
                        'questPoints': 0,
                        'kills': member_data.get('kills', 0),
                        'stats': json.dumps({}),
                        'questData': json.dumps({}),
                        'badges': json.dumps([]),
                        'lastUpdated': datetime.now(),
                        'lastSeenInApi': datetime.now(),
                        'active': True
                    }
                    
                    existing_member = await prisma.clanmember.find_unique(
                        where={'username': member_data['username']}
                    )
                    is_new_member = existing_member is None
                    was_inactive = existing_member and not existing_member.active if existing_member else False
                    
                    result = await prisma.clanmember.upsert(
                        where={'username': member_data['username']},
                        data={
                            'update': update_data,
                            'create': create_data
                        }
                    )
                    
                    if is_new_member or was_inactive:
                        await log_clan_event_if_new(
                            username=member_data['username'],
                            event_type='Join',
                            old_rank=None,
                            new_rank=member_data['clan_rank'],
                            window_minutes=60
                        )
                        if is_new_member:
                            print(f"🎉 {member_data['username']} joined the clan as {member_data['clan_rank']}")
                        else:
                            print(f"🔄 {member_data['username']} returned to the clan as {member_data['clan_rank']}")
                    
                    if result:
                        batch_successful += 1
                        successful_syncs += 1
                        print(f"✅ Repopulated {member_data['username']} ({member_data['clan_rank']}, {member_data['total_xp']:,} XP)")
                    else:
                        batch_failed += 1
                        failed_syncs += 1
                        print(f"⚠️ Upsert returned None for {member_data['username']}")
                    
                except Exception as e:
                    batch_failed += 1
                    failed_syncs += 1
                    print(f"❌ Error repopulating {member_data['username']}: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
            
            print(f"✅ Batch {batch_num + 1}/{total_batches} complete: {batch_successful} successful, {batch_failed} failed")
            print(f"📊 Overall progress: {successful_syncs}/{len(clan_data)} members processed")
            
            try:
                current_count = await prisma.clanmember.count()
                print(f"🔍 Database verification: {current_count} members currently in database")
            except Exception as count_error:
                print(f"⚠️ Could not verify database count: {count_error}")
            
            if batch_num < total_batches - 1:
                print(f"⏳ Waiting 3 seconds before next batch...")
                await asyncio.sleep(3)
        
        print("🔍 Checking for members who left the clan...")
        api_usernames = {member['username'].lower() for member in clan_data}
        
        all_db_members = await prisma.clanmember.find_many(
            where={'active': True}
        )
        
        left_count = 0
        for db_member in all_db_members:
            if db_member.username.lower() not in api_usernames:
                await prisma.clanmember.update(
                    where={'username': db_member.username},
                    data={'active': False}
                )
                
                await log_clan_event_if_new(
                    username=db_member.username,
                    event_type='Leave',
                    old_rank=db_member.clanRank,
                    new_rank=None,
                    window_minutes=60
                )
                
                left_count += 1
                print(f"👋 {db_member.username} left the clan (was {db_member.clanRank})")
        
        if left_count > 0:
            print(f"📊 Detected {left_count} member(s) who left the clan")
        else:
            print(f"✅ No members have left the clan")
        
        try:
            final_count = await prisma.clanmember.count()
            active_count = await prisma.clanmember.count(where={'active': True})
            print(f"🔍 Final database verification: {final_count} total members, {active_count} active")
        except Exception as final_count_error:
            print(f"⚠️ Could not verify final database count: {final_count_error}")
        
        print(f"✅ Repopulation completed: {successful_syncs} successful, {failed_syncs} failed")
        print(f"📊 Total members processed: {len(clan_data)}")
        
        clan_members_cache['data'] = []
        clan_members_cache['timestamp'] = 0
        print(f"🔄 Cleared clan members cache to force fresh data on next fetch")
        
        return {
            'status': 'completed',
            'successful_syncs': successful_syncs,
            'failed_syncs': failed_syncs,
            'total_members': len(clan_data)
        }
        
    except Exception as e:
        print(f"❌ Error in repopulation: {e}")
        import traceback
        traceback.print_exc()
        return {
            'status': 'error',
            'error': str(e),
            'successful_syncs': successful_syncs if 'successful_syncs' in locals() else 0,
            'failed_syncs': failed_syncs if 'failed_syncs' in locals() else 0
        }

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
                # Separate update vs create data to preserve non-API fields like discord_id (important-comment)
                update_data = {
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
                
                create_data = {
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
                        'update': update_data,
                        'create': create_data
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

def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    access_token: str = Cookie(None)
):
    token = None
    
    if credentials:
        token = credentials.credentials
        print(f"🔍 TOKEN VERIFY: Using Authorization header token")
    # Fallback to cookie if no Authorization header
    elif access_token:
        token = access_token
        print(f"🔍 TOKEN VERIFY: Using cookie token")
    else:
        print("❌ TOKEN VERIFY: No token found in Authorization header or cookie")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        print(f"🔍 TOKEN VERIFY: Starting token verification")
        print(f"🔍 TOKEN VERIFY: Token prefix: {token[:20]}...")
        
        secret_key = os.getenv("JWT_SECRET_KEY", "fallback-secret")
        algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        print(f"🔍 TOKEN VERIFY: Using secret key prefix: {secret_key[:10]}... and algorithm: {algorithm}")
        
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
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
                    }
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
            
            redirect_url += f"&token={jwt_token}" if "?" in redirect_url else f"?token={jwt_token}"
            
            response = RedirectResponse(url=redirect_url, status_code=302)
            
            response.set_cookie(
                key="access_token",
                value=jwt_token,
                httponly=True,
                secure=True,
                samesite="none",
                path="/",
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
    clan_xp = None
    clan_rank_number = None
    print(f"Looking for player: '{decoded_username}'")
    print(f"Available clan members: {[m['username'] for m in clan_members[:5]]}")
    
    for member in clan_members:
        if member['username'].lower().replace('\xa0', ' ') == decoded_username.lower().replace('\xa0', ' '):
            clan_rank = member['clan_rank']
            clan_xp = member.get('total_xp', 0)
            print(f"Found clan rank: {clan_rank}, clan XP: {clan_xp}")
            break
    
    if clan_rank is None and len(clan_members) > 0:
        print(f"❌ NO MATCH FOUND for '{decoded_username}'")
        print(f"❌ First 5 clan members for comparison:")
        for idx, member in enumerate(clan_members[:5]):
            normalized_member = member['username'].lower().replace('\xa0', ' ')
            normalized_search = decoded_username.lower().replace('\xa0', ' ')
            print(f"  [{idx}] Member: '{member['username']}' | Normalized: '{normalized_member}' | Match: {normalized_member == normalized_search}")
    elif clan_rank is None:
        print(f"❌ CLAN ROSTER EMPTY - fetch_clan_members() returned 0 members")
    
    if clan_members and clan_xp is not None:
        sorted_members = sorted(clan_members, key=lambda m: m.get('total_xp', 0), reverse=True)
        for idx, member in enumerate(sorted_members):
            if member['username'].lower().replace('\xa0', ' ') == decoded_username.lower().replace('\xa0', ' '):
                clan_rank_number = idx + 1
                print(f"Calculated clan rank number: {clan_rank_number}")
                break
    
    stats = await fetch_player_stats(decoded_username)
    
    is_verified = False
    print(f"Checking Discord verification for username: '{decoded_username}'")
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            print("Using Prisma query for Discord verification")
            linked_member = await prisma.clanmember.find_first(
                where={'username': decoded_username}
            )
            print(f"Prisma result: {linked_member}")
            is_verified = bool(linked_member and linked_member.discordId)
            print(f"Prisma is_verified: {is_verified}")
        else:
            print("Falling back to direct database query for Discord verification")
            import asyncpg
            import os
            
            conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
            try:
                result = await conn.fetchrow(
                    "SELECT discord_id FROM clan_members WHERE username = $1",
                    decoded_username
                )
                print(f"Direct query result: {result}")
                is_verified = bool(result and result['discord_id'])
                print(f"Direct query is_verified: {is_verified}")
            finally:
                await conn.close()
    except Exception as e:
        print(f"Error checking Discord verification for {decoded_username}: {e}")
        import traceback
        traceback.print_exc()
        is_verified = False
    
    print(f"Final is_verified value for {decoded_username}: {is_verified}")
    
    if stats:
        if clan_rank:
            stats['clan_rank'] = clan_rank
        if clan_xp is not None:
            stats['clan_xp'] = clan_xp
        if clan_rank_number is not None:
            stats['clan_rank_number'] = clan_rank_number
        stats['is_verified'] = is_verified
        
        try:
            if PRISMA_AVAILABLE and prisma and prisma.is_connected():
                member = await prisma.clanmember.find_unique(where={'username': decoded_username})
                if member:
                    if member.badges:
                        import json
                        custom_badges = json.loads(member.badges) if isinstance(member.badges, str) else member.badges
                        stats['custom_badges'] = custom_badges
                    else:
                        stats['custom_badges'] = []
                    
                    if member.joinDate:
                        stats['join_date'] = member.joinDate.isoformat()
                        print(f"✅ join_date found for {decoded_username}: {stats['join_date']}")
                    else:
                        print(f"⚠️  join_date is NULL for {decoded_username}")
                else:
                    stats['custom_badges'] = []
                    print(f"⚠️  Member not found in database for {decoded_username}")
            else:
                stats['custom_badges'] = []
                print(f"⚠️  Prisma not available for {decoded_username}")
        except Exception as e:
            print(f"Error fetching custom badges and join_date for {decoded_username}: {e}")
            stats['custom_badges'] = []
        
        if 'hiscores' in stats:
            stats['runescore'] = stats['hiscores'].get('runescore')
            stats['clue_scrolls'] = stats['hiscores'].get('clue_scrolls')
            stats['league_points'] = stats['hiscores'].get('league_points')
            stats['league_rank'] = stats['hiscores'].get('league_rank')
        
        print(f"🔍 FINAL RESPONSE CHECK: username={decoded_username}, clan_xp={stats.get('clan_xp', 'NOT SET')}, clan_rank_number={stats.get('clan_rank_number', 'NOT SET')}")
        print(f"🔍 RESPONSE KEYS: {list(stats.keys())}")
        
        profile_cache['data'][decoded_username] = stats
        profile_cache['timestamps'][decoded_username] = current_time
        print(f"Cached profile data for {decoded_username} for {profile_cache['ttl']} seconds")
        
        return JSONResponse(
            content=jsonable_encoder(stats),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    
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
            "clan_rank": clan_rank,
            "clan_xp": clan_xp,
            "clan_rank_number": clan_rank_number,
            "is_verified": is_verified,
            "custom_badges": [],
            "runescore": None,
            "clue_scrolls": None,
            "league_points": None,
            "league_rank": None
        }
        
        profile_cache['data'][decoded_username] = fallback_data
        profile_cache['timestamps'][decoded_username] = current_time
        print(f"Cached fallback profile data for {decoded_username} for {profile_cache['ttl']} seconds")
        
        return JSONResponse(
            content=jsonable_encoder(fallback_data),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    
    raise HTTPException(status_code=404, detail="Player not found or stats unavailable")

@api_router.get("/player/{username}/activities")
async def get_player_activities(
    username: str,
    page: int = Query(1, description="Page number for pagination"),
    limit: int = Query(10, description="Number of activities per page")
):
    """Get activities for a specific player with pagination"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    
    print(f"=== API REQUEST: get_player_activities for {decoded_username} with page={page}, limit={limit} ===")
    
    try:
        if not prisma or not prisma.is_connected():
            print(f"❌ Prisma not available for player activities")
            raise HTTPException(status_code=503, detail="Database connection unavailable")
        
        skip = (page - 1) * limit
        
        activities_from_db = await prisma.clanactivity.find_many(
            where={'username': decoded_username},
            order={'activityTimestamp': 'desc'},
            skip=skip,
            take=limit
        )
        
        total_count = await prisma.clanactivity.count(
            where={'username': decoded_username}
        )
        
        print(f"Retrieved {len(activities_from_db)} activities for {decoded_username} (total: {total_count}, page: {page})")
        
        activities = []
        for activity in activities_from_db:
            ts = int(activity.activityTimestamp) if activity.activityTimestamp is not None else 0
            if ts > 1000000000000:
                ts = ts // 1000
            
            activities.append({
                'username': activity.username,
                'text': activity.text,
                'timestamp': ts
            })
        
        has_more = (skip + limit) < total_count
        
        return {
            "activities": activities,
            "has_more": has_more
        }
        
    except Exception as e:
        print(f"❌ Error fetching activities for {decoded_username}: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch activities: {str(e)}")


@api_router.get("/player/{username}/citadel-caps")
async def get_player_citadel_caps(username: str):
    """Get the total count of citadel caps for a specific player"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    
    print(f"=== API REQUEST: get_player_citadel_caps for {decoded_username} ===")
    
    try:
        if not prisma or not prisma.is_connected():
            print(f"❌ Prisma not available for citadel caps count")
            raise HTTPException(status_code=503, detail="Database connection unavailable")
        
        caps_count = await prisma.clanactivity.count(
            where={
                'username': decoded_username,
                'text': 'Capped at my Clan Citadel.'
            }
        )
        
        print(f"Found {caps_count} citadel caps for {decoded_username}")
        
        return {
            "username": decoded_username,
            "total_caps": caps_count
        }
        
    except Exception as e:
        print(f"❌ Error fetching citadel caps for {decoded_username}: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch citadel caps: {str(e)}")


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
        "type": competition_data.get("type", "xp"),
        "skill": competition_data.get("skill", "overall"),
        "boss": competition_data.get("boss", ""),
        "start_date": datetime.fromisoformat(competition_data["start_date"]),
        "end_date": datetime.fromisoformat(competition_data["end_date"]),
        "created_by": user_id,
        "created_at": datetime.now(),
        "participants": []
    }
    
    competitions_db[competition_id] = competition
    return competition

@api_router.get("/competitions")
async def get_competitions(status: Optional[str] = None):
    """Get all competitions with optional status filtering"""
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            competitions = await prisma.competition.find_many(
                order={'startDate': 'desc'},
                include={'entries': True}
            )
            
            from datetime import timezone
            now = datetime.now(timezone.utc)
            competition_list = []
            
            for comp in competitions:
                if now < comp.startDate:
                    comp_status = 'upcoming'
                elif now > comp.endDate:
                    comp_status = 'ended'
                else:
                    comp_status = 'active'
                
                if status is None or comp_status == status:
                    try:
                        comp_dict = {
                            'id': comp.id,
                            'name': comp.name,
                            'description': comp.description,
                            'type': comp.type,
                            'skill': comp.skill,
                            'boardSize': comp.boardSize,
                            'dropsGrid': comp.dropsGrid,
                            'startDate': comp.startDate.isoformat() if comp.startDate else None,
                            'endDate': comp.endDate.isoformat() if comp.endDate else None,
                            'isActive': comp.isActive,
                            'createdBy': comp.createdBy,
                            'rewardFirstGp': comp.rewardFirstGp,
                            'rewardSecondGp': comp.rewardSecondGp,
                            'rewardThirdGp': comp.rewardThirdGp,
                            'rewardBadgeId': comp.rewardBadgeId,
                            'createdAt': comp.createdAt.isoformat() if comp.createdAt else None,
                            'updatedAt': comp.updatedAt.isoformat() if comp.updatedAt else None,
                            'status': comp_status,
                            'participantCount': len(comp.entries) if comp.entries else 0
                        }
                        competition_list.append(comp_dict)
                    except Exception as e:
                        print(f"Error serializing competition {comp.id}: {e}")
                        import traceback
                        traceback.print_exc()
            
            return {"competitions": competition_list}
        else:
            return {"competitions": list(competitions_db.values())}
    except Exception as e:
        print(f"Error fetching competitions: {e}")
        return {"competitions": []}

async def calculate_drop_leaderboard(competition, members):
    """Calculate leaderboard for drop competitions using activity logs"""
    try:
        from .database import get_db_connection
    except ImportError:
        from database import get_db_connection
    
    leaderboard = []
    conn = await get_db_connection()
    
    async with conn:
        for member in members:
            try:
                cur = await conn.execute("""
                    SELECT text, details, activity_timestamp
                    FROM clan_activities
                    WHERE username = %s
                      AND activity_timestamp BETWEEN %s AND %s
                      AND (text LIKE '%received a drop%' OR text LIKE '%found%')
                """, (
                    member,
                    int(competition['start_date'].timestamp()),
                    int(competition['end_date'].timestamp())
                ))
                
                activities = await cur.fetchall()
                drop_count = 0
                
                for text, details, timestamp in activities:
                    if any(keyword in text.lower() for keyword in ['received a drop', 'found']):
                        if competition.get('boss'):
                            if competition['boss'].lower() in text.lower():
                                drop_count += 1
                        else:
                            drop_count += 1
                
                leaderboard.append({
                    'username': member,
                    'drop_count': drop_count,
                    'boss': competition.get('boss', 'All bosses')
                })
            
            except Exception as e:
                print(f"Error calculating drops for {member}: {e}")
                continue
    
    leaderboard.sort(key=lambda x: x['drop_count'], reverse=True)
    return leaderboard

@api_router.get("/competitions/{competition_id}")
async def get_competition(competition_id: str, page: int = 1, per_page: int = 25):
    """Get specific competition with leaderboard (on-demand calculation)"""
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            competition = await prisma.competition.find_unique(
                where={'id': competition_id},
                include={'entries': True}
            )
            
            if not competition:
                raise HTTPException(status_code=404, detail="Competition not found")
            
            leaderboard = []
            
            if competition.type == 'XP_GAIN':
                try:
                    from .database import get_db_connection, get_snapshot_json_on_or_before
                except ImportError:
                    from database import get_db_connection, get_snapshot_json_on_or_before
                
                conn = await get_db_connection()
                async with conn:
                    for entry in competition.entries:
                        xp_gain = 0
                        try:
                            end_snapshot = await get_snapshot_json_on_or_before(
                                conn, entry.username, competition.endDate.date()
                            )
                            
                            if end_snapshot:
                                skill = competition.skill or 'overall'
                                if skill and skill.lower() == 'overall':
                                    xp_end = sum(s.get('xp', 0) for s in end_snapshot.values() if isinstance(s, dict))
                                else:
                                    xp_end = end_snapshot.get(skill, {}).get('xp', 0)
                                
                                xp_gain = max(0, xp_end - entry.xpStart)
                        except Exception as e:
                            print(f"Error calculating XP for {entry.username}: {e}")
                            xp_gain = 0
                        
                        leaderboard.append({
                            'username': entry.username,
                            'xp_gain': xp_gain,
                            'skill': competition.skill
                        })
                
                leaderboard.sort(key=lambda x: x['xp_gain'], reverse=True)
            
            elif competition.type == 'BOSS_KILLS':
                if not competition.dropsGrid:
                    return {**competition.dict(), "leaderboard": []}
                
                try:
                    from .database import get_db_connection
                except ImportError:
                    from database import get_db_connection
                
                drops_grid = competition.dropsGrid
                board_size = competition.boardSize or 5
                conn = await get_db_connection()
                
                def detect_bingos(completed_positions, grid_size):
                    completed_set = set(completed_positions)
                    bingo_count = 0
                    
                    for row in range(grid_size):
                        row_complete = all(row * grid_size + col in completed_set for col in range(grid_size))
                        if row_complete:
                            bingo_count += 1
                    
                    for col in range(grid_size):
                        col_complete = all(row * grid_size + col in completed_set for row in range(grid_size))
                        if col_complete:
                            bingo_count += 1
                    
                    main_diag_complete = all(i * grid_size + i in completed_set for i in range(grid_size))
                    if main_diag_complete:
                        bingo_count += 1
                    
                    anti_diag_complete = all(i * grid_size + (grid_size - 1 - i) in completed_set for i in range(grid_size))
                    if anti_diag_complete:
                        bingo_count += 1
                    
                    return bingo_count
                
                async with conn:
                    for entry in competition.entries:
                        completed_count = 0
                        completed_positions = []
                        try:
                            cursor = await conn.execute("""
                                SELECT item_name, boss_name
                                FROM clan_drops
                                WHERE username = $1
                                  AND activity_timestamp BETWEEN $2 AND $3
                            """, 
                                entry.username,
                                int(competition.startDate.timestamp()),
                                int(competition.endDate.timestamp())
                            )
                            
                            member_drops = await cursor.fetchall()
                            drops_set = {(drop['item_name'], drop['boss_name']) for drop in member_drops}
                            
                            for grid_item in drops_grid:
                                if (grid_item['itemName'], grid_item['bossName']) in drops_set:
                                    completed_count += 1
                                    completed_positions.append(grid_item['position'])
                        except Exception as e:
                            print(f"Error calculating drops for {entry.username}: {e}")
                            completed_count = 0
                            completed_positions = []
                        
                        bingo_count = detect_bingos(completed_positions, board_size)
                        
                        leaderboard.append({
                            'username': entry.username,
                            'squares_completed': completed_count,
                            'total_squares': len(drops_grid),
                            'completion_percentage': round((completed_count / len(drops_grid) * 100), 1) if drops_grid else 0,
                            'completed_positions': completed_positions,
                            'bingos': bingo_count
                        })
                
                leaderboard.sort(key=lambda x: x['squares_completed'], reverse=True)
            
            for idx, entry in enumerate(leaderboard, 1):
                entry['rank'] = idx
            
            from datetime import timezone
            now = datetime.now(timezone.utc)
            if competition.endDate < now and competition.rewardBadgeId and len(leaderboard) > 0:
                winner_username = leaderboard[0]['username']
                
                winner_member = await prisma.clanmember.find_unique(
                    where={'username': winner_username}
                )
                
                if winner_member:
                    current_badges = winner_member.badges if winner_member.badges else []
                    if isinstance(current_badges, str):
                        import json
                        current_badges = json.loads(current_badges)
                    
                    if competition.rewardBadgeId not in [b.get('id') if isinstance(b, dict) else b for b in current_badges]:
                        badge = await prisma.custombadge.find_unique(
                            where={'id': competition.rewardBadgeId}
                        )
                        if badge:
                            badge_data = {
                                'id': badge.id,
                                'name': badge.name,
                                'description': badge.description,
                                'imageUrl': badge.imageUrl,
                                'backgroundColor': badge.backgroundColor,
                                'gradientColors': badge.gradientColors
                            }
                            current_badges.append(badge_data)
                            
                            import json
                            await prisma.clanmember.update(
                                where={'username': winner_username},
                                data={'badges': json.dumps(current_badges)}
                            )
                            
                            invalidate_player_cache(winner_username)
            
            start_idx = (page - 1) * per_page
            end_idx = start_idx + per_page
            total_participants = len(leaderboard)
            top_10 = leaderboard[:10] if len(leaderboard) >= 10 else leaderboard
            
            return {
                "id": competition.id,
                "name": competition.name,
                "description": competition.description,
                "type": competition.type,
                "skill": competition.skill,
                "boardSize": competition.boardSize,
                "dropsGrid": competition.dropsGrid,
                "startDate": competition.startDate.isoformat() if competition.startDate else None,
                "endDate": competition.endDate.isoformat() if competition.endDate else None,
                "isActive": competition.isActive,
                "createdBy": competition.createdBy,
                "rewardFirstGp": competition.rewardFirstGp,
                "rewardSecondGp": competition.rewardSecondGp,
                "rewardThirdGp": competition.rewardThirdGp,
                "rewardBadgeId": competition.rewardBadgeId,
                "createdAt": competition.createdAt.isoformat() if competition.createdAt else None,
                "updatedAt": competition.updatedAt.isoformat() if competition.updatedAt else None,
                "leaderboard": leaderboard[start_idx:end_idx],
                "top_10": top_10,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": total_participants,
                    "total_pages": (total_participants + per_page - 1) // per_page
                }
            }
        else:
            raise HTTPException(status_code=503, detail="Database not available")
    except Exception as e:
        print(f"Error fetching competition: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/competitions/{competition_id}/drop-stats")
async def get_competition_drop_stats(competition_id: str, position: Optional[int] = None):
    """Get drop statistics for a PvM competition"""
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            competition = await prisma.competition.find_unique(
                where={'id': competition_id},
                include={'entries': True}
            )
            
            if not competition:
                raise HTTPException(status_code=404, detail="Competition not found")
            
            if competition.type != 'BOSS_KILLS' or not competition.dropsGrid:
                raise HTTPException(status_code=400, detail="Not a PvM competition")
            
            try:
                from .database import get_db_connection
            except ImportError:
                from database import get_db_connection
            
            drops_grid = competition.dropsGrid
            conn = await get_db_connection()
            
            drop_data = {}
            
            async with conn:
                for entry in competition.entries:
                    try:
                        cursor = await conn.execute("""
                            SELECT item_name, boss_name, COUNT(*) as count
                            FROM clan_drops
                            WHERE username = $1
                              AND activity_timestamp BETWEEN $2 AND $3
                            GROUP BY item_name, boss_name
                        """, 
                            entry.username,
                            int(competition.startDate.timestamp()),
                            int(competition.endDate.timestamp())
                        )
                        
                        member_drops = await cursor.fetchall()
                        
                        for drop in member_drops:
                            key = (drop['item_name'], drop['boss_name'])
                            if key not in drop_data:
                                drop_data[key] = []
                            drop_data[key].append({
                                'username': entry.username,
                                'count': drop['count']
                            })
                    except Exception as e:
                        print(f"Error fetching drops for {entry.username}: {e}")
            
            if position is not None:
                grid_item = next((item for item in drops_grid if item['position'] == position), None)
                if not grid_item:
                    return {'item': None, 'players': []}
                
                key = (grid_item['itemName'], grid_item['bossName'])
                players_with_drop = drop_data.get(key, [])
                
                return {
                    'item': {
                        'name': grid_item['itemName'],
                        'boss': grid_item['bossName'],
                        'imageUrl': grid_item['imageUrl'],
                        'position': grid_item['position']
                    },
                    'players': sorted(players_with_drop, key=lambda x: x['count'], reverse=True)
                }
            
            player_stats = {}
            for entry in competition.entries:
                filled_count = 0
                for grid_item in drops_grid:
                    key = (grid_item['itemName'], grid_item['bossName'])
                    if key in drop_data and any(p['username'] == entry.username for p in drop_data[key]):
                        filled_count += 1
                if filled_count > 0:
                    player_stats[entry.username] = filled_count
            
            ranked_players = sorted(
                [{'username': k, 'filled_slots': v} for k, v in player_stats.items()],
                key=lambda x: x['filled_slots'],
                reverse=True
            )
            
            return {
                'total_slots': len(drops_grid),
                'ranked_players': ranked_players
            }
        else:
            raise HTTPException(status_code=503, detail="Database not available")
    except Exception as e:
        print(f"Error fetching drop stats: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/player/{username}/competitions")
async def get_player_competitions(username: str):
    """Get competition participation history for a player"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    
    player_competitions = []
    debug_info = {}
    
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            print(f"🔍 Looking for member with username: {repr(decoded_username)}")
            debug_info['decoded_username'] = decoded_username
            
            member = await prisma.clanmember.find_unique(
                where={'username': decoded_username}
            )
            
            if not member:
                print(f"❌ No clan member found for username: {decoded_username}")
                all_kyles = await prisma.clanmember.find_many(
                    where={'username': {'contains': 'Kyle', 'mode': 'insensitive'}}
                )
                print(f"🔍 Found {len(all_kyles)} members with 'Kyle' in username:")
                debug_info['member_found'] = False
                debug_info['similar_usernames'] = [k.username for k in all_kyles[:5]]
                for k in all_kyles[:5]:
                    print(f"  - {repr(k.username)} (ID: {k.id})")
                return {"competitions": [], "debug": debug_info}
            
            print(f"✅ Found clan member: {member.username} (ID: {member.id})")
            debug_info['member_found'] = True
            debug_info['member_id'] = member.id
            debug_info['member_username'] = member.username
            
            total_entries = await prisma.competitionentry.count()
            print(f"🔍 Total competition entries in database: {total_entries}")
            debug_info['total_entries_in_db'] = total_entries
            
            player_entries = await prisma.competitionentry.find_many(
                where={'memberId': member.id},
                include={'competition': True}
            )
            
            print(f"✅ Found {len(player_entries)} competition entries for {member.username} (memberId: {member.id})")
            debug_info['player_entries_count'] = len(player_entries)
            
            if len(player_entries) == 0:
                sample_entries = await prisma.competitionentry.find_many(
                    take=5,
                    include={'member': True}
                )
                print(f"🔍 Sample entries from database:")
                debug_info['sample_entries'] = []
                for entry in sample_entries:
                    print(f"  - Entry for {entry.username} (memberId: {entry.memberId}, member exists: {entry.member is not None})")
                    debug_info['sample_entries'].append({
                        'username': entry.username,
                        'memberId': entry.memberId,
                        'member_exists': entry.member is not None
                    })
            
            competitions = [entry.competition for entry in player_entries if entry.competition]
            competitions.sort(key=lambda c: c.startDate, reverse=True)
            
            from datetime import timezone
            
            for comp in competitions:
                comp_with_entries = await prisma.competition.find_unique(
                    where={'id': comp.id},
                    include={'entries': True}
                )
                
                contribution = 0
                placement = None
                
                try:
                    if comp.type == 'XP_GAIN':
                        try:
                            from .database import get_db_connection, get_snapshot_json_on_or_before
                        except ImportError:
                            from database import get_db_connection, get_snapshot_json_on_or_before
                        
                        conn = await get_db_connection()
                        async with conn:
                            player_entry = next((e for e in comp_with_entries.entries if e.username.lower() == decoded_username.lower()), None)
                            if player_entry:
                                end_snapshot = await get_snapshot_json_on_or_before(
                                    conn, decoded_username, comp.endDate.date()
                                )
                                
                                if end_snapshot:
                                    skill = comp.skill or 'overall'
                                    if skill and skill.lower() == 'overall':
                                        xp_end = sum(s.get('xp', 0) for s in end_snapshot.values() if isinstance(s, dict))
                                    else:
                                        xp_end = end_snapshot.get(skill, {}).get('xp', 0)
                                    
                                    contribution = max(0, xp_end - player_entry.xpStart)
                            
                            leaderboard_entries = []
                            for entry in comp_with_entries.entries:
                                xp_gain = 0
                                try:
                                    end_snapshot = await get_snapshot_json_on_or_before(
                                        conn, entry.username, comp.endDate.date()
                                    )
                                    
                                    if end_snapshot:
                                        skill = comp.skill or 'overall'
                                        if skill and skill.lower() == 'overall':
                                            xp_end = sum(s.get('xp', 0) for s in end_snapshot.values() if isinstance(s, dict))
                                        else:
                                            xp_end = end_snapshot.get(skill, {}).get('xp', 0)
                                        
                                        xp_gain = max(0, xp_end - entry.xpStart)
                                except:
                                    xp_gain = 0
                                
                                leaderboard_entries.append((entry.username, xp_gain))
                            
                            leaderboard_entries.sort(key=lambda x: x[1], reverse=True)
                            placement = next((i+1 for i, (u, _) in enumerate(leaderboard_entries) 
                                            if u.lower() == decoded_username.lower()), None)
                    
                    else:
                        try:
                            from .database import get_db_connection
                        except ImportError:
                            from database import get_db_connection
                        
                        conn = await get_db_connection()
                        async with conn:
                            async with conn.cursor() as cursor:
                                player_drops = 0
                                
                                await cursor.execute(
                                    "SELECT username, activity FROM player_activity_logs WHERE LOWER(username) = LOWER(%s) AND timestamp >= %s AND timestamp <= %s",
                                    (decoded_username, comp.startDate, comp.endDate)
                                )
                                rows = await cursor.fetchall()
                                
                                if comp.dropsGrid:
                                    drops_grid = comp.dropsGrid
                                    for row in rows:
                                        text = row[1]
                                        for drop_item in drops_grid:
                                            if drop_item and drop_item.lower() in text.lower():
                                                player_drops += 1
                                
                                contribution = player_drops
                                
                                all_entries_drops = []
                                for entry in comp_with_entries.entries:
                                    member_drops = 0
                                    await cursor.execute(
                                        "SELECT activity FROM player_activity_logs WHERE LOWER(username) = LOWER(%s) AND timestamp >= %s AND timestamp <= %s",
                                        (entry.username, comp.startDate, comp.endDate)
                                    )
                                    rows = await cursor.fetchall()
                                
                                    if comp.dropsGrid:
                                        for row in rows:
                                            text = row[0]
                                            for drop_item in drops_grid:
                                                if drop_item and drop_item.lower() in text.lower():
                                                    member_drops += 1
                                    
                                    all_entries_drops.append((entry.username, member_drops))
                            
                                all_entries_drops.sort(key=lambda x: x[1], reverse=True)
                                placement = next((i+1 for i, (u, _) in enumerate(all_entries_drops) 
                                                if u.lower() == decoded_username.lower()), None)
                except Exception as calc_error:
                    print(f"⚠️ Error calculating placement/contribution for competition {comp.name}: {calc_error}")
                    contribution = 0
                    placement = None
                
                now = datetime.now(timezone.utc)
                if now < comp.startDate:
                    status = 'upcoming'
                elif now > comp.endDate:
                    status = 'ended'
                else:
                    status = 'active'
                
                player_competitions.append({
                    'id': comp.id,
                    'name': comp.name,
                    'description': comp.description,
                    'type': comp.type,
                    'skill': comp.skill,
                    'boardSize': comp.boardSize,
                    'start_date': comp.startDate.isoformat() if comp.startDate else None,
                    'end_date': comp.endDate.isoformat() if comp.endDate else None,
                    'status': status,
                    'placement': placement,
                    'contribution': contribution,
                    'rewardFirstGp': comp.rewardFirstGp,
                    'rewardSecondGp': comp.rewardSecondGp,
                    'rewardThirdGp': comp.rewardThirdGp,
                    'rewardBadgeId': comp.rewardBadgeId
                })
        else:
            # Fallback to in-memory competitions_db (for development/testing)
            for comp_id, competition in competitions_db.items():
                player_competitions.append({
                    **competition,
                    'placement': None,
                    'contribution': 0
                })
    
    except Exception as e:
        print(f"Error fetching player competitions: {e}")
        import traceback
        traceback.print_exc()
        debug_info['error'] = str(e)
    
    return {"competitions": player_competitions}

@api_router.get("/player/{username}/highest-placement")
async def get_highest_placement(username: str):
    """Get the player's highest (best/lowest number) competition placement"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            member = await prisma.clanmember.find_unique(
                where={'username': decoded_username}
            )
            
            if not member:
                return {
                    'has_placement': False,
                    'placement': None,
                    'competition_id': None,
                    'competition_name': None
                }
            
            player_entries = await prisma.competitionentry.find_many(
                where={'memberId': member.id},
                include={'competition': True}
            )
            
            if not player_entries:
                return {
                    'has_placement': False,
                    'placement': None,
                    'competition_id': None,
                    'competition_name': None
                }
            
            best_placement = None
            best_comp_id = None
            best_comp_name = None
            
            for entry in player_entries:
                comp = entry.competition
                if not comp:
                    continue
                
                comp_with_entries = await prisma.competition.find_unique(
                    where={'id': comp.id},
                    include={'entries': True}
                )
                
                placement = None
                
                try:
                    if comp.type == 'XP_GAIN':
                        try:
                            from .database import get_db_connection, get_snapshot_json_on_or_before
                        except ImportError:
                            from database import get_db_connection, get_snapshot_json_on_or_before
                        
                        conn = await get_db_connection()
                        async with conn:
                            leaderboard_entries = []
                            for e in comp_with_entries.entries:
                                xp_gain = 0
                                try:
                                    end_snapshot = await get_snapshot_json_on_or_before(
                                        conn, e.username, comp.endDate.date()
                                    )
                                    
                                    if end_snapshot:
                                        skill = comp.skill or 'overall'
                                        if skill and skill.lower() == 'overall':
                                            xp_end = sum(s.get('xp', 0) for s in end_snapshot.values() if isinstance(s, dict))
                                        else:
                                            xp_end = end_snapshot.get(skill, {}).get('xp', 0)
                                        
                                        xp_gain = max(0, xp_end - e.xpStart)
                                except:
                                    xp_gain = 0
                                
                                leaderboard_entries.append((e.username, xp_gain))
                            
                            leaderboard_entries.sort(key=lambda x: x[1], reverse=True)
                            placement = next((i+1 for i, (u, _) in enumerate(leaderboard_entries) 
                                            if u.lower() == decoded_username.lower()), None)
                    
                    else:
                        try:
                            from .database import get_db_connection
                        except ImportError:
                            from database import get_db_connection
                        
                        conn = await get_db_connection()
                        async with conn:
                            async with conn.cursor() as cursor:
                                drops_grid = comp.dropsGrid
                                all_entries_drops = []
                                
                                for e in comp_with_entries.entries:
                                    member_drops = 0
                                    await cursor.execute(
                                        "SELECT activity FROM player_activity_logs WHERE LOWER(username) = LOWER(%s) AND timestamp >= %s AND timestamp <= %s",
                                        (e.username, comp.startDate, comp.endDate)
                                    )
                                    rows = await cursor.fetchall()
                                
                                    if drops_grid:
                                        for row in rows:
                                            text = row[0]
                                            for drop_item in drops_grid:
                                                if drop_item and drop_item.lower() in text.lower():
                                                    member_drops += 1
                                    
                                    all_entries_drops.append((e.username, member_drops))
                            
                                all_entries_drops.sort(key=lambda x: x[1], reverse=True)
                                placement = next((i+1 for i, (u, _) in enumerate(all_entries_drops) 
                                                if u.lower() == decoded_username.lower()), None)
                except Exception as e:
                    print(f"Error calculating placement for competition {comp.name}: {e}")
                    placement = None
                
                if placement is not None:
                    if best_placement is None or placement < best_placement:
                        best_placement = placement
                        best_comp_id = comp.id
                        best_comp_name = comp.name
            
            if best_placement is not None:
                return {
                    'has_placement': True,
                    'placement': best_placement,
                    'competition_id': best_comp_id,
                    'competition_name': best_comp_name
                }
            else:
                return {
                    'has_placement': False,
                    'placement': None,
                    'competition_id': None,
                    'competition_name': None
                }
        else:
            return {
                'has_placement': False,
                'placement': None,
                'competition_id': None,
                'competition_name': None
            }
    except Exception as e:
        print(f"Error fetching highest placement for {username}: {e}")
        import traceback
        traceback.print_exc()
        return {
            'has_placement': False,
            'placement': None,
            'competition_id': None,
            'competition_name': None
        }

async def fetch_clan_members() -> List[Dict[str, Any]]:
    """Fetch clan members from RuneScape Clan API"""
    try:
        current_time = time_module.time()
        cache_ttl = 300  # 5 minutes for fresher XP data
        if (clan_members_cache['data'] and
            current_time - clan_members_cache['timestamp'] < cache_ttl):
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
    print(f"🔐 ADMIN ACCESS: User ID type: {type(user_id)}")
    
    try:
        if prisma and prisma.is_connected():
            print(f"🔐 ADMIN ACCESS: Checking Prisma for user: {user_id}")
            
            # Check all clan members with Discord IDs for debugging
            all_members = await prisma.clanmember.find_many(
                where={'discordId': {'not': None}}
            )
            print(f"🔐 ADMIN ACCESS: Found {len(all_members)} members with Discord IDs")
            for member in all_members[:5]:  # Show first 5 for debugging
                print(f"🔐 ADMIN ACCESS: Member {member.username}: {member.discordId} ({member.clanRank})")
            
            linked_member = await prisma.clanmember.find_first(
                where={'discordId': user_id}
            )
            print(f"🔐 ADMIN ACCESS: Query result for {user_id}: {linked_member}")
            
            if linked_member and linked_member.clanRank:
                clan_rank = linked_member.clanRank
                print(f"🔐 ADMIN ACCESS: Found clan rank from Prisma: {clan_rank}")
                rank_priority = get_rank_priority(clan_rank)
                if rank_priority <= 3:  # Owner=1, Deputy Owner=2, Overseer=3
                    print(f"✅ ADMIN ACCESS: User {user_id} has admin access with rank {clan_rank}")
                    return {'admin_id': user_id, 'username': linked_member.username}
                else:
                    print(f"❌ ADMIN ACCESS: User {user_id} has insufficient rank: {clan_rank} (priority {rank_priority})")
                    raise HTTPException(status_code=403, detail=f"Admin access required. Your rank: {clan_rank}. Required: Owner, Deputy Owner, or Overseer.")
            else:
                print(f"❌ ADMIN ACCESS: No linked member found for Discord ID: {user_id}")
                
                if user_id.isdigit():
                    try:
                        linked_member = await prisma.clanmember.find_first(
                            where={'discordId': int(user_id)}
                        )
                        print(f"🔐 ADMIN ACCESS: Integer query result for {user_id}: {linked_member}")
                        
                        if linked_member and linked_member.clanRank:
                            clan_rank = linked_member.clanRank
                            print(f"🔐 ADMIN ACCESS: Found clan rank from integer query: {clan_rank}")
                            rank_priority = get_rank_priority(clan_rank)
                            if rank_priority <= 3:  # Owner=1, Deputy Owner=2, Overseer=3
                                print(f"✅ ADMIN ACCESS: User {user_id} has admin access with rank {clan_rank}")
                                return {'admin_id': user_id, 'username': linked_member.username}
                            else:
                                print(f"❌ ADMIN ACCESS: User {user_id} has insufficient rank: {clan_rank} (priority {rank_priority})")
                                raise HTTPException(status_code=403, detail=f"Admin access required. Your rank: {clan_rank}. Required: Owner, Deputy Owner, or Overseer.")
                    except Exception as int_error:
                        print(f"🔐 ADMIN ACCESS: Integer conversion error: {int_error}")
                
                kyle_member = await prisma.clanmember.find_first(
                    where={'username': 'lm Kyle'}
                )
                print(f"🔐 ADMIN ACCESS: lm Kyle member record: {kyle_member}")
                
                if kyle_member:
                    print(f"🔐 ADMIN ACCESS: lm Kyle exists with discordId: {kyle_member.discordId}, rank: {kyle_member.clanRank}")
                    if not kyle_member.discordId:
                        print(f"🔐 ADMIN ACCESS: lm Kyle has no Discord ID linked - need to update record")
                        await prisma.clanmember.update(
                            where={'username': 'lm Kyle'},
                            data={'discordId': user_id}
                        )
                        print(f"🔐 ADMIN ACCESS: Updated lm Kyle with Discord ID: {user_id}")
                        
                        if kyle_member.clanRank:
                            clan_rank = kyle_member.clanRank
                            rank_priority = get_rank_priority(clan_rank)
                            if rank_priority <= 3:  # Owner=1, Deputy Owner=2, Overseer=3
                                print(f"✅ ADMIN ACCESS: User {user_id} has admin access with rank {clan_rank}")
                                return {'admin_id': user_id, 'username': kyle_member.username}
                            else:
                                print(f"❌ ADMIN ACCESS: User {user_id} has insufficient rank: {clan_rank} (priority {rank_priority})")
                                raise HTTPException(status_code=403, detail=f"Admin access required. Your rank: {clan_rank}. Required: Owner, Deputy Owner, or Overseer.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ ADMIN ACCESS: Prisma error: {e}")
        import traceback
        print(f"🔐 ADMIN ACCESS: Full traceback: {traceback.format_exc()}")
    
    print(f"❌ ADMIN ACCESS: Final rejection - no valid admin access found for user: {user_id}")
    raise HTTPException(status_code=403, detail="Admin access required. You must be Owner, Deputy Owner, or Overseer.")

@api_router.get("/clan/members")
async def get_clan_members_paginated(
    page: int = 1,
    limit: int = 15,
    search: Optional[str] = None,
    sort_by: str = "rank",
    fresh: bool = False
):
    """Get clan members with pagination and search"""
    if limit not in [15, 30, 50, 100, 250]:
        limit = 15
    
    t0 = time_module.time()
    
    if not fresh:
        try:
            print("🔄 Fetching clan member data from database...")
            t_db0 = time_module.time()
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
                print(f"[Perf] /api/clan/members DB fetch={int((t_db - t_db0)*1000)}ms transform={int((t_transform - t_db)*1000)}ms rows={len(db_members)}")
            else:
                print("⚠️ Database empty, falling back to API...")
                raise Exception("Database is empty")
                
        except Exception as db_error:
            print(f"❌ Database error, falling back to API: {db_error}")
            try:
                print("🔄 Fetching fresh clan member data from RuneScape API...")
                t_api0 = time_module.time()
                members = await fetch_clan_members()
                t_api = time_module.time()
                print(f"[Perf] /api/clan/members API fetch={int((t_api - t_api0)*1000)}ms count={len(members)}")
                
                if not members:
                    raise Exception("No members returned from API")
                    
            except Exception as api_error:
                raise Exception(f"Both database and API failed: DB={db_error}, API={api_error}")
    else:
        try:
            print("🔄 Fetching fresh clan member data from RuneScape API (fresh=True)...")
            t_api0 = time_module.time()
            members = await fetch_clan_members()
            t_api = time_module.time()
            print(f"[Perf] /api/clan/members API fetch={int((t_api - t_api0)*1000)}ms count={len(members)}")
            
            if not members:
                raise Exception("No members returned from API")
                
        except Exception as api_error:
            print(f"❌ API error, falling back to database: {api_error}")
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
                print(f"[Perf] /api/clan/members DB fallback={int((t_db - t0)*1000)}ms transform={int((t_transform - t_db)*1000)}ms rows={len(db_members)}")
            else:
                raise Exception("No members found in database either")
    
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
        if prisma:
            # Calculate pagination for stored activities
            skip = (page - 1) * limit
            activities_from_db = await prisma.clanactivity.find_many(
                order={'activityTimestamp': 'desc'},
                skip=skip,
                take=limit
            )
            total_stored_count = await prisma.clanactivity.count()
            
            stored_activities = []
            for activity in activities_from_db:
                ts = int(activity.activityTimestamp) if activity.activityTimestamp is not None else 0
                if ts > 1000000000000:
                    ts = ts // 1000
                date_str = datetime.fromtimestamp(ts).strftime('%m-%d-%Y') if ts > 0 else activity.activityDate
                stored_activities.append({
                    'username': activity.username,
                    'text': activity.text,
                    'timestamp': ts,
                    'date': date_str
                })
            
            print(f"Retrieved {len(stored_activities)} stored activities from Prisma database (total: {total_stored_count})")
            
            if total_stored_count > 0:
                return {
                    "activities": stored_activities,
                    "pagination": {
                        "page": page,
                        "limit": limit,
                        "total_activities": total_stored_count,
                        "has_next": (skip + limit) < total_stored_count
                    },
                    "loading_status": {
                        "is_complete": True,
                        "processed_members": total_stored_count,
                        "total_members": total_stored_count
                    }
                }
        else:
            # Fallback to old database connection method
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
    
    # Fallback to cache logic only if no stored activities found
    if (activities_cache['data'] and 
        current_time - activities_cache['timestamp'] < activities_cache['ttl']):
        print("Returning cached activities data")
        all_activities = activities_cache['data']
        
        combined_activities = stored_activities + all_activities
        seen_activities = set()
        unique_activities = []
        for activity in combined_activities:
            ts = activity['timestamp']
            if ts > 1000000000000:
                activity['timestamp'] = ts // 1000
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
                "limit": limit,
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
            ts = activity['timestamp']
            if ts > 1000000000000:
                activity['timestamp'] = ts // 1000
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
                runemetrics_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={member['username']}&activities=20"
                
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
                                            'date': datetime.fromtimestamp(activity_timestamp).strftime('%m-%d-%Y'),
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
                                    
                                    await parse_and_store_drops_from_activities(result, member['username'])
                            except Exception as db_error:
                                print(f"Error storing activities to database: {db_error}")
                            
                            combined_activities = stored_activities + all_activities
                            seen_activities = set()
                            unique_activities = []
                            for activity in combined_activities:
                                ts = activity['timestamp']
                                if ts > 1000000000000:
                                    activity['timestamp'] = ts // 1000
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

@api_router.get("/admin/logs")
async def get_admin_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin_id: str = Depends(verify_admin_access)
):
    """Get admin action logs"""
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            logs = await prisma.adminlog.find_many(
                skip=(page - 1) * limit,
                take=limit,
                order={'timestamp': 'desc'}
            )
            return {"logs": logs}
        return {"logs": []}
    except Exception as e:
        print(f"Error fetching admin logs: {e}")
        raise HTTPException(status_code=500, detail="Error fetching admin logs")

@api_router.get("/admin/health")
async def get_site_health(admin_id: str = Depends(verify_admin_access)):
    """Get site health status"""
    try:
        from .admin_utils import get_site_health_status
        health_data = get_site_health_status()
        
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            member_count = await prisma.clanmember.count()
            health_data['total_members'] = member_count
        
        return health_data
    except Exception as e:
        print(f"Error fetching site health: {e}")
        raise HTTPException(status_code=500, detail="Error fetching site health")

@api_router.get("/debug/auth")
async def debug_auth_flow(token: str = Depends(verify_token)):
    """Debug authentication flow - TEMPORARY"""
    try:
        print(f"🔍 DEBUG AUTH: Token received: {token}")
        print(f"🔍 DEBUG AUTH: Token type: {type(token)}")
        
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            kyle = await prisma.clanmember.find_first(
                where={'username': 'lm Kyle'}
            )
            
            # Check all members with Discord IDs
            members_with_discord = await prisma.clanmember.find_many(
                where={'discordId': {'not': None}}
            )
            
            jwt_discord_id = token
            member_by_string = await prisma.clanmember.find_first(
                where={'discordId': jwt_discord_id}
            )
            
            member_by_int = None
            if jwt_discord_id.isdigit():
                member_by_int = await prisma.clanmember.find_first(
                    where={'discordId': int(jwt_discord_id)}
                )
            
            return {
                "token": token,
                "kyle_record": {
                    "username": kyle.username if kyle else None,
                    "discordId": kyle.discordId if kyle else None,
                    "discordId_type": str(type(kyle.discordId)) if kyle else None,
                    "clanRank": kyle.clanRank if kyle else None
                } if kyle else None,
                "members_with_discord_count": len(members_with_discord),
                "first_5_members": [
                    {
                        "username": m.username,
                        "discordId": m.discordId,
                        "discordId_type": str(type(m.discordId)),
                        "clanRank": m.clanRank
                    } for m in members_with_discord[:5]
                ],
                "jwt_discord_id": jwt_discord_id,
                "found_by_string": member_by_string.username if member_by_string else None,
                "found_by_int": member_by_int.username if member_by_int else None
            }
        
        return {"error": "Prisma not available"}
    except Exception as e:
        print(f"🔍 DEBUG AUTH ERROR: {e}")
        return {"error": str(e)}

@api_router.get("/admin/badges")
async def get_custom_badges(admin_id: str = Depends(verify_admin_access)):
    """Get custom badges"""
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            badges = await prisma.custombadge.find_many(
                order={'createdAt': 'desc'},
                include={'competitions': True}
            )
            return {"badges": badges}
        return {"badges": []}
    except Exception as e:
        print(f"Error fetching custom badges: {e}")
        raise HTTPException(status_code=500, detail="Error fetching custom badges")

@api_router.post("/admin/badges")
async def create_custom_badge(
    name: str = Form(...),
    description: str = Form(""),
    background_color: str = Form(None),
    gradient_color1: str = Form(None),
    gradient_color2: str = Form(None),
    badge_file: UploadFile = File(...),
    admin_info: dict = Depends(verify_admin_access)
):
    """Create a new custom badge with file upload and color options"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    try:
        if badge_file.content_type not in ["image/png", "image/jpeg", "image/svg+xml"]:
            raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPG, SVG allowed.")
        
        if badge_file.size and badge_file.size > 2 * 1024 * 1024:  # 2MB limit
            raise HTTPException(status_code=400, detail="File too large. Maximum 2MB allowed.")
        
        upload_dir = Path("/app/uploads/badges")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_extension = badge_file.filename.split('.')[-1] if badge_file.filename else 'png'
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = upload_dir / unique_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(badge_file.file, buffer)
        
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            badge_data = {
                'name': name,
                'description': description,
                'imagePath': str(file_path),
                'imageUrl': f"/uploads/badges/{unique_filename}",
                'createdBy': admin_id
            }
            
            if gradient_color1 and gradient_color2:
                badge_data['gradientColors'] = json.dumps([gradient_color1, gradient_color2])
            elif background_color:
                badge_data['backgroundColor'] = background_color
            
            badge = await prisma.custombadge.create(badge_data)
            
            await log_admin_action(
                admin_id, 
                admin_username, 
                "create_badge", 
                f"Created custom badge: {name}",
                prisma_client=prisma,
                prisma_available=PRISMA_AVAILABLE
            )
            
            return {"success": True, "badge": badge}
        
        raise HTTPException(status_code=500, detail="Database not available")
    except Exception as e:
        print(f"Error creating custom badge: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating custom badge: {str(e)}")
@api_router.put("/admin/badges/{badge_id}")
async def update_custom_badge(
    badge_id: str,
    name: str = Form(...),
    description: str = Form(""),
    background_color: str = Form(None),
    gradient_color1: str = Form(None),
    gradient_color2: str = Form(None),
    badge_file: UploadFile = File(None),
    admin_info: dict = Depends(verify_admin_access)
):
    """Update an existing custom badge"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            existing_badge = await prisma.custombadge.find_unique(where={'id': badge_id})
            if not existing_badge:
                raise HTTPException(status_code=404, detail="Badge not found")
            
            update_data = {
                'name': name,
                'description': description
            }
            
            if gradient_color1 and gradient_color2:
                update_data['gradientColors'] = json.dumps([gradient_color1, gradient_color2])
            elif background_color:
                update_data['backgroundColor'] = background_color
            
            if badge_file and badge_file.filename:
                if badge_file.content_type not in ["image/png", "image/jpeg", "image/svg+xml"]:
                    raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPG, SVG allowed.")
                
                if badge_file.size and badge_file.size > 2 * 1024 * 1024:
                    raise HTTPException(status_code=400, detail="File too large. Maximum 2MB allowed.")
                
                upload_dir = Path("/app/uploads/badges")
                upload_dir.mkdir(parents=True, exist_ok=True)
                
                file_extension = badge_file.filename.split('.')[-1] if badge_file.filename else 'png'
                unique_filename = f"{uuid.uuid4()}.{file_extension}"
                file_path = upload_dir / unique_filename
                
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(badge_file.file, buffer)
                
                if existing_badge.imagePath and Path(existing_badge.imagePath).exists():
                    try:
                        Path(existing_badge.imagePath).unlink()
                    except Exception as e:
                        print(f"Warning: Could not delete old badge image: {e}")
                
                update_data['imagePath'] = str(file_path)
                update_data['imageUrl'] = f"/uploads/badges/{unique_filename}"
            
            badge = await prisma.custombadge.update(
                where={'id': badge_id},
                data=update_data
            )
            
            await log_admin_action(
                admin_id,
                admin_username,
                "update_badge",
                f"Updated custom badge: {name}",
                prisma_client=prisma,
                prisma_available=PRISMA_AVAILABLE
            )
            
            return {"success": True, "badge": badge}
        
        raise HTTPException(status_code=500, detail="Database not available")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating custom badge: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating custom badge: {str(e)}")



@api_router.post("/admin/assign-badge")
async def assign_badge_to_member(
    request: dict,
    admin_info: dict = Depends(verify_admin_access)
):
    """Assign a custom badge to a clan member"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    try:
        print(f"🎯 BADGE ASSIGN: Starting badge assignment for admin {admin_id}")
        print(f"🎯 BADGE ASSIGN: Request data: {request}")
        
        username = request.get('username')
        badge_id = request.get('badgeId')
        
        print(f"🎯 BADGE ASSIGN: Parsed username={username}, badge_id={badge_id}")
        
        if not username or not badge_id:
            print(f"❌ BADGE ASSIGN: Missing required fields - username: {username}, badge_id: {badge_id}")
            raise HTTPException(status_code=400, detail="Username and badge ID required")
        
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            print(f"🎯 BADGE ASSIGN: Prisma available, finding member: {username}")
            member = await prisma.clanmember.find_unique(where={'username': username})
            if not member:
                print(f"❌ BADGE ASSIGN: Member not found: {username}")
                raise HTTPException(status_code=404, detail="Member not found")
            
            print(f"🎯 BADGE ASSIGN: Found member, current badges: {member.badges}")
            current_badges = member.badges if member.badges else []
            if isinstance(current_badges, str):
                import json
                current_badges = json.loads(current_badges)
            
            print(f"🎯 BADGE ASSIGN: Processed current badges: {current_badges}")
            
            if badge_id not in [b.get('id') if isinstance(b, dict) else b for b in current_badges]:
                print(f"🎯 BADGE ASSIGN: Badge not already assigned, finding badge: {badge_id}")
                badge = await prisma.custombadge.find_unique(where={'id': badge_id})
                if badge:
                    print(f"🎯 BADGE ASSIGN: Found badge: {badge.name}")
                    badge_data = {
                        'id': badge.id,
                        'name': badge.name,
                        'imageUrl': badge.imageUrl,
                        'type': 'custom'
                    }
                    
                    if badge.backgroundColor:
                        badge_data['backgroundColor'] = badge.backgroundColor
                    if badge.gradientColors:
                        badge_data['gradientColors'] = badge.gradientColors
                    
                    current_badges.append(badge_data)
                    
                    print(f"🎯 BADGE ASSIGN: Updating member with new badges: {current_badges}")
                    import json
                    await prisma.clanmember.update(
                        where={'username': username},
                        data={'badges': json.dumps(current_badges)}
                    )
                    
                    print(f"🎯 BADGE ASSIGN: Logging admin action")
                    await log_admin_action(
                        admin_id,
                        admin_username,
                        "assign_badge",
                        f"Assigned badge '{badge.name}' to {username}",
                        prisma_client=prisma,
                        prisma_available=PRISMA_AVAILABLE
                    )
                    
                    invalidate_player_cache(username)
                    print(f"✅ BADGE ASSIGN: Successfully assigned badge '{badge.name}' to {username}")
                    return {"success": True}
                else:
                    print(f"❌ BADGE ASSIGN: Badge not found: {badge_id}")
                    raise HTTPException(status_code=404, detail="Badge not found")
            
            print(f"🎯 BADGE ASSIGN: Badge already assigned to {username}")
            return {"success": True, "message": "Badge already assigned"}
        
        print(f"❌ BADGE ASSIGN: Database not available")
        raise HTTPException(status_code=500, detail="Database not available")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ BADGE ASSIGN: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error assigning badge: {str(e)}")

@api_router.post("/admin/remove-badge")
async def remove_badge_from_member(
    request: dict,
    admin_info: dict = Depends(verify_admin_access)
):
    """Remove a custom badge from a clan member"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    try:
        
        username = request.get('username')
        badge_id = request.get('badgeId')
        
        if not username or not badge_id:
            raise HTTPException(status_code=400, detail="Username and badge ID required")
        
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            member = await prisma.clanmember.find_unique(where={'username': username})
            if not member:
                raise HTTPException(status_code=404, detail="Member not found")
            
            current_badges = member.badges if member.badges else []
            if isinstance(current_badges, str):
                import json
                current_badges = json.loads(current_badges)
            
            original_count = len(current_badges)
            current_badges = [b for b in current_badges if (b.get('id') if isinstance(b, dict) else b) != badge_id]
            
            if len(current_badges) < original_count:
                import json
                await prisma.clanmember.update(
                    where={'username': username},
                    data={'badges': json.dumps(current_badges)}
                )
                
                await log_admin_action(
                    admin_id,
                    admin_username, 
                    "remove_badge",
                    f"Removed badge from {username}",
                    prisma_client=prisma,
                    prisma_available=PRISMA_AVAILABLE
                )
                
                invalidate_player_cache(username)
            
            return {"success": True}
        
        raise HTTPException(status_code=500, detail="Database not available")
    except Exception as e:
        print(f"Error removing badge: {e}")
        raise HTTPException(status_code=500, detail="Error removing badge")

@api_router.delete("/admin/badges/{badge_id}")
async def delete_custom_badge(
    badge_id: str,
    admin_info: dict = Depends(verify_admin_access)
):
    """Delete a custom badge"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    try:
        
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            badge = await prisma.custombadge.find_unique(
                where={'id': badge_id},
                include={'competitions': True}
            )
            if not badge:
                raise HTTPException(status_code=404, detail="Badge not found")
            
            if badge.competitions and len(badge.competitions) > 0:
                competition_names = [c.name for c in badge.competitions]
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot delete badge '{badge.name}' - it is linked to competitions: {', '.join(competition_names)}"
                )
            
            import os
            if os.path.exists(badge.imagePath):
                os.remove(badge.imagePath)
            
            await prisma.custombadge.delete(where={'id': badge_id})
            
            await log_admin_action(
                admin_id,
                admin_username,
                "delete_badge",
                f"Deleted custom badge: {badge.name}",
                prisma_client=prisma,
                prisma_available=PRISMA_AVAILABLE
            )
            
            return {"success": True}
        
        raise HTTPException(status_code=500, detail="Database not available")
    except Exception as e:
        print(f"Error deleting badge: {e}")
        raise HTTPException(status_code=500, detail="Error deleting badge")

async def log_admin_action(admin_id: str, username: str, action: str, details: str, prisma_client=None, prisma_available=False):
    """Log an admin action to the database"""
    try:
        if prisma_available and prisma_client and prisma_client.is_connected():
            await prisma_client.adminlog.create(
                data={
                    'adminId': admin_id,
                    'username': username,
                    'action': action,
                    'details': details
                }
            )
    except Exception as e:
        print(f"Error logging admin action: {e}")

@api_router.post("/account-link-requests")
async def create_account_link_request(
    request_data: dict,
    authorization: str = Header(None)
):
    """Create a new account link request"""
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token_data = await verify_token(authorization.replace("Bearer ", ""))
        discord_id = token_data.get("discord_id")
        
        if not PRISMA_AVAILABLE or not prisma or not prisma.is_connected():
            raise HTTPException(status_code=500, detail="Database not available")
        
        primary_member = await prisma.clanmember.find_first(
            where={'discordId': discord_id}
        )
        
        if not primary_member:
            raise HTTPException(status_code=404, detail="Primary account not found")
        
        alternate_username = request_data.get("alternateUsername")
        if not alternate_username:
            raise HTTPException(status_code=400, detail="Alternate username is required")
        
        alternate_member = await prisma.clanmember.find_unique(
            where={'username': alternate_username}
        )
        
        if not alternate_member:
            raise HTTPException(status_code=404, detail="Alternate account not found in clan")
        
        if alternate_member.discordId and alternate_member.discordId != discord_id:
            raise HTTPException(status_code=400, detail="Account is already linked to another Discord user")
        
        existing_request = await prisma.accountlinkrequest.find_first(
            where={
                'primaryDiscordId': discord_id,
                'alternateUsername': alternate_username,
                'status': 'PENDING'
            }
        )
        
        if existing_request:
            raise HTTPException(status_code=400, detail="A pending request already exists for this account")
        
        link_request = await prisma.accountlinkrequest.create(
            data={
                'primaryDiscordId': discord_id,
                'primaryUsername': primary_member.username,
                'alternateUsername': alternate_username,
                'status': 'PENDING'
            }
        )
        
        return {"success": True, "request": link_request.model_dump()}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating account link request: {e}")
        raise HTTPException(status_code=500, detail="Error creating account link request")

@api_router.get("/account-link-requests/my-requests")
async def get_my_account_link_requests(authorization: str = Header(None)):
    """Get all account link requests for the current user"""
    try:
        if not authorization:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        token_data = await verify_token(authorization.replace("Bearer ", ""))
        discord_id = token_data.get("discord_id")
        
        if not PRISMA_AVAILABLE or not prisma or not prisma.is_connected():
            raise HTTPException(status_code=500, detail="Database not available")
        
        requests = await prisma.accountlinkrequest.find_many(
            where={'primaryDiscordId': discord_id},
            order={'requestedAt': 'desc'}
        )
        
        return {"requests": [r.model_dump() for r in requests]}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching account link requests: {e}")
        raise HTTPException(status_code=500, detail="Error fetching account link requests")

@api_router.get("/admin/account-link-requests")
async def get_pending_account_link_requests(admin_info: dict = Depends(verify_admin_access)):
    """Get all pending account link requests (admin only)"""
    try:
        if not PRISMA_AVAILABLE or not prisma or not prisma.is_connected():
            raise HTTPException(status_code=500, detail="Database not available")
        
        requests = await prisma.accountlinkrequest.find_many(
            where={'status': 'PENDING'},
            order={'requestedAt': 'desc'}
        )
        
        return {"requests": [r.model_dump() for r in requests]}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching pending requests: {e}")
        raise HTTPException(status_code=500, detail="Error fetching pending requests")

@api_router.post("/admin/account-link-requests/{request_id}/approve")
async def approve_account_link_request(
    request_id: str,
    admin_info: dict = Depends(verify_admin_access)
):
    """Approve an account link request (admin only)"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    
    try:
        if not PRISMA_AVAILABLE or not prisma or not prisma.is_connected():
            raise HTTPException(status_code=500, detail="Database not available")
        
        link_request = await prisma.accountlinkrequest.find_unique(
            where={'id': request_id}
        )
        
        if not link_request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if link_request.status != 'PENDING':
            raise HTTPException(status_code=400, detail="Request has already been processed")
        
        await prisma.clanmember.update(
            where={'username': link_request.alternateUsername},
            data={'discordId': link_request.primaryDiscordId}
        )
        
        await prisma.accountlinkrequest.update(
            where={'id': request_id},
            data={
                'status': 'APPROVED',
                'reviewedAt': datetime.now(timezone.utc),
                'reviewedBy': admin_username
            }
        )
        
        await log_admin_action(
            admin_id,
            admin_username,
            "approve_account_link",
            f"Approved account link: {link_request.primaryUsername} -> {link_request.alternateUsername}",
            prisma_client=prisma,
            prisma_available=PRISMA_AVAILABLE
        )
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error approving account link request: {e}")
        raise HTTPException(status_code=500, detail="Error approving account link request")

@api_router.post("/admin/account-link-requests/{request_id}/reject")
async def reject_account_link_request(
    request_id: str,
    admin_info: dict = Depends(verify_admin_access)
):
    """Reject an account link request (admin only)"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    
    try:
        if not PRISMA_AVAILABLE or not prisma or not prisma.is_connected():
            raise HTTPException(status_code=500, detail="Database not available")
        
        link_request = await prisma.accountlinkrequest.find_unique(
            where={'id': request_id}
        )
        
        if not link_request:
            raise HTTPException(status_code=404, detail="Request not found")
        
        if link_request.status != 'PENDING':
            raise HTTPException(status_code=400, detail="Request has already been processed")
        
        await prisma.accountlinkrequest.update(
            where={'id': request_id},
            data={
                'status': 'REJECTED',
                'reviewedAt': datetime.now(timezone.utc),
                'reviewedBy': admin_username
            }
        )
        
        await log_admin_action(
            admin_id,
            admin_username,
            "reject_account_link",
            f"Rejected account link: {link_request.primaryUsername} -> {link_request.alternateUsername}",
            prisma_client=prisma,
            prisma_available=PRISMA_AVAILABLE
        )
        
        return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error rejecting account link request: {e}")
        raise HTTPException(status_code=500, detail="Error rejecting account link request")

@api_router.get("/admin/competitions")
async def get_admin_competitions(admin_id: str = Depends(verify_admin_access)):
    """Get competitions for admin management"""
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            competitions = await prisma.competition.find_many(
                order={'createdAt': 'desc'}
            )
            return {"competitions": competitions}
        else:
            # Fallback to in-memory competitions
            competitions_list = list(competitions_db.values())
            return {"competitions": competitions_list}
    except Exception as e:
        print(f"Error fetching admin competitions: {e}")
        raise HTTPException(status_code=500, detail="Error fetching competitions")

@api_router.post("/admin/competitions")
async def create_admin_competition(
    competition_data: dict,
    admin_info: dict = Depends(verify_admin_access)
):
    """Create a new competition with automatic member enrollment at start time"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            start_date = datetime.fromisoformat(competition_data['start_date'].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(competition_data['end_date'].replace('Z', '+00:00'))
            
            if not validate_midnight_utc(start_date) or not validate_midnight_utc(end_date):
                raise HTTPException(
                    status_code=400,
                    detail="Competition start and end times must be at midnight UTC (00:00:00)"
                )
            
            comp_type = competition_data['type'].upper()
            if comp_type in ['XP', 'SKILLING']:
                comp_type = 'XP_GAIN'
            elif comp_type in ['DROPS', 'PVM']:
                comp_type = 'BOSS_KILLS'
            
            create_data = {
                'name': competition_data['name'],
                'description': competition_data.get('description', ''),
                'type': comp_type,
                'startDate': start_date,
                'endDate': end_date,
                'createdBy': admin_id,
                'rewardFirstGp': competition_data.get('reward_first_gp'),
                'rewardSecondGp': competition_data.get('reward_second_gp'),
                'rewardThirdGp': competition_data.get('reward_third_gp')
            }
            
            reward_badge_id = competition_data.get('reward_badge_id')
            if reward_badge_id:
                create_data['rewardBadge'] = {'connect': {'id': reward_badge_id}}
            
            if competition_data.get('skill'):
                create_data['skill'] = competition_data['skill']
            if competition_data.get('board_size'):
                create_data['boardSize'] = competition_data['board_size']
            if competition_data.get('drops_grid'):
                drops_grid = competition_data['drops_grid']
                if isinstance(drops_grid, str):
                    try:
                        drops_grid = json.loads(drops_grid)
                    except:
                        pass
                from prisma import Json
                create_data['dropsGrid'] = Json(drops_grid)
            
            competition = await prisma.competition.create(create_data)
            
            members = await prisma.clanmember.find_many(where={'active': True})
            
            if comp_type == 'XP_GAIN':
                try:
                    from .database import get_db_connection, get_snapshot_json_on_or_before
                except ImportError:
                    from database import get_db_connection, get_snapshot_json_on_or_before
                
                conn = await get_db_connection()
                async with conn:
                    for member in members:
                        try:
                            start_snapshot = await get_snapshot_json_on_or_before(
                                conn, member.username, start_date.date()
                            )
                            
                            xp_start = 0
                            if start_snapshot:
                                skill = competition_data.get('skill', 'overall')
                                if skill and skill.lower() == 'overall':
                                    xp_start = sum(s.get('xp', 0) for s in start_snapshot.values() if isinstance(s, dict))
                                else:
                                    xp_start = start_snapshot.get(skill, {}).get('xp', 0)
                            
                            await prisma.competitionentry.create({
                                'competitionId': competition.id,
                                'memberId': member.id,
                                'username': member.username,
                                'xpStart': xp_start,
                                'xpEnd': None
                            })
                        except Exception as e:
                            print(f"Warning: Failed to create entry for {member.username}: {e}")
                            continue
            else:
                for member in members:
                    try:
                        await prisma.competitionentry.create({
                            'competitionId': competition.id,
                            'memberId': member.id,
                            'username': member.username,
                            'xpStart': 0,
                            'xpEnd': None
                        })
                    except Exception as e:
                        print(f"Warning: Failed to create entry for {member.username}: {e}")
                        continue
            
            await log_admin_action(
                admin_id,
                admin_username,
                "create_competition",
                f"Created competition: {competition.name}",
                prisma_client=prisma,
                prisma_available=PRISMA_AVAILABLE
            )
            
            return competition
        else:
            raise HTTPException(status_code=503, detail="Database not available")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating competition: {e}")
        import traceback
        traceback.print_exc()
        
        error_msg = str(e)
        if "required" in error_msg.lower() and "drops" in error_msg.lower():
            error_msg = "Missing required Bingo grid data. Please ensure you have selected a grid size and filled all squares."
        elif "skill" in error_msg.lower() and "required" in error_msg.lower():
            error_msg = "Missing required skill selection for XP competition."
        elif "start_date" in error_msg or "end_date" in error_msg:
            error_msg = "Invalid competition dates. Dates must be at midnight UTC."
        else:
            error_msg = f"Failed to create competition: {error_msg}"
        
        raise HTTPException(status_code=400, detail=error_msg)

@api_router.put("/admin/competitions/{competition_id}")
async def update_admin_competition(
    competition_id: str,
    competition_data: dict,
    admin_info: dict = Depends(verify_admin_access)
):
    """Update an existing competition (only metadata, not participants)"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            competition = await prisma.competition.find_unique(
                where={'id': competition_id}
            )
            
            if not competition:
                raise HTTPException(status_code=404, detail="Competition not found")
            
            from datetime import timezone
            now = datetime.now(timezone.utc)
            competition_started = now >= competition.startDate
            
            update_data = {}
            if 'start_date' in competition_data:
                start_date = datetime.fromisoformat(competition_data['start_date'].replace('Z', '+00:00'))
                if not validate_midnight_utc(start_date):
                    raise HTTPException(
                        status_code=400,
                        detail="Start time must be at midnight UTC (00:00:00)"
                    )
                update_data['startDate'] = start_date
            
            if 'end_date' in competition_data:
                end_date = datetime.fromisoformat(competition_data['end_date'].replace('Z', '+00:00'))
                if not validate_midnight_utc(end_date):
                    raise HTTPException(
                        status_code=400,
                        detail="End time must be at midnight UTC (00:00:00)"
                    )
                update_data['endDate'] = end_date
            
            if not competition_started:
                if 'reward_first_gp' in competition_data:
                    update_data['rewardFirstGp'] = competition_data['reward_first_gp']
                if 'reward_second_gp' in competition_data:
                    update_data['rewardSecondGp'] = competition_data['reward_second_gp']
                if 'reward_third_gp' in competition_data:
                    update_data['rewardThirdGp'] = competition_data['reward_third_gp']
                if 'reward_badge_id' in competition_data:
                    update_data['rewardBadgeId'] = competition_data['reward_badge_id']
            
            if 'name' in competition_data:
                update_data['name'] = competition_data['name']
            if 'description' in competition_data:
                update_data['description'] = competition_data['description']
            if 'skill' in competition_data:
                update_data['skill'] = competition_data['skill']
            if 'board_size' in competition_data:
                update_data['boardSize'] = competition_data['board_size']
            if 'drops_grid' in competition_data:
                update_data['dropsGrid'] = competition_data['drops_grid']
            
            updated_competition = await prisma.competition.update(
                where={'id': competition_id},
                data=update_data
            )
            
            await log_admin_action(
                admin_id,
                admin_username,
                "update_competition",
                f"Updated competition: {updated_competition.name}",
                prisma_client=prisma,
                prisma_available=PRISMA_AVAILABLE
            )
            
            return updated_competition
        else:
            raise HTTPException(status_code=503, detail="Database not available")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating competition: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/competitions/{competition_id}")
async def delete_admin_competition(
    competition_id: str,
    admin_info: dict = Depends(verify_admin_access)
):
    """Delete a competition and all associated entries"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            competition = await prisma.competition.find_unique(
                where={'id': competition_id}
            )
            
            if not competition:
                raise HTTPException(status_code=404, detail="Competition not found")
            
            await prisma.competition.delete(
                where={'id': competition_id}
            )
            
            await log_admin_action(
                admin_id,
                admin_username,
                "delete_competition",
                f"Deleted competition: {competition.name}",
                prisma_client=prisma,
                prisma_available=PRISMA_AVAILABLE
            )
            
            return {"success": True, "message": "Competition deleted"}
        else:
            raise HTTPException(status_code=503, detail="Database not available")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting competition: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/members")
async def get_admin_members(admin_id: str = Depends(verify_admin_access)):
    """Get clan members for admin management"""
    try:
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            members = await prisma.clanmember.find_many(
                order={'username': 'asc'}
            )
            return {"members": members}
        return {"members": []}
    except Exception as e:
        print(f"Error fetching admin members: {e}")
        raise HTTPException(status_code=500, detail="Error fetching members")

@api_router.get("/admin/rank-tracking")
async def get_rank_tracking(admin_id: str = Depends(verify_admin_access)):
    """Get rank tracking data"""
    try:
        from .admin_utils import calculate_rank_needed
        
        LEADERSHIP_RANKS = ['Owner', 'Deputy Owner', 'Overseer']
        
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            members = await prisma.clanmember.find_many(
                where={'active': True},
                order={'username': 'asc'}
            )
            tracking = []
            
            for member in members:
                join_date = member.joinDate
                days_in_clan = 0
                rank_needed = "Unknown"
                
                is_leadership = member.clanRank in LEADERSHIP_RANKS
                
                if join_date:
                    join_date_naive = join_date.replace(tzinfo=None) if join_date.tzinfo else join_date
                    days_in_clan = (datetime.now() - join_date_naive).days
                    
                    if is_leadership:
                        rank_needed = member.clanRank
                    else:
                        rank_needed = calculate_rank_needed(join_date, member.clanRank)
                
                due_for_promotion = (
                    not is_leadership and
                    rank_needed != "Unknown" and 
                    rank_needed != member.clanRank and
                    days_in_clan > 0
                )
                
                tracking.append({
                    'username': member.username,
                    'actualRank': member.clanRank,
                    'rankNeeded': rank_needed,
                    'joinDate': join_date.isoformat() if join_date else None,
                    'daysInClan': days_in_clan,
                    'dueForPromotion': due_for_promotion
                })
            
            return {"tracking": tracking}
        return {"tracking": []}
    except Exception as e:
        print(f"Error fetching rank tracking: {e}")
        raise HTTPException(status_code=500, detail="Error fetching rank tracking")

@api_router.post("/admin/normalize-activities")
async def normalize_activities(request: Request):
    """Normalize all activity timestamps from milliseconds to seconds and dates to MM-DD-YYYY format"""
    await verify_admin_access(request)
    fixed_ts = 0
    fixed_date = 0
    try:
        if not prisma:
            raise HTTPException(status_code=500, detail="Prisma not initialized")
        
        rows = await prisma.clanactivity.find_many()
        for r in rows:
            ts = int(r.activityTimestamp) if r.activityTimestamp is not None else 0
            ts_norm = ts // 1000 if ts > 1000000000000 else ts
            desired_date = datetime.fromtimestamp(ts_norm).strftime('%m-%d-%Y') if ts_norm > 0 else r.activityDate
            needs_ts_fix = ts != ts_norm
            needs_date_fix = (r.activityDate or "") != desired_date
            if needs_ts_fix or needs_date_fix:
                await prisma.clanactivity.update(
                    where={"id": r.id},
                    data={
                        "activityTimestamp": ts_norm,
                        "activityDate": desired_date
                    }
                )
                if needs_ts_fix: 
                    fixed_ts += 1
                if needs_date_fix: 
                    fixed_date += 1
        return {"fixed_timestamps": fixed_ts, "fixed_dates": fixed_date, "status": "ok"}
    except Exception as e:
        print(f"Normalize error: {e}")
        raise HTTPException(status_code=500, detail=f"Normalization failed: {str(e)}")

@api_router.put("/admin/members/{username}/join-date")
async def update_member_join_date(
    username: str,
    join_date_data: dict,
    admin_info: dict = Depends(verify_admin_access)
):
    """Update member join date"""
    admin_id = admin_info['admin_id']
    admin_username = admin_info['username']
    try:
        
        if PRISMA_AVAILABLE and prisma and prisma.is_connected():
            join_date = datetime.fromisoformat(join_date_data['join_date'])
            
            member = await prisma.clanmember.update(
                where={'username': username},
                data={'joinDate': join_date}
            )
            
            await log_admin_action(
                admin_id,
                admin_username,
                "update_join_date",
                f"Updated join date for {username} to {join_date.strftime('%Y-%m-%d')}",
                prisma_client=prisma,
                prisma_available=PRISMA_AVAILABLE
            )
            
            return {"success": True, "member": member}
        
        raise HTTPException(status_code=500, detail="Database not available")
    except Exception as e:
        print(f"Error updating join date: {e}")
        raise HTTPException(status_code=500, detail="Error updating join date")
        
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


async def is_rare_drop_item(item_name: str) -> bool:
    """Check if an item is a rare drop using exact case-insensitive matching only"""
    try:
        item_lower = item_name.lower().strip()
        
        kill_indicators = ['killed', 'defeating', 'defeated', 'slain', 'kill count']
        if any(indicator in item_lower for indicator in kill_indicators):
            return False
        
        if item_lower in ITEM_TO_BOSSES_LOOKUP:
            return True
                
        return False
    except Exception as e:
        print(f"Error checking rarity for {item_name}: {e}")
        return False

async def get_boss_rare_drop_table(boss_name: str) -> list:
    """Get the complete rare drop table for a specific boss from static dataset"""
    try:
        if boss_name in BOSS_DROPS_DATASET:
            return BOSS_DROPS_DATASET[boss_name]
        
        boss_lower = boss_name.lower()
        for boss_key, items in BOSS_DROPS_DATASET.items():
            if boss_key.lower() == boss_lower:
                return items
        
        print(f"DEBUG: No drops found for '{boss_name}' in dataset")
        return []
        
    except Exception as e:
        print(f"Error fetching rare drops for {boss_name}: {e}")
        return []

async def get_item_drop_sources_from_wiki(item_name: str) -> list:
    """Get item drop sources from static dataset with exact case-insensitive matching"""
    try:
        item_lower = item_name.lower().strip()
        
        if item_lower in ITEM_TO_BOSSES_LOOKUP:
            sources = ITEM_TO_BOSSES_LOOKUP[item_lower]
            print(f"DEBUG: Found {len(sources)} drop source(s) for '{item_name}': {sources}")
            return sources
        
        print(f"DEBUG: No drop sources found for '{item_name}' in dataset")
        return []
        
    except Exception as e:
        print(f"Error fetching drop sources for {item_name}: {e}")
        return []

async def parse_and_store_drops_from_activities(activities: list, username: str):
    """Parse drops from activities and store them in database"""
    drops_found = []
    try:
        conn = await get_db_connection()
        async with conn:
            try:
                from .database import store_clan_drop
            except ImportError:
                from database import store_clan_drop
            
            for activity in activities:
                activity_text = activity['text']
                details = activity.get('details', '')
                
                # Exclude kill events and non-drop activities
                kill_indicators = ['killed', 'defeating', 'defeated', 'slain', 'kill count']
                if any(indicator in activity_text.lower() for indicator in kill_indicators):
                    continue
                
                drop_indicators = ['looted', 'found', 'received', 'obtained']
                
                text_has_drop = any(indicator in activity_text.lower() for indicator in drop_indicators)
                details_has_drop = any(indicator in details.lower() for indicator in drop_indicators)
                
                if text_has_drop or details_has_drop:
                    print(f"DEBUG: Processing activity for {username}: '{activity_text}' | Details: '{details}'")
                    
                    item_match = None
                    
                    item_match = re.search(r"I found (?:a |an )?(.+?)(?:\.|,|$)", activity_text)
                    if item_match:
                        print(f"DEBUG: Pattern 1 matched: '{item_match.group(1)}'")
                    
                    if not item_match:
                        item_match = re.search(r"I (?:looted|received|obtained) (?:a |an )?(.+?)(?:\.|,|$)", activity_text)
                        if item_match:
                            print(f"DEBUG: Pattern 2 matched: '{item_match.group(1)}'")
                    
                    if not item_match:
                        item_match = re.search(r"(?:found|looted|received|obtained) (?:a |an )?(.+?)(?:\.|,|$)", activity_text)
                        if item_match:
                            print(f"DEBUG: Pattern 3 matched: '{item_match.group(1)}'")
                    
                    if not item_match:
                        item_match = re.search(r"(?:I )?(?:found|looted|received|obtained) (?:a |an )?(.+)", activity_text)
                        if item_match:
                            print(f"DEBUG: Pattern 4 matched: '{item_match.group(1)}'")
                    
                    if item_match:
                        item_name = item_match.group(1).strip()
                        
                        item_name = re.sub(r'[.,!?]+$', '', item_name).strip()
                        
                        item_name = re.sub(r'^some\s+', '', item_name, flags=re.IGNORECASE).strip()
                        
                        print(f"DEBUG: Final item name: '{item_name}'")
                        
                        if not await is_rare_drop_item(item_name):
                            print(f"DEBUG: Skipping - '{item_name}' not in rare drop dataset")
                            continue
                        
                        drop_sources = await get_item_drop_sources_from_wiki(item_name)
                        
                        if len(drop_sources) > 0:
                            boss_name = drop_sources[0]
                        else:
                            boss_name = "Unknown"
                        
                        print(f"DEBUG: Storing drop: {item_name} (boss: {boss_name})")
                        
                        item_image_url = get_item_image_from_manifest(item_name)
                        
                        await store_clan_drop(
                            conn,
                            username,
                            item_name,
                            boss_name,
                            item_image_url or "",
                            activity_text,
                            activity['timestamp']
                        )
                        print(f"DEBUG: Successfully stored drop: {item_name}")
                        drops_found.append(item_name)
                    else:
                        print(f"DEBUG: No item match found for: '{activity_text}'")
    except Exception as e:
        print(f"Error parsing and storing drops for {username}: {e}")
    
    return drops_found



@api_router.get("/boss/{boss_name}/rare-drops")
async def get_boss_rare_drops(boss_name: str):
    """Get the rare drop table for a specific boss"""
    try:
        rare_drops = await get_boss_rare_drop_table(boss_name)
        
        items = []
        for item_name in rare_drops:
            image_url = get_item_image_from_manifest(item_name)
            
            items.append({
                "name": item_name,
                "image_url": image_url
            })
        
        return {
            "boss_name": boss_name,
            "items": items
        }
    except Exception as e:
        print(f"Error getting rare drops for {boss_name}: {e}")
        return {"boss_name": boss_name, "items": []}

@api_router.get("/bosses/all")
async def get_all_bosses():
    """Get all boss names from the static dataset"""
    try:
        return {"bosses": list(BOSS_DROPS_DATASET.keys())}
    except Exception as e:
        print(f"Error getting all bosses: {e}")
        return {"bosses": []}

@api_router.get("/clan/drops")
async def get_clan_drops(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=50)):
    """Get recent drops from all clan members"""
    try:
        if not prisma:
            raise HTTPException(status_code=500, detail="Database not available")
        
        offset = (page - 1) * limit
        
        drops = await prisma.clandrop.find_many(
            order={'activityTimestamp': 'desc'},
            skip=offset,
            take=limit
        )
        
        total_drops = await prisma.clandrop.count()
        
        formatted_drops = []
        for drop in drops:
            formatted_drops.append({
                'username': drop.username,
                'item_name': drop.itemName,
                'boss_name': drop.bossName,
                'item_image_url': drop.itemImageUrl,
                'activity_text': drop.activityText,
                'timestamp': drop.activityTimestamp,
                'date': datetime.fromtimestamp(drop.activityTimestamp / 1000).strftime('%Y-%m-%d %H:%M:%S')
            })
        
        return {
            "drops": formatted_drops,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_drops": total_drops,
                "has_next": offset + limit < total_drops
            }
        }
        
    except Exception as e:
        print(f"Error fetching clan drops: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching clan drops: {str(e)}")

@api_router.get("/player/{username}/drops")
async def get_player_drops(username: str, page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=50), reprocess: bool = Query(False)):
    """Get boss drops for a specific player from database with fallback to live parsing"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    
    import sys
    print(f"🔍 DEBUG: get_player_drops called for {decoded_username}, reprocess={reprocess}", flush=True)
    sys.stderr.write(f"🔍 STDERR: get_player_drops called for {decoded_username}, reprocess={reprocess}\n")
    sys.stderr.flush()
    
    if reprocess:
        print(f"🔍 DEBUG: Starting reprocess for {decoded_username}", flush=True)
        sys.stderr.write(f"🔍 STDERR: Starting reprocess for {decoded_username}\n")
        sys.stderr.flush()
        try:
            conn = await get_db_connection()
            async with conn:
                cursor = await conn.execute("""
                    SELECT username, text, details, activity_date, activity_timestamp
                    FROM clan_activities 
                    WHERE username = %s
                    ORDER BY activity_timestamp DESC
                """, (decoded_username,))
                
                rows = await cursor.fetchall()
                print(f"DEBUG: Found {len(rows)} activities in database for {decoded_username}")
                
                activities = [
                    {
                        'username': row[0],
                        'text': row[1],
                        'details': row[2],
                        'date': row[3],
                        'timestamp': row[4]
                    }
                    for row in rows
                ]
                
                if activities:
                    print(f"DEBUG: Calling parse_and_store_drops_from_activities with {len(activities)} activities")
                    await parse_and_store_drops_from_activities(activities, decoded_username)
                else:
                    print(f"DEBUG: No activities found for {decoded_username}")
        except Exception as e:
            print(f"Error re-processing drops for {decoded_username}: {e}")
            import traceback
            traceback.print_exc()
    
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
                                    'date': datetime.fromtimestamp(activity_timestamp).strftime('%m-%d-%Y'),
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
        conn = await get_db_connection()
        async with conn:
            try:
                from .database import get_player_drops_from_db
            except ImportError:
                from database import get_player_drops_from_db
            
            offset = (page - 1) * limit
            stored_drops = await get_player_drops_from_db(conn, decoded_username, limit * 2, offset)
        
        if stored_drops:
            paginated_drops = stored_drops[:limit]
            return {
                "drops": paginated_drops,
                "has_more": len(stored_drops) > limit,
                "total": len(stored_drops)
            }
        
        # Fallback: fetch live data and store it for future use
        all_activities = await fetch_single_player_activities(decoded_username)
        
        await parse_and_store_drops_from_activities(all_activities, decoded_username)
        
        drops = []
        for activity in all_activities:
            activity_text = activity['text']
            details = activity.get('details', '')
            
            drop_indicators = ['looted', 'found', 'received', 'obtained']
            
            if any(indicator in details.lower() for indicator in drop_indicators):
                item_match = re.search(r"I found (?:a |an )?(.+?)(?:\.|$)", activity_text)
                if not item_match:
                    item_match = re.search(r"I (?:looted|received|obtained) (?:a |an )?(.+?)(?:\.|$)", activity_text)
                
                if item_match:
                    item_name = item_match.group(1).strip()
                    
                    boss_match = (
                        re.search(r"After defeating (.+?), I (?:looted|found)", details) or
                        re.search(r"While exploring (.+?), I (?:looted|found)", details) or
                        re.search(r"(?:exploring|in|at) (?:the )?(.+?),", details)
                    )
                    
                    if boss_match:
                        boss_name = boss_match.group(1).strip()
                    else:
                        boss_name = "Misc"
                    
                    item_image_url = get_item_image_from_manifest(item_name)
                    
                    drops.append({
                        'item_name': item_name,
                        'boss_name': boss_name,
                        'timestamp': activity['timestamp'],
                        'date': activity['date'],
                        'item_image_url': item_image_url,
                        'activity_text': activity['text']
                    })
        
        drops.sort(key=lambda x: x['timestamp'], reverse=True)
        
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_drops = drops[start_idx:end_idx]
        
        return {
            "drops": paginated_drops,
            "has_more": end_idx < len(drops),
            "total": len(drops)
        }
        
    except Exception as e:
        print(f"Error fetching player drops for {decoded_username}: {e}")
        return {
            "drops": [],
            "total": 0,
            "has_more": False
        }

@api_router.post("/player/{username}/reprocess-drops")
async def reprocess_player_drops(username: str):
    """Re-process existing activities for drop detection"""
    from urllib.parse import unquote
    decoded_username = unquote(username).replace('-', ' ')
    
    try:
        conn = await get_db_connection()
        async with conn:
            cursor = await conn.execute("""
                SELECT username, text, details, activity_date, activity_timestamp
                FROM clan_activities 
                WHERE username = %s
                ORDER BY activity_timestamp DESC
            """, (decoded_username,))
            
            rows = await cursor.fetchall()
            activities = [
                {
                    'username': row[0],
                    'text': row[1],
                    'details': row[2],
                    'date': row[3],
                    'timestamp': row[4]
                }
                for row in rows
            ]
            
            if activities:
                await parse_and_store_drops_from_activities(activities, decoded_username)
                return {
                    "message": f"Re-processed {len(activities)} activities for {decoded_username}",
                    "activities_processed": len(activities)
                }
            else:
                return {"message": f"No stored activities found for {decoded_username}"}
                
    except Exception as e:
        print(f"Error re-processing drops for {decoded_username}: {e}")
        return {"error": str(e)}

@api_router.get("/player/{username}/activities")
async def get_player_activities(username: str, page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=50)):
    """Get activities for a specific player from database with fallback to live API"""
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
                                    'date': datetime.fromtimestamp(activity_timestamp).strftime('%m-%d-%Y'),
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
        conn = await get_db_connection()
        async with conn:
            try:
                from .database import get_stored_activities
            except ImportError:
                from database import get_stored_activities
            
            cursor = await conn.execute("""
                SELECT username, text, details, activity_date, activity_timestamp
                FROM clan_activities 
                WHERE username = %s
                ORDER BY activity_timestamp DESC 
                LIMIT %s OFFSET %s
            """, (decoded_username, limit, (page - 1) * limit))
            
            rows = await cursor.fetchall()
            db_activities = []
            for row in rows:
                ts = int(row[4]) if row[4] is not None else 0
                if ts > 1000000000000:
                    ts = ts // 1000
                date_str = datetime.fromtimestamp(ts).strftime('%m-%d-%Y') if ts > 0 else row[3]
                db_activities.append({
                    'username': row[0],
                    'text': row[1],
                    'details': row[2],
                    'date': date_str,
                    'timestamp': ts
                })
            
            count_cursor = await conn.execute("""
                SELECT COUNT(*) FROM clan_activities WHERE username = %s
            """, (decoded_username,))
            total_count = (await count_cursor.fetchone())[0]
            
            if db_activities:
                return {
                    "activities": db_activities,
                    "player": decoded_username,
                    "total_activities": total_count,
                    "page": page,
                    "limit": limit,
                    "has_more": (page * limit) < total_count
                }
    except Exception as db_error:
        print(f"Database error for {decoded_username}: {db_error}")
    
    # Fallback to live API if no database activities
    live_activities = await fetch_single_player_activities(decoded_username)
    
    # Store the live activities in database for future use
    if live_activities:
        try:
            conn = await get_db_connection()
            async with conn:
                try:
                    from .database import store_clan_activity
                except ImportError:
                    from database import store_clan_activity
                
                for activity in live_activities:
                    await store_clan_activity(
                        conn,
                        activity['username'],
                        activity['text'],
                        activity['details'],
                        activity['date'],
                        activity['timestamp']
                    )
                
                await parse_and_store_drops_from_activities(live_activities, decoded_username)
        except Exception as store_error:
            print(f"Error storing activities for {decoded_username}: {store_error}")
    
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_activities = live_activities[start_idx:end_idx]
    
    return {
        "activities": paginated_activities,
        "player": decoded_username,
        "total_activities": len(live_activities),
        "page": page,
        "limit": limit,
        "has_more": end_idx < len(live_activities)
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
            cached_data = profile_history_cache['data'][cache_key].copy()
            
            try:
                if PRISMA_AVAILABLE and prisma and prisma.is_connected():
                    member = await prisma.clanmember.find_unique(where={'username': decoded_username})
                    if member and member.badges:
                        import json
                        custom_badges = json.loads(member.badges) if isinstance(member.badges, str) else member.badges
                        cached_data['custom_badges'] = custom_badges
                        print(f"✅ Fetched fresh custom badges for cached response: {len(custom_badges)} badges")
                    else:
                        cached_data['custom_badges'] = []
                        print(f"⚠️ No custom badges found for {decoded_username} in database")
                else:
                    cached_data['custom_badges'] = []
                    print(f"⚠️ Prisma not available, defaulting to empty custom badges")
            except Exception as e:
                print(f"❌ Error fetching custom badges for {decoded_username} in cached path: {e}")
                cached_data['custom_badges'] = []
            
            return JSONResponse(
                content=jsonable_encoder(cached_data),
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
        
        current_stats = await fetch_player_stats(decoded_username)
        if not current_stats:
            raise HTTPException(status_code=404, detail="Player not found")
        
        print(f"[History] Live API fetched for {decoded_username} (overall xp={current_stats['stats']['overall']['xp']:,})")
        
        clan_members = await fetch_clan_members()
        clan_rank = None
        clan_xp = None
        clan_rank_number = None
        print(f"Looking for player in history endpoint: '{decoded_username}'")
        
        for member in clan_members:
            if member['username'].lower().replace('\xa0', ' ') == decoded_username.lower().replace('\xa0', ' '):
                clan_rank = member['clan_rank']
                clan_xp = member.get('total_xp', 0)
                print(f"Found clan rank in history endpoint: {clan_rank}, clan XP: {clan_xp}")
                break
        
        # Calculate numerical clan rank (position when sorted by total_xp descending)
        if clan_members and clan_xp is not None:
            sorted_members = sorted(clan_members, key=lambda m: m.get('total_xp', 0), reverse=True)
            for idx, member in enumerate(sorted_members):
                if member['username'].lower().replace('\xa0', ' ') == decoded_username.lower().replace('\xa0', ' '):
                    clan_rank_number = idx + 1  # 1-indexed rank
                    print(f"Calculated clan rank number in history endpoint: {clan_rank_number}")
                    break
        
        is_verified = False
        print(f"Checking Discord verification for username in history endpoint: '{decoded_username}'")
        try:
            if PRISMA_AVAILABLE and prisma and prisma.is_connected():
                print("Using Prisma query for Discord verification in history endpoint")
                linked_member = await prisma.clanmember.find_first(
                    where={'username': decoded_username}
                )
                print(f"Prisma result in history endpoint: {linked_member}")
                is_verified = bool(linked_member and linked_member.discordId)
                print(f"Prisma is_verified in history endpoint: {is_verified}")
            else:
                print("Falling back to direct database query for Discord verification in history endpoint")
                import asyncpg
                import os
                
                conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
                try:
                    result = await conn.fetchrow(
                        "SELECT discord_id FROM clan_members WHERE username = $1",
                        decoded_username
                    )
                    print(f"Direct query result in history endpoint: {result}")
                    is_verified = bool(result and result['discord_id'])
                    print(f"Direct query is_verified in history endpoint: {is_verified}")
                finally:
                    await conn.close()
        except Exception as e:
            print(f"Error checking Discord verification for {decoded_username} in history endpoint: {e}")
            import traceback
            traceback.print_exc()
            is_verified = False
        
        print(f"Final is_verified value for {decoded_username} in history endpoint: {is_verified}")
        
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
        if clan_xp is not None:
            enhanced_stats['clan_xp'] = clan_xp
        if clan_rank_number is not None:
            enhanced_stats['clan_rank_number'] = clan_rank_number
        
        enhanced_stats['is_verified'] = is_verified
        
        try:
            if PRISMA_AVAILABLE and prisma and prisma.is_connected():
                member = await prisma.clanmember.find_unique(where={'username': decoded_username})
                if member and member.badges:
                    import json
                    custom_badges = json.loads(member.badges) if isinstance(member.badges, str) else member.badges
                    enhanced_stats['custom_badges'] = custom_badges
                    print(f"✅ Fetched fresh custom badges for new response: {len(custom_badges)} badges")
                else:
                    enhanced_stats['custom_badges'] = []
                    print(f"⚠️ No custom badges found for {decoded_username} in database")
            else:
                enhanced_stats['custom_badges'] = []
                print(f"⚠️ Prisma not available, defaulting to empty custom badges")
        except Exception as e:
            print(f"❌ Error fetching custom badges for {decoded_username} in history endpoint: {e}")
            enhanced_stats['custom_badges'] = []
        
        if 'quest_points' in current_stats:
            enhanced_stats['quest_points'] = current_stats['quest_points']
            print(f"DEBUG: Preserved quest_points in enhanced_stats for {decoded_username}: {current_stats['quest_points']}")
        else:
            print(f"DEBUG: No quest_points found in current_stats for {decoded_username}")
        
        if 'hiscores' in current_stats:
            hiscores = current_stats['hiscores']
            if 'runescore' in hiscores:
                enhanced_stats['runescore'] = hiscores['runescore']
            if 'league_points' in hiscores:
                enhanced_stats['league_points'] = hiscores['league_points']
            if 'league_rank' in hiscores:
                enhanced_stats['league_rank'] = hiscores['league_rank']
            if 'clue_scrolls' in hiscores:
                enhanced_stats['clue_scrolls'] = hiscores['clue_scrolls']
            print(f"DEBUG: Added hiscores data to enhanced_stats for {decoded_username}")
        
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
        
        return JSONResponse(
            content=jsonable_encoder(enhanced_stats),
            headers={
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
        
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
    """GET endpoint to trigger XP snapshot collection without auth for testing"""
    try:
        print("[Trigger] XP snapshot collection triggered without auth")
        
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
                        done_count, remaining_count = await collect_daily_player_stats_multi_cycle()
                        print(f"[Manual Trigger] XP snapshot collection completed: {done_count} processed, {remaining_count} remaining")
                else:
                    done_count, remaining_count = await collect_daily_player_stats_multi_cycle()
                    print(f"[Manual Trigger] XP snapshot collection completed: {done_count} processed, {remaining_count} remaining")
            except Exception as e:
                print(f"❌ [Manual Trigger] Error in XP snapshot collection: {e}")
                import traceback
                traceback.print_exc()
        
        asyncio.create_task(run())
        return {"status": "queued", 
                "message": "Started XP snapshot collection (multi-cycle processing for all clan members). Check /api/admin/check-snapshots."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/trigger-activities")
async def trigger_activities_get():
    """GET endpoint to trigger activity/drop collection without auth for testing"""
    try:
        print("[Trigger] Activity/drop collection triggered without auth")
        
        lock = getattr(app.state, "snapshot_lock", None)
        if lock and lock.locked():
            print("[Manual Trigger] Another collection run is in progress; skipping.")
            return {"status": "skipped", 
                    "message": "Another collection is already in progress. Check /api/admin/check-snapshots."}
        
        async def run():
            try:
                try:
                    from .database import collect_daily_activities_and_drops
                except ImportError:
                    from database import collect_daily_activities_and_drops
                
                if lock:
                    async with lock:
                        processed, failed = await collect_daily_activities_and_drops()
                        print(f"[Manual Trigger] Activity/drop collection completed: {processed} processed, {failed} failed")
                else:
                    processed, failed = await collect_daily_activities_and_drops()
                    print(f"[Manual Trigger] Activity/drop collection completed: {processed} processed, {failed} failed")
            except Exception as e:
                print(f"❌ [Manual Trigger] Error in activity/drop collection: {e}")
                import traceback
                traceback.print_exc()
        
        asyncio.create_task(run())
        return {"status": "queued", 
                "message": "Started activity/drop collection for all members (batch processing: 8 members per cycle). Check logs for progress."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/trigger-clan-members")
async def trigger_clan_members_get(debug: bool = False):
    """GET endpoint to trigger comprehensive clan member sync with join/name change detection"""
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
        
        print("🔄 Manual trigger: Starting fast clan member sync...")
        
        await daily_clan_member_refresh()
        
        clan_members_cache.clear()
        print("🧹 Cleared clan members cache after manual sync")
        
        final_count = await prisma.clanmember.count()
        
        return {
            "status": "success",
            "message": "Fast sync completed (comprehensive sync runs hourly automatically)",
            "total_in_db": final_count
        }
            
    except Exception as e:
        print(f"❌ Manual trigger error: {e}")
        return {
            "status": "error",
            "message": str(e),
            "members_fetched": 0,
            "members_updated": 0
        }
@app.get("/api/admin/repopulate-members")
async def repopulate_clan_members():
    """Repopulate the clan_members table from RuneScape API"""
    try:
        print("🔄 Starting clan members repopulation...")
        await sync_clan_members_to_database_with_queue()
        
        member_count = await prisma.clanmember.count()
        print(f"✅ Repopulation complete! {member_count} members in database")
        
        return {
            "status": "success",
            "message": f"Successfully repopulated clan_members table with {member_count} members",
            "member_count": member_count
        }
    except Exception as e:
        print(f"❌ Error during repopulation: {e}")
        return {
            "status": "error", 
            "message": f"Failed to repopulate clan_members table: {str(e)}"
        }
async def _run_repopulation_background():
    """Background task to repopulate drops without blocking HTTP response"""
    try:
        print("=" * 80)
        print("🔄 [BACKGROUND] Starting drops repopulation with exact matching logic...")
        print("=" * 80)
        
        conn = await get_db_connection()
        async with conn:
            count_cursor = await conn.execute("SELECT COUNT(*) FROM clan_drops")
            count_result = await count_cursor.fetchone()
            before_count = count_result[0] if count_result else 0
            print(f"📊 [BACKGROUND] Current drops in database: {before_count}")
            
            await conn.execute("DELETE FROM clan_drops")
            print("🗑️  [BACKGROUND] Cleared clan_drops table")
            
            activities_cursor = await conn.execute("""
                SELECT username, text, details, activity_date, activity_timestamp
                FROM clan_activities
                ORDER BY activity_timestamp DESC
            """)
            
            all_activities = await activities_cursor.fetchall()
            print(f"📋 [BACKGROUND] Found {len(all_activities)} total activities to parse")
            
            username_activities = {}
            for row in all_activities:
                username = row[0]
                if username not in username_activities:
                    username_activities[username] = []
                
                username_activities[username].append({
                    'username': username,
                    'text': row[1],
                    'details': row[2] or '',
                    'date': row[3],
                    'timestamp': row[4]
                })
            
            print(f"👥 [BACKGROUND] Processing activities for {len(username_activities)} members")
            print("-" * 80)
            
            total_drops_found = 0
            processed = 0
            for username, activities in username_activities.items():
                processed += 1
                drops = await parse_and_store_drops_from_activities(activities, username)
                total_drops_found += len(drops)
                if drops:
                    print(f"  ✅ [BACKGROUND] {username}: Found {len(drops)} drops")
                
                if processed % 10 == 0:
                    print(f"📈 [BACKGROUND] Progress: {processed}/{len(username_activities)} members, {total_drops_found} drops so far")
            
            print("-" * 80)
            print(f"✅ [BACKGROUND] Repopulation complete: {total_drops_found} total drops stored")
            print(f"📊 [BACKGROUND] Before count: {before_count}, After count: {total_drops_found}")
            print("=" * 80)
            
    except Exception as e:
        print(f"❌ [BACKGROUND] Error during drops repopulation: {e}")
        import traceback
        traceback.print_exc()

@app.get("/api/admin/repopulate-drops")
async def repopulate_drops():
    """Repopulate clan_drops table by re-parsing all historical activity logs with exact matching"""
    try:
        print("🔄 Triggering background repopulation task...")
        
        conn = await get_db_connection()
        async with conn:
            count_cursor = await conn.execute("SELECT COUNT(*) FROM clan_drops")
            count_result = await count_cursor.fetchone()
            before_count = count_result[0] if count_result else 0
            
            activities_count_cursor = await conn.execute("SELECT COUNT(*) FROM clan_activities")
            activities_result = await activities_count_cursor.fetchone()
            activities_count = activities_result[0] if activities_result else 0
            
            members_count_cursor = await conn.execute("SELECT COUNT(DISTINCT username) FROM clan_activities")
            members_result = await members_count_cursor.fetchone()
            members_count = members_result[0] if members_result else 0
        
        asyncio.create_task(_run_repopulation_background())
        
        print("✅ Background repopulation task started")
        
        return {
            "status": "started",
            "message": "Repopulation started in background. Check server logs for progress.",
            "before_count": before_count,
            "members_to_process": members_count,
            "activities_to_scan": activities_count,
            "note": "This process may take several minutes. Check Fly.io logs with: flyctl logs --app stormlight"
        }
            
    except Exception as e:
        print(f"❌ Error triggering drops repopulation: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "message": f"Failed to trigger repopulation: {str(e)}"
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
                            # Already correctly split into update/create data to preserve discord_id
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
            
            last_sync_hour = None
            
            while True:
                try:
                    from datetime import timezone
                    now = datetime.now(timezone.utc)
                    today = now.date()
                    current_hour = now.hour
                    has_run_today = (getattr(app.state, "last_snapshot_date_utc", None) == today)
                    
                    if last_sync_hour != current_hour:
                        print(f"🔄 [Scheduler][HOURLY] Starting clan member sync at {now.isoformat()}Z")
                        
                        async with app.state.sync_lock:
                            await sync_clan_members_to_database_with_queue()
                        print(f"✅ [Scheduler][HOURLY] Clan member sync completed at {datetime.now(timezone.utc).isoformat()}Z")
                        
                        if current_hour == 0 and not has_run_today:
                            print(f"🚀 [Scheduler][DAILY] Starting daily snapshot collection at {now.isoformat()}Z")
                            
                            async def run_daily_snapshots():
                                try:
                                    async with app.state.snapshot_lock:
                                        done_count, remaining_count = await collect_daily_player_stats_multi_cycle()
                                    app.state.last_snapshot_date_utc = today
                                    completion_time = datetime.now(timezone.utc).isoformat()
                                    print(f"✅ [Scheduler][DAILY] Snapshot collection completed at {completion_time}Z: {done_count} processed, {remaining_count} remaining")
                                except Exception as e:
                                    print(f"❌ [Scheduler][DAILY] Error in snapshot collection: {e}")
                                    import traceback
                                    traceback.print_exc()
                            
                            asyncio.create_task(run_daily_snapshots())
                            print(f"📋 [Scheduler][DAILY] Snapshot collection task created (running in background)")
                        elif current_hour == 0:
                            print(f"⏭️  [Scheduler][DAILY] Snapshot already ran today ({today.isoformat()}), skipping")
                        
                        print(f"🚀 [Scheduler][HOURLY] Starting activity/drop collection at {now.isoformat()}Z")
                        try:
                            processed_count, failed_count = await collect_daily_activities_and_drops()
                            completion_time = datetime.now(timezone.utc).isoformat()
                            print(f"✅ [Scheduler][HOURLY] Activity/drop collection completed at {completion_time}Z: {processed_count} processed, {failed_count} failed")
                            
                            conn = await get_db_connection()
                            async with conn:
                                activity_count = await conn.fetchval("SELECT COUNT(*) FROM clan_activities")
                                drop_count = await conn.fetchval("SELECT COUNT(*) FROM clan_drops") 
                                print(f"📊 [Scheduler][HOURLY] Database totals: {activity_count} activities, {drop_count} drops")
                        except Exception as e:
                            print(f"❌ [Scheduler][HOURLY] Error in activity/drop collection: {e}")
                            import traceback
                            traceback.print_exc()
                        
                        try:
                            conn = await get_db_connection()
                            async with conn:
                                try:
                                    from .database import cleanup_old_activities
                                except ImportError:
                                    from database import cleanup_old_activities
                                await cleanup_old_activities(conn, days_to_keep=30)
                        except Exception as e:
                            print(f"❌ [Scheduler][HOURLY] Error cleaning up activities: {e}")
                        
                        last_sync_hour = current_hour
                        print(f"✅ [Scheduler][HOURLY] All hourly tasks completed for hour {current_hour}. Next run: {(current_hour + 1) % 24}:00 UTC")
                    
                except Exception as e:
                    print(f"❌ [Scheduler] Critical error in hourly scheduler: {e}")
                    import traceback
                    traceback.print_exc()
                    
                await asyncio.sleep(300)
        
        asyncio.create_task(hourly_scheduler())
        
    except Exception as e:
        print(f"Error during startup: {e}")
        import traceback
        traceback.print_exc()

@app.get("/api/player/{username}/recent-progress")
async def get_player_recent_progress(username: str):
    """Get player's recent XP progress over 24h, 7d, and 30d"""
    try:
        from urllib.parse import unquote
        from datetime import datetime, timedelta, timezone
        
        try:
            from .database import get_db_connection
        except ImportError:
            from database import get_db_connection
        
        decoded_username = unquote(username).replace('-', ' ')
        
        conn = await get_db_connection()
        async with conn:
            now = datetime.now(timezone.utc).date()
            
            cursor = await conn.execute("""
                SELECT username, snapshot_date, total_xp
                FROM player_daily_snapshots
                WHERE username = %s
                ORDER BY snapshot_date DESC
                LIMIT 1
            """, (decoded_username,))
            latest_snapshot = await cursor.fetchone()
            
            if not latest_snapshot or not latest_snapshot[2]:
                return {
                    'username': decoded_username,
                    'xp_30d': 0,
                    'xp_24h': 0,
                    'xp_7d': 0,
                    'sparkline': []
                }
            
            current_xp = latest_snapshot[2]
            latest_date = latest_snapshot[1]
            
            cursor = await conn.execute("""
                SELECT snapshot_date, total_xp
                FROM player_daily_snapshots
                WHERE username = %s AND snapshot_date >= %s
                ORDER BY snapshot_date ASC
            """, (decoded_username, latest_date - timedelta(days=30)))
            snapshots_30d = await cursor.fetchall()
            
            sparkline = []
            prev_xp = None
            for snap in snapshots_30d:
                if prev_xp is not None and snap[1]:
                    xp_gained = int(snap[1] - prev_xp) if snap[1] > prev_xp else 0
                    sparkline.append({
                        'date': snap[0].isoformat(),
                        'xp': xp_gained
                    })
                elif prev_xp is None and snap[1]:
                    sparkline.append({
                        'date': snap[0].isoformat(),
                        'xp': 0
                    })
                prev_xp = snap[1] if snap[1] else prev_xp
            
            xp_24h = sum(item['xp'] for item in sparkline[-1:]) if len(sparkline) >= 1 else 0
            xp_7d = sum(item['xp'] for item in sparkline[-7:]) if len(sparkline) >= 7 else sum(item['xp'] for item in sparkline)
            xp_30d = sum(item['xp'] for item in sparkline)
            
            return {
                'username': decoded_username,
                'xp_30d': int(xp_30d),
                'xp_24h': int(xp_24h),
                'xp_7d': int(xp_7d),
                'sparkline': sparkline
            }
        
    except Exception as e:
        print(f"Error fetching recent progress for {username}: {e}")
        import traceback
        traceback.print_exc()
        return {
            'username': username,
            'xp_30d': 0,
            'xp_24h': 0,
            'xp_7d': 0,
            'sparkline': []
        }

@app.get("/api/members/active-today")
async def get_members_active_today():
    """Get active clan members who gained XP in the last 24 hours"""
    try:
        from datetime import datetime, timedelta, timezone
        
        try:
            from .database import get_db_connection
        except ImportError:
            from database import get_db_connection
        
        conn = await get_db_connection()
        async with conn:
            now = datetime.now(timezone.utc).date()
            date_24h_ago = now - timedelta(days=1)
            
            cursor = await conn.execute("""
                SELECT username FROM clan_members WHERE active = TRUE
            """)
            active_clan_members = {row[0] for row in await cursor.fetchall()}
            
            cursor = await conn.execute("""
                SELECT username, snapshot_date, total_xp
                FROM player_daily_snapshots
                WHERE snapshot_date >= %s
                ORDER BY username, snapshot_date DESC
            """, (date_24h_ago,))
            all_snapshots = await cursor.fetchall()
            
            latest_by_user = {}
            previous_by_user = {}
            
            for snap in all_snapshots:
                username = snap[0]
                if username not in active_clan_members:
                    continue
                    
                if username not in latest_by_user:
                    latest_by_user[username] = snap
                elif username not in previous_by_user:
                    previous_by_user[username] = snap
            
            active_members = []
            for username, latest_snap in latest_by_user.items():
                if latest_snap[2]:
                    previous_snap = previous_by_user.get(username)
                    if previous_snap and previous_snap[2]:
                        xp_gained = latest_snap[2] - previous_snap[2]
                        if xp_gained > 0:
                            active_members.append({
                                'username': username,
                                'xp_gained': int(xp_gained)
                            })
            
            active_members.sort(key=lambda x: x['xp_gained'], reverse=True)
            top_5 = active_members[:5]
            
            return {
                'active_members': top_5,
                'total_active': len(active_members)
            }
        
    except Exception as e:
        print(f"Error fetching active members: {e}")
        import traceback
        traceback.print_exc()
        return {"active_members": [], "total_active": 0}

app.include_router(api_router)

app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """Serve React app for all non-API routes"""
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    
    static_file_path = f"static/{full_path}"
    if os.path.exists(static_file_path) and os.path.isfile(static_file_path):
        return FileResponse(static_file_path)
    
    response = FileResponse("static/index.html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

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
