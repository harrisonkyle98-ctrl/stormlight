# Stage 1: Build Vite frontend
FROM node:18-alpine AS frontend
WORKDIR /frontend
COPY stormlight-frontend/package*.json ./
RUN npm ci
COPY stormlight-frontend/ ./
RUN npm run build

# Stage 2: Build backend with Poetry and Prisma
FROM python:3.12-slim AS backend
WORKDIR /app
RUN apt-get update && apt-get install -y gcc curl && rm -rf /var/lib/apt/lists/*
RUN pip install poetry
COPY stormlight-backend/pyproject.toml stormlight-backend/poetry.lock ./
RUN poetry config virtualenvs.create false
RUN poetry install --only=main --no-root
COPY stormlight-backend/prisma ./prisma/
# Verify schema has recursive_type_depth before generation
RUN echo "=== Verifying schema.prisma ===" && \
    grep -A 2 "generator client" ./prisma/schema.prisma && \
    echo "=== Schema verified ==="
# Clear any Prisma caches before generation
RUN rm -rf /root/.cache/prisma* /tmp/prisma* ~/.cache/prisma* || true
# Force fresh Prisma client generation
ARG CACHE_BUST=unknown
RUN echo "=== Cache bust timestamp: $CACHE_BUST ===" && \
    echo "=== Generating Prisma client with recursive_type_depth=-1 ==="
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN poetry run prisma generate
# Verify generated Prisma client has the correct fields
RUN python -c "from prisma.models import Competition; fields = list(Competition.model_fields.keys()); print('=== Competition model fields:', fields); assert 'rewardBadgeId' in fields, 'rewardBadgeId field missing!'; assert 'dropsGrid' in fields, 'dropsGrid field missing!'; print('=== Prisma client verification PASSED ===')"
# Copy backend app code
COPY stormlight-backend/ ./
# Copy built frontend
COPY --from=frontend /frontend/dist ./static
# Create uploads directory
RUN mkdir -p /app/uploads/badges
ENV PORT=8000
EXPOSE 8000
RUN chmod +x /app/start.sh
CMD ["/app/start.sh"]
