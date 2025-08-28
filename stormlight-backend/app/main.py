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

async def fetch_player_stats(username: str) -> Optional[Dict[str, Any]]:
    """Fetch player stats from RuneScape Hiscores API"""
    try:
        async with httpx.AsyncClient() as client:
            hiscores_url = f"{os.getenv('RUNESCAPE_API_BASE')}/m=hiscore/index_lite.ws?player={username}"
            response = await client.get(hiscores_url)
            
            if response.status_code == 200:
                lines = response.text.strip().split('\n')
                
                if len(lines) < 27:
                    print(f"Incomplete data for {username}: only {len(lines)} lines")
                    return None
                
                stats = {}
                
                skills = [
                    'overall', 'attack', 'defence', 'strength', 'constitution', 'ranged', 'prayer',
                    'magic', 'cooking', 'woodcutting', 'fletching', 'fishing', 'firemaking',
                    'crafting', 'smithing', 'mining', 'herblore', 'agility', 'thieving',
                    'slayer', 'farming', 'runecrafting', 'hunter', 'construction', 'summoning',
                    'dungeoneering', 'divination', 'invention'
                ]
                
                for i, skill in enumerate(skills):
                    if i < len(lines):
                        parts = lines[i].split(',')
                        if len(parts) >= 3:
                            stats[skill] = {
                                'rank': int(parts[0]) if parts[0] != '-1' else None,
                                'level': int(parts[1]) if parts[1] != '-1' else 1,
                                'xp': int(parts[2]) if parts[2] != '-1' else 0
                            }
                
                player_stats_cache[username.lower()] = {
                    'stats': stats,
                    'last_updated': datetime.now(),
                    'username': username
                }
                
                return player_stats_cache[username.lower()]
            elif response.status_code == 404:
                print(f"Player {username} not found or has private profile")
                return None
            else:
                print(f"API error for {username}: {response.status_code}")
                return None
                
    except Exception as e:
        print(f"Error fetching stats for {username}: {e}")
        return None

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

@app.get("/api/clan/members")
async def get_clan_members_endpoint():
    """Get list of clan members"""
    members = await get_clan_members()
    return {"members": members, "clan_name": os.getenv("CLAN_NAME", "Stormlight")}

@app.get("/api/player/{username}/stats")
async def get_player_stats(username: str):
    """Get player stats from RuneScape API"""
    stats = await fetch_player_stats(username)
    if not stats:
        raise HTTPException(status_code=404, detail="Player not found or stats unavailable")
    return stats

@app.get("/api/hiscores")
async def get_clan_hiscores():
    """Get clan hiscores"""
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
