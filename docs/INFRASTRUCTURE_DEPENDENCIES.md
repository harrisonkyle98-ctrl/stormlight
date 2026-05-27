# Stormlight — Infrastructure Dependency Report

> **Purpose**: Identify every infrastructure dependency, environment variable, hardcoded reference, and single-clan assumption to prepare for clean separation into the future multi-tenant platform.

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Hardcoded Domain References](#hardcoded-domain-references)
3. [Hardcoded Clan Name References](#hardcoded-clan-name-references)
4. [Single-Clan Assumptions](#single-clan-assumptions)
5. [External Service Dependencies](#external-service-dependencies)
6. [Fly.io Infrastructure](#flyio-infrastructure)
7. [Supabase / Database](#supabase--database)
8. [Discord OAuth2](#discord-oauth2)
9. [RuneScape APIs](#runescape-apis)
10. [Static Assets & Volumes](#static-assets--volumes)
11. [Migration Risk Assessment](#migration-risk-assessment)

---

## Environment Variables

### Required (5 variables — set as Fly.io secrets)

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:***@52.22.132.208:5432/postgres` |
| `DISCORD_CLIENT_ID` | Discord OAuth app client ID | `1412974739340791900` |
| `DISCORD_CLIENT_SECRET` | Discord OAuth app secret | `bJlBq3K1fB3N4dOprcnoL5IFG_WU4YQn` |
| `JWT_SECRET_KEY` | JWT signing key | 64-char random string |
| `DISCORD_REDIRECT_URI` | OAuth callback URL | `https://stormlightrs.com/api/auth/callback/discord` |

### Implicit / Hardcoded in Code

| Variable | Location | Default |
|----------|----------|---------|
| `CLAN_NAME` | `main.py:3374` | `"Stormlight"` (env var with fallback) |
| `FLY_MACHINE_ID` | `main.py:10180` | `"local"` (provided by Fly.io runtime) |
| `PORT` | `fly.toml:9` | `8000` |
| `PYTHONPATH` | `fly.toml:10` | `/app` |
| `VITE_API_URL` | `.env.production` | `https://stormlight.fly.dev` |

### Frontend Build-Time Variables

| Variable | File | Value |
|----------|------|-------|
| `VITE_API_URL` | `stormlight-frontend/.env.production` | `https://stormlight.fly.dev` |

**Note**: The frontend uses `VITE_API_URL` at build time. In production, the built frontend is served by the backend from `/static`, so API calls go to the same origin. The `.env.production` value is effectively a fallback.

---

## Hardcoded Domain References

### `stormlightrs.com` (10 occurrences)

| File | Line(s) | Context |
|------|---------|---------|
| `stormlight-backend/app/main.py` | 2080 | OAuth redirect URI fallback |
| `stormlight-backend/app/main.py` | 11245 | User-Agent header for wiki scraping |
| `stormlight-frontend/src/pages/PlayerProfile.tsx` | 398 | Badge image URL prefix |
| `stormlight-frontend/src/components/admin/BadgeManagementTab.tsx` | 433, 496, 538, 581, 626, 672 | Badge image URL prefix (6 occurrences) |
| `stormlight-frontend/src/components/profile/GlobalProfileHeader.tsx` | 732 | Badge image URL prefix |
| `stormlight-frontend/src/components/BingoBoard.tsx` | 149, 194 | Drop image URL prefix |
| `deploy-backend.sh` | 10, 18, 19, 20 | Deploy script URLs |
| `DEPLOYMENT.md` | Multiple | Documentation references |

### `stormlight.fly.dev` (2 occurrences)

| File | Line(s) | Context |
|------|---------|---------|
| `stormlight-frontend/.env.production` | 1 | Frontend API URL |
| `DEPLOYMENT.md` | 101 | Documentation reference |

### Impact for Migration

All `stormlightrs.com` references in frontend code serve as URL prefixes for badge/drop images. In a multi-tenant platform, these should be replaced with relative paths or a configurable base URL. The backend OAuth fallback should be removed in favor of requiring the `DISCORD_REDIRECT_URI` env var.

---

## Hardcoded Clan Name References

### Backend — `"Stormlight"` (12 occurrences in `main.py`)

| Line | Context | Type |
|------|---------|------|
| 101 | `FastAPI(title="Stormlight Clan API")` | App title |
| 2367 | Error message: "not a member of the Stormlight clan" | User-facing error |
| 3374 | `os.getenv("CLAN_NAME", "Stormlight")` | Hiscores response |
| 4829 | Clan API URL: `clanName=Stormlight` | RS3 API call |
| 5148 | Response: `"clan_name": "Stormlight"` | API response |
| 5155 | Clan API URL: `clanName=Stormlight` | RS3 API call |
| 5205 | Response: `"clan_name": "Stormlight"` | API response |
| 5219 | Response: `"clan_name": "Stormlight"` | API response |
| 5227 | Response: `"clan_name": "Stormlight"` | API response |
| 9391 | Clan API URL: `clanName=Stormlight` | RS3 API call (admin trigger) |
| 9717 | Clan API URL: `clanName=Stormlight` | RS3 API call (repopulate drops) |
| 11245 | User-Agent string | Wiki scraping |

### Frontend — `"Stormlight"` (8 occurrences)

| File | Line | Context |
|------|------|---------|
| `pages/Login.tsx` | 53, 82 | "Welcome to the Stormlight clan dashboard" |
| `pages/Terms.tsx` | 36, 45 | Terms of service text |
| `hooks/usePageTitle.ts` | 10 | Page title prefix: `"Stormlight | {title}"` |
| `components/Navbar.tsx` | 47 | Nav brand text |
| `components/Footer.tsx` | 31 | Copyright text |
| `index.css` | 42, 45 | CSS comments |

---

## Single-Clan Assumptions

These are architectural decisions that assume only one clan exists. Each must be addressed for multi-tenancy.

### 1. Global Clan Member Table

**Current**: `clan_members` table has no `clan_id` — all members belong to "Stormlight" implicitly.

**Impact**: Every query assumes all members are from one clan. Multi-tenant requires `clan_id` FK on `clan_members`, `clan_activities`, `clan_drops`, `clan_log`, `player_daily_snapshots`, `player_stats_history`, `player_stat_changes`, `player_today_gains`, `competitions`, `competition_entries`.

### 2. Single Scheduler

**Current**: One background scheduler loop fetches data for one clan's members.

**Impact**: Multi-tenant needs per-clan scheduling, or a single scheduler that iterates over all clans with appropriate rate limiting.

### 3. Fixed RS3 API URL

**Current**: `clanName=Stormlight` hardcoded in 4+ places.

**Impact**: Must become parameterized per-clan. OSRS support will need different API endpoints entirely.

### 4. Single OAuth Application

**Current**: One Discord OAuth app with one redirect URI.

**Impact**: Platform can likely share one OAuth app with a common redirect, but tenant isolation for admin roles needs design.

### 5. Username Gradient Mapping

**Current**: `badge_utils.py` hardcodes specific usernames (e.g., "lm Kyle", "Papa Cody") to gradient colors.

**Impact**: Must become configurable per-clan with admin UI for setting username styles.

### 6. Rank Hierarchy

**Current**: RS3 clan rank names hardcoded (Owner → Recruit).

**Impact**: RS3 rank names are universal across all RS3 clans, but OSRS group ranks are different. Platform needs game-type-aware rank systems.

### 7. Expected Roster Count

**Current**: `EXPECTED_ROSTER_COUNT = 245` hardcoded.

**Impact**: Each clan has different size. Remove or make per-clan configurable.

### 8. Badge System

**Current**: System badges reference specific clan members and RS3-specific achievements.

**Impact**: Badge definitions should be templated per-clan and per-game-type.

---

## External Service Dependencies

### RuneScape APIs (Jagex)

| API | URL | Auth | Rate Limit | Reliability |
|-----|-----|------|------------|-------------|
| Clan Hiscores | `secure.runescape.com/m=clan-hiscores/members_lite.ws` | None | Moderate | Good |
| RuneMetrics Profile | `apps.runescape.com/runemetrics/profile/profile` | None | Strict | Unstable |
| RuneMetrics Quests | `apps.runescape.com/runemetrics/quests` | None | Strict | Unstable |
| Global Hiscores | `secure.runescape.com/m=hiscore/index_lite.ws` | None | Moderate | Good |
| RS Wiki (MediaWiki) | `runescape.wiki/api.php` | None | Moderate | Good |

### Discord API

| Endpoint | Purpose |
|----------|---------|
| `discord.com/api/oauth2/authorize` | OAuth login redirect |
| `discord.com/api/oauth2/token` | Token exchange |
| `discord.com/api/users/@me` | User info fetch |

### Supabase (Database)

- **Host**: `52.22.132.208:5432` (direct IP, AWS us-east-1)
- **Type**: PostgreSQL
- **Connection**: Direct TCP (not Supabase pooler)
- **No Supabase SDK used** — pure PostgreSQL connection

---

## Fly.io Infrastructure

### Current App

| Setting | Value |
|---------|-------|
| App name | `stormlight` |
| Region | `iad` (US East - Virginia) |
| Machine type | Default (shared-cpu-1x) |
| Min machines | 1 |
| Auto-stop | Disabled |
| Volume | `badge_uploads` → `/app/uploads` |
| Custom domain | `stormlightrs.com` |
| Internal port | 8000 |

### DNS / Domain

- `stormlightrs.com` configured to point to `stormlight.fly.dev`
- HTTPS forced via Fly.io TLS termination
- Fly.io manages SSL certificates automatically

### Secrets (5)

Set via `flyctl secrets set`:
1. `DATABASE_URL`
2. `DISCORD_CLIENT_ID`
3. `DISCORD_CLIENT_SECRET`
4. `JWT_SECRET_KEY`
5. `DISCORD_REDIRECT_URI`

### Volume

- `badge_uploads` volume attached at `/app/uploads/badges`
- Contains admin-uploaded custom badge images
- **Must be preserved during migration** — badge images are not in git

---

## Supabase / Database

### Connection Details

- **Provider**: Supabase (managed PostgreSQL)
- **Host**: `52.22.132.208` (direct IP — AWS EC2)
- **Port**: 5432
- **Database**: `postgres` (default)
- **User**: `postgres`
- **Connection**: Direct (no connection pooler, no Supabase client SDK)

### Tables (14)

```
users
clan_members
competitions
competition_entries
custom_badges
admin_logs
clan_log
clan_activities
clan_drops
player_daily_snapshots
player_stats_history
player_stat_changes
account_link_requests
player_today_gains          (raw SQL, not in Prisma schema)
```

### Data Volume (Estimated)

- `player_daily_snapshots` — Largest table (~245 members × 365 days = ~89K rows/year)
- `clan_activities` — High volume (~245 members × 20 activities × 365 days)
- `player_stats_history` — 29 skills × 245 members × 365 days = ~2.6M rows/year

### Backup Considerations

- No automated backup process beyond Supabase's built-in daily backups
- Manual backup command documented in DEPLOYMENT.md using `pg_dump`
- Historical data should be exported before any schema migration

---

## Discord OAuth2

### Current Application

| Setting | Value |
|---------|-------|
| Client ID | `1412974739340791900` |
| Redirect URI | `https://stormlightrs.com/api/auth/callback/discord` |
| Scopes | `identify`, `email` |

### Migration Impact

- New platform will need either:
  - Updated redirect URI on existing Discord app (if keeping same app)
  - New Discord OAuth app with new redirect URI
- Consider: bot integration for future Discord features (notifications, role sync)

---

## Static Assets & Volumes

### Git-Tracked Assets (`stormlight-frontend/public/assets/`)

| Directory | Contents | Count |
|-----------|----------|-------|
| `skills/` | RS3 skill icons | 29 |
| `ranks/` | Clan rank icons | 12+ |
| `drops/` | Boss drop item images | 100+ |
| `badges/` | League/DXP/PvM badge images | 20+ |
| `icons/` | Stat icons (runescore, quest points, etc.) | 7 |
| `nav/` | Navigation images | 4 |
| `patterns/` | Background texture patterns | 6 |

### Volume-Stored Assets (NOT in git)

| Path | Contents |
|------|----------|
| `/app/uploads/badges/` | Admin-uploaded custom badge images |

**Critical**: Badge images uploaded via the admin panel are stored on the Fly.io volume. These are NOT in the git repository and must be separately backed up before any migration.

---

## Migration Risk Assessment

### HIGH RISK

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Database schema migration** | All tables need `clan_id` FK; JSONB blobs need restructuring | Plan incremental migration with backward compatibility |
| **Volume-stored badge images** | Lost if Fly.io app is destroyed | Export via `flyctl ssh sftp` before any changes |
| **Historical data preservation** | player_daily_snapshots, activities, drops are irreplaceable | Full `pg_dump` before any schema changes |
| **Domain DNS transfer** | Downtime if misconfigured | Plan DNS cutover during low-traffic window |
| **Secrets in source control** | `deploy-backend.sh` and `DEPLOYMENT.md` contain plaintext secrets | Rotate all secrets after platform migration |

### MEDIUM RISK

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Discord OAuth redirect change** | Users temporarily unable to log in | Pre-register new redirect URI, update Discord app settings |
| **Scheduler disruption** | Hourly data collection stops | Keep old app running until new scheduler is validated |
| **Frontend hardcoded URLs** | Badge/drop images break | Search-and-replace with configurable base URL |
| **Supabase connection string** | Direct IP may change | Use Supabase pooler URL or hostname instead of IP |

### LOW RISK

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Fly.io app name collision** | Can't reuse "stormlight" app name | Use new name for platform (e.g., "stormlight-platform") |
| **Node/Python version drift** | Build may break with newer versions | Pin versions in Dockerfile |
| **npm/Poetry lock files** | Dependency resolution changes | Commit lock files, pin versions |

---

## Recommendations for Clean Separation

### Immediate (Before Migration)

1. **Export database**: Full `pg_dump` of all tables
2. **Export badge images**: Download from Fly.io volume via SSH/SFTP
3. **Rotate secrets**: All secrets in `deploy-backend.sh` and `DEPLOYMENT.md` should be considered compromised
4. **Document current Fly.io state**: `flyctl status`, `flyctl secrets list`, `flyctl volumes list`

### During Migration

5. **Keep old app running**: Do not destroy until new platform is validated
6. **Register new DNS**: New domain for platform, keep `stormlightrs.com` pointing to old app
7. **Create new Supabase project**: Fresh schema designed for multi-tenancy
8. **Write data migration scripts**: Transform single-clan data into multi-tenant format
9. **Create new Discord OAuth app**: Or update existing with additional redirect URI

### Architecture Recommendations for New Platform

10. **Multi-tenant from day one**: `clan_id` on every data table
11. **Hiscores-first XP tracking**: Use RS3/OSRS Hiscores as canonical, RuneMetrics as optional supplement
12. **Modular backend**: Separate routes, services, models, and schedulers into proper modules
13. **Single ORM**: Pick one database access pattern and stick with it
14. **Redis for state**: Cache, rate limits, scheduler coordination
15. **Background job system**: Celery or equivalent instead of in-process asyncio tasks
16. **Per-clan configuration**: Theme, branding, rank rules, badge definitions
17. **Self-service onboarding**: Clan registration flow without admin intervention
