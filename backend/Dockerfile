# Render uses CPU or GPU depending on selection. We'll use standard PyTorch container architecture 
FROM python:3.11-slim

# 1. Move the workspace up one level so 'app' remains a contained directory
WORKDIR /workspace

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# 2. Copy all files. This lands your code at /workspace/app/main.py
COPY . .

# 3. 🔥 THE FIX: Tell Python that /workspace is the primary engine lookup root
ENV PYTHONPATH=/workspace

# Execute model baking sequence
RUN python3 download_models.py

EXPOSE 8000

# 4. Invoke Uvicorn relative to the workspace directory layer
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]