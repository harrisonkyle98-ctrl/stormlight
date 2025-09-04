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

# Configure poetry
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-dev

# Copy application code (including prisma schema)
COPY . .

# Generate Prisma client after copying schema
RUN poetry run prisma generate

# Verify Prisma client was generated
RUN ls -la /usr/local/lib/python3.12/site-packages/ | grep prisma || echo "Prisma not found in site-packages"
RUN python -c "from prisma import Prisma; print('Prisma import successful')" || echo "Prisma import failed"

# Expose port
EXPOSE 8000

# Start the application
CMD ["poetry", "run", "fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
