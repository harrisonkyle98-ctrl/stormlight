# Stage 1: Build Vite frontend
FROM node:18-alpine AS frontend
WORKDIR /frontend
COPY stormlight-frontend/package*.json ./
RUN npm ci
COPY stormlight-frontend/ ./
# Build with same-origin API base to avoid CORS
ARG VITE_API_URL=/
ENV VITE_API_URL=${VITE_API_URL}
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
# Placeholder for prisma generate
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN poetry run prisma generate
# Copy backend app code
COPY stormlight-backend/ ./
# Copy built frontend
COPY --from=frontend /frontend/dist ./static
ENV PORT=8000
EXPOSE 8000
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
