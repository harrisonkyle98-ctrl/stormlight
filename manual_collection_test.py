#!/usr/bin/env python3

import asyncio
import asyncpg
import httpx
import os
from datetime import datetime

async def collect_member_activities(username):
    """Manually collect activities for a specific member"""
    try:
        database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres')
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            runemetrics_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={username}&activities=20"
            
            print(f"=== MANUAL COLLECTION TEST FOR {username} ===")
            print(f"Fetching activities from: {runemetrics_url}")
            
            response = await client.get(runemetrics_url)
            
            if response.status_code == 200:
                data = response.json()
                activities = data.get('activities', [])
                print(f"✅ Retrieved {len(activities)} activities from API")
                
                conn = await asyncpg.connect(database_url)
                stored_count = 0
                
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
                                print(f"⚠️ Invalid date format: {activity_date_str}")
                                continue
                        
                        activity_timestamp = int(activity_date.timestamp())
                        
                        result = await conn.execute("""
                            INSERT INTO clan_activities (username, text, details, activity_date, activity_timestamp)
                            VALUES ($1, $2, $3, $4, $5)
                            ON CONFLICT (username, text, activity_timestamp) DO NOTHING
                        """, username, activity['text'], activity['details'], activity['date'], activity_timestamp)
                        
                        stored_count += 1
                        print(f"  📝 Stored: {activity['text'][:50]}...")
                        
                    except Exception as e:
                        print(f"❌ Error storing activity: {e}")
                
                final_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM clan_activities WHERE username = $1", username
                )
                
                await conn.close()
                print(f"\n=== RESULTS ===")
                print(f"✅ Processed {stored_count} activities for {username}")
                print(f"📊 Total activities in database: {final_count}")
                
            else:
                print(f"❌ API error: {response.status_code}")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

async def test_multiple_members():
    """Test collection for multiple members"""
    test_members = ["lm Kyle", "Dark Ganon", "EightBitRich"]
    
    for username in test_members:
        await collect_member_activities(username)
        print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    asyncio.run(test_multiple_members())
