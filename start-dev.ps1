# AIAR Guitar - Development Startup Script
# Starts Backend and Frontend in separate interactive windows

Write-Host "🎸 Starting AIAR Guitar Development Environment..." -ForegroundColor Cyan

# 1. Start Backend
Write-Host "Starting Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {cd backend; pip install -r requirements.txt; $env:QDRANT_URL='http://localhost:6333'; $env:EMBEDDING_MODE='raw'; $env:CORS_ORIGINS='http://localhost:3000'; uvicorn app.main:app --reload --port 8000}"

# 2. Start Frontend
Write-Host "Starting Frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& {cd frontend; pnpm install; $env:NEXT_PUBLIC_WSS_URL='ws://localhost:8000/ws/inference'; pnpm dev}"

Write-Host "✅ Services starting in new windows." -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000"
Write-Host "   Backend:  http://localhost:8000/docs"
Write-Host ""
Write-Host "⚠️  Note: Docker is not running. The backend will use 'mock' mode for chords instead of Qdrant." -ForegroundColor Yellow
Write-Host "   To enable Qdrant, start Docker Desktop and run: docker run -p 6333:6333 qdrant/qdrant" -ForegroundColor Gray
