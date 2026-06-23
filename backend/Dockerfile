# Dockerfile for FastAPI Backend
# Build command: cd backend && docker build -t fav-web-backend .
# Run command: docker run -p 8000:8000 fav-web-backend

FROM python:3.10-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies needed for OpenCV, InsightFace compilation, and PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory to /app
WORKDIR /app

# Copy requirements file first to utilize Docker layer caching
COPY requirements.txt ./backend/requirements.txt

# Install python dependencies (Install numpy/cython and CPU-only PyTorch first to prevent build errors)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir numpy cython && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend files into the backend/ folder of working directory
COPY . ./backend/

# Expose backend API port
EXPOSE 8000

# Set PYTHONPATH so FastAPI can import modules correctly from backend folder
ENV PYTHONPATH=/app

# Start FastAPI application using Uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
