# Use Python 3.11 slim image for smaller size
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for Python package management
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install Python dependencies
RUN uv sync --frozen

# Copy application code
COPY main.py ./
COPY utils/ ./utils/

ENV PYTHONUNBUFFERED=1

# Run the application
ENTRYPOINT ["uv", "run", "python", "main.py"]