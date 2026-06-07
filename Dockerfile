# ==========================================
# STAGE 1: Compile Vite/React Production Bundle
# ==========================================
FROM node:20-alpine AS build-stage
WORKDIR /app

# Point directly to your nested frontend directory layout
COPY frontend/vite-project/package*.json ./
RUN npm ci

COPY frontend/vite-project/ .
RUN npm run build


# ==========================================
# STAGE 2: Build Python Core & Bake ML Weights
# ==========================================
FROM python:3.11-slim
WORKDIR /workspace

# Install native system build requirements 
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install python packages using cache optimization
COPY backend/requirements.txt ./requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy backend application codes into the workspace container layer
COPY backend/workspace/ .

# Copy download script and execute weight baking sequence during build step
COPY backend/download_models.py ./download_models.py
RUN python3 download_models.py

# Inject compiled React UI static assets from Stage 1 into FastAPI lookup directory
COPY --from=build-stage /app/dist ./frontend/dist

# Expose Render's standard interface port
EXPOSE 10000
ENV PYTHONPATH=/workspace

# Start single container entrypoint handling both UI and Core API streams
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]