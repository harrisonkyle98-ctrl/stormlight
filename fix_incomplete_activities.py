#!/usr/bin/env python3

import asyncio
import asyncpg
import httpx
import os
from datetime import datetime

async def fix_incomplete_members():
    """Fix activity storage for members with incomplete logs"""
    try:
        database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres')
        conn = await asyncpg.connect(database_url)
        
        print("=== FIXING INCOMPLETE ACTIVITY MEMBERS ===")
        
        incomplete_members = await conn.fetch("""
            SELECT username, COUNT(*) as activity_count 
            FROM clan_activities 
            GROUP BY username 
            HAVING COUNT(*) < 5
            ORDER BY COUNT(*) ASC
        """)
        
        print(f"Found {len(incomplete_members)} members with incomplete activity logs:")
        for member in incomplete_members:
            print(f"  - {member['username']}: {member['activity_count']} activities")
        
        await conn.close()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for member in incomplete_members:
                username = member['username']
                print(f"\n🔄 Processing {username}...")
                
                try:
                    runemetrics_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={username}&activities=20"
                    response = await client.get(runemetrics_url)
                    
                    if response.status_code == 200:
                        data = response.json()
                        activities = data.get('activities', [])
                        print(f"  📊 Retrieved {len(activities)} activities from API")
                        
                        if activities:
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
                                            print(f"    ⚠️ Invalid date format: {activity_date_str}")
                                            continue
                                    
                                    activity_timestamp = int(activity_date.timestamp())
                                    
                                    result = await conn.execute("""
                                        INSERT INTO clan_activities (username, text, details, activity_date, activity_timestamp)
                                        VALUES ($1, $2, $3, $4, $5)
                                        ON CONFLICT (username, text, activity_timestamp) DO NOTHING
                                    """, username, activity['text'], activity['details'], activity['date'], activity_timestamp)
                                    
                                    stored_count += 1
                                    
                                except Exception as e:
                                    print(f"    ❌ Error storing activity: {e}")
                            
                            final_count = await conn.fetchval(
                                "SELECT COUNT(*) FROM clan_activities WHERE username = $1", username
                            )
                            
                            await conn.close()
                            print(f"  ✅ {username}: Processed {stored_count} activities, total in DB: {final_count}")
                        else:
                            print(f"  ⚠️ No activities returned for {username}")
                    
                    elif response.status_code == 429:
                        print(f"  ⏳ Rate limited for {username}, waiting...")
                        await asyncio.sleep(5)
                        continue
                    else:
                        print(f"  ❌ API error for {username}: {response.status_code}")
                
                except Exception as e:
                    print(f"  ❌ Error processing {username}: {e}")
                
                await asyncio.sleep(2)
        
        print("\n=== VERIFICATION ===")
        conn = await asyncpg.connect(database_url)
        
        updated_counts = await conn.fetch("""
            SELECT username, COUNT(*) as activity_count 
            FROM clan_activities 
            GROUP BY username 
            HAVING COUNT(*) < 5
            ORDER BY COUNT(*) ASC
        """)
        
        await conn.close()
        
        if updated_counts:
            print(f"Still incomplete after fix ({len(updated_counts)} members):")
            for member in updated_counts:
                print(f"  - {member['username']}: {member['activity_count']} activities")
        else:
            print("✅ All members now have adequate activity logs!")
        
    except Exception as e:
        print(f"❌ Error fixing incomplete activities: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(fix_incomplete_members())
