from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg
import httpx
import os
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
import jwt
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware
import asyncio

load_dotenv()

app = FastAPI(title="Stormlight Clan API", version="1.0.0")

app.add_middleware(SessionMiddleware, secret_key=os.getenv("JWT_SECRET_KEY", "fallback-secret"))

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

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
competitions_db = {}
player_stats_cache = {}
discovered_players_db = {}

SKILL_TABLE_MAPPING = {
    'overall': 0, 'attack': 1, 'defence': 2, 'strength': 3, 'constitution': 4,
    'ranged': 5, 'prayer': 6, 'magic': 7, 'cooking': 8, 'woodcutting': 9,
    'fletching': 10, 'fishing': 11, 'firemaking': 12, 'crafting': 13, 'smithing': 14,
    'mining': 15, 'herblore': 16, 'agility': 17, 'thieving': 18, 'slayer': 19,
    'farming': 20, 'runecrafting': 21, 'hunter': 22, 'construction': 23, 'summoning': 24,
    'dungeoneering': 25, 'divination': 26, 'invention': 27, 'archaeology': 28, 'necromancy': 29
}

RUNEMETRICS_SKILL_MAPPING = {
    0: 'attack', 1: 'defence', 2: 'strength', 3: 'constitution', 4: 'ranged', 5: 'prayer',
    6: 'magic', 7: 'cooking', 8: 'woodcutting', 9: 'fletching', 10: 'fishing', 11: 'firemaking',
    12: 'crafting', 13: 'smithing', 14: 'mining', 15: 'herblore', 16: 'agility', 17: 'thieving',
    18: 'slayer', 19: 'farming', 20: 'runecrafting', 21: 'hunter', 22: 'construction', 23: 'summoning',
    24: 'dungeoneering', 25: 'divination', 26: 'invention', 27: 'archaeology', 28: 'necromancy'
}

async def fetch_player_stats(username: str) -> Optional[Dict[str, Any]]:
    """Fetch player stats from RuneScape Runemetrics API"""
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
                
                stats['overall'] = {
                    'rank': int(data.get('rank', '0').replace(',', '')) if data.get('rank') and data.get('rank') != '0' else None,
                    'level': data.get('totalskill', 0),
                    'xp': data.get('totalxp', 0)
                }
                
                for skill_data in data.get('skillvalues', []):
                    skill_id = skill_data.get('id')
                    skill_name = RUNEMETRICS_SKILL_MAPPING.get(skill_id)
                    
                    if skill_name:
                        stats[skill_name] = {
                            'rank': skill_data.get('rank'),
                            'level': skill_data.get('level', 1),
                            'xp': skill_data.get('xp', 0)
                        }
                
                all_skills = ['overall'] + list(RUNEMETRICS_SKILL_MAPPING.values())
                for skill_name in all_skills:
                    if skill_name not in stats:
                        stats[skill_name] = {
                            'rank': None,
                            'level': 1,
                            'xp': 0
                        }
                
                player_stats_cache[username.lower()] = {
                    'stats': stats,
                    'last_updated': datetime.now(),
                    'username': data.get('name', username)
                }
                
                return player_stats_cache[username.lower()]
            elif response.status_code == 404:
                print(f"Player {username} not found or has private profile")
                return None
            else:
                print(f"Runemetrics API error for {username}: {response.status_code}")
                return None
                
    except Exception as e:
        print(f"Error fetching stats for {username}: {e}")
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
                        discovered_players_db[username.lower()] = {
                            'username': username,
                            'discovered_at': datetime.now(),
                            'source': 'ranking_api'
                        }
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
        secret_key = os.getenv("JWT_SECRET_KEY", "fallback-secret")
        algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        payload = jwt.decode(credentials.credentials, secret_key, algorithms=[algorithm])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return str(user_id)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/api/auth/discord")
async def discord_login():
    """Initiate Discord OAuth login"""
    redirect_uri = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:3000/auth/callback")
    return {
        "auth_url": f"https://discord.com/api/oauth2/authorize?client_id={os.getenv('DISCORD_CLIENT_ID')}&redirect_uri={redirect_uri}&response_type=code&scope=identify%20email"
    }

@app.post("/api/auth/callback")
async def discord_callback(code: str):
    """Handle Discord OAuth callback"""
    try:
        async with httpx.AsyncClient() as client:
            token_data = {
                'client_id': os.getenv('DISCORD_CLIENT_ID'),
                'client_secret': os.getenv('DISCORD_CLIENT_SECRET'),
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': os.getenv('DISCORD_REDIRECT_URI'),
            }
            
            token_response = await client.post(
                'https://discord.com/api/oauth2/token',
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            
            if token_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get access token")
            
            token_json = token_response.json()
            access_token = token_json['access_token']
            
            user_response = await client.get(
                'https://discord.com/api/users/@me',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            
            if user_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get user info")
            
            user_data = user_response.json()
            
            user_id = user_data['id']
            users_db[user_id] = {
                'id': user_id,
                'username': user_data['username'],
                'discriminator': user_data.get('discriminator', '0'),
                'email': user_data.get('email'),
                'avatar': user_data.get('avatar'),
                'created_at': datetime.now()
            }
            
            jwt_token = create_access_token({"sub": user_id})
            
            return {
                "access_token": jwt_token,
                "token_type": "bearer",
                "user": users_db[user_id]
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@app.get("/api/user/me")
async def get_current_user(user_id: str = Depends(verify_token)):
    """Get current user info"""
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    return users_db[user_id]


@app.get("/api/player/{username}/stats")
async def get_player_stats(username: str):
    """Get player stats from RuneScape API with clan rank if available"""
    from urllib.parse import unquote
    decoded_username = unquote(username)
    
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
        return stats
    
    if clan_rank:
        return {
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
            discovered_players_db[search.lower()] = {
                'username': search,
                'discovered_at': datetime.now(),
                'source': 'search'
            }
    else:
        top_players = await fetch_top_players(skill, 50)
        
        discovered_with_stats = []
        for username_key, player_info in discovered_players_db.items():
            if username_key not in [p['username'].lower() for p in top_players]:
                stats = await fetch_player_stats(player_info['username'])
                if stats and skill in stats['stats']:
                    discovered_with_stats.append(stats)
        
        all_players = top_players + discovered_with_stats
        all_players.sort(key=lambda x: x['stats'].get(skill, {}).get('xp', 0), reverse=True)
        
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        players = all_players[start_idx:end_idx]
    
    return {
        "hiscores": players,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_players": len(discovered_players_db) + 50,
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
    
    members = await fetch_clan_members()
    
    if search:
        search_lower = search.lower()
        members = [m for m in members if search_lower in m['username'].lower()]
    
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
            clan_data_text = response.text
        
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
                        member_clan_rank = parts[1].strip()  # This is the clanRank variable
                        member_xp = int(parts[2])  # Total XP is 3rd column
                        
                        total_xp += member_xp
                        member_count += 1
                        
                        if highest_rank_member is None or get_rank_priority(member_clan_rank) < get_rank_priority(highest_rank_member):
                            highest_rank_member = member_clan_rank
                            
                        print(f"Member: {member_name}, Rank: {member_clan_rank}, XP: {member_xp}")  # Debug logging
                    except (ValueError, IndexError) as e:
                        print(f"Error parsing line '{line}': {e}")
                        continue
        
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
    page: int = 1,
    limit: int = 10
):
    """Get recent activities from all clan members with pagination"""
    print(f"Starting get_clan_activities with page={page}, limit={limit}")
    try:
        print("Fetching clan members...")
        members = await fetch_clan_members()
        print(f"Found {len(members)} clan members")
        all_activities = []
        
        batch_size = 20  # Process 20 members at a time
        
        async def fetch_member_activities(member, client):
            """Fetch activities for a single member"""
            try:
                runemetrics_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={member['username']}&activities=1"
                print(f"Fetching activities for {member['username']}")
                response = await client.get(runemetrics_url)
                
                if response.status_code == 200:
                    data = response.json()
                    activities = data.get('activities', [])
                    print(f"Found {len(activities)} activities for {member['username']}")
                    
                    member_activities = []
                    twelve_weeks_ago = datetime.now().timestamp() - (12 * 7 * 24 * 60 * 60)
                    
                    for activity in activities:
                        try:
                            activity_date = datetime.strptime(activity['date'], '%d-%b-%Y %H:%M')
                            activity_timestamp = activity_date.timestamp()
                            
                            if activity_timestamp >= twelve_weeks_ago:
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
                else:
                    print(f"Failed to fetch activities for {member['username']}: {response.status_code}")
                    return []
                    
            except Exception as e:
                print(f"Error fetching activities for {member['username']}: {e}")
                return []
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for i in range(0, len(members), batch_size):
                batch = members[i:i + batch_size]
                print(f"Processing batch {i//batch_size + 1}/{(len(members) + batch_size - 1)//batch_size} ({len(batch)} members)")
                
                batch_tasks = [fetch_member_activities(member, client) for member in batch]
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                for result in batch_results:
                    if isinstance(result, list):
                        all_activities.extend(result)
                    else:
                        print(f"Error in batch processing: {result}")
                
                if i + batch_size < len(members):
                    await asyncio.sleep(0.2)
        
        print(f"Total activities collected: {len(all_activities)}")
        all_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_activities = all_activities[start_idx:end_idx]
        
        print(f"Returning {len(paginated_activities)} activities for page {page}")
        return {
            "activities": paginated_activities,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_activities": len(all_activities),
                "has_next": end_idx < len(all_activities)
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
                "limit": limit,
                "total_activities": 0,
                "has_next": False
            }
        }
