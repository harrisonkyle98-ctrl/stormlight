# Stormlight — Transition Guide

> **Purpose**: Actionable guide for the future platform rewrite, summarizing what worked, what failed, what to salvage, and how to cleanly separate from the current implementation.

---

## What Worked

### 1. Core Concept
A clan-specific dashboard with XP tracking, competitions, and Discord auth proved viable and engaging. The feature set is a strong product-market fit for the RS3 clan community.

### 2. Snapshot-Based XP Tracking
The daily snapshot methodology (`today_xp = live_xp - baseline_snapshot`) is sound and produces accurate gain data. The multi-period comparison (day/week/month/year) gives users meaningful analytics.

### 3. Competition System
XP competitions with date ranges and leaderboards worked well. The bingo board (drop grid) format was unique and engaging. Both should be preserved.

### 4. Badge System
Automated achievement badges (Maxed, Quest Cape) plus custom admin-uploaded badges created a compelling reward system. The badge config structure is clean and extensible.

### 5. Discord OAuth Flow
The Discord login → account linking → JWT flow works reliably. The redirect-only callback pattern (no JSON responses from OAuth endpoint) eliminated common frontend integration issues.

### 6. Advisory Lock Pattern
Using PostgreSQL `pg_try_advisory_lock()` to prevent duplicate scheduler runs across multiple Fly.io machines is elegant and reliable.

### 7. Frontend UI/UX
The fantasy-themed dark UI with storm animations, parchment patterns, and rank-colored styling created a distinctive visual identity. The shadcn/ui foundation provides a solid component library.

### 8. Multi-Cycle Rate Limit Strategy
Processing members in batches with delays between cycles successfully avoided RuneMetrics rate limits while still completing full collection within an hour.

---

## What Failed

### 1. RuneMetrics as Primary Data Source
RuneMetrics API is rate-limited, returns inconsistent data, has frequent downtime, and was the #1 source of bugs. Building core XP tracking on it was a mistake.

### 2. Single-File Backend
12,000 lines in `main.py` made development painful, debugging difficult, and code review impossible. No function could be tested in isolation.

### 3. Dual ORM (Prisma + psycopg)
Using two different database access patterns on the same tables created inconsistency and doubled the maintenance surface area.

### 4. In-Memory State
Rate limit counters, OAuth code deduplication, and member caches are all in-memory. They're lost on restart and don't work with multiple machines.

### 5. No Test Coverage
Zero automated tests meant every deployment was a manual verification exercise. Regressions were caught in production.

### 6. Secrets in Git
Database passwords and API keys committed in `deploy-backend.sh` and `DEPLOYMENT.md` — a security incident waiting to happen.

---

## What Can Be Salvaged

### Direct Reuse (copy into new project)

| Asset | Source | Notes |
|-------|--------|-------|
| Skill mapping & normalization | `skill_mapping.py` | Universal RS3 skill names/columns |
| XP level tables | `main.py:207-213` | Standard + Elite XP tables |
| Boss drops dataset | `data/boss_drops.json` | Boss → drop item mapping |
| Badge definitions | `badge_config.py` | 29 skill badges with colors |
| Badge computation logic | `badge_utils.py` | Achievement detection |
| Rank hierarchy | `admin_utils.py:21-46` | RS3 rank names + longevity rules |
| All frontend assets | `public/assets/` | Skill/rank/drop/badge icons |
| shadcn/ui components | `components/ui/` | Full component library |
| Drop image manifest | `public/assets/drops/manifest.json` | Image filename mappings |

### Conceptual Reuse (rebuild with same design)

| Concept | Notes |
|---------|-------|
| Snapshot → gain calculation | Same math, cleaner implementation |
| Advisory lock deduplication | Same pattern for scheduler coordination |
| Multi-cycle batch processing | Same strategy for rate limit management |
| Competition types & lifecycle | Same feature set, multi-tenant aware |
| Bingo board drop grid | Same UI, better detection pipeline |
| Discord OAuth → JWT flow | Same auth pattern, extract to service |
| Profile tab system | Same UX structure (Skills, Drops, Activity, etc.) |

---

## Fly.io Access — What Devin Needs

To properly inspect and document the current deployment infrastructure, Devin needs access to the Fly.io account. Here's what's needed and how to grant it:

### Option A: Fly.io Auth Token (Recommended)

1. Go to https://fly.io/user/personal_access_tokens
2. Create a new token named "Devin Access" with an expiration
3. Provide the token to Devin as a secret

**Required permissions**: Read-only is sufficient for archival work. Specifically:
- `flyctl status -a stormlight` — View app status
- `flyctl secrets list -a stormlight` — List secret names (not values)
- `flyctl volumes list -a stormlight` — List attached volumes
- `flyctl ssh console -a stormlight` — SSH for badge image export
- `flyctl logs -a stormlight` — View recent logs

### Option B: Interactive Login

1. Devin runs `flyctl auth login`
2. This opens a browser for Fly.io authentication
3. User authenticates in the browser
4. Session persists for the terminal session

### What Devin Will NOT Do

- Will NOT deploy or modify the running app
- Will NOT delete or stop machines
- Will NOT modify secrets
- Will NOT remove volumes or domains
- Will NOT make any destructive changes

### What Devin Will Do

- Inspect current deployment configuration
- List secrets (names only) to confirm env var inventory
- Check volume status and size
- Export badge images from volume (if accessible)
- Document Fly.io-specific configuration
- Check DNS/certificate status

---

## Pre-Migration Checklist

Before starting any rewrite implementation:

- [ ] Full `pg_dump` of production database stored safely
- [ ] Badge images exported from Fly.io volume (`/app/uploads/badges/`)
- [ ] All secrets rotated (DB password, Discord secret, JWT key)
- [ ] Current `flyctl status` output documented
- [ ] Current `flyctl secrets list` output documented
- [ ] Current DNS configuration documented
- [ ] Fly.io access granted to Devin (for inspection only)
- [ ] New domain selected for platform
- [ ] Decision on: new Supabase project vs. schema migration on existing
- [ ] Decision on: new Discord OAuth app vs. update existing
- [ ] Decision on: Hiscores-only vs. Hiscores + optional RuneMetrics

---

## Recommended Architecture for New Platform

```
Platform (new domain, e.g., rsclans.com)
│
├── API Layer (FastAPI, modular)
│   ├── routes/
│   │   ├── auth.py          (Discord OAuth, JWT)
│   │   ├── clans.py         (Clan CRUD, onboarding)
│   │   ├── members.py       (Per-clan member management)
│   │   ├── stats.py         (XP tracking, analytics)
│   │   ├── competitions.py  (Competition CRUD, leaderboards)
│   │   ├── badges.py        (Badge management)
│   │   └── admin.py         (Per-clan admin actions)
│   ├── services/
│   │   ├── hiscores.py      (RS3/OSRS hiscore fetching)
│   │   ├── runemetrics.py   (Optional live XP supplement)
│   │   ├── snapshot.py      (Snapshot collection engine)
│   │   └── scheduler.py     (Background job coordination)
│   └── models/
│       └── (SQLAlchemy/Prisma models with clan_id FK)
│
├── Background Workers
│   ├── Per-clan snapshot collection (configurable frequency)
│   ├── Competition XP updates
│   └── Activity/drop scraping (optional per clan)
│
├── Database (PostgreSQL)
│   ├── clans                 (NEW: tenant table)
│   ├── clan_members          (+ clan_id FK)
│   ├── player_snapshots      (+ clan_id FK)
│   ├── competitions          (+ clan_id FK)
│   └── ... (all tables get clan_id)
│
├── Cache (Redis)
│   ├── Rate limit state
│   ├── Session cache
│   ├── RS API response cache
│   └── Scheduler coordination
│
└── Frontend (React + Vite + shadcn/ui)
    ├── Landing page (clan directory)
    ├── Clan portal (/:clanSlug/*)
    ├── Self-service onboarding
    └── Per-clan theming
```

### Key Design Principles

1. **Clan ID everywhere** — Every data record belongs to a clan
2. **Hiscores-first** — RS3/OSRS Hiscores as canonical XP source
3. **Optional RuneMetrics** — Live XP as a premium/optional supplement
4. **Modular backend** — One file per route group, services layer for business logic
5. **Redis state** — No in-memory caching or coordination
6. **Proper testing** — pytest for backend, Vitest for frontend
7. **CI/CD pipeline** — Automated linting, testing, and deployment
8. **Game-type aware** — RS3 and OSRS have different APIs, skills, and rank systems

---

## Data Migration Strategy

### Phase 1: Export Current Data

```bash
# Full database export
pg_dump "$DATABASE_URL" > stormlight_backup_$(date +%F).sql

# Badge images export (requires Fly.io access)
flyctl ssh sftp get /app/uploads/badges/ ./badge_backup/ -a stormlight
```

### Phase 2: Transform for Multi-Tenancy

1. Create `clans` table with Stormlight as first entry
2. Add `clan_id` column to all data tables
3. Populate `clan_id` with Stormlight's ID for all existing records
4. Add foreign key constraints
5. Update all queries to filter by `clan_id`

### Phase 3: Validate

1. Compare record counts pre/post migration
2. Verify XP gain calculations produce same results
3. Verify competition leaderboards unchanged
4. Verify member profiles load correctly

---

## Timeline Considerations

| Phase | Estimated Effort | Dependencies |
|-------|-----------------|--------------|
| Database export & backup | 1 hour | Fly.io access |
| Badge image export | 30 minutes | Fly.io SSH access |
| Secret rotation | 1 hour | Supabase admin, Discord dev portal |
| New project scaffolding | 2-3 days | Architecture decisions |
| Multi-tenant schema design | 2-3 days | Data model decisions |
| Auth service (Discord OAuth) | 1-2 days | New Discord app (if needed) |
| Core API (members, stats) | 3-5 days | Schema complete |
| Snapshot engine | 2-3 days | Core API complete |
| Competition system | 2-3 days | Core API complete |
| Frontend port | 5-7 days | API complete |
| Data migration | 1-2 days | Both systems running |
| DNS cutover | 1 hour | New platform validated |

**Total estimated**: 3-5 weeks for full platform rewrite with data migration.

The current production site should remain running throughout this entire process.
