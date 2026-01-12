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
                
                CREATE TABLE IF NOT EXISTS clan_drops (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) NOT NULL,
                    item_name VARCHAR(255) NOT NULL,
                    boss_name VARCHAR(255) NOT NULL,
                    item_image_url TEXT,
                    activity_text TEXT NOT NULL,
                    activity_timestamp BIGINT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(username, item_name, boss_name, activity_timestamp)
                );
                
                CREATE INDEX IF NOT EXISTS idx_drops_username ON clan_drops(username);
                CREATE INDEX IF NOT EXISTS idx_drops_timestamp ON clan_drops(activity_timestamp DESC);
                
                CREATE TABLE IF NOT EXISTS player_today_gains (
                    username VARCHAR(255) NOT NULL,
                    snapshot_date DATE NOT NULL,
                    overall_gain BIGINT NOT NULL DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (username, snapshot_date)
                );
                
                CREATE INDEX IF NOT EXISTS idx_today_gains_date ON player_today_gains(snapshot_date);
                CREATE INDEX IF NOT EXISTS idx_today_gains_date_gain ON player_today_gains(snapshot_date, overall_gain DESC);
                
                -- Add display_username column for proper capitalization (migration)
                ALTER TABLE player_today_gains ADD COLUMN IF NOT EXISTS display_username TEXT;
                CREATE INDEX IF NOT EXISTS idx_today_gains_display ON player_today_gains(display_username);
                
                -- Add 29 skill gain columns to unify live XP tracking (migration)
                ALTER TABLE player_today_gains
                    ADD COLUMN IF NOT EXISTS attack_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS defence_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS strength_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS constitution_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS ranged_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS prayer_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS magic_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS cooking_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS woodcutting_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS fletching_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS fishing_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS firemaking_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS crafting_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS smithing_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS mining_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS herblore_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS agility_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS thieving_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS slayer_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS farming_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS runecrafting_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS hunter_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS construction_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS summoning_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS dungeoneering_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS divination_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS invention_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS archaeology_gain BIGINT NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS necromancy_gain BIGINT NOT NULL DEFAULT 0;
                
                -- Add total_caps column to clan_members for persistent cap counting
                ALTER TABLE clan_members ADD COLUMN IF NOT EXISTS total_caps INTEGER DEFAULT 0;
            """)
            print("Database schema initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")
        print("Historical tracking will be disabled")

async def collect_daily_player_stats_cycle(usernames: list[str], cycle_num: int, total_cycles: int, start_index_base: int = 0, roster_usernames: set[str] | None = None):
    """Collect daily snapshots for a subset of clan members (one cycle)."""
    import asyncio
    import random
    
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
    failure_reasons: dict[str, str] = {}
    
    def classify_failure_reason(username: str, err: Exception | None, stats_data: dict | None) -> str:
        """Classify the failure reason for a member."""
        if stats_data and isinstance(stats_data, dict):
            api_name = stats_data.get('username') or stats_data.get('name')
            if api_name and api_name != username:
                return f"RENAMED -> '{api_name}'"
        
        if roster_usernames is not None and username not in roster_usernames:
            return "LEFT_CLAN (not in roster)"
        
        if err:
            msg = str(err).lower()
            if "429" in msg or "rate limit" in msg or "too many requests" in msg:
                return "RATE_LIMIT_429"
            if "timeout" in msg or "timed out" in msg:
                return "TIMEOUT"
            if "profile_private" in msg or "private profile" in msg:
                return "PROFILE_PRIVATE"
            if "not_a_member" in msg:
                return "RUNEMETRICS_NOT_A_MEMBER"
            if "404" in msg and "not found" in msg:
                return "404_NOT_FOUND_OR_PRIVATE"
            if "banned" in msg:
                return "BANNED_OR_INACTIVE"
            return f"API_EXCEPTION: {str(err)}"
        
        return "API_NO_DATA_OR_TIMEOUT"
    
    batch_size = 1
    batches = [usernames[i:i + batch_size] for i in range(0, len(usernames), batch_size)]
    
    async def process_member_with_retry(username: str, max_retries: int = 5) -> tuple[bool, dict | None, Exception | None]:
        """Process a single member with exponential backoff retry logic."""
        retry_delays = [2, 5, 10, 20, 30]
        
        for attempt in range(max_retries + 1):
            try:
                stats_data = await asyncio.wait_for(fetch_player_stats(username), timeout=25)
                
                if not stats_data or 'stats' not in stats_data:
                    return False, None, None

                conn = await get_db_connection()
                async with conn:
                    await ensure_today_snapshot(conn, username, stats_data)
                
                return True, stats_data, None
                
            except Exception as e:
                err = str(e).lower()
                non_retryable = any(s in err for s in ["404", "not found", "invalid", "no hiscore", "private profile", "profile_private", "not_a_member"])
                if attempt < max_retries and not non_retryable:
                    delay = retry_delays[attempt]
                    await asyncio.sleep(delay)
                else:
                    failure_reason = classify_failure_reason(username, e, None)
                    return False, None, failure_reason
        
        return False, None, None

    per_member_delay_secs = 3.0 + random.uniform(-0.3, 0.3)
    
    print(f"[Bulk Snapshots] Cycle {cycle_num} Configuration: processing {len(usernames)} members sequentially, per_member_delay={per_member_delay_secs:.2f}s")
    
    for i, username in enumerate(usernames):
        global_idx = start_index_base + processed + 1
        ok, stats_data, err = await process_member_with_retry(username, max_retries=5)
        processed += 1
        if ok:
            succeeded += 1
            if global_idx % 5 == 0 or global_idx == start_index_base + len(usernames):
                print(f"[Bulk Snapshots] Cycle {cycle_num} Progress: #{global_idx} (succeeded={succeeded}, failed={failed})")
        else:
            failed += 1
            failed_users.append(username)
            reason = classify_failure_reason(username, err, stats_data)
            failure_reasons[username] = reason
            if failed <= 10:
                print(f"[Bulk Snapshots] Cycle {cycle_num} ❌ #{global_idx} {username}: {reason}")
        
        if i < len(usernames) - 1:
            delay_with_jitter = 3.0 + random.uniform(-0.3, 0.3)
            await asyncio.sleep(delay_with_jitter)

    if failed_users:
        print(f"[Bulk Snapshots] Cycle {cycle_num} - Skipping long retry sweep ({len(failed_users)} failed); multi-cycle will retry them in the next cycle")
    
    print(f"[Bulk Snapshots] Cycle {cycle_num} Finished. Processed={processed} Succeeded={succeeded} Failed={len(failed_users)}")
    if failed_users:
        sample = failed_users[:10]
        print(f"[Bulk Snapshots] Cycle {cycle_num} Final failed users (sample {len(sample)}/{len(failed_users)}): {sample}")
    else:
        print(f"[Bulk Snapshots] Cycle {cycle_num} 🎉 All {succeeded} members processed successfully!")
    
    return succeeded, len(failed_users), failed_users, failure_reasons

async def collect_daily_player_stats_multi_cycle(members_per_cycle: int = 10, cycle_delay_minutes: int = 0.3):
    """Collect daily snapshots of all clan members using persistent multi-cycle approach with adaptive rate limit handling."""
    import asyncio
    import random
    from datetime import datetime
    from math import ceil
    
    print(f"🚀 [Multi-Cycle] Starting multi-cycle snapshot collection at {datetime.utcnow().isoformat()}Z")
    
    try:
        try:
            from .main import prisma, fetch_clan_members
        except ImportError:
            from main import prisma, fetch_clan_members
        
        try:
            roster = await fetch_clan_members()
            roster_usernames = {m.get('username') for m in roster if m.get('username')}
            print(f"📋 [Multi-Cycle] Fetched current clan roster: {len(roster_usernames)} members")
        except Exception as e:
            print(f"⚠️ [Multi-Cycle] Failed to fetch clan roster for classification; continuing without it: {e}")
            roster_usernames = None
        
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
        max_cycles = needed_cycles * 15
        all_failed_users: list[str] = []
        attempts_today: dict[str, int] = {}
        final_failed_set: set[str] = set()
        final_failure_reasons: dict[str, str] = {}
        consecutive_no_progress_cycles = 0
        consecutive_non_retryable_no_progress = 0
        max_no_progress_cycles = 30
        
        while remaining and cycle_num < max_cycles:
            cycle_num += 1
            chunk = remaining[:members_per_cycle]
            total_cycles_est = max(1, (len(remaining) + members_per_cycle - 1) // members_per_cycle)
            print(f"🔄 [Multi-Cycle] Cycle {cycle_num}/{total_cycles_est} starting with {len(chunk)} members (remaining={len(remaining)})")
            print(f"🔍 [Multi-Cycle] Chunk usernames: {chunk[:10]}{'...' if len(chunk) > 10 else ''}")
            
            done_before = len(done)
            try:
                succeeded, failed, failed_users, failure_reasons = await collect_daily_player_stats_cycle(
                    chunk, cycle_num, total_cycles_est, start_index_base=done_before, roster_usernames=roster_usernames
                )
                print(f"✅ [Multi-Cycle] Cycle {cycle_num} finished: {succeeded} succeeded, {failed} failed (chunk={len(chunk)})")
                
                rate_limit_count = sum(1 for r in failure_reasons.values() if r and 'RATE_LIMIT' in r)
                timeout_count = sum(1 for r in failure_reasons.values() if r and 'TIMEOUT' in r)
                private_count = sum(1 for r in failure_reasons.values() if r and 'PRIVATE' in r)
                not_found_count = sum(1 for r in failure_reasons.values() if r and ('404' in r or 'NOT_FOUND' in r))
                not_in_roster_count = sum(1 for r in failure_reasons.values() if r and 'NOT_IN_ROSTER' in r)
                other_count = len(failure_reasons) - rate_limit_count - timeout_count - private_count - not_found_count - not_in_roster_count
                
                print(f"📊 [Multi-Cycle] Cycle {cycle_num} Failure Summary: RATE_LIMIT={rate_limit_count}, TIMEOUT={timeout_count}, PRIVATE={private_count}, NOT_FOUND={not_found_count}, NOT_IN_ROSTER={not_in_roster_count}, OTHER={other_count}")
                
                for u, reason in failure_reasons.items():
                    if len(final_failure_reasons) < 50:
                        final_failure_reasons[u] = reason
            except Exception as e:
                print(f"❌ [Multi-Cycle] Cycle {cycle_num} crashed: {e}")
                import traceback
                traceback.print_exc()
                failed_users = []
                failure_reasons = {}
                rate_limit_count = 0
                timeout_count = 0
            
            newly_finalized = []
            for u in failed_users:
                attempts_today[u] = attempts_today.get(u, 0) + 1
                if attempts_today[u] >= 3 and u not in final_failed_set:
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
            
            transient_failures = rate_limit_count + timeout_count
            transient_ratio = transient_failures / len(chunk) if len(chunk) > 0 else 0
            is_rate_limited = succeeded == 0 and transient_ratio >= 0.6
            
            if done_after == done_before and remaining_after:
                consecutive_no_progress_cycles += 1
                
                if is_rate_limited:
                    print(f"⚠️ [Multi-Cycle] No progress this cycle due to rate limiting ({consecutive_no_progress_cycles} total, {consecutive_non_retryable_no_progress} non-retryable); will back off and retry")
                else:
                    consecutive_non_retryable_no_progress += 1
                    print(f"⚠️ [Multi-Cycle] No progress this cycle ({consecutive_no_progress_cycles} total, {consecutive_non_retryable_no_progress} non-retryable); rotating remaining to avoid head-of-line blocking")
                
                if consecutive_non_retryable_no_progress >= 10:
                    print(f"🛑 [Multi-Cycle] Stopping after 10 consecutive non-retryable no-progress cycles")
                    all_failed_users.extend([u for u in remaining_after if u not in all_failed_users])
                    break
                
                if consecutive_no_progress_cycles >= max_no_progress_cycles:
                    print(f"🛑 [Multi-Cycle] Stopping after {max_no_progress_cycles} total consecutive cycles with no progress")
                    all_failed_users.extend([u for u in remaining_after if u not in all_failed_users])
                    break
                
                rot = min(members_per_cycle, len(remaining_after))
                remaining = remaining_after[rot:] + remaining_after[:rot]
                print(f"🔄 [Multi-Cycle] Rotated {rot} members to end of queue; new order: {remaining[:5]}...")
            else:
                consecutive_no_progress_cycles = 0  # Reset counter on progress
                consecutive_non_retryable_no_progress = 0
                remaining = remaining_after
                print(f"✅ [Multi-Cycle] Progress made: +{done_after - done_before} members completed")
            
            if not remaining:
                print(f"🎉 [Multi-Cycle] All members processed! Breaking out of cycle loop.")
                break
            
            if len(remaining) == 0:
                print(f"🎉 [Multi-Cycle] Confirmed: No remaining members. Job complete.")
                break
            
            if remaining:
                if is_rate_limited:
                    actual_delay = max(3.0, cycle_delay_minutes * 4)  # 3-5 minute backoff for rate limiting
                    print(f"⏳ [Multi-Cycle] Rate limiting detected, backing off for {actual_delay} minutes before next cycle...")
                elif consecutive_no_progress_cycles > 0:
                    actual_delay = cycle_delay_minutes * 2
                    print(f"⏳ [Multi-Cycle] Waiting {actual_delay} minutes before next cycle...")
                else:
                    actual_delay = cycle_delay_minutes
                    print(f"⏳ [Multi-Cycle] Waiting {actual_delay} minutes before next cycle...")
                await asyncio.sleep(actual_delay * 60)
        
        if cycle_num >= max_cycles and remaining:
            print(f"⚠️ [Multi-Cycle] WARNING: Hit max cycle limit ({max_cycles}) with {len(remaining)} members still remaining")
            print(f"🔍 [Multi-Cycle] Remaining members: {remaining[:20]}{'...' if len(remaining) > 20 else ''}")
            all_failed_users.extend([u for u in remaining if u not in all_failed_users])
            for username in remaining:
                if username not in final_failure_reasons:
                    final_failure_reasons[username] = "MAX_CYCLES_REACHED"
        
        dur = (datetime.utcnow() - start).total_seconds()
        final_done_count = len(done)
        final_remaining_count = expected_members - final_done_count
        
        if all_failed_users or final_failed_set:
            final_list = sorted(set(all_failed_users).union(final_failed_set))
            print(f"📋 [Multi-Cycle] FINAL FAILED LIST ({len(final_list)} members):")
            for u in final_list:
                reason = final_failure_reasons.get(u, "UNKNOWN")
                print(f"  - {u}: {reason}")
        
        print(f"🎉 [Multi-Cycle] Complete: {final_done_count}/{expected_members} members have a snapshot today in {dur/60:.1f} minutes")
        print(f"🔍 [Multi-Cycle] DEBUG: Final stats - cycles: {cycle_num}, remaining: {final_remaining_count}")
        
        success_rate = (final_done_count / expected_members * 100) if expected_members > 0 else 0
        print(f"📊 [Multi-Cycle] Success rate: {success_rate:.1f}% ({final_done_count}/{expected_members})")
        
        if final_remaining_count > 0:
            print(f"⚠️ [Multi-Cycle] {final_remaining_count} members still need snapshots - will retry in next scheduled run")
        
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

async def upsert_today_gain(conn, username: str, display_username: str, xp_gain: int, date_utc):
    """
    Upsert today's XP gain for a player into player_today_gains table.
    
    Args:
        conn: Database connection
        username: Username (mixed-case, used for PRIMARY KEY)
        display_username: Properly capitalized username for display
        xp_gain: XP gained today
        date_utc: UTC date for the snapshot
    """
    await conn.execute("""
        INSERT INTO player_today_gains (username, snapshot_date, overall_gain, display_username, updated_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT (username, snapshot_date)
        DO UPDATE SET
            overall_gain = EXCLUDED.overall_gain,
            display_username = EXCLUDED.display_username,
            updated_at = NOW()
    """, (username, date_utc, xp_gain, display_username))

async def upsert_today_skill_gains_unified(conn, username: str, display_username: str, snapshot_date, skill_gains: dict):
    """
    Upsert all skill XP gains for a player into the unified player_today_gains table.
    This replaces the old per-skill-row approach with a single-row-per-user approach.
    
    Args:
        conn: Database connection
        username: Username (mixed-case, used for PRIMARY KEY)
        display_username: Properly capitalized username for display
        snapshot_date: Date for the snapshot (usually today's date)
        skill_gains: Dictionary mapping skill names to XP gains
                     e.g., {'attack': 1000, 'defence': 500, 'overall': 5000}
    """
    try:
        from .skill_mapping import SKILL_NAMES, get_column_name
    except ImportError:
        from skill_mapping import SKILL_NAMES, get_column_name
    
    columns = ['username', 'snapshot_date', 'display_username', 'updated_at']
    values = [username, snapshot_date, display_username, 'NOW()']
    update_parts = ['display_username = EXCLUDED.display_username', 'updated_at = NOW()']
    
    for skill in SKILL_NAMES + ['overall']:
        column_name = get_column_name(skill)
        gain_value = max(0, skill_gains.get(skill, 0))
        columns.append(column_name)
        values.append(str(gain_value))
        update_parts.append(f"{column_name} = EXCLUDED.{column_name}")
    
    columns_str = ', '.join(columns)
    placeholders = ', '.join(['%s' if v != 'NOW()' else 'NOW()' for v in values])
    update_str = ', '.join(update_parts)
    
    param_values = [v for v in values if v != 'NOW()']
    
    sql = f"""
        INSERT INTO player_today_gains ({columns_str})
        VALUES ({placeholders})
        ON CONFLICT (username, snapshot_date)
        DO UPDATE SET {update_str}
    """
    
    await conn.execute(sql, param_values)

async def get_player_stats_for_periods(conn, username: str, period1: str, period2: str, reference_date: date = None):
    """Get player stats comparison between two time periods using consolidated snapshots.
    
    Args:
        conn: Database connection
        username: Player username
        period1: First period name (e.g., 'today', 'week')
        period2: Second period name (e.g., 'yesterday', 'month')
        reference_date: UTC reference date for period calculations. If None, uses date.today() (not recommended).
    """
    # Pass reference_date to ensure consistent date handling across the request
    d1 = get_date_for_period(period1, reference_date)
    d2 = get_date_for_period(period2, reference_date)

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

    # Pass reference_date to get_period_window for consistent date handling
    start1, end1 = get_period_window(period1, reference_date)
    start2, end2 = get_period_window(period2, reference_date)
    end1_json = await get_snapshot_json_on_or_before(conn, username, end1) or {}
    start1_json = await get_snapshot_json_on_or_before(conn, username, start1) or {}
    end2_json = await get_snapshot_json_on_or_before(conn, username, end2) or {}
    start2_json = await get_snapshot_json_on_or_before(conn, username, start2) or {}

    first_day = await get_first_snapshot_date(conn, username)
    baseline_json = await get_snapshot_json_on_or_before(conn, username, first_day) if first_day else {}

    for sk in set(list(changes.keys()) + list(end1_json.keys()) + list(start1_json.keys()) + list(end2_json.keys()) + list(start2_json.keys())):
        e1, s1 = end1_json.get(sk, {}), start1_json.get(sk, {})
        e2, s2 = end2_json.get(sk, {}), start2_json.get(sk, {})

        s1_xp = s1.get('xp') or 0
        e1_xp = e1.get('xp') or 0
        s2_xp = s2.get('xp') or 0
        e2_xp = e2.get('xp') or 0

        if first_day and start1 < first_day <= end1:
            b1 = (baseline_json.get(sk, {}) or {}).get('xp') or 0
            s1_xp = max(s1_xp, b1)
        if first_day and start2 < first_day <= end2:
            b2 = (baseline_json.get(sk, {}) or {}).get('xp') or 0
            s2_xp = max(s2_xp, b2)

        gain1 = max(0, e1_xp - s1_xp)
        gain2 = max(0, e2_xp - s2_xp)

        base = changes.get(sk, {'level_change': 0, 'xp_change': 0, 'rank_change': 0, 'xp_period1': e1_xp, 'xp_period2': e2_xp})
        base.update({'xp_gain_period1': gain1, 'xp_gain_period2': gain2})
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
    """Store a clan activity in the database and increment total_caps if it's a new cap activity"""
    try:
        print(f"  📝 [Store Activity] Storing for {username}: {text[:50]}...")
        
        cursor = await conn.execute("""
            INSERT INTO clan_activities (username, text, details, activity_date, activity_timestamp)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (username, text, activity_timestamp) DO NOTHING
            RETURNING id
        """, (username, text, details, activity_date, activity_timestamp))
        
        row = await cursor.fetchone()
        was_inserted = row is not None
        
        if was_inserted and text == 'Capped at my Clan Citadel.':
            await conn.execute("""
                UPDATE clan_members 
                SET total_caps = total_caps + 1 
                WHERE LOWER(username) = LOWER(%s)
            """, (username,))
            print(f"  🏰 [Store Activity] Incremented total_caps for {username}")
        
        print(f"  ✅ [Store Activity] Successfully stored activity for {username} (new: {was_inserted})")
    except Exception as e:
        print(f"  ❌ [Store Activity] Error storing activity for {username}: {e}")
        import traceback
        traceback.print_exc()

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
    """DISABLED: Activity logs are now kept indefinitely. This function is a no-op."""
    print("Activity log cleanup is disabled - logs are kept indefinitely")

async def backfill_total_caps_from_activities(conn):
    """Backfill total_caps in clan_members from historical activity logs.
    
    This is idempotent - it uses SET (not +=) so it can be run multiple times safely.
    """
    try:
        print("🔄 [Backfill] Starting total_caps backfill from activity logs...")
        
        result = await conn.execute("""
            UPDATE clan_members cm
            SET total_caps = COALESCE(caps.cnt, 0)
            FROM (
                SELECT username, COUNT(*) as cnt
                FROM clan_activities
                WHERE text = 'Capped at my Clan Citadel.'
                GROUP BY username
            ) caps
            WHERE LOWER(cm.username) = LOWER(caps.username)
        """)
        
        updated_count = result.split()[-1] if result else "0"
        print(f"✅ [Backfill] Updated total_caps for {updated_count} clan members")
        
        cursor = await conn.execute("""
            SELECT COUNT(DISTINCT username) FROM clan_activities WHERE text = 'Capped at my Clan Citadel.'
        """)
        row = await cursor.fetchone()
        total_users_with_caps = row[0] if row else 0
        print(f"📊 [Backfill] Total users with cap activities: {total_users_with_caps}")
        
    except Exception as e:
        print(f"❌ [Backfill] Error backfilling total_caps: {e}")
        import traceback
        traceback.print_exc()

def normalize_skill(skill: str | None) -> str:
    if not skill:
        return 'overall'
    s = skill.strip().lower()
    return 'overall' if s in ('overall', 'total', 'total xp', 'total_xp') else s

async def get_first_snapshot_date(conn, username: str):
    """
    Returns the earliest snapshot_date for a player from consolidated daily snapshots.
    Falls back to None if no snapshots exist.
    """
    cur = await conn.execute("""
        SELECT MIN(snapshot_date)
        FROM player_daily_snapshots
        WHERE username = %s
    """, (username,))
    row = await cur.fetchone()
    return row[0] if row and row[0] else None

async def get_xp_timeseries(conn, username: str, skill: str | None, view: str, year: int, month: int | None):
    """
    Build XP gain time-series for a username.
    - view: 'day' for daily within a (year, month); 'month' for monthly over a year
    - skill: None or 'overall' for total XP; otherwise lowercase skill name in stats JSON
    Returns:
    {
      'username': username,
      'skill': normalized_skill,
      'range': view,
      'year': year,
      'month': month or None,
      'points': [{ 'date': 'YYYY-MM-DD' or 'YYYY-MM', 'xp_end': int, 'xp_gain': int }],
      'start_xp': int,
      'end_xp': int,
      'total_gain': int
    }
    """
    sk = normalize_skill(skill)

    if view not in ('day', 'month'):
        raise ValueError("view must be 'day' or 'month'")

    import json
    from datetime import date, timedelta
    from calendar import monthrange

    if view == 'day':
        if month is None:
            raise ValueError("month is required for daily view")
        from datetime import date as date_class
        today = date_class.today()
        
        days_in_month = monthrange(year, month)[1]
        start_date = date(year, month, 1)
        
        if year == today.year and month == today.month:
            end_date = today
        else:
            end_date = date(year, month, days_in_month)
        
        prev_day = start_date - timedelta(days=1)

        cur = await conn.execute("""
            SELECT snapshot_date, stats
            FROM player_daily_snapshots
            WHERE username = %s
              AND snapshot_date BETWEEN %s AND %s
            ORDER BY snapshot_date ASC
        """, (username, prev_day, end_date))
        rows = await cur.fetchall()
        if sk == 'overall':
            snap_stats_by_day = {}
            for d, stats_json in rows:
                try:
                    stats_obj = stats_json if isinstance(stats_json, dict) else json.loads(stats_json)
                except Exception:
                    stats_obj = {}
                snap_stats_by_day[d] = stats_obj

            skill_keys = []
            if rows:
                any_stats = next(iter(snap_stats_by_day.values()), {}) or {}
                skill_keys = [k for k in any_stats.keys() if k != 'overall']

            first_day = await get_first_snapshot_date(conn, username)
            points = []
            last_known = {k: None for k in skill_keys}
            prev_vals = {k: None for k in skill_keys}
            d = prev_day
            while d <= end_date:
                if d in snap_stats_by_day:
                    stats = snap_stats_by_day[d] or {}
                    for k in skill_keys:
                        s = stats.get(k) or {}
                        v = int(s.get('xp') or 0)
                        last_known[k] = v
                if d == prev_day:
                    for k in skill_keys:
                        prev_vals[k] = (last_known[k] or 0)
                elif d >= start_date:
                    end_vals = {k: (last_known[k] if last_known[k] is not None else prev_vals[k] or 0) for k in skill_keys}
                    if first_day and d == first_day:
                        by_skill = {k: 0 for k in skill_keys}
                    else:
                        by_skill = {k: max(0, (end_vals[k] or 0) - (prev_vals[k] or 0)) for k in skill_keys}
                    xp_end_total = 0
                    if d in snap_stats_by_day and (snap_stats_by_day[d] or {}).get('overall'):
                        xp_end_total = int((snap_stats_by_day[d]['overall'] or {}).get('xp') or 0)
                    else:
                        xp_end_total = sum(end_vals.values())
                    points.append({
                        'date': d.isoformat(),
                        'xp_end': xp_end_total,
                        'xp_gain': sum(by_skill.values()),
                        'by_skill': by_skill
                    })
                    prev_vals = end_vals
                d += timedelta(days=1)
        else:
            snap_map = {}
            for d, stats_json in rows:
                try:
                    stats_obj = stats_json if isinstance(stats_json, dict) else json.loads(stats_json)
                except Exception:
                    stats_obj = {}
                s = stats_obj.get(sk) or {}
                xp = int(s.get('xp') or 0)
                snap_map[d] = xp

            first_day = await get_first_snapshot_date(conn, username)
            points = []
            last_known_xp = None
            prev_xp = None
            d = prev_day
            while d <= end_date:
                if d in snap_map:
                    last_known_xp = snap_map[d]
                if d == prev_day:
                    prev_xp = last_known_xp or 0
                elif d >= start_date:
                    xp_end = last_known_xp or prev_xp or 0
                    if first_day and d == first_day:
                        gain = 0
                    else:
                        gain = max(0, xp_end - (prev_xp or 0))
                    points.append({
                        'date': d.isoformat(),
                        'xp_end': xp_end,
                        'xp_gain': gain
                    })
                    prev_xp = xp_end
                d += timedelta(days=1)

        start_xp = 0
        if points:
            for d, stats_json in rows:
                if d == prev_day:
                    try:
                        stats_obj = stats_json if isinstance(stats_json, dict) else json.loads(stats_json or '{}')
                        if sk == 'overall':
                            if stats_obj and stats_obj.get('overall'):
                                start_xp = int(stats_obj['overall'].get('xp', 0))
                            else:
                                start_xp = sum(int((stats_obj.get(k, {}).get('xp', 0))) for k in stats_obj.keys() if k != 'overall')
                        else:
                            skill_data = stats_obj.get(sk, {})
                            start_xp = int(skill_data.get('xp', 0))
                    except Exception:
                        start_xp = 0
                    break
            
            if start_xp == 0 and points:
                first_nonzero_xp = None
                for point in points:
                    if point['xp_end'] > 0:
                        first_nonzero_xp = point['xp_end']
                        break
                if first_nonzero_xp is not None:
                    start_xp = first_nonzero_xp
        
        end_xp = points[-1]['xp_end'] if points else 0
        total_gain = sum(point['xp_gain'] for point in points)
        return {
            'username': username,
            'skill': sk,
            'range': 'day',
            'year': year,
            'month': month,
            'points': points,
            'start_xp': start_xp,
            'end_xp': end_xp,
            'total_gain': total_gain
        }

    else:
        from datetime import date as date_class
        today = date_class.today()
        
        prev_year_end = date(year - 1, 12, 31)
        if year == today.year:
            year_end = today
        else:
            year_end = date(year, 12, 31)

        cur = await conn.execute("""
            SELECT snapshot_date, stats
            FROM player_daily_snapshots
            WHERE username = %s
              AND snapshot_date BETWEEN %s AND %s
            ORDER BY snapshot_date ASC
        """, (username, prev_year_end, year_end))
        rows = await cur.fetchall()

        import json
        def month_end(d: date) -> date:
            from calendar import monthrange
            return date(d.year, d.month, monthrange(d.year, d.month)[1])

        if sk == 'overall':
            row_idx = 0
            day_cursor = prev_year_end
            xp_by_day_per_skill = {}
            last_known = {}
            skill_keys = []
            if rows:
                first_stats = rows[0][1] if isinstance(rows[0][1], dict) else json.loads(rows[0][1] or '{}')
                skill_keys = [k for k in (first_stats or {}).keys() if k != 'overall']
                
                baseline_skills = {}
                for snapshot_date, stats in rows:
                    stats_obj = stats if isinstance(stats, dict) else json.loads(stats or '{}')
                    has_data = False
                    for k in skill_keys:
                        skill_data = (stats_obj or {}).get(k) or {}
                        xp_value = int(skill_data.get('xp') or 0)
                        if xp_value > 0:
                            baseline_skills[k] = xp_value
                            has_data = True
                    if has_data:
                        break
                
                for k in skill_keys:
                    last_known[k] = baseline_skills.get(k, 0)

            while day_cursor <= year_end:
                while row_idx < len(rows) and rows[row_idx][0] <= day_cursor:
                    stats_obj = rows[row_idx][1] if isinstance(rows[row_idx][1], dict) else json.loads(rows[row_idx][1] or '{}')
                    for k in skill_keys:
                        skill_data = (stats_obj or {}).get(k) or {}
                        xp_value = int(skill_data.get('xp') or 0)
                        if xp_value > 0:
                            last_known[k] = xp_value
                    row_idx += 1
                xp_by_day_per_skill[day_cursor] = {k: (last_known.get(k) or 0) for k in skill_keys}
                day_cursor = day_cursor + timedelta(days=1)

            first_day = await get_first_snapshot_date(conn, username)
            points = []
            
            baseline_total_xp = sum(baseline_skills.values())
            prev_month_vals = baseline_skills.copy()
            
            for m in range(1, 13):
                m_start = date(year, m, 1)
                m_end = date(year, m, monthrange(year, m)[1])
                
                end_vals = None
                for check_date in sorted(xp_by_day_per_skill.keys(), reverse=True):
                    if m_start <= check_date <= m_end:
                        end_vals = xp_by_day_per_skill[check_date]
                        break
                
                if end_vals is None:
                    end_vals = prev_month_vals.copy()
                
                current_total_xp = sum(end_vals.values())
                prev_total_xp = sum(prev_month_vals.values())
                monthly_gain = max(0, current_total_xp - prev_total_xp)
                
                by_skill = {k: max(0, (end_vals.get(k, 0)) - (prev_month_vals.get(k, 0))) for k in skill_keys}
                points.append({
                    'date': f"{year}-{m:02d}",
                    'xp_end': current_total_xp,
                    'xp_gain': monthly_gain,
                    'by_skill': by_skill
                })
                prev_month_vals = end_vals.copy()

            if year == today.year:
                start_xp = sum(xp_by_day_per_skill.get(prev_year_end, {}).values())
                
                if start_xp == 0:
                    earliest_date_in_year = None
                    for check_date in sorted(xp_by_day_per_skill.keys()):
                        if check_date.year == year:
                            earliest_date_in_year = check_date
                            break
                    
                    if earliest_date_in_year:
                        start_xp = sum(xp_by_day_per_skill.get(earliest_date_in_year, {}).values())
            else:
                start_xp = sum(xp_by_day_per_skill.get(prev_year_end, {}).values())
            
            end_xp = sum(xp_by_day_per_skill.get(year_end, {}).values())
            
            total_gain = sum(point['xp_gain'] for point in points)
            return {
                'username': username,
                'skill': sk,
                'range': 'month',
                'year': year,
                'month': None,
                'points': points,
                'start_xp': start_xp,
                'end_xp': end_xp,
                'total_gain': total_gain
            }
        else:
            row_idx = 0
            last_known_xp = None
            day_cursor = prev_year_end
            day_end = year_end
            xp_by_day = {}
            while day_cursor <= day_end:
                while row_idx < len(rows) and rows[row_idx][0] <= day_cursor:
                    try:
                        stats_obj = rows[row_idx][1] if isinstance(rows[row_idx][1], dict) else json.loads(rows[row_idx][1] or '{}')
                    except Exception:
                        stats_obj = {}
                    skill_data = (stats_obj or {}).get(sk) or {}
                    last_known_xp = int(skill_data.get('xp') or 0)
                    row_idx += 1
                xp_by_day[day_cursor] = last_known_xp or 0
                day_cursor = day_cursor + timedelta(days=1)

            first_day = await get_first_snapshot_date(conn, username)
            points = []
            
            baseline_xp = 0
            earliest_date_in_year = None
            for check_date in sorted(xp_by_day.keys()):
                if check_date.year == year and xp_by_day[check_date] > 0:
                    baseline_xp = xp_by_day[check_date]
                    earliest_date_in_year = check_date
                    break
            
            prev_end_xp = xp_by_day.get(prev_year_end, 0)
            if prev_end_xp == 0 and baseline_xp > 0:
                prev_end_xp = baseline_xp
            
            prev_month_end_xp = 0  # Start from 0 for first month
            for m in range(1, 13):
                m_start = date(year, m, 1)
                m_end = date(year, m, monthrange(year, m)[1])
                
                month_end_xp = None
                for check_date in sorted(xp_by_day.keys(), reverse=True):
                    if m_start <= check_date <= m_end and xp_by_day[check_date] > 0:
                        month_end_xp = xp_by_day[check_date]
                        break  # Use the latest snapshot in the month
                
                if month_end_xp is None:
                    month_end_xp = prev_month_end_xp
                    gain = 0
                else:
                    if prev_month_end_xp == 0 and baseline_xp > 0:
                        gain = max(0, month_end_xp - baseline_xp)
                    else:
                        gain = max(0, month_end_xp - prev_month_end_xp)
                
                points.append({
                    'date': f"{year}-{m:02d}",
                    'xp_end': month_end_xp,
                    'xp_gain': gain
                })
                prev_month_end_xp = month_end_xp

            if year == today.year:
                start_xp = xp_by_day.get(prev_year_end, 0)
                
                if start_xp == 0:
                    earliest_date_in_year = None
                    for check_date in sorted(xp_by_day.keys()):
                        if check_date.year == year:
                            earliest_date_in_year = check_date
                            break
                    
                    if earliest_date_in_year:
                        start_xp = xp_by_day.get(earliest_date_in_year, 0)
            else:
                start_xp = xp_by_day.get(prev_year_end, 0)
            
            end_xp = xp_by_day.get(year_end, start_xp)
            
            total_gain = sum(point['xp_gain'] for point in points)
        return {
            'username': username,
            'skill': sk,
            'range': 'month',
            'year': year,
            'month': None,
            'points': points,
            'start_xp': start_xp,
            'end_xp': end_xp,
            'total_gain': total_gain
        }

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

async def store_clan_drop(conn, username: str, item_name: str, boss_name: str, item_image_url: str, activity_text: str, activity_timestamp: int):
    """Store a clan drop in the database with deduplication and image URL updates"""
    try:
        await conn.execute("""
            INSERT INTO clan_drops (username, item_name, boss_name, item_image_url, activity_text, activity_timestamp)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (username, item_name, activity_timestamp) 
            DO UPDATE SET 
                boss_name = EXCLUDED.boss_name,
                item_image_url = EXCLUDED.item_image_url,
                activity_text = EXCLUDED.activity_text
        """, (username, item_name, boss_name, item_image_url, activity_text, activity_timestamp))
    except Exception as e:
        print(f"Error storing drop for {username}: {e}")

async def get_player_drops_from_db(conn, username: str, limit: int = 50, offset: int = 0):
    """Get stored drops for a player from database"""
    try:
        cursor = await conn.execute("""
            SELECT item_name, boss_name, item_image_url, activity_text, activity_timestamp
            FROM clan_drops 
            WHERE username = %s
            ORDER BY activity_timestamp DESC 
            LIMIT %s OFFSET %s
        """, (username, limit, offset))
        
        rows = await cursor.fetchall()
        return [
            {
                'item_name': row[0],
                'boss_name': row[1], 
                'item_image_url': row[2],
                'activity_text': row[3],
                'timestamp': row[4],
                'date': datetime.fromtimestamp(row[4]).strftime('%d-%b-%Y %H:%M')
            }
            for row in rows
        ]
    except Exception as e:
        print(f"Error retrieving drops for {username}: {e}")
        return []

async def collect_daily_activities_and_drops(members_per_cycle: int = 8, cycle_delay_minutes: float = 1.0):
    """Collect daily activities and drops for all clan members using multi-cycle approach."""
    import asyncio
    import httpx
    import random
    from datetime import datetime
    from math import ceil
    
    print(f"🚀 [Activity Collection] Starting multi-cycle activity/drop collection at {datetime.utcnow().isoformat()}Z")
    
    try:
        try:
            from .main import fetch_clan_members, parse_and_store_drops_from_activities
        except ImportError:
            from main import fetch_clan_members, parse_and_store_drops_from_activities
        
        roster = await fetch_clan_members()
        all_usernames = [m.get('username') for m in roster if m.get('username')]
        print(f"📋 [Activity Collection] Members to process: {len(all_usernames)}")
        
        if not all_usernames:
            print(f"❌ [Activity Collection] No clan members found")
            return 0, 0
        
        cycle_num = 0
        needed_cycles = max(1, ceil(len(all_usernames) / members_per_cycle))
        max_cycles = needed_cycles * 2
        processed_members = 0
        failed_members = 0
        
        async def fetch_member_activities_with_retry(username: str, client, max_retries: int = 3):
            """Fetch activities for a single member with retry logic"""
            runemetrics_url = f"https://apps.runescape.com/runemetrics/profile/profile?user={username}&activities=20"
            
            for attempt in range(max_retries):
                try:
                    response = await client.get(runemetrics_url)
                    
                    if response.status_code == 200:
                        data = response.json()
                        activities = data.get('activities', [])
                        
                        member_activities = []
                        
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
                                        continue
                                
                                activity_timestamp = int(activity_date.timestamp())
                                current_time = datetime.now().timestamp()
                                if activity_timestamp < 0 or activity_timestamp > current_time + 86400:
                                    continue
                                
                                member_activities.append({
                                    'username': username,
                                    'text': activity['text'],
                                    'details': activity['details'],
                                    'date': datetime.fromtimestamp(activity_timestamp).strftime('%m-%d-%Y'),
                                    'timestamp': activity_timestamp
                                })
                            except (ValueError, KeyError):
                                continue
                        
                        return member_activities
                    
                    elif response.status_code == 429:
                        delay = min(3.0 * (2 ** attempt), 30.0)
                        await asyncio.sleep(delay)
                        continue
                    else:
                        if attempt < max_retries - 1:
                            await asyncio.sleep(1.5 ** attempt)
                            continue
                        return []
                        
                except Exception as e:
                    if attempt < max_retries - 1:
                        await asyncio.sleep(1.5 ** attempt)
                        continue
                    return []
            
            return []
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for i in range(0, len(all_usernames), members_per_cycle):
                cycle_num += 1
                batch = all_usernames[i:i + members_per_cycle]
                print(f"🔄 [Activity Collection] Cycle {cycle_num}/{needed_cycles} processing {len(batch)} members")
                
                for j, username in enumerate(batch):
                    if j > 0:
                        delay = random.uniform(2.0, 4.0)
                        await asyncio.sleep(delay)
                    
                    try:
                        activities = await fetch_member_activities_with_retry(username, client)
                        
                        if activities:
                            print(f"  📊 [Activity Collection] Fetched {len(activities)} activities for {username} (all ages)")
                            conn = await get_db_connection()
                            async with conn:
                                stored_count = 0
                                duplicate_count = 0
                                for activity in activities:
                                    try:
                                        await store_clan_activity(
                                            conn, 
                                            activity['username'], 
                                            activity['text'], 
                                            activity['details'], 
                                            activity['date'], 
                                            activity['timestamp']
                                        )
                                        stored_count += 1
                                    except Exception as e:
                                        error_str = str(e).lower()
                                        if 'unique' in error_str or 'duplicate' in error_str:
                                            duplicate_count += 1
                                        else:
                                            print(f"  ❌ [Activity Collection] Failed to store activity for {username}: {e}")
                                
                                drops_found = await parse_and_store_drops_from_activities(activities, username)
                                print(f"  🎯 [Activity Collection] Found {len(drops_found) if drops_found else 0} drops for {username}")
                            
                            print(f"✅ [Activity Collection] {username}: {stored_count} new, {duplicate_count} duplicates (total fetched: {len(activities)})")
                            processed_members += 1
                        else:
                            print(f"⚠️ [Activity Collection] No activities for {username} (none available or API error)")
                            processed_members += 1
                    
                    except Exception as e:
                        print(f"❌ [Activity Collection] Failed to process {username}: {e}")
                        import traceback
                        traceback.print_exc()
                        failed_members += 1
                
                if i + members_per_cycle < len(all_usernames):
                    cycle_delay = cycle_delay_minutes * 60
                    print(f"[Activity Collection] Waiting {cycle_delay}s before next cycle...")
                    await asyncio.sleep(cycle_delay)
        
        print(f"✅ [Activity Collection] Completed: {processed_members} processed, {failed_members} failed")
        return processed_members, failed_members
        
    except Exception as e:
        print(f"❌ [Activity Collection] Error: {e}")
        import traceback
        traceback.print_exc()
        return 0, 0
