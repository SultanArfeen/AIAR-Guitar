# AIAR Guitar - Deployment Guide

## Overview

This guide covers deploying AIAR Guitar to various environments: local development, Docker, and cloud platforms.

---

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Git

---

## Local Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/aiar-guitar.git
cd aiar-guitar

# Option 1: Docker Compose (recommended)
docker-compose -f ops/docker-compose.yml up

# Option 2: Run services separately
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
pnpm install
pnpm dev

# Terminal 3 - Qdrant
docker run -p 6333:6333 qdrant/qdrant
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | <http://localhost:3000> |
| Backend API | <http://localhost:8000> |
| API Docs | <http://localhost:8000/docs> |
| Qdrant Dashboard | <http://localhost:6333/dashboard> |

---

## Environment Variables

### Frontend (.env.local)

```bash
# WebSocket URL for backend
NEXT_PUBLIC_WSS_URL=ws://localhost:8000/ws/inference

# Enable debug mode
NEXT_PUBLIC_DEBUG_MODE=false
```

### Backend (.env)

```bash
# Qdrant connection
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=chords_v1

# AI Settings
EMBEDDING_MODE=raw
SCORE_THRESHOLD=0.85

# CORS
CORS_ORIGINS=http://localhost:3000

# Logging
LOG_LEVEL=INFO
```

---

## Docker Deployment

### Build Images

```bash
# Build all services
docker-compose -f ops/docker-compose.yml build

# Build individual services
docker build -t aiar-guitar-frontend ./frontend
docker build -t aiar-guitar-backend ./backend
```

### Run with Docker Compose

```bash
# Start in background
docker-compose -f ops/docker-compose.yml up -d

# View logs
docker-compose -f ops/docker-compose.yml logs -f

# Stop services
docker-compose -f ops/docker-compose.yml down

# Stop and remove volumes
docker-compose -f ops/docker-compose.yml down -v
```

### Health Checks

```bash
# Check service health
curl http://localhost:3000
curl http://localhost:8000/health
curl http://localhost:8000/health/qdrant
```

---

## Cloud Deployment

### Option 1: Railway

Railway provides easy deployment for both frontend and backend.

1. **Create Railway Account**: <https://railway.app>

2. **Deploy Backend**:

   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   cd backend
   railway init
   railway up
   ```

3. **Deploy Frontend**:

   ```bash
   cd frontend
   railway init
   railway up
   ```

4. **Add Qdrant**:
   - Use Railway's database plugins or deploy a Qdrant container
   - Update `QDRANT_URL` environment variable

5. **Configure Environment**:
   - Set `NEXT_PUBLIC_WSS_URL` to your backend's WebSocket URL
   - Set `CORS_ORIGINS` to your frontend domain

### Option 2: Vercel + Cloud Run

**Frontend on Vercel:**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel
```

**Backend on Google Cloud Run:**

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/aiar-guitar-backend ./backend

# Deploy
gcloud run deploy aiar-guitar-backend \
  --image gcr.io/PROJECT_ID/aiar-guitar-backend \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "QDRANT_URL=your-qdrant-url"
```

### Option 3: AWS (ECS + Fargate)

1. Push images to ECR
2. Create ECS cluster
3. Define task definitions for frontend/backend
4. Create services and load balancer
5. Configure Route53 for DNS

---

## Qdrant Setup

### Local Development

```bash
# Run with Docker
docker run -p 6333:6333 -v qdrant_data:/qdrant/storage qdrant/qdrant
```

### Production (Qdrant Cloud)

1. Create account at <https://cloud.qdrant.io>
2. Create cluster
3. Get API key and endpoint
4. Update `QDRANT_URL` with cluster URL

### Initialize Collection

```bash
# Create the chords collection
curl -X PUT http://localhost:6333/collections/chords_v1 \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 63,
      "distance": "Cosine"
    }
  }'
```

---

## SSL/TLS Configuration

### WebSocket Security

For production, WebSocket connections must use WSS (WebSocket Secure):

1. **Frontend**: Update `NEXT_PUBLIC_WSS_URL` to use `wss://`
2. **Backend**: Configure TLS certificate in reverse proxy

### Nginx Example

```nginx
server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /ws/inference {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://backend:8000;
    }
}
```

---

## Scaling

### Horizontal Scaling

The backend is stateless and can be horizontally scaled:

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      replicas: 3
```

### Load Balancing

Use a load balancer (Nginx, HAProxy, cloud LB) to distribute WebSocket connections.

**Important**: WebSocket connections are sticky sessions. Configure your load balancer accordingly.

---

## Monitoring

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | General health check |
| `/health/qdrant` | Qdrant connection status |

### Logging

Backend uses structured JSON logging:

```json
{
  "timestamp": "2024-01-18T10:30:00Z",
  "level": "INFO",
  "name": "aiar-guitar",
  "message": "Inference completed in 15.2ms"
}
```

### Metrics (Optional)

Add Prometheus metrics endpoint:

```python
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| WebSocket connection fails | Check CORS settings and WSS URL |
| No camera access | Ensure HTTPS in production |
| Qdrant connection error | Verify QDRANT_URL and network |
| High latency | Check network, reduce inference rate |

### Debug Mode

Enable debug logging:

```bash
# Backend
LOG_LEVEL=DEBUG uvicorn app.main:app

# Frontend
NEXT_PUBLIC_DEBUG_MODE=true pnpm dev
```

### Logs

```bash
# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Specific container
docker logs -f <container-id>
```

---

## Security Checklist

- [ ] Use HTTPS/WSS in production
- [ ] Validate all input server-side (Pydantic)
- [ ] Never log raw landmark data to external services
- [ ] Use environment variables for secrets
- [ ] Configure proper CORS origins
- [ ] Rate limit WebSocket connections
- [ ] Enable security headers (HSTS, CSP, etc.)

---

## Backup & Recovery

### Qdrant Data

```bash
# Backup
docker cp qdrant:/qdrant/storage ./qdrant-backup

# Restore
docker cp ./qdrant-backup qdrant:/qdrant/storage
```

### Database Snapshots

Qdrant supports snapshots:

```bash
# Create snapshot
curl -X POST http://localhost:6333/collections/chords_v1/snapshots

# List snapshots
curl http://localhost:6333/collections/chords_v1/snapshots
```

---

## Production Checklist

- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Qdrant collection created
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] CI/CD pipeline working
- [ ] Load testing completed
- [ ] Security audit passed
