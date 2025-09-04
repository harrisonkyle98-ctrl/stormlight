#!/bin/bash
set -e

echo "🔧 Generating Prisma client..."
poetry run prisma generate

echo "🚀 Starting FastAPI server..."
poetry run fastapi run app/main.py --host 0.0.0.0 --port ${PORT:-8000}
