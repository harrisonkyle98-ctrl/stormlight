FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Copy poetry files
COPY pyproject.toml poetry.lock ./

# Configure poetry to not create virtualenvs
RUN poetry config virtualenvs.create false

# Install dependencies including Prisma
RUN poetry install --no-dev

# Copy application code (including prisma schema)
COPY . .

# Set environment variable for Prisma
ENV PRISMA_PYTHON_CLIENT_GENERATOR_CACHE_DIR=/app/.prisma

# Generate Prisma client with explicit cache directory
RUN mkdir -p /app/.prisma && \
    poetry run prisma generate && \
    python -c "from prisma import Prisma; print('✅ Prisma client generation verified')"

# Expose port
EXPOSE 8000

# Start the application
CMD ["poetry", "run", "fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
