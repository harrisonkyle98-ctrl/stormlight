import psycopg
import os
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List


async def cleanup_clan_log_duplicates(conn):
    """Remove duplicate clan log entries from database"""
    sql = '''
    WITH dupes AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY username, event_type, old_rank, new_rank
               ORDER BY timestamp DESC, id DESC
             ) AS rn
      FROM clan_log
    )
    DELETE FROM clan_log
    USING dupes
    WHERE clan_log.id = dupes.id
      AND dupes.rn > 1;
    '''
    async with conn.cursor() as cur:
        result = await cur.execute(sql)
        rows_affected = cur.rowcount if hasattr(cur, 'rowcount') else 0
        print(f"🗑️ Removed {rows_affected} duplicate clan log entries")


DATABASE_URL = os.getenv("DATABASE_URL")

async def get_db_connection():
    """Get database connection"""
    db_url = os.getenv("DATABASE_URL")
    print(f"🔍 get_db_connection: DATABASE_URL = {db_url[:50] if db_url else 'None'}...")
    if not db_url:
        raise Exception("DATABASE_URL environment variable not set")
    return await psycopg.AsyncConnection.connect(db_url)

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
                
                CREATE TABLE IF NOT EXISTS player_daily_snapshots (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    snapshot_date DATE NOT NULL,
                    stats JSONB NOT NULL,
                    combat_level INTEGER,
                    total_xp BIGINT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(username, snapshot_date)
                );
                
                CREATE INDEX IF NOT EXISTS idx_pds_username_date ON player_daily_snapshots(username, snapshot_date);
                CREATE INDEX IF NOT EXISTS idx_pds_date ON player_daily_snapshots(snapshot_date);
                
                CREATE TABLE IF NOT EXISTS clan_activities (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    text TEXT NOT NULL,
                    details TEXT,
                    activity_date VARCHAR(50) NOT NULL,
                    activity_timestamp BIGINT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(username, text, activity_timestamp)
                );
                
                CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON clan_activities(activity_timestamp DESC);
                CREATE INDEX IF NOT EXISTS idx_activities_username ON clan_activities(username);
                CREATE INDEX IF NOT EXISTS idx_clan_members_discord_id ON clan_members(discord_id);
            """)
            print("Database schema initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("Historical tracking will be disabled")

async def collect_daily_player_stats_cycle(usernames: list[str], cycle_num: int, total_cycles: int, start_index_base: int = 0):
    """Collect daily snapshots for a subset of clan members (one cycle)."""
    import asyncio
    
    try:
        from .main import fetch_player_stats
    except ImportError:
        from main import fetch_player_stats

    print(f"[Bulk Snapshots] Cycle {cycle_num}/{total_cycles}: Starting collection for {len(usernames)} members sequentially (1 at a time)")
    print(f"[Bulk Snapshots] Cycle {cycle_num} IndexBase={start_index_base} Members={len(usernames)}")

    processed = 0
    succeeded = 0
    failed = 0
    failed_users: list[str] = []
    
    batch_size = 1
    batches = [usernames[i:i + batch_size] for i in range(0, len(usernames), batch_size)]
    
    async def process_member_with_retry(username: str, max_retries: int = 5) -> bool:
        """Process a single member with exponential backoff retry logic."""
        retry_delays = [2, 5, 10, 20, 30]
        
        for attempt in range(max_retries + 1):
            try:
                stats_data = await asyncio.wait_for(fetch_player_stats(username), timeout=25)
                
                if not stats_data or 'stats' not in stats_data:
                    print(f"[Bulk Snapshots] ❌ No stats for {username} (attempt {attempt + 1}/{max_retries + 1})")
                    return False

                conn = await get_db_connection()
                async with conn:
                    await ensure_today_snapshot(conn, username, stats_data)
                
                print(f"[Bulk Snapshots] ✅ Completed {username} on attempt {attempt + 1}")
                return True
                
            except Exception as e:
                err = str(e).lower()
                non_retryable = any(s in err for s in ["404", "not found", "invalid", "no hiscore", "private profile", "profile_private", "not_a_member"])
                if attempt < max_retries and not non_retryable:
                    delay = retry_delays[attempt]
                    print(f"[Bulk Snapshots] ⚠️ Retry {attempt + 1}/{max_retries + 1} for {username} after {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    print(f"[Bulk Snapshots] ❌ Final failure for {username} (attempt {attempt + 1}): {e} (non_retryable={non_retryable})")
                    return False
        
        return False

    per_call_delay_secs = 5.0
    batch_delay_secs = 10.0
    
    print(f"[Bulk Snapshots] Cycle {cycle_num} Configuration: batch_size={batch_size}, per_call_delay={per_call_delay_secs}s, batch_delay={batch_delay_secs}s")
    
    for batch_idx, batch in enumerate(batches):
        print(f"[Bulk Snapshots] Cycle {cycle_num} - Processing batch {batch_idx + 1}/{len(batches)} ({len(batch)} members)")
        
        for username in batch:
            global_idx = start_index_base + processed + 1
            print(f"[Bulk Snapshots] Cycle {cycle_num} ▶️ Member #{global_idx}: {username}")
            ok = await process_member_with_retry(username, max_retries=5)
            processed += 1
            if ok:
                succeeded += 1
                print(f"[Bulk Snapshots] Cycle {cycle_num} ✅ #{global_idx} {username} (succeeded={succeeded}, failed={failed})")
            else:
                failed += 1
                failed_users.append(username)
                print(f"[Bulk Snapshots] Cycle {cycle_num} ❌ #{global_idx} {username} (succeeded={succeeded}, failed={failed})")
            await asyncio.sleep(per_call_delay_secs)
        
        print(f"[Bulk Snapshots] Cycle {cycle_num} - Batch {batch_idx + 1} complete: {succeeded}/{processed} total succeeded")
        
        if batch_idx < len(batches) - 1:
            await asyncio.sleep(batch_delay_secs)

    if failed_users:
        print(f"[Bulk Snapshots] Cycle {cycle_num} - Skipping long retry sweep ({len(failed_users)} failed); multi-cycle will retry them in the next cycle")
    
    print(f"[Bulk Snapshots] Cycle {cycle_num} Finished. Processed={processed} Succeeded={succeeded} Failed={len(failed_users)}")
    if failed_users:
        sample = failed_users[:10]
        print(f"[Bulk Snapshots] Cycle {cycle_num} Final failed users (sample {len(sample)}/{len(failed_users)}): {sample}")
    else:
        print(f"[Bulk Snapshots] Cycle {cycle_num} 🎉 All {succeeded} members processed successfully!")
    
    return succeeded, len(failed_users), failed_users

async def collect_daily_player_stats_multi_cycle(members_per_cycle: int = 10, cycle_delay_minutes: int = 3):
    """Collect daily snapshots of all clan members using persistent multi-cycle approach."""
    import asyncio
    from datetime import datetime
    from math import ceil
    
    print(f"🚀 [Multi-Cycle] Starting multi-cycle snapshot collection at {datetime.utcnow().isoformat()}Z")
    
    try:
        try:
            from .main import prisma
        except ImportError:
            from main import prisma
        
        db_members = await prisma.clanmember.find_many()
        all_usernames = [m.username for m in db_members if m.username]
        expected_members = len(all_usernames)
        print(f"📋 [Multi-Cycle] Members to process today: {expected_members}")
        print(f"🔍 [Multi-Cycle] DEBUG: All usernames sample (first 10): {all_usernames[:10]}")
        
        if not all_usernames:
            print(f"❌ [Multi-Cycle] No clan members found in database")
            return 0, 0
        
        conn = await get_db_connection()
        async with conn:
            done = await get_today_snapshot_usernames(conn)
        remaining = filter_remaining_usernames(all_usernames, done)
        print(f"📊 [Multi-Cycle] Already done today: {len(done)}; remaining: {len(remaining)}")
        print(f"🔍 [Multi-Cycle] DEBUG: Done usernames sample (first 10): {list(done)[:10]}")
        print(f"🔍 [Multi-Cycle] DEBUG: Remaining usernames sample (first 10): {remaining[:10]}")
        
        cycle_num = 0
        start = datetime.utcnow()
        needed_cycles = max(1, ceil(expected_members / members_per_cycle))
        max_cycles = needed_cycles + 10
        all_failed_users = []
        attempts_today = {}
        final_failed_set = set()
        
        while remaining and cycle_num < max_cycles:
            cycle_num += 1
            chunk = remaining[:members_per_cycle]
            total_cycles_est = max(1, (len(remaining) + members_per_cycle - 1) // members_per_cycle)
            print(f"🔄 [Multi-Cycle] Cycle {cycle_num}/{total_cycles_est} starting with {len(chunk)} members (remaining={len(remaining)})")
            print(f"🔍 [Multi-Cycle] Chunk usernames: {chunk[:10]}{'...' if len(chunk) > 10 else ''}")
            
            done_before = len(done)
            try:
                succeeded, failed, failed_users = await collect_daily_player_stats_cycle(
                    chunk, cycle_num, total_cycles_est, start_index_base=done_before
                )
                print(f"✅ [Multi-Cycle] Cycle {cycle_num} finished: {succeeded} succeeded, {failed} failed (chunk={len(chunk)})")
            except Exception as e:
                print(f"❌ [Multi-Cycle] Cycle {cycle_num} crashed: {e}")
                import traceback
                traceback.print_exc()
                failed_users = []
            
            newly_finalized = []
            for u in failed_users:
                attempts_today[u] = attempts_today.get(u, 0) + 1
                if attempts_today[u] >= 3:
                    if u not in final_failed_set:
                        final_failed_set.add(u)
                        newly_finalized.append(u)
            if newly_finalized:
                print(f"📌 [Multi-Cycle] Finalizing {len(newly_finalized)} permanently failed members for today: {newly_finalized[:10]}{'...' if len(newly_finalized)>10 else ''}")
            
            conn = await get_db_connection()
            async with conn:
                done = await get_today_snapshot_usernames(conn)
            remaining_after = [u for u in filter_remaining_usernames(all_usernames, done) if u not in final_failed_set]
            done_after = len(done)
            print(f"📊 [Multi-Cycle] Progress: done={done_after}/{expected_members}; remaining={len(remaining_after)}; diff=+{done_after - done_before}")
            
            if done_after == done_before and remaining_after:
                print(f"⚠️ [Multi-Cycle] No progress this cycle; rotating remaining to avoid head-of-line blocking")
                rot = min(members_per_cycle, len(remaining_after))
                remaining = remaining_after[rot:] + remaining_after[:rot]
            else:
                remaining = remaining_after
            
            if remaining:
                print(f"⏳ [Multi-Cycle] Waiting {cycle_delay_minutes} minutes before next cycle...")
                await asyncio.sleep(cycle_delay_minutes * 60)
        
        if cycle_num >= max_cycles and remaining:
            print(f"⚠️ [Multi-Cycle] WARNING: Hit max cycle limit ({max_cycles}) with {len(remaining)} members still remaining")
            all_failed_users.extend([u for u in remaining if u not in all_failed_users])
        
        dur = (datetime.utcnow() - start).total_seconds()
        final_done_count = len(done)
        final_remaining_count = expected_members - final_done_count
        
        if all_failed_users or final_failed_set:
            final_list = sorted(set(all_failed_users).union(final_failed_set))
            print(f"📋 [Multi-Cycle] FINAL FAILED LIST ({len(final_list)} members): {final_list}")
        
        print(f"🎉 [Multi-Cycle] Complete: {final_done_count}/{expected_members} members have a snapshot today in {dur/60:.1f} minutes")
        print(f"🔍 [Multi-Cycle] DEBUG: Final stats - cycles: {cycle_num}, remaining: {final_remaining_count}")
        
        return final_done_count, final_remaining_count
        
    except Exception as e:
        print(f"❌ [Multi-Cycle] Critical error in multi-cycle collection: {e}")
        import traceback
        traceback.print_exc()
        return 0, 0

async def collect_daily_player_stats(concurrency: int = 8, limit: int | None = None):
    """Collect daily snapshots of all clan member stats with batch processing and retry logic."""
    import asyncio
    today = date.today()

    try:
        from .main import fetch_clan_members, fetch_player_stats
    except ImportError:
        from main import fetch_clan_members, fetch_player_stats

    members = await fetch_clan_members()
    usernames = [m['username'] for m in members if m.get('username')]
    
    if limit:
        usernames = usernames[:limit]

    print(f"[Bulk Snapshots] Starting collection for {len(usernames)} members in batches of 5")

    processed = 0
    succeeded = 0
    failed = 0
    failed_users: list[str] = []
    
    batch_size = 1
    batches = [usernames[i:i + batch_size] for i in range(0, len(usernames), batch_size)]
    
    async def process_member_with_retry(username: str, max_retries: int = 5) -> bool:
        """Process a single member with exponential backoff retry logic."""
        retry_delays = [2, 5, 10, 20, 30]
        
        for attempt in range(max_retries + 1):
            try:
                stats_data = await asyncio.wait_for(fetch_player_stats(username), timeout=25)
                
                if not stats_data or 'stats' not in stats_data:
                    print(f"[Bulk Snapshots] ❌ No stats for {username} (attempt {attempt + 1}/{max_retries + 1})")
                    return False

                conn = await get_db_connection()
                async with conn:
                    await ensure_today_snapshot(conn, username, stats_data)
                
                print(f"[Bulk Snapshots] ✅ Completed {username} on attempt {attempt + 1}")
                return True
                
            except Exception as e:
                err = str(e).lower()
                non_retryable = any(s in err for s in ["404", "not found", "invalid", "no hiscore", "private profile", "profile_private", "not_a_member"])
                if attempt < max_retries and not non_retryable:
                    delay = retry_delays[attempt]
                    print(f"[Bulk Snapshots] ⚠️ Retry {attempt + 1}/{max_retries + 1} for {username} after {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    print(f"[Bulk Snapshots] ❌ Final failure for {username} (attempt {attempt + 1}): {e} (non_retryable={non_retryable})")
                    return False
        
        return False

    per_call_delay_secs = 5.0
    batch_delay_secs = 10.0
    
    print(f"[Bulk Snapshots] Configuration: batch_size={batch_size}, per_call_delay={per_call_delay_secs}s, batch_delay={batch_delay_secs}s")
    
    for batch_idx, batch in enumerate(batches):
        print(f"[Bulk Snapshots] Processing batch {batch_idx + 1}/{len(batches)} ({len(batch)} members)")
        
        for username in batch:
            ok = await process_member_with_retry(username, max_retries=5)
            processed += 1
            if ok:
                succeeded += 1
            else:
                failed += 1
                failed_users.append(username)
            await asyncio.sleep(per_call_delay_secs)
        
        print(f"[Bulk Snapshots] Batch {batch_idx + 1} complete: {succeeded}/{processed} total succeeded")
        
        if batch_idx < len(batches) - 1:
            await asyncio.sleep(batch_delay_secs)

    from datetime import datetime
    max_minutes = 20
    start_time = datetime.now()
    
    while failed_users:
        if (datetime.now() - start_time).total_seconds() > max_minutes * 60:
            print(f"[Bulk Snapshots] ⏳ Safety stop after {max_minutes} minutes with {len(failed_users)} still failing")
            break
            
        retry_usernames = failed_users.copy()
        failed_users = []
        retry_batches = [retry_usernames[i:i + batch_size] for i in range(0, len(retry_usernames), batch_size)]
        
        for batch_idx, batch in enumerate(retry_batches):
            print(f"[Bulk Snapshots] Retry batch {batch_idx + 1}/{len(retry_batches)} ({len(batch)} members)")
            
            for username in batch:
                ok = await process_member_with_retry(username, max_retries=5)
                if ok:
                    succeeded += 1
                    print(f"[Bulk Snapshots] ✅ Retry success for {username}")
                else:
                    failed_users.append(username)
                await asyncio.sleep(per_call_delay_secs)
            
            if batch_idx < len(retry_batches) - 1:
                await asyncio.sleep(batch_delay_secs * 2)  # Extra spacing on retries
        
        if failed_users:
            print(f"[Bulk Snapshots] Still {len(failed_users)} failed; cooling down 60s before next retry sweep")
            await asyncio.sleep(60)
    
    print(f"[Bulk Snapshots] Finished. Processed={processed} Succeeded={succeeded} Failed={len(failed_users)}")
    if failed_users:
        sample = failed_users[:20]
        print(f"[Bulk Snapshots] Final failed users (sample {len(sample)}/{len(failed_users)}): {sample}")
    else:
        print(f"[Bulk Snapshots] 🎉 All {succeeded} members processed successfully!")
    
    return succeeded, len(failed_users)

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

def get_period_window(period: str, reference_date: date = None) -> tuple[date, date]:
    """Calculate start and end dates for a period window to compute gains"""
    if reference_date is None:
        reference_date = date.today()
    
    p = period.lower()
    if p == 'today':
        return (reference_date - timedelta(days=1), reference_date)
    if p == 'yesterday':
        return (reference_date - timedelta(days=2), reference_date - timedelta(days=1))
    if p == 'week':
        return (reference_date - timedelta(days=7), reference_date)
    if p == 'last_week':
        return (reference_date - timedelta(days=14), reference_date - timedelta(days=7))
    if p == 'month':
        return (reference_date - timedelta(days=30), reference_date)
    if p == 'last_month':
        return (reference_date - timedelta(days=60), reference_date - timedelta(days=30))
    if p == 'year':
        return (reference_date - timedelta(days=365), reference_date)
    if p == 'last_year':
        return (reference_date - timedelta(days=730), reference_date - timedelta(days=365))
    return (reference_date, reference_date)

async def get_snapshot_rows_on_or_before(conn, username: str, target_date):
    """Return rows for the nearest snapshot_date <= target_date, or [] if none."""
    cursor = await conn.execute("""
        SELECT MAX(snapshot_date) FROM player_stats_history
        WHERE username = %s AND snapshot_date <= %s
    """, (username, target_date))
    row = await cursor.fetchone()
    if not row or not row[0]:
        return []
    snapshot_date = row[0]
    rows_cur = await conn.execute("""
        SELECT skill_name, level, xp, rank FROM player_stats_history
        WHERE username = %s AND snapshot_date = %s
    """, (username, snapshot_date))
    return await rows_cur.fetchall()

async def get_snapshot_dict_on_or_before(conn, username: str, target_date: date) -> dict:
    """Return snapshot dict for the nearest snapshot_date <= target_date"""
    rows = await get_snapshot_rows_on_or_before(conn, username, target_date)
    return {row[0]: row for row in rows}

async def get_snapshot_json_on_or_before(conn, username: str, target_date: date) -> dict | None:
    """Get consolidated JSON snapshot on or before target date with legacy fallback"""
    cur = await conn.execute("""
        SELECT stats FROM player_daily_snapshots
        WHERE username = %s AND snapshot_date <= %s
        ORDER BY snapshot_date DESC
        LIMIT 1
    """, (username, target_date))
    row = await cur.fetchone()
    if row and row[0]:
        return row[0] if isinstance(row[0], dict) else None
    
    rows = await get_snapshot_rows_on_or_before(conn, username, target_date)
    return {r[0]: {'level': r[1], 'xp': r[2], 'rank': r[3]} for r in rows} if rows else None

async def get_today_snapshot_usernames(conn) -> set[str]:
    """Get set of usernames that already have snapshots for today."""
    cur = await conn.execute("""
        SELECT DISTINCT username
        FROM player_daily_snapshots
        WHERE snapshot_date = CURRENT_DATE
    """)
    rows = await cur.fetchall()
    return {r[0] for r in rows if r and r[0]}

def filter_remaining_usernames(all_usernames: list[str], done: set[str]) -> list[str]:
    """Filter out usernames that already have snapshots today."""
    return [u for u in all_usernames if u and u not in done]

async def get_snapshot_json_on_date(conn, username: str, snap_date: date) -> dict | None:
    """Get consolidated JSON snapshot for exact date with legacy fallback"""
    cur = await conn.execute("""
        SELECT stats FROM player_daily_snapshots
        WHERE username = %s AND snapshot_date = %s
    """, (username, snap_date))
    row = await cur.fetchone()
    if row and row[0]:
        return row[0] if isinstance(row[0], dict) else None
    
    cur = await conn.execute("""
        SELECT skill_name, level, xp, rank FROM player_stats_history
        WHERE username = %s AND snapshot_date = %s
    """, (username, snap_date))
    rows = await cur.fetchall()
    return {r[0]: {'level': r[1], 'xp': r[2], 'rank': r[3]} for r in rows} if rows else None

async def upsert_daily_snapshot(conn, username: str, stats: dict, snap_date: date):
    """Insert consolidated daily snapshot with all skills in JSON format"""
    if not stats or 'stats' not in stats:
        return
    
    minimal = {
        sk: {'level': v.get('level', 0), 'xp': v.get('xp', 0), 'rank': v.get('rank')}
        for sk, v in stats['stats'].items()
    }
    combat_level = stats['stats'].get('overall', {}).get('combatlevel')
    total_xp = stats['stats'].get('overall', {}).get('xp')
    
    import json
    await conn.execute("""
        INSERT INTO player_daily_snapshots (username, snapshot_date, stats, combat_level, total_xp)
        VALUES (%s, %s, %s::jsonb, %s, %s)
        ON CONFLICT (username, snapshot_date) DO NOTHING
    """, (username, snap_date, json.dumps(minimal), combat_level, total_xp))

async def ensure_today_snapshot(conn, username: str, stats: dict):
    """Ensure a 'today' baseline snapshot exists for a user (preserve existing baseline)."""
    today = date.today()
    await upsert_daily_snapshot(conn, username, stats, today)

async def get_player_stats_for_periods(conn, username: str, period1: str, period2: str):
    """Get player stats comparison between two time periods using consolidated snapshots"""
    d1 = get_date_for_period(period1)
    d2 = get_date_for_period(period2)

    snap1 = await get_snapshot_json_on_date(conn, username, d1) or await get_snapshot_json_on_or_before(conn, username, d1) or {}
    snap2 = await get_snapshot_json_on_date(conn, username, d2) or await get_snapshot_json_on_or_before(conn, username, d2) or {}

    skills = set(snap1.keys()) | set(snap2.keys())
    changes = {}
    for sk in skills:
        s1 = snap1.get(sk, {})
        s2 = snap2.get(sk, {})
        lvl1, xp1, rk1 = s1.get('level', 0), s1.get('xp', 0), (s1.get('rank') or 0)
        lvl2, xp2, rk2 = s2.get('level', 0), s2.get('xp', 0), (s2.get('rank') or 0)
        changes[sk] = {
            'level_change': lvl1 - lvl2,
            'xp_change': xp1 - xp2,
            'rank_change': rk2 - rk1,
            'xp_period1': xp1,
            'xp_period2': xp2,
            'xp_gain_period1': 0,
            'xp_gain_period2': 0
        }

    start1, end1 = get_period_window(period1)
    start2, end2 = get_period_window(period2)
    end1_json = await get_snapshot_json_on_or_before(conn, username, end1) or {}
    start1_json = await get_snapshot_json_on_or_before(conn, username, start1) or {}
    end2_json = await get_snapshot_json_on_or_before(conn, username, end2) or {}
    start2_json = await get_snapshot_json_on_or_before(conn, username, start2) or {}

    for sk in set(list(changes.keys()) + list(end1_json.keys()) + list(start1_json.keys()) + list(end2_json.keys()) + list(start2_json.keys())):
        e1, s1 = end1_json.get(sk, {}), start1_json.get(sk, {})
        e2, s2 = end2_json.get(sk, {}), start2_json.get(sk, {})
        gain1 = (e1.get('xp') or 0) - (s1.get('xp') or 0)
        gain2 = (e2.get('xp') or 0) - (s2.get('xp') or 0)
        base = changes.get(sk, {'level_change': 0, 'xp_change': 0, 'rank_change': 0, 'xp_period1': e1.get('xp', 0), 'xp_period2': e2.get('xp', 0)})
        base.update({'xp_gain_period1': max(gain1, 0), 'xp_gain_period2': max(gain2, 0)})
        changes[sk] = base

    return changes

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

async def store_clan_activity(conn, username: str, text: str, details: str, activity_date: str, activity_timestamp: int):
    """Store a clan activity in the database"""
    try:
        await conn.execute("""
            INSERT INTO clan_activities (username, text, details, activity_date, activity_timestamp)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (username, text, activity_timestamp) DO NOTHING
        """, (username, text, details, activity_date, activity_timestamp))
    except Exception as e:
        print(f"Error storing activity for {username}: {e}")

async def get_stored_activities(conn, limit: int = 100, offset: int = 0):
    """Get stored activities from database, ordered by timestamp descending"""
    try:
        cursor = await conn.execute("""
            SELECT username, text, details, activity_date, activity_timestamp
            FROM clan_activities 
            ORDER BY activity_timestamp DESC 
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        rows = await cursor.fetchall()
        activities = []
        for row in rows:
            activities.append({
                'username': row[0],
                'text': row[1], 
                'details': row[2],
                'date': row[3],
                'timestamp': row[4]
            })
        return activities
    except Exception as e:
        print(f"Error retrieving stored activities: {e}")
        return []

async def get_activity_count(conn):
    """Get total count of stored activities"""
    try:
        cursor = await conn.execute("SELECT COUNT(*) FROM clan_activities")
        row = await cursor.fetchone()
        return row[0] if row else 0
    except Exception as e:
        print(f"Error getting activity count: {e}")
        return 0

async def cleanup_old_activities(conn, days_to_keep: int = 30):
    """Remove activities older than specified days"""
    try:
        cutoff_timestamp = datetime.now().timestamp() - (days_to_keep * 24 * 60 * 60)
        await conn.execute("""
            DELETE FROM clan_activities 
            WHERE activity_timestamp < %s
        """, (cutoff_timestamp,))
        print(f"Cleaned up activities older than {days_to_keep} days")
    except Exception as e:
        print(f"Error cleaning up old activities: {e}")

async def migrate_history_to_daily_snapshots(conn):
    """Migrate legacy player_stats_history into consolidated player_daily_snapshots"""
    await conn.execute("""
        INSERT INTO player_daily_snapshots (username, snapshot_date, stats, combat_level, total_xp)
        SELECT
            username,
            snapshot_date,
            jsonb_object_agg(
                skill_name,
                jsonb_build_object('level', level, 'xp', xp, 'rank', rank)
                ORDER BY skill_name
            ) AS stats,
            MAX(CASE WHEN skill_name='overall' THEN combat_level END) AS combat_level,
            MAX(CASE WHEN skill_name='overall' THEN xp END) AS total_xp
        FROM player_stats_history
        GROUP BY username, snapshot_date
        ON CONFLICT (username, snapshot_date) DO NOTHING
    """)
    print("[Migration] Backfill into player_daily_snapshots completed")
