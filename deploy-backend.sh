#!/bin/bash

echo "🚀 Deploying Stormlight unified app to Fly.io..."

echo "🔐 Setting environment variables..."
flyctl secrets set DATABASE_URL="postgresql://postgres:PumfAGTaunYekmIM@52.22.132.208:5432/postgres" -a stormlight
flyctl secrets set DISCORD_CLIENT_ID="1412974739340791900" -a stormlight
flyctl secrets set DISCORD_CLIENT_SECRET="bJlBq3K1fB3N4dOprcnoL5IFG_WU4YQn" -a stormlight
flyctl secrets set JWT_SECRET_KEY="G0kP4KqE4Bhs6PjB8n7E2zjYb1pQ2cR9vU6tF3xN4yM1aS7dT8wR5eL2kV9hC0qD" -a stormlight
flyctl secrets set DISCORD_REDIRECT_URI="https://stormlight.fly.dev/api/auth/callback/discord" -a stormlight

echo "🚀 Deploying unified app..."
flyctl deploy -a stormlight

echo "✅ Deployment complete!"
echo "🌐 Unified App URL: https://stormlight.fly.dev/"
echo "🔗 API Base URL: https://stormlight.fly.dev/api/"
echo "🔐 Discord OAuth Redirect URI: https://stormlight.fly.dev/api/auth/callback/discord"
