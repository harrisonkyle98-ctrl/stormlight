#!/usr/bin/env python3
import sys
import os
import asyncio
sys.path.append('/home/ubuntu/stormlight/stormlight-backend')

async def check_clan_log_duplicates():
    """Check for duplicate clan log entries"""
    try:
        from app.database import get_db_connection
        
        conn = await get_db_connection()
        async with conn:
            cur = await conn.execute("""
                WITH dupes AS (
                  SELECT username, event_type, old_rank, new_rank, 
                         DATE_TRUNC('minute', timestamp) as minute_bucket,
                         COUNT(*) as count
                  FROM clan_log
                  GROUP BY username, event_type, old_rank, new_rank, DATE_TRUNC('minute', timestamp)
                  HAVING COUNT(*) > 1
                )
                SELECT * FROM dupes ORDER BY count DESC, username
            """)
            duplicate_groups = await cur.fetchall()
            
            if duplicate_groups:
                print(f"🔍 Found {len(duplicate_groups)} duplicate groups:")
                total_duplicates = 0
                for row in duplicate_groups:
                    username, event_type, old_rank, new_rank, minute_bucket, count = row
                    total_duplicates += count - 1
                    print(f"  - {username} | {event_type} | {old_rank}→{new_rank} | {minute_bucket} | {count} entries")
                print(f"📊 Total duplicate entries: {total_duplicates}")
            else:
                print("✅ No duplicate clan log entries found!")
                
    except Exception as e:
        print(f"❌ Error checking duplicates: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_clan_log_duplicates())
