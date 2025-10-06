import asyncpg
import asyncio
from datetime import datetime

async def check_recent_activities():
    conn = await asyncpg.connect('postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres')
    
    count = await conn.fetchval('SELECT COUNT(*) FROM clan_activities')
    print(f'📊 Total activities in DB: {count}')
    
    rows = await conn.fetch('''
        SELECT username, text, activity_date, activity_timestamp, created_at
        FROM clan_activities
        ORDER BY activity_timestamp DESC
        LIMIT 5
    ''')
    
    print(f'\n📋 Most Recent 5 Activities (by timestamp):')
    for row in rows:
        ms = row['activity_timestamp']
        ts = datetime.fromtimestamp(ms / 1000 if ms > 1000000000000 else ms)
        print(f'  {row["username"]}: {row["text"][:50]}...')
        print(f'    Date: {row["activity_date"]} | Timestamp: {ts.isoformat()} | DB Created: {row["created_at"].isoformat()}')
    
    latest_created = await conn.fetchval('SELECT MAX(created_at) FROM clan_activities')
    print(f'\n⏰ Last activity inserted into DB: {latest_created.isoformat() if latest_created else "None"}')
    
    recent_count = await conn.fetchval('''
        SELECT COUNT(*) FROM clan_activities 
        WHERE created_at > NOW() - INTERVAL '24 hours'
    ''')
    print(f'📈 Activities inserted in last 24 hours: {recent_count}')
    
    ms_count = await conn.fetchval('''
        SELECT COUNT(*) FROM clan_activities 
        WHERE activity_timestamp > 1000000000000
    ''')
    print(f'\n⚠️  Activities with millisecond timestamps: {ms_count}')
    
    s_count = await conn.fetchval('''
        SELECT COUNT(*) FROM clan_activities 
        WHERE activity_timestamp <= 1000000000000
    ''')
    print(f'✅ Activities with second timestamps: {s_count}')
    
    recent_by_ts = await conn.fetch('''
        SELECT username, text, activity_date, activity_timestamp, created_at
        FROM clan_activities
        WHERE activity_timestamp > $1
        ORDER BY activity_timestamp DESC
        LIMIT 10
    ''', int((datetime.now().timestamp() - 7*24*60*60) * 1000))
    
    print(f'\n📅 Activities from last 7 days (by activity_timestamp):')
    if recent_by_ts:
        for row in recent_by_ts:
            ms = row['activity_timestamp']
            ts = datetime.fromtimestamp(ms / 1000 if ms > 1000000000000 else ms)
            print(f'  {row["username"]}: {row["text"][:40]}...')
            print(f'    Activity Date: {ts.isoformat()} | Inserted: {row["created_at"].isoformat()}')
    else:
        print('  ❌ No activities found in last 7 days')
    
    await conn.close()

asyncio.run(check_recent_activities())
