# ==============================================
# AIAR Guitar - Start App (Hybrid Mode)
# ==============================================
# This script starts the application in hybrid mode:
# 1. Qdrant (Database) in Docker
# 2. Seeder, Backend, and Frontend on your Host machine
#
# Usage:
#   .\start-app.ps1
# ==============================================

Write-Host "🎸 Starting AIAR Guitar in Hybrid Mode..." -ForegroundColor Cyan

# 1. Check for Docker
Write-Host "`n[1/5] Checking Docker..." -ForegroundColor Yellow
docker ps > $null 2>&1
if ($LastExitCode -ne 0) {
    Write-Error "Docker Desktop is not running. Please start it and try again."
    exit 1
}
Write-Host "✅ Docker is running."

# 2. Start Qdrant
Write-Host "`n[2/5] Starting Qdrant Database..." -ForegroundColor Yellow
docker run -d --name aiar-qdrant -p 6333:6333 -p 6334:6334 qdrant/qdrant > $null 2>&1
Write-Host "⏳ Waiting for Qdrant to be healthy..."
do {
    Start-Sleep -Seconds 2
    $response = curl.exe -s http://localhost:6333/ 2>$null
} while ($null -eq $response)
Write-Host "✅ Qdrant is ready."

# 3. Setup Backend & Seed Data
Write-Host "`n[3/5] Setting up Backend & Seeding Data..." -ForegroundColor Yellow
cd backend

# Create venv if not exists
if (-not (Test-Path "venv")) {
    python -m venv venv
}

# Install requirements
./venv/Scripts/python.exe -m pip install -r requirements.txt

# Run Seeder
./venv/Scripts/python.exe scripts/seed_qdrant.py
Write-Host "✅ Data seeded successfully."

# 4. Start Backend (in new window)
Write-Host "`n[4/5] Starting FastAPI Backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; ./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000"
Write-Host "✅ Backend is starting in a new window."

# 5. Start Frontend
Write-Host "`n[5/5] Starting Next.js Frontend..." -ForegroundColor Yellow
cd ../frontend
# Ensure dependencies are installed (pnpm)
pnpm install
# Start dev server
Write-Host "🚀 Launching development server..." -ForegroundColor Green
pnpm dev

cd ..
