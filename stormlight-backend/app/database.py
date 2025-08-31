import psycopg
import os
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List

DATABASE_URL = os.getenv("DATABASE_URL")

async def get_db_connection():
    """Get database connection"""
    if not DATABASE_URL:
        raise Exception("DATABASE_URL environment variable not set")
    return await psycopg.AsyncConnection.connect(DATABASE_URL)

async def init_database():
    """Initialize database schema"""
    try:
        conn = await get_db_connection()
        async with conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS player_stats_history (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    skill_name VARCHAR(50) NOT NULL,
                    level INTEGER NOT NULL,
                    xp BIGINT NOT NULL,
                    rank INTEGER,
                    combat_level INTEGER,
                    snapshot_date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(username, skill_name, snapshot_date)
                );
                
                CREATE TABLE IF NOT EXISTS player_stat_changes (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    skill_name VARCHAR(50) NOT NULL,
                    date DATE NOT NULL,
                    level_change INTEGER DEFAULT 0,
                    xp_change BIGINT DEFAULT 0,
                    rank_change INTEGER DEFAULT 0,
                    xp_today BIGINT DEFAULT 0,
                    xp_yesterday BIGINT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(username, skill_name, date)
                );
                
                CREATE INDEX IF NOT EXISTS idx_player_stats_username_date ON player_stats_history(username, snapshot_date);
                CREATE INDEX IF NOT EXISTS idx_player_changes_username_date ON player_stat_changes(username, date);
            """)
            print("Database schema initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("Historical tracking will be disabled")

async def collect_daily_player_stats():
    """Collect daily snapshots of all clan member stats"""
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        
        try:
            from .main import fetch_clan_members, fetch_player_stats
        except ImportError:
            from main import fetch_clan_members, fetch_player_stats
        import asyncio
        
        members = await fetch_clan_members()
        today = date.today()
        
        conn = await get_db_connection()
        async with conn:
            for member in members:
                username = member['name']
                stats_data = await fetch_player_stats(username)
                
                if stats_data and 'stats' in stats_data:
                    stats = stats_data['stats']
                    
                    for skill_name, skill_data in stats.items():
                        combat_level = stats.get('overall', {}).get('combatlevel', 0) if skill_name == 'overall' else 0
                        await conn.execute("""
                            INSERT INTO player_stats_history 
                            (username, skill_name, level, xp, rank, combat_level, snapshot_date)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (username, skill_name, snapshot_date) 
                            DO UPDATE SET level = EXCLUDED.level, xp = EXCLUDED.xp, rank = EXCLUDED.rank
                        """, (
                            username, skill_name, skill_data['level'], skill_data['xp'], 
                            skill_data.get('rank'), combat_level, today
                        ))
                    
                    await calculate_daily_changes(conn, username, today)
                
                await asyncio.sleep(2)
                
    except Exception as e:
        print(f"Error in daily stats collection: {e}")

def get_date_for_period(period: str, reference_date: date = None) -> date:
    """Calculate date for a given time period"""
    if reference_date is None:
        reference_date = date.today()
    
    period_map = {
        'today': reference_date,
        'yesterday': reference_date - timedelta(days=1),
        'week': reference_date - timedelta(days=7),
        'month': reference_date - timedelta(days=30),
        'year': reference_date - timedelta(days=365),
        'last_week': reference_date - timedelta(days=14),
        'last_month': reference_date - timedelta(days=60),
        'last_year': reference_date - timedelta(days=730)
    }
    
    return period_map.get(period.lower(), reference_date)

async def get_player_stats_for_periods(conn, username: str, period1: str, period2: str):
    """Get player stats comparison between two time periods"""
    date1 = get_date_for_period(period1)
    date2 = get_date_for_period(period2)
    
    period1_cursor = await conn.execute("""
        SELECT skill_name, level, xp, rank FROM player_stats_history 
        WHERE username = %s AND snapshot_date = %s
    """, (username, date1))
    
    period2_cursor = await conn.execute("""
        SELECT skill_name, level, xp, rank FROM player_stats_history 
        WHERE username = %s AND snapshot_date = %s
    """, (username, date2))
    
    period1_rows = await period1_cursor.fetchall()
    period2_rows = await period2_cursor.fetchall()
    
    period1_dict = {row[0]: row for row in period1_rows}
    period2_dict = {row[0]: row for row in period2_rows}
    
    changes_data = {}
    
    all_skills = set(period1_dict.keys()) | set(period2_dict.keys())
    
    for skill_name in all_skills:
        period1_data = period1_dict.get(skill_name)
        period2_data = period2_dict.get(skill_name)
        
        if period1_data and period2_data:
            level_change = period1_data[1] - period2_data[1]
            xp_change = period1_data[2] - period2_data[2]
            rank_change = (period2_data[3] or 0) - (period1_data[3] or 0)
            
            changes_data[skill_name] = {
                'level_change': level_change,
                'xp_change': xp_change,
                'rank_change': rank_change,
                'xp_period1': period1_data[2],
                'xp_period2': period2_data[2]
            }
        elif period1_data:
            changes_data[skill_name] = {
                'level_change': 0,
                'xp_change': 0,
                'rank_change': 0,
                'xp_period1': period1_data[2],
                'xp_period2': period1_data[2]
            }
    
    return changes_data

async def calculate_daily_changes(conn, username: str, today: date):
    """Calculate daily changes for a player"""
    yesterday = today - timedelta(days=1)
    
    today_cursor = await conn.execute("""
        SELECT skill_name, level, xp, rank FROM player_stats_history 
        WHERE username = %s AND snapshot_date = %s
    """, (username, today))
    
    yesterday_cursor = await conn.execute("""
        SELECT skill_name, level, xp, rank FROM player_stats_history 
        WHERE username = %s AND snapshot_date = %s
    """, (username, yesterday))
    
    today_rows = await today_cursor.fetchall()
    yesterday_rows = await yesterday_cursor.fetchall()
    yesterday_dict = {row[0]: row for row in yesterday_rows}
    
    for today_row in today_rows:
        skill_name = today_row[0]
        yesterday_row = yesterday_dict.get(skill_name)
        
        if yesterday_row:
            level_change = today_row[1] - yesterday_row[1]
            xp_change = today_row[2] - yesterday_row[2]
            rank_change = (yesterday_row[3] or 0) - (today_row[3] or 0)
            
            await conn.execute("""
                INSERT INTO player_stat_changes 
                (username, skill_name, date, level_change, xp_change, rank_change, xp_today, xp_yesterday)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (username, skill_name, date) 
                DO UPDATE SET level_change = EXCLUDED.level_change, xp_change = EXCLUDED.xp_change, rank_change = EXCLUDED.rank_change
            """, (username, skill_name, today, level_change, xp_change, rank_change, today_row[2], yesterday_row[2]))
