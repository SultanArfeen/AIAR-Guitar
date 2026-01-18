# AIAR Guitar - Architecture Overview

## System Overview

AIAR Guitar is a browser-based augmented reality musical instrument that combines:

- **Computer Vision**: Real-time hand tracking using MediaPipe
- **3D Rendering**: AR guitar overlay using Three.js/React Three Fiber
- **Audio Synthesis**: Low-latency sound generation with Tone.js
- **AI Chord Correction**: Vector similarity search for accurate chord recognition

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │  MediaPipe  │    │   Three.js  │    │   Tone.js   │    │
│  │    Hands    │    │  AR Render  │    │    Audio    │    │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    │
│         │                  │                   │            │
│  ┌──────┴──────────────────┴───────────────────┴───────┐   │
│  │              Zustand State Management               │   │
│  │     (landmarks, chords, audio state, UI flags)      │   │
│  └────────────────────────┬────────────────────────────┘   │
│                           │                                 │
│                    WebSocket (JSON)                         │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────┐
│                      Backend Services                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                FastAPI WebSocket Server                  │ │
│  │              POST /ws/inference (WebSocket)              │ │
│  │              GET /health, GET /health/qdrant             │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                   │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │            Chord Recognition Service                     │ │
│  │  • Normalize 63D hand vector                            │ │
│  │  • Query Qdrant for similar chord embeddings            │ │
│  │  • Apply confidence threshold (0.85)                    │ │
│  │  • Return fingering map + MIDI notes                    │ │
│  └────────────────────────┬────────────────────────────────┘ │
│                           │                                   │
│  ┌────────────────────────▼────────────────────────────────┐ │
│  │              Qdrant Vector Database                      │ │
│  │  Collection: chords_v1                                   │ │
│  │  • 63D or 128D embeddings                               │ │
│  │  • Cosine similarity search                             │ │
│  │  • ~100 chord variations                                │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Hand Tracking Pipeline

```
Webcam Frame (60 FPS)
       │
       ▼
┌─────────────────┐
│  MediaPipe      │  Extracts 21 landmarks per hand
│  Hands WASM     │  Returns x, y, z for each
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Normalization  │  • Translate to wrist anchor
│                 │  • Scale by shoulder width
│                 │  • Apply EMA smoothing (α=0.3)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Flatten to     │  21 landmarks × 3 coords = 63 floats
│  63D Vector     │  [x0, y0, z0, x1, y1, z1, ...]
└────────┬────────┘
         │
         ▼
   Zustand Store
```

### 2. Chord Recognition Pipeline

```
63D Hand Vector
       │
       ▼
┌─────────────────┐
│  WebSocket Send │  inference_request message
│  (throttled)    │  Every ~200ms
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FastAPI        │  Validate with Pydantic
│  Backend        │  
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  L2 Normalize   │  Prepare for cosine similarity
│  Vector         │  
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Qdrant Search  │  Find top-3 similar chords
│  (or Mock)      │  
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Threshold      │  confidence >= 0.85?
│  Check          │  → correction_active = true
└────────┬────────┘
         │
         ▼
   inference_result
```

### 3. Audio Synthesis Pipeline

```
Strum Detection
(right hand velocity)
       │
       ▼
┌─────────────────┐
│  Check Velocity │  speed > threshold?
│  Threshold      │  (0.15 normalized)
└────────┬────────┘
         │ (if strum detected)
         ▼
┌─────────────────┐
│  Calculate      │  stringIndex from Y position
│  String Hit     │  fretIndex from chord/correction
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Velocity →     │  gain = lerp(min, max, v^0.9)
│  Gain Mapping   │  
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tone.js        │  PluckSynth.triggerAttack()
│  Synthesis      │  
└────────┬────────┘
         │
         ▼
   Audio Output
```

---

## Component Architecture

### Frontend

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Main application page
│   └── globals.css         # Global styles
│
├── components/
│   ├── Vision/
│   │   └── HandTracker.tsx # MediaPipe integration
│   ├── AR/
│   │   ├── ARScene.tsx     # R3F Canvas setup
│   │   └── GuitarMesh.tsx  # 3D guitar model
│   ├── UI/
│   │   ├── IntroSequence.tsx
│   │   ├── HUD.tsx
│   │   └── ErrorBoundary.tsx
│   └── Debug/
│       └── DebugView.tsx   # Debug overlay
│
├── systems/
│   └── AudioEngine.ts      # Tone.js wrapper
│
├── stores/
│   └── useStore.ts         # Zustand state
│
├── lib/
│   └── math.ts             # Vector math utilities
│
├── config/
│   └── constants.ts        # Configuration
│
└── types/
    ├── ws.ts               # WebSocket types
    └── landmarks.ts        # Hand landmark types
```

### Backend

```
backend/
├── app/
│   ├── main.py             # FastAPI application
│   ├── models/
│   │   └── inference_models.py  # Pydantic models
│   ├── services/
│   │   └── chord_recognition.py # Core logic
│   └── tests/
│       └── test_inference.py    # Pytest tests
│
├── requirements.txt
├── Dockerfile
└── pytest.ini
```

---

## State Management

### Zustand Store Structure

```typescript
interface AppState {
  // Vision
  leftHand: ProcessedHand | null;
  rightHand: ProcessedHand | null;
  bodyAnchors: BodyAnchors;
  isTracking: boolean;
  trackingFps: number;
  
  // Audio
  isInitialized: boolean;
  isMuted: boolean;
  masterVolume: number;
  activeStrings: Set<number>;
  lastStrumEvent: StrumEvent | null;
  
  // WebSocket
  wsConnected: boolean;
  lastInferenceResult: InferenceResult | null;
  inferenceLatency: number;
  
  // AI Correction
  correctionActive: boolean;
  currentChord: ChordId;
  overrideNotes: number[];
  
  // UI
  debugMode: boolean;
  error: string | null;
  fps: number;
}
```

---

## Key Algorithms

### Hand Landmark Normalization

```typescript
function normalizeLandmarks(
  landmarks: Point3D[],
  anchor: Point3D,
  scaleFactor: number
): Point3D[] {
  return landmarks.map(lm => ({
    x: (lm.x - anchor.x) / scaleFactor,
    y: (lm.y - anchor.y) / scaleFactor,
    z: (lm.z - anchor.z) / scaleFactor,
  }));
}
```

### Strum Detection

```typescript
function detectStrum(
  currentPos: Point3D,
  lastPos: Point3D,
  dt: number
): { isStrum: boolean; velocity: number } {
  const speed = distance(currentPos, lastPos) / dt;
  const isStrum = speed > STRUM_THRESHOLD;
  const velocity = clamp(speed / SPEED_MAX, 0, 1);
  return { isStrum, velocity };
}
```

### Velocity to Gain Mapping

```typescript
function velocityToGain(
  velocity: number,
  minGain: number,
  maxGain: number,
  gamma: number
): number {
  const v = clamp(velocity, 0, 1);
  return lerp(minGain, maxGain, Math.pow(v, gamma));
}
```

---

## Performance Considerations

### Frontend

| Metric | Target | Optimization |
|--------|--------|--------------|
| FPS | 60 | RAF loop, WebGL |
| Tracking latency | <16ms | WASM, GPU |
| Audio latency | <10ms | Web Audio API |
| Memory | <200MB | Dispose unused |

### Backend

| Metric | Target | Optimization |
|--------|--------|--------------|
| Inference time | <50ms | HNSW index |
| WebSocket RTT | <100ms | Local network |
| Throughput | 100 rps | Async Python |

---

## Security

### Data Privacy

1. **No raw video transmission** - Only 63 floats per hand
2. **Client-side processing** - MediaPipe runs in browser
3. **TLS encryption** - WSS in production
4. **Input validation** - Pydantic schemas

### Security Headers

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

---

## Extensibility

### Adding New Chords

1. Create embedding for chord pose
2. Insert into Qdrant collection
3. Add to CHORD_DATABASE constant

### Custom Tunings

1. Update GUITAR_TUNING in constants.ts
2. Recalculate MIDI mappings
3. Update sample paths if using samples

### New Instruments

The architecture supports other string instruments:

- Ukulele (4 strings)
- Bass (4-6 strings)
- Violin (4 strings)

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 15 | SSR, routing |
| 3D Rendering | React Three Fiber | WebGL |
| Hand Tracking | MediaPipe | WASM CV |
| Audio | Tone.js | Web Audio |
| State | Zustand | React state |
| Animation | Framer Motion | UI motion |
| Backend | FastAPI | Async Python |
| Validation | Pydantic | Type safety |
| Vector DB | Qdrant | Similarity search |
| DevOps | Docker | Containerization |
| CI/CD | GitHub Actions | Automation |
