# Stormlight — Architecture & System Documentation

> **Purpose**: Preserve a complete understanding of the current Stormlight implementation before beginning the multi-tenant platform rewrite. This document covers every major system, what worked, what failed, and what can be salvaged.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Schema](#database-schema)
7. [Authentication Flow](#authentication-flow)
8. [Snapshot Pipeline](#snapshot-pipeline)
9. [XP Tracking Systems](#xp-tracking-systems)
10. [Competition System](#competition-system)
11. [Badge System](#badge-system)
12. [Activity & Drop Tracking](#activity--drop-tracking)
13. [Scheduler System](#scheduler-system)
14. [Deployment Structure](#deployment-structure)
15. [Known Technical Debt](#known-technical-debt)
16. [Reusable Components & Features](#reusable-components--features)
17. [Systems That Should NOT Be Carried Forward](#systems-that-should-not-be-carried-forward)

---

## Project Overview

Stormlight is a RuneScape 3 clan website built for the "Stormlight" clan. It provides:

- Clan member tracking with live roster sync from the RS3 Clan API
- Per-player XP gain tracking (daily, weekly, monthly, yearly)
- Historical analytics with time-series charting
- Competitions (XP gain, level gain, boss kills, bingo-style drop grids)
- Discord OAuth2-authenticated member system with account linking
- Admin panel for clan management
- Badge/reward system with custom and automated badges
- Activity log and boss drop tracking from RuneMetrics
- Automated hourly data collection via background scheduler

**Production URL**: `https://stormlightrs.com`
**Test Environment**: `https://stormlightrs.com/test`

---

## Tech Stack

| Layer | Technology | Version/Details |
|-------|-----------|-----------------|
| **Backend** | FastAPI | v0.116+ with Uvicorn |
| **ORM** | Prisma (prisma-client-py) | v0.15+ with `recursive_type_depth = -1` |
| **Raw SQL** | psycopg (async) | v3.2+ — used alongside Prisma for snapshot/analytics queries |
| **Database** | PostgreSQL | Supabase-hosted (AWS us-east-1) |
| **Frontend** | React 18 + TypeScript | Vite 6 build system |
| **UI Library** | shadcn/ui | Radix primitives + Tailwind CSS 3 |
| **Charts** | Recharts | v2.12+ |
| **Auth** | Discord OAuth2 | via authlib + manual JWT |
| **Hosting** | Fly.io | Single machine, `iad` region |
| **Container** | Docker | Multi-stage: Node 18 (frontend) → Python 3.12 (backend) |

---

## Repository Structure

```
stormlight/
├── fly.toml                     # Fly.io app configuration
├── Dockerfile                   # Multi-stage build (frontend + backend)
├── deploy-backend.sh            # Deployment script with secrets
├── DEPLOYMENT.md                # Deployment guide
├── .gitignore
├── .dockerignore
│
├── stormlight-backend/
│   ├── pyproject.toml           # Poetry dependencies
│   ├── poetry.lock
│   ├── app/
│   │   ├── main.py              # ~12,000 lines — ALL API routes, scheduler, business logic
│   │   ├── database.py          # ~1,650 lines — SQL queries, snapshot collection, XP calculations
│   │   ├── admin_utils.py       # Admin logging, rank calculation, competition snapshots
│   │   ├── badge_config.py      # Badge definitions (skill, DXP, PvM, API badges)
│   │   ├── badge_utils.py       # Badge computation logic
│   │   ├── skill_mapping.py     # RS3 skill name normalization and column mapping
│   │   └── data/
│   │       └── boss_drops.json  # Boss drop dataset for drop detection
│   ├── prisma/
│   │   └── schema.prisma        # Database schema (13 models, 4 enums)
│   └── tests/
│
├── stormlight-frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── .env.production          # VITE_API_URL=https://stormlight.fly.dev
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx              # Router with auth gates
│   │   ├── main.tsx
│   │   ├── pages/               # 10 page components
│   │   ├── components/          # ~50+ components (UI, admin, tabs, profile, etc.)
│   │   ├── contexts/            # AuthContext, ThemeContext, ProfileGainsContext
│   │   ├── hooks/               # Custom hooks (toast, mobile, hover, page title, username style)
│   │   ├── utils/               # Shared utilities (ranks, skills, gradients, URL encoding)
│   │   ├── config/              # Theme configuration
│   │   └── styles/              # CSS modules
│   └── public/
│       └── assets/              # Skill icons, rank icons, badges, drop images, patterns
│
└── Root-level scripts:
    ├── check_duplicates.py
    ├── cleanup_kill_events.py
    ├── fix_incomplete_activities.py
    ├── get_boss_rare_drops.py
    ├── manual_collection_test.py
    ├── repopulate_drops.py
    ├── test_all_member_activities.py
    └── test_collection_system.py
```

---

## Backend Architecture

### Single-File Monolith (`main.py` — ~12,000 lines)

The entire backend lives in one file. It contains:

- **FastAPI app setup** (CORS, session middleware, rate limiting)
- **Discord OAuth2 flow** (login, callback, JWT issuance, account linking)
- **Clan member management** (RS3 API sync, leave detection, rank tracking)
- **Player stats endpoints** (profile, hiscores, XP history, analytics)
- **Competition CRUD** (create, join, leaderboards, bingo boards)
- **Badge management** (custom badge upload, assignment, system badge computation)
- **Activity/drop parsing** (RuneMetrics activity feed → structured drops)
- **Admin endpoints** (trigger snapshots, manage members, debug tools)
- **Hourly background scheduler** (snapshot collection, XP updates, activity scraping)
- **Wiki scraping** (Travelling Merchant, DailyScape data from RS Wiki)
- **Static file serving** (built frontend from `/static`)
- **SPA fallback** (catch-all route serves `index.html`)

### Dual Database Access Pattern

The backend uses **two separate database access methods**:

1. **Prisma ORM** — For structured CRUD operations (users, clan members, competitions, badges, admin logs)
2. **Raw psycopg (async)** — For performance-critical analytics queries, snapshot upserts, and complex aggregations

Both connect to the same Supabase PostgreSQL instance. This dual pattern was necessitated by Prisma's limitations with complex time-series queries.

### API Router Structure

All API routes are mounted under `/api/` via an `APIRouter` prefix. Key route groups:

| Route Group | Description |
|-------------|-------------|
| `/api/auth/*` | Discord OAuth login/callback, account linking |
| `/api/user/*` | Current user info, preferences, settings |
| `/api/members/*` | Clan member listing, active today, search |
| `/api/clan-member/{username}/*` | Individual player profile, stats, quests |
| `/api/player/{username}/*` | XP history, recent progress, analytics |
| `/api/hiscores/*` | Global RS3 hiscores with pagination |
| `/api/competitions/*` | Competition CRUD, leaderboards, entries |
| `/api/badges/*` | Badge management, assignment |
| `/api/admin/*` | Admin actions, snapshot triggers, debug |
| `/api/wiki/*` | Travelling Merchant, DailyScape |
| `/healthz` | Health check endpoint |

---

## Frontend Architecture

### Page Structure

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Dashboard with activity logs, clan stats, members active today |
| Test Home | `/test` | Experimental UI with immersive fantasy styling |
| Hiscores | `/hiscores` | Global RS3 hiscores with pagination |
| Clan Hiscores | `/clan-hiscores` | Clan-specific skill rankings |
| Members | `/members` | Full clan roster with rank sorting |
| Player Profile | `/clan-member/:username` | Tabbed profile (Skills, Drops, Activity, Quests, Analytics, Competitions, Log) |
| Competitions | `/competitions` | Active/past competition listing |
| Competition Detail | `/competitions/:id` | Leaderboard, bingo board, GP rewards |
| Admin Panel | `/admin` | Badge management, competition management, rank tracking, member logs |
| Login | (no route) | Discord OAuth login gate |
| Link Account | (no route) | RS username → Discord account linking |
| Terms | `/terms` | Terms of service |

### Key Components

- **AnimatedHeader** — Animated storm/cloud header with parallax layers and navigation ribbon
- **RibbonNav** — Navigation ribbon with page images (Home, Members, Hiscores, Competitions)
- **GlobalProfileHeader** — Player profile header with badges, rank, XP display
- **BingoBoard** — Drop competition bingo grid with image matching
- **CircularClanXPGraph** — Circular/radial XP visualization

### Contexts

- **AuthContext** — JWT-based auth state, Discord login flow, account linking
- **ThemeContext** — User theme preferences (ribbon color customization)
- **ProfileGainsContext** — Shared XP gains data across profile tabs

### Design System

- Custom dark fantasy theme built on shadcn/ui
- Parchment-style patterns and grid overlays
- Per-rank color tinting (gold for Owner, silver for Deputy Owner, etc.)
- Username gradient styling for senior ranks (Owner, Deputy Owner, Overseer)

---

## Database Schema

### Models (via Prisma)

| Model | Table | Purpose |
|-------|-------|---------|
| `User` | `users` | Discord-authenticated site users |
| `ClanMember` | `clan_members` | RS3 clan roster with stats, badges, join date |
| `Competition` | `competitions` | XP/level/boss/custom competitions |
| `CompetitionEntry` | `competition_entries` | Per-member competition participation |
| `CustomBadge` | `custom_badges` | Uploadable badge images with categories |
| `AdminLog` | `admin_logs` | Admin action audit trail |
| `ClanLog` | `clan_log` | Rank changes, join/leave events |
| `ClanActivity` | `clan_activities` | RuneMetrics activity feed entries |
| `ClanDrop` | `clan_drops` | Parsed boss drops with images |
| `PlayerDailySnapshot` | `player_daily_snapshots` | Daily XP snapshots (JSONB stats blob) |
| `PlayerStatsHistory` | `player_stats_history` | Per-skill historical snapshots |
| `PlayerStatChanges` | `player_stat_changes` | Computed daily XP/level deltas |
| `AccountLinkRequest` | `account_link_requests` | RS username ↔ Discord linking |

### Additional Raw SQL Tables

| Table | Purpose |
|-------|---------|
| `player_today_gains` | Unified per-skill daily XP gains (created via raw SQL) |

### Enums

- `CompetitionType`: `XP_GAIN`, `LEVEL_GAIN`, `BOSS_KILLS`, `CUSTOM`
- `AccountLinkStatus`: `PENDING`, `APPROVED`, `REJECTED`, `UNLINKED`
- `BadgeCategory`: `CUSTOM`, `SKILL`, `DXP`, `PVM`, `API`

---

## Authentication Flow

```
User clicks "Login with Discord"
  → Frontend calls GET /api/auth/discord
  → Backend returns Discord OAuth URL
  → User authenticates on Discord
  → Discord redirects to /api/auth/callback/discord?code=...
  → Backend exchanges code for Discord access token
  → Backend fetches Discord user info (identify + email scope)
  → Backend creates/updates User record
  → Backend checks if Discord ID is linked to a ClanMember
  → Backend issues JWT (stored in cookie + returned as query param)
  → Frontend stores JWT in localStorage
  → Subsequent requests send JWT via Authorization: Bearer header
  → If user not linked to a clan member, show LinkAccount flow
```

**Key Implementation Details:**
- OAuth callback always returns 302 redirect (never JSON) to avoid stuck callback URLs
- Duplicate OAuth code detection via in-memory set with lock
- JWT contains `discord_id`, `username`, `roles`
- Rate limiting on profile endpoints via IP-based middleware
- `lastSeenAt` updated on every authenticated request

---

## Snapshot Pipeline

The snapshot system collects daily XP data for all clan members.

### Collection Flow

```
Hourly Scheduler Tick
  → Check if hour changed (deduplicate within same hour)
  → Acquire PostgreSQL advisory lock (prevent multi-machine duplication)
  → Step 1: Sync clan roster from RS3 Clan API
  → Step 2: Detect member leaves (compare API roster vs DB)
  → Step 3: Multi-cycle snapshot collection
      For each member:
        → Fetch stats from RuneMetrics profile API
        → Upsert into player_daily_snapshots (JSONB blob)
        → Calculate XP deltas vs previous snapshot
        → Store in player_stat_changes
  → Step 4: Activity & drop collection from RuneMetrics
  → Step 5: Update competition XP for active competitions
  → Step 6: Update per-skill today gains
  → Step 7: Release advisory lock
```

### Multi-Cycle Approach

To avoid RuneMetrics rate limits, members are processed in batches:
- ~60 members processed across 4-5 cycles
- ~10 members per cycle
- Short delay between cycles (~18 seconds)
- Total collection time: ~2-3 minutes per full run

### Data Sources

| Source | URL Pattern | Data Retrieved |
|--------|------------|----------------|
| RS3 Clan API | `clan-hiscores/members_lite.ws?clanName=Stormlight` | Roster, ranks, total XP, kills |
| RuneMetrics Profile | `apps/runemetrics/profile/profile?user=X&activities=20` | Per-skill XP/levels, recent activities |
| RuneMetrics Quests | `apps/runemetrics/quests?user=X` | Quest completion data |
| RS3 Hiscores | `m=hiscore/index_lite.ws?player=X` | Global hiscore rankings |

---

## XP Tracking Systems

### 1. Daily Snapshots (`player_daily_snapshots`)

- Full skill stats JSONB blob stored once per day per member
- Baseline for all XP gain calculations
- Created during hourly scheduler run
- Provides `xp_today = live_xp - snapshot_xp`

### 2. Today Gains (`player_today_gains`)

- Unified table with one column per skill (`attack_gain`, `defence_gain`, etc.)
- Updated hourly with `live_xp - baseline_snapshot`
- Used by "Members Active Today" panel and profile analytics
- Raw SQL table (not in Prisma schema)

### 3. Stats History (`player_stats_history` + `player_stat_changes`)

- Per-skill snapshots over time
- Computed deltas for day/week/month/year views
- Powers the Analytics tab time-series charts

### 4. Live XP (Competition Updates)

- During active competitions, hourly scheduler fetches live XP from RuneMetrics
- Updates `xpEnd` on competition entries
- Calculates `xpGained = xpEnd - xpStart`

### Gain Period Calculation

```python
def get_date_for_period(period: str) -> date:
    # "today" → today's date
    # "yesterday" → today - 1
    # "week" → most recent Monday
    # "month" → 1st of current month
    # "year" → January 1st of current year
```

XP gain for a period = `current_snapshot.xp - period_start_snapshot.xp`

---

## Competition System

### Types

1. **XP_GAIN** — Track total or skill-specific XP gained during competition window
2. **LEVEL_GAIN** — Track levels gained (not currently fully implemented)
3. **BOSS_KILLS** — Boss kill competitions (not currently fully implemented)
4. **CUSTOM** — Bingo-style drop grid competitions

### Bingo Board (Drop Grid)

- Admin creates a grid of boss drops (e.g., 5x5)
- Each cell has an item name, boss name, and image
- Members mark cells as completed when they get the drop
- Auto-detection via RuneMetrics activity feed
- Bingo line detection (horizontal, vertical, diagonal)

### Competition Lifecycle

1. Admin creates competition with date range and type
2. Members join (or auto-join for certain types)
3. Scheduler updates XP hourly during active window
4. Start snapshot captured at competition start
5. End snapshot captured at competition end
6. Leaderboard calculated from `xpGained = xpEnd - xpStart`
7. Optional badge reward assigned to winners

---

## Badge System

### Badge Categories

| Category | Description |
|----------|-------------|
| **Rank Badges** | Computed from clan rank (Owner → Recruit) with per-rank colors |
| **Achievement Badges** | Maxed, Master Maxed, Max XP, Quest Cape |
| **Skill Badges** | 29 skill competition winner badges |
| **DXP Badges** | Double XP event participation tiers |
| **PvM Badges** | Boss kill achievement badges |
| **Custom Badges** | Admin-uploaded custom badge images |

### Senior Rank Gradient System

Owner, Deputy Owner, and Overseer get personalized gradient backgrounds on their rank badge. Specific usernames map to custom gradient color pairs (e.g., "lm Kyle" → purple-to-blue).

---

## Activity & Drop Tracking

### Activity Collection

1. Fetch RuneMetrics profile with `activities=20` parameter
2. Parse activity text for boss drop patterns
3. Store raw activities in `clan_activities`
4. Extract drops into `clan_drops` with boss attribution

### Drop Detection

- Boss drops dataset (`boss_drops.json`) maps bosses → possible rare drops
- Reverse lookup: item name → possible bosses
- Activity text parsed to identify drops (e.g., "I found a Seismic wand")
- Drop images sourced from local asset manifest

---

## Scheduler System

### Architecture

- Single `asyncio` background task created at startup
- 120-second initial delay before first run
- 300-second (5-minute) tick interval
- Hour-change detection triggers full hourly task suite
- PostgreSQL advisory locks prevent duplicate runs across Fly.io machines

### Hourly Task Sequence

1. **Clan Member Sync** — Fetch RS3 roster, update DB
2. **Leave Detection** — Compare API roster vs DB, mark leavers
3. **Snapshot Collection** — Multi-cycle stats collection from RuneMetrics
4. **Activity & Drop Collection** — Parse RuneMetrics activity feeds
5. **Competition XP Update** — Update active competition entries
6. **Today Gains Calculation** — Compute per-skill daily gains
7. **Per-Skill Gains Update** — Unified skill gain table update

### Rate Limit Mitigation

- Staggered member processing (10 per cycle, 18s between cycles)
- Random delays between individual requests
- Timeout handling with graceful fallback
- Advisory locks to prevent multi-machine duplication

---

## Deployment Structure

### Fly.io Configuration

```toml
app = "stormlight"
primary_region = "iad"          # US East (Virginia)
internal_port = 8000
force_https = true
auto_stop_machines = false      # Always running for scheduler
min_machines_running = 1
```

### Docker Build

```
Stage 1 (frontend): node:18-alpine
  → npm ci → npm run build → /frontend/dist

Stage 2 (backend): python:3.12-slim
  → poetry install → prisma generate → copy app + static
  → CMD: uvicorn app.main:app
```

### Volume Mount

```toml
[mounts]
  source = "badge_uploads"
  destination = "/app/uploads"
```

Badge images uploaded by admins are stored on a persistent Fly.io volume.

### Health Check

```
GET /healthz → {"status": "ok"}
Interval: 10s, Timeout: 2s, Grace: 5s
```

---

## Known Technical Debt

### Critical Issues

1. **12,000-line monolith** (`main.py`) — All business logic in one file with no module separation
2. **Dual ORM pattern** — Prisma + raw psycopg accessing the same tables, creating maintenance burden
3. **Hardcoded clan name** — "Stormlight" is hardcoded in ~15 places across backend and frontend
4. **Secrets in deploy script** — `deploy-backend.sh` and `DEPLOYMENT.md` contain plaintext DB password, Discord secrets, JWT key
5. **RuneMetrics dependency** — Live XP tracking relies on RuneMetrics API which has rate limits, downtime, and inconsistent availability
6. **No test coverage** — `tests/` directory is empty; test scripts at root level are one-off manual scripts
7. **CORS allow all** — `allow_origins=["*"]` in production

### Moderate Issues

8. **In-memory caching** — Clan member cache, OAuth code deduplication, rate limit state — all lost on restart
9. **No migration system** — Schema changes via `prisma db push` (non-destructive but no rollback)
10. **Frontend .env.production** points to `stormlight.fly.dev` not `stormlightrs.com`
11. **Mixed datetime handling** — Some naive, some timezone-aware datetimes
12. **Fragile activity parsing** — Regex-based drop detection from activity text is brittle
13. **No pagination on several endpoints** — Some member/activity lists fetch all records

### Minor Issues

14. **Duplicate imports** — `asyncio`, `Path`, `time` imported multiple times
15. **Inconsistent error handling** — Mix of try/except with print vs proper HTTP errors
16. **Dead code** — Several unused utility functions and commented-out endpoints

---

## Reusable Components & Features

### Worth Preserving for Rewrite

| Component | Location | Notes |
|-----------|----------|-------|
| **Skill mapping** | `skill_mapping.py` | Clean RS3 skill normalization, column mapping |
| **Badge computation** | `badge_utils.py` | Achievement badge logic (maxed, quest cape, etc.) |
| **Badge config** | `badge_config.py` | All 29 skill badge definitions with colors |
| **Boss drops dataset** | `data/boss_drops.json` | Comprehensive boss → drop mapping |
| **XP tables** | `main.py:207-213` | RS3 and Elite XP level calculation tables |
| **Rank hierarchy** | `admin_utils.py` + `badge_utils.py` | Rank names, priorities, longevity rules |
| **Frontend UI components** | `components/ui/*` | Full shadcn/ui component library |
| **Profile tab system** | `components/tabs/*` | Skills, Drops, Activity, Quests, Analytics, Competitions tabs |
| **Chart components** | Analytics tab, CircularClanXPGraph | Recharts-based XP visualizations |
| **Theme system** | `contexts/ThemeContext.tsx` | User-customizable theme with ribbon colors |
| **Username styling** | `utils/usernameColorUtils.ts` + `useUsernameStyle.ts` | Gradient username rendering |
| **Rank utilities** | `utils/ranks.ts` | Rank sorting, display, icon mapping |
| **Drop image manifest** | `public/assets/drops/manifest.json` | 100+ boss drop images with mappings |
| **Skill icons** | `public/assets/skills/` | All 29 RS3 skill icons |
| **Animated header** | `AnimatedHeader.tsx/.css` | Storm cloud parallax animation |

### Design Patterns Worth Keeping

- JWT-based auth with Discord OAuth (but extract to service)
- Advisory lock pattern for scheduler deduplication
- Multi-cycle rate-limit-aware data collection
- Snapshot-based XP gain calculation methodology
- Bingo board competition format

---

## Systems That Should NOT Be Carried Forward

### 1. RuneMetrics as Primary XP Source

**Problem**: RuneMetrics API is rate-limited, unreliable, and returns inconsistent data. Building the core XP tracking on it created the #1 source of bugs.

**Recommendation**: Use RS3 Hiscores as the canonical data source. RuneMetrics can be optional/supplemental.

### 2. Single-File Backend Monolith

**Problem**: 12,000 lines in one file makes development, testing, and code review nearly impossible.

**Recommendation**: Proper module separation (routes, services, models, utils).

### 3. Dual Database Access (Prisma + Raw SQL)

**Problem**: Two different ways to access the same database creates consistency issues and doubles the maintenance surface.

**Recommendation**: Pick one. Raw SQL via psycopg is more flexible for analytics; Prisma is better for CRUD. Consider SQLAlchemy as a unified middle ground.

### 4. In-Memory State Management

**Problem**: Rate limit counters, OAuth code dedup, member caches — all lost on restart or multi-machine deployment.

**Recommendation**: Use Redis or database-backed state for anything that must survive restarts.

### 5. Hardcoded Single-Clan Architecture

**Problem**: "Stormlight" clan name hardcoded everywhere, no tenant isolation, no concept of multiple clans.

**Recommendation**: Multi-tenant design from day one with `clan_id` foreign keys on all data tables.

### 6. Secrets in Source Control

**Problem**: `deploy-backend.sh` and `DEPLOYMENT.md` contain plaintext database passwords and API secrets.

**Recommendation**: Use Fly.io secrets management exclusively. Remove all secrets from committed files.
