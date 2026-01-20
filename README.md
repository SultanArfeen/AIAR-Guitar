# AIAR Guitar

> Browser-based Augmented Reality Guitar with Real-Time Computer Vision & AI Chord Correction

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688)](https://fastapi.tiangolo.com/)

## Features

- ** Hand Tracking**: Real-time hand landmark detection using MediaPipe
- ** AR Guitar**: 3D guitar overlay that anchors to your body
- ** Audio Synthesis**: Low-latency Tone.js audio engine with strum detection
- ** AI Chord Correction**: Vector similarity search for accurate chord recognition
- ** Real-Time**: Sub-35ms frame-to-audio latency target

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and pnpm
- Python 3.11+
- Docker (for running Qdrant)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/aiar-guitar.git
cd aiar-guitar

# Start all services with Docker Compose
docker-compose -f ops/docker-compose.yml up -d

# Or run services individually:

# Frontend (Terminal 1)
cd frontend
pnpm install
pnpm dev

# Backend (Terminal 2)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Access the Application

- **Frontend**: <http://localhost:3000>
- **Backend API**: <http://localhost:8000>
- **API Docs**: <http://localhost:8000/docs>
- **Qdrant Dashboard**: <http://localhost:6333/dashboard>

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  MediaPipe   │  │   Three.js   │  │   Tone.js    │      │
│  │    Hands     │  │  AR Render   │  │    Audio     │      │
│  └──────┬───────┘  └──────────────┘  └──────┬───────┘      │
│         │                                     │              │
│  ┌──────▼──────────────────────────────────▼───────┐       │
│  │          Zustand State Store                     │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │ WebSocket                             │
└─────────────────────┼───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Backend Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   FastAPI    │  │    Chord     │  │   Qdrant     │      │
│  │  WebSocket   │──│  Recognition │──│  Vector DB   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
/
├── frontend/               # Next.js 15 frontend
│   ├── app/               # App Router pages
│   ├── components/        # React components
│   │   ├── Vision/        # Hand tracking
│   │   ├── AR/            # 3D rendering
│   │   ├── UI/            # UI components
│   │   └── Debug/         # Debug overlays
│   ├── systems/           # Audio engine
│   ├── stores/            # Zustand state
│   └── types/             # TypeScript types
├── backend/               # FastAPI backend
│   └── app/
│       ├── models/        # Pydantic models
│       ├── services/      # Business logic
│       └── tests/         # Pytest tests
├── ops/                   # DevOps configs
│   └── docker-compose.yml
├── docs/                  # Documentation
└── .github/workflows/     # CI/CD
```

## 🎮 Usage

1. **Grant Camera Permission**: Allow the browser to access your webcam
2. **Position Yourself**: Stand in front of the camera with your arms visible
3. **Play**: Move your right hand across the virtual strings to strum
4. **Chord Positions**: Shape your left hand to form chords on the virtual fretboard

### Debug Mode

Add `?debug=true` to the URL to enable:

- Hand landmark visualization
- Strum velocity vectors
- Collision zone overlays
- FPS and latency metrics

## 🔧 Configuration

### Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_WSS_URL=ws://localhost:8000/ws/inference

# Backend (.env)
QDRANT_URL=http://localhost:6333
EMBEDDING_MODE=raw        # "raw" (63D) or "mlp" (128D)
SCORE_THRESHOLD=0.85
OPENAI_API_KEY=           # Optional, for future features
```

## Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Schema](./docs/API_SCHEMA.md)
- [Testing Guide](./docs/TESTING.md)
- [Deployment Guide](./docs/DEPLOY.md)

## Testing

```bash
# Frontend tests
cd frontend
pnpm test

# Backend tests
cd backend
pytest -v

# Smoke test (requires Docker)
./ops/smoke_test.sh
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for hand tracking
- [Three.js](https://threejs.org/) and [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Tone.js](https://tonejs.github.io/) for audio synthesis
- [Qdrant](https://qdrant.tech/) for vector similarity search
