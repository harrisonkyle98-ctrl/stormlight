#!/bin/bash

echo "🚀 Deploying Stormlight unified app to Fly.io..."

echo "🔐 Setting environment variables..."
flyctl secrets set DATABASE_URL="postgresql://postgres:PumfAGTaunYekmIM@db.megkevquxnlqcnetqfav.supabase.co:5432/postgres" -a stormlight
flyctl secrets set DISCORD_CLIENT_ID="1412974739340791900" -a stormlight
flyctl secrets set DISCORD_CLIENT_SECRET="bJlBq3K1fB3N4dOprcnoL5IFG_WU4YQn" -a stormlight
flyctl secrets set NEXTAUTH_SECRET="0r5KsWkTI4h0JqBsEo-xefVMEvpSb5q8A0RHBm4N760" -a stormlight
flyctl secrets set DISCORD_REDIRECT_URI="https://stormlight.fly.dev/api/auth/callback/discord" -a stormlight

echo "🚀 Deploying unified app..."
flyctl deploy -a stormlight

echo "✅ Deployment complete!"
echo "🌐 Unified App URL: https://stormlight.fly.dev/"
echo "🔗 API Base URL: https://stormlight.fly.dev/api/"
echo "🔐 Discord OAuth Redirect URI: https://stormlight.fly.dev/api/auth/callback/discord"
