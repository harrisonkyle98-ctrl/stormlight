#!/bin/bash
set -e

echo "🔧 Generating Prisma client..."
poetry run prisma generate

echo "🔧 Applying database schema changes..."
poetry run prisma db push

echo "🚀 Starting FastAPI server..."
poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
