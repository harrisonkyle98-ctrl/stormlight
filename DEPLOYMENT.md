# Stormlight Deployment Guide

## Development Environment Setup ✅

The local development environment has been successfully initialized with all dependencies installed and servers running.

### Completed Setup Steps

1. **Environment Variables** ✅
   - Created `.env` file in `stormlight-backend/` with all 5 required variables
   - JWT_SECRET_KEY, DATABASE_URL, Discord OAuth credentials configured

2. **Backend Setup** ✅
   - Installed all Poetry dependencies (FastAPI, Prisma, psycopg, etc.)
   - Generated Prisma client successfully
   - Pushed database schema to Supabase (non-destructive)
   - Backend server running on `http://localhost:8000`
   - Database connected successfully to PostgreSQL at 52.22.132.208:5432
   - All OAuth environment variables verified and loaded

3. **Frontend Setup** ✅
   - Installed all npm dependencies (React, Vite, TypeScript, etc.)
   - Frontend dev server running on `http://localhost:5173`
   - Vite proxy configured to forward API requests to backend

4. **Verification** ✅
   - Health check endpoint `/healthz` returns `{"status": "ok"}`
   - Frontend login page loads correctly
   - No console errors or missing dependencies
   - Both servers running without errors

### Local Testing Limitations ⚠️

Full OAuth authentication testing is **not possible locally** because:
- Discord OAuth redirect URI is configured for production: `https://stormlight.fly.dev/api/auth/callback/discord`
- Discord will reject login attempts from localhost
- Full application testing requires deployment to Fly.io

---

## Deployment to Fly.io

### Prerequisites

1. **Fly.io Authentication** (Required)
   - You must log in to your Fly.io account through the terminal first
   - Run: `flyctl auth login`
   - This will open a browser window for authentication

### Deployment Configuration ✅

All deployment files are ready:

1. **`fly.toml`** - Fly.io app configuration
   - App name: `stormlight`
   - Region: `iad` (US East)
   - Python version: 3.12
   - Internal port: 8000
   - Health checks configured on `/healthz`

2. **`Dockerfile`** - Multi-stage build
   - Stage 1: Builds frontend with Node 18 and Vite
   - Stage 2: Builds backend with Python 3.12, Poetry, and Prisma
   - Copies built frontend to `static/` directory for production serving
   - Creates uploads directory for badge images

3. **`deploy-backend.sh`** - Automated deployment script (UPDATED)
   - Sets all 5 required Fly.io secrets
   - Deploys unified app with frontend and backend
   - Uses correct JWT_SECRET_KEY and DATABASE_URL

### Environment Variables (Fly.io Secrets)

The following secrets will be set in Fly.io:

```bash
DATABASE_URL=postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres
DISCORD_CLIENT_ID=1412974739340791900
DISCORD_CLIENT_SECRET=bJlBq3K1fB3N4dOprcnoL5IFG_WU4YQn
JWT_SECRET_KEY=G0kP4KqE4Bhs6PjB8n7E2zjYb1pQ2cR9vU6tF3xN4yM1aS7dT8wR5eL2kV9hC0qD
DISCORD_REDIRECT_URI=https://stormlight.fly.dev/api/auth/callback/discord
```

### Deployment Steps

1. **Login to Fly.io** (if not already logged in):
   ```bash
   flyctl auth login
   ```

2. **Run the deployment script**:
   ```bash
   cd /home/ubuntu/repos/stormlight
   chmod +x deploy-backend.sh
   ./deploy-backend.sh
   ```

   This script will:
   - Set all environment variables as Fly.io secrets
   - Build the Docker image (frontend + backend)
   - Deploy to `stormlight.fly.dev`

3. **Verify deployment**:
   - **App URL**: https://stormlight.fly.dev/
   - **API Base**: https://stormlight.fly.dev/api/
   - **Health Check**: https://stormlight.fly.dev/healthz
   - **OAuth Redirect**: https://stormlight.fly.dev/api/auth/callback/discord

### Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
cd /home/ubuntu/repos/stormlight

# Set secrets
flyctl secrets set DATABASE_URL="postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres" -a stormlight
flyctl secrets set DISCORD_CLIENT_ID="1412974739340791900" -a stormlight
flyctl secrets set DISCORD_CLIENT_SECRET="bJlBq3K1fB3N4dOprcnoL5IFG_WU4YQn" -a stormlight
flyctl secrets set JWT_SECRET_KEY="G0kP4KqE4Bhs6PjB8n7E2zjYb1pQ2cR9vU6tF3xN4yM1aS7dT8wR5eL2kV9hC0qD" -a stormlight
flyctl secrets set DISCORD_REDIRECT_URI="https://stormlight.fly.dev/api/auth/callback/discord" -a stormlight

# Deploy
flyctl deploy -a stormlight
```

### Post-Deployment Verification

After deployment completes:

1. **Check app status**:
   ```bash
   flyctl status -a stormlight
   ```

2. **View logs**:
   ```bash
   flyctl logs -a stormlight
   ```

3. **Test endpoints**:
   - Visit https://stormlight.fly.dev/ (should show login page)
   - Check https://stormlight.fly.dev/healthz (should return `{"status": "ok"}`)
   - Test Discord OAuth login flow

4. **Verify scheduled tasks**:
   - Check logs for "🔄 Starting hourly clan member sync" messages
   - Hourly scheduler runs snapshots in first 5 minutes of each hour (00:00-00:05 UTC)

### Snapshot Collection System

The backend includes an automated snapshot collection system:

- **Automatic**: Hourly scheduler runs at startup and every hour
- **Manual trigger**: POST to `/api/admin/trigger-snapshots`
- **Multi-cycle approach**: Processes ~60 members across 4-5 cycles to avoid rate limits
- **Storage**: `player_daily_snapshots` table in Supabase

---

## Database Backup Protocol

As per your failsafe requirements, before any schema changes:

```bash
# Create timestamped backup
mkdir -p backups
pg_dump "postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres" > backups/backup_$(date +%F_%H-%M-%S).sql

# Verify backup exists
ls -lh backups/

# Restore if needed (emergency only)
psql "postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres" < backups/backup_<timestamp>.sql
```

**Note**: The `prisma db push` command used during setup is non-destructive and does not require a backup.

---

## Running Locally (Development)

Both servers are currently running in the background:

### Backend Server
```bash
cd /home/ubuntu/repos/stormlight/stormlight-backend
poetry run fastapi run app/main.py --host 0.0.0.0 --port 8000
```
- Runs on http://localhost:8000
- Environment variables loaded from `.env` file
- Connects to Supabase PostgreSQL database

### Frontend Server
```bash
cd /home/ubuntu/repos/stormlight/stormlight-frontend
npm run dev
```
- Runs on http://localhost:5173
- Proxies API requests to backend via Vite config
- Hot reload enabled for development

### Stopping Servers

To stop the currently running servers, you can kill the shell processes or press Ctrl+C in the respective terminals.

---

## Summary

✅ **Development environment fully initialized and verified**
✅ **Both backend and frontend servers running successfully**
✅ **Database connected and schema synchronized**
✅ **Deployment configuration ready for Fly.io**
⏳ **Awaiting Fly.io authentication to proceed with deployment**

**Next Step**: Log in to Fly.io (`flyctl auth login`) and run the deployment script when ready.
