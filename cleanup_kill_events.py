import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def cleanup_kill_events():
    """Remove kill events that were incorrectly stored as drops"""
    try:
        database_url = "postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres"
        conn = await asyncpg.connect(database_url)
        
        kill_patterns = ['killed', 'defeating', 'defeated', 'slain']
        
        total_deleted = 0
        for pattern in kill_patterns:
            result = await conn.execute(
                "DELETE FROM clan_drops WHERE item_name ILIKE $1",
                f'%{pattern}%'
            )
            deleted_count = int(result.split()[-1]) if result.split()[-1].isdigit() else 0
            total_deleted += deleted_count
            print(f"Deleted {deleted_count} entries containing '{pattern}'")
        
        common_patterns = ['Large amount of coins', 'coins obtained', 'gp obtained']
        for pattern in common_patterns:
            result = await conn.execute(
                "DELETE FROM clan_drops WHERE item_name ILIKE $1",
                f'%{pattern}%'
            )
            deleted_count = int(result.split()[-1]) if result.split()[-1].isdigit() else 0
            total_deleted += deleted_count
            print(f"Deleted {deleted_count} entries containing '{pattern}'")
        
        await conn.close()
        print(f"✅ Cleanup completed - Total deleted: {total_deleted}")
        
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")

if __name__ == "__main__":
    asyncio.run(cleanup_kill_events())
