#!/bin/bash


echo "🚀 Deploying Stormlight backend to Fly.io..."

BACKEND_DIR=""
if [ -d "./stormlight-backend" ]; then
    BACKEND_DIR="./stormlight-backend"
elif [ -d "../stormlight-backend" ]; then
    BACKEND_DIR="../stormlight-backend"
elif [ -d "./backend" ]; then
    BACKEND_DIR="./backend"
elif [ -d "../backend" ]; then
    BACKEND_DIR="../backend"
else
    echo "❌ Could not find stormlight-backend directory"
    echo "Please run this script from your stormlight project directory"
    exit 1
fi

echo "📁 Found backend directory: $BACKEND_DIR"

echo "🔐 Setting environment variables..."
flyctl secrets set DATABASE_URL="postgresql://postgres:PumfAGTaunYekmIM@db.megkevquxnlqcnetqfav.supabase.co:5432/postgres" -a stormlight
flyctl secrets set DISCORD_CLIENT_ID="1412974739340791900" -a stormlight
flyctl secrets set DISCORD_CLIENT_SECRET="bJlBq3K1fB3N4dOprcnoL5IFG_WU4YQn" -a stormlight
flyctl secrets set NEXTAUTH_SECRET="0r5KsWkTI4h0JqBsEo-xefVMEvpSb5q8A0RHBm4N760" -a stormlight

echo "🚀 Deploying backend..."
cd "$BACKEND_DIR"
flyctl deploy -a stormlight

echo "✅ Deployment complete!"
echo "🌐 Frontend URL: https://runescape-clan-website-q4g9hn1a.devinapps.com/"
echo "🔗 Backend URL: https://stormlight.fly.dev/"
