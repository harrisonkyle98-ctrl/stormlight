#!/usr/bin/env python3

import asyncio
import asyncpg
import os

async def test_all_members():
    """Test activity completeness for all clan members"""
    try:
        database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres')
        conn = await asyncpg.connect(database_url)
        
        print("=== TESTING ALL MEMBER ACTIVITY COMPLETENESS ===")
        
        members = await conn.fetch("SELECT DISTINCT username FROM clan_activities ORDER BY username")
        
        print(f"Testing activity completeness for {len(members)} members:")
        incomplete_members = []
        complete_members = []
        
        for member in members:
            username = member['username']
            activity_count = await conn.fetchval(
                "SELECT COUNT(*) FROM clan_activities WHERE username = $1", username
            )
            
            if activity_count < 5:  # Flag members with very few activities
                incomplete_members.append((username, activity_count))
                print(f"⚠️ {username}: only {activity_count} activities")
            else:
                complete_members.append((username, activity_count))
                print(f"✅ {username}: {activity_count} activities")
        
        await conn.close()
        
        print(f"\n=== SUMMARY ===")
        print(f"✅ Complete members: {len(complete_members)}")
        print(f"⚠️ Incomplete members: {len(incomplete_members)}")
        
        if incomplete_members:
            print(f"\n❌ Found {len(incomplete_members)} members with incomplete activity logs:")
            for username, count in incomplete_members:
                print(f"  - {username}: {count} activities")
        else:
            print("\n✅ All members have adequate activity logs")
        
        return incomplete_members
        
    except Exception as e:
        print(f"❌ Error testing member activities: {e}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == "__main__":
    asyncio.run(test_all_members())
