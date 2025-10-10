#!/usr/bin/env python3
"""
Standalone script to repopulate clan_drops table with exact item name matching.
Run this script directly to avoid HTTP timeout issues.
"""

import asyncio
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'stormlight-backend'))

async def main():
    try:
        from app.database import get_db_connection
        from app.main import parse_and_store_drops_from_activities, load_boss_drops_dataset
        
        print("=" * 80)
        print("🔄 Starting Drops Repopulation Script")
        print("=" * 80)
        print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        print()
        
        load_boss_drops_dataset()
        print("✅ Loaded boss drops dataset and image manifest\n")
        
        conn = await get_db_connection()
        async with conn:
            cursor = await conn.execute("SELECT COUNT(*) FROM clan_drops")
            result = await cursor.fetchone()
            before_count = result[0] if result else 0
            print(f"📊 Current drops in database: {before_count}")
            print("ℹ️  Skipping table clear - using ON CONFLICT to prevent duplicates\n")
            
            print("📋 Fetching all activities from database...")
            activities_cursor = await conn.execute("""
                SELECT username, text, details, activity_date, activity_timestamp
                FROM clan_activities
                ORDER BY activity_timestamp DESC
            """)
            
            all_activities = await activities_cursor.fetchall()
            print(f"✅ Found {len(all_activities)} total activities to parse\n")
            
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
            
            print(f"👥 Processing activities for {len(username_activities)} members\n")
            print("-" * 80)
            
            total_drops_found = 0
            processed_members = 0
            
            for username, activities in username_activities.items():
                processed_members += 1
                print(f"[{processed_members}/{len(username_activities)}] Processing {username}... ", end='', flush=True)
                
                drops = await parse_and_store_drops_from_activities(activities, username)
                total_drops_found += len(drops)
                
                if drops:
                    print(f"✅ Found {len(drops)} drops")
                else:
                    print("⚪ No drops")
                
                if processed_members % 10 == 0:
                    print(f"\n📈 Progress: {processed_members}/{len(username_activities)} members, {total_drops_found} drops so far\n")
            
            print("-" * 80)
            print()
            print("=" * 80)
            print("✅ Repopulation Complete!")
            print("=" * 80)
            print(f"📊 Results:")
            print(f"   - Before count: {before_count}")
            print(f"   - After count:  {total_drops_found}")
            print(f"   - Members processed: {len(username_activities)}")
            print(f"   - Activities scanned: {len(all_activities)}")
            print(f"⏰ Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
            print("=" * 80)
            
    except Exception as e:
        print(f"\n❌ Error during repopulation: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
