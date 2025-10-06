import asyncpg
import asyncio
from datetime import datetime

async def normalize_timestamps_safely():
    conn = await asyncpg.connect('postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres')
    
    print('🔍 Analyzing timestamp format issues...')
    
    ms_count = await conn.fetchval('''
        SELECT COUNT(*) FROM clan_activities 
        WHERE activity_timestamp > 1000000000000
    ''')
    print(f'⚠️  Found {ms_count} activities with millisecond timestamps')
    
    s_count = await conn.fetchval('''
        SELECT COUNT(*) FROM clan_activities 
        WHERE activity_timestamp <= 1000000000000
    ''')
    print(f'✅ Found {s_count} activities with second timestamps')
    
    total_before = await conn.fetchval('SELECT COUNT(*) FROM clan_activities')
    print(f'📊 Total activities before normalization: {total_before}')
    
    if ms_count == 0:
        print('✅ All timestamps already normalized!')
        await conn.close()
        return
    
    print('\n🔍 Checking for duplicates (activities existing in both ms and second formats)...')
    duplicates = await conn.fetch('''
        SELECT 
            a.username,
            a.text,
            a.activity_timestamp as ms_timestamp,
            b.activity_timestamp as s_timestamp,
            a.id as ms_id,
            b.id as s_id
        FROM clan_activities a
        JOIN clan_activities b ON 
            a.username = b.username 
            AND a.text = b.text 
            AND a.activity_timestamp / 1000 = b.activity_timestamp
        WHERE a.activity_timestamp > 1000000000000 
            AND b.activity_timestamp <= 1000000000000
    ''')
    
    print(f'📊 Found {len(duplicates)} duplicate activities (exist in both formats)')
    
    if duplicates:
        print(f'\n🗑️  Removing {len(duplicates)} duplicate millisecond entries (preserving second format versions)...')
        ms_ids_to_delete = [dup['ms_id'] for dup in duplicates]
        
        deleted = await conn.execute('''
            DELETE FROM clan_activities
            WHERE id = ANY($1::int[])
        ''', ms_ids_to_delete)
        
        print(f'✅ Removed {len(ms_ids_to_delete)} duplicate entries')
    
    print('\n🔧 Normalizing remaining millisecond timestamps to seconds...')
    
    try:
        updated = await conn.execute('''
            UPDATE clan_activities
            SET 
                activity_timestamp = activity_timestamp / 1000,
                activity_date = TO_CHAR(TO_TIMESTAMP(activity_timestamp / 1000), 'MM-DD-YYYY')
            WHERE activity_timestamp > 1000000000000
        ''')
        
        rows_updated = updated.split()[-1] if updated else '0'
        print(f'✅ Normalized {rows_updated} activities')
    except Exception as e:
        print(f'❌ Error during normalization: {e}')
        await conn.close()
        return
    
    ms_count_after = await conn.fetchval('''
        SELECT COUNT(*) FROM clan_activities 
        WHERE activity_timestamp > 1000000000000
    ''')
    print(f'\n📊 Millisecond timestamps remaining: {ms_count_after}')
    
    s_count_after = await conn.fetchval('''
        SELECT COUNT(*) FROM clan_activities 
        WHERE activity_timestamp <= 1000000000000
    ''')
    print(f'📊 Second timestamps now: {s_count_after}')
    
    total_after = await conn.fetchval('SELECT COUNT(*) FROM clan_activities')
    print(f'📊 Total activities after normalization: {total_after}')
    print(f'📊 Net change: {total_after - total_before} ({len(duplicates) if duplicates else 0} duplicates removed)')
    
    print('\n📋 Most recent 5 activities after normalization:')
    recent = await conn.fetch('''
        SELECT username, text, activity_timestamp, activity_date
        FROM clan_activities
        ORDER BY activity_timestamp DESC
        LIMIT 5
    ''')
    
    for row in recent:
        ts = datetime.fromtimestamp(row['activity_timestamp'])
        print(f'  {row["username"]}: {row["text"][:50]}')
        print(f'    Timestamp: {row["activity_timestamp"]} | Date: {ts.strftime("%Y-%m-%d %H:%M")} | Stored: {row["activity_date"]}')
    
    await conn.close()
    print('\n✅ Timestamp normalization complete!')

asyncio.run(normalize_timestamps_safely())
