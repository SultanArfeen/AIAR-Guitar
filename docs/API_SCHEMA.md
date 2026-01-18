# AIAR Guitar - API Schema

## Overview

This document specifies the complete WebSocket API for communication between the frontend and backend inference service.

---

## Connection

### WebSocket Endpoint

```
ws://localhost:8000/ws/inference     # Development
wss://your-domain.com/ws/inference   # Production
```

### Connection Flow

1. Client connects to WebSocket endpoint
2. Server accepts connection
3. Client sends `inference_request` messages
4. Server responds with `inference_result` or `inference_error`
5. Connection persists until client disconnects or error occurs

---

## Message Types

### Client → Server

#### `inference_request`

Request chord recognition for a hand landmark vector.

```json
{
  "type": "inference_request",
  "timestamp": 1700000000,
  "hand_anchor": "left_wrist",
  "left_hand_vector": [0.12, 0.45, 0.99, ...],
  "mode": "chord_correction",
  "meta": {
    "frame_id": 1234,
    "fps": 60
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Must be `"inference_request"` |
| `timestamp` | integer | Yes | Unix timestamp in milliseconds |
| `hand_anchor` | string | Yes | Anchor point: `"left_wrist"`, `"right_wrist"`, or `"body_center"` |
| `left_hand_vector` | float[] | Yes | Exactly 63 floats (21 landmarks × 3 coordinates) |
| `mode` | string | No | Inference mode, currently only `"chord_correction"` |
| `meta` | object | No | Optional metadata for debugging |

**Vector Format:**

The `left_hand_vector` contains 21 hand landmarks, each with 3 coordinates (x, y, z), flattened in MediaPipe order:

```
[x0, y0, z0, x1, y1, z1, ..., x20, y20, z20]
```

Landmarks are:

- 0: Wrist
- 1-4: Thumb (CMC, MCP, IP, TIP)
- 5-8: Index finger (MCP, PIP, DIP, TIP)
- 9-12: Middle finger
- 13-16: Ring finger
- 17-20: Pinky finger

**Normalization:**

Before sending, landmarks should be:

1. Translated relative to the wrist (landmarks[0])
2. Scaled by shoulder width for depth invariance
3. Values should be in range [-10, 10]

---

### Server → Client

#### `inference_result`

Successful chord recognition result.

```json
{
  "type": "inference_result",
  "timestamp": 1700000001,
  "chord_id": "C_Major",
  "confidence": 0.982,
  "fingering_map": [0, 3, 2, 0, 1, 0],
  "correction_active": true,
  "override_notes": [48, 52, 55, 60, 64, 67],
  "message": ""
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | Always `"inference_result"` |
| `timestamp` | integer | Yes | Unix timestamp |
| `chord_id` | string | Yes | Recognized chord ID (e.g., `"C_Major"`, `"Am7"`) |
| `confidence` | float | Yes | Confidence score [0.0, 1.0] |
| `fingering_map` | int[] | Yes | Fret positions for 6 strings (E A D G B e), -1 = muted |
| `correction_active` | boolean | Yes | Whether AI correction should be applied |
| `override_notes` | int[] | No | MIDI notes to play when correction is active |
| `message` | string | No | Optional human-readable message |

**Correction Thresholds:**

- `confidence >= 0.85`: `correction_active = true`
- `confidence < 0.85`: `correction_active = false`
- `confidence < 0.40`: Low confidence warning in `message`

---

#### `inference_error`

Error response for failed requests.

```json
{
  "type": "inference_error",
  "code": "ERR_AI_400",
  "message": "Invalid vector length: expected 63 floats"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Always `"inference_error"` |
| `code` | string | Error code (see table below) |
| `message` | string | Human-readable error description |

---

## Error Codes

| Code | Description | Client Action |
|------|-------------|---------------|
| `ERR_CAM_001` | Webcam permission denied | Show modal with instructions |
| `ERR_WS_002` | WebSocket unreachable or timed out | Switch to geometric mode, retry with backoff |
| `ERR_AI_003` | Low confidence (score < 0.40) | Show warning, use geometric fallback |
| `ERR_AI_400` | Bad request (invalid vector) | Check vector normalization |
| `ERR_DEP_500` | Qdrant/dependency error | Use geometric mode, log error |

---

## REST Endpoints

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "healthy",
  "timestamp": 1700000000,
  "version": "0.1.0"
}
```

### Qdrant Health

```http
GET /health/qdrant
```

Response:

```json
{
  "status": "healthy",
  "connected": true,
  "url": "http://localhost:6333"
}
```

---

## Chord Identifiers

Standard chord ID format: `{Root}_{Quality}`

| Chord ID | Name | Fingering |
|----------|------|-----------|
| `C_Major` | C Major | [0, 3, 2, 0, 1, 0] |
| `C_Minor` | C Minor | [3, 3, 5, 5, 4, 3] |
| `D_Major` | D Major | [-1, -1, 0, 2, 3, 2] |
| `D_Minor` | D Minor | [-1, -1, 0, 2, 3, 1] |
| `E_Major` | E Major | [0, 2, 2, 1, 0, 0] |
| `E_Minor` | E Minor | [0, 2, 2, 0, 0, 0] |
| `F_Major` | F Major | [1, 3, 3, 2, 1, 1] |
| `G_Major` | G Major | [3, 2, 0, 0, 0, 3] |
| `A_Major` | A Major | [0, 0, 2, 2, 2, 0] |
| `A_Minor` | A Minor | [0, 0, 2, 2, 1, 0] |
| `B_Major` | B Major | [-1, 2, 4, 4, 4, 2] |
| `B_Minor` | B Minor | [-1, 2, 4, 4, 3, 2] |

Fingering array position: `[E, A, D, G, B, e]` (low to high)

---

## Rate Limiting

- Recommended: Send at most 5 requests per second
- The `inferenceThrottleMs` config (default 200ms) controls client-side throttling
- Server does not enforce hard rate limits but may respond slowly under load

---

## Example Client Implementation

```typescript
const ws = new WebSocket('ws://localhost:8000/ws/inference');

ws.onopen = () => {
  console.log('Connected to inference server');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'inference_result') {
    if (data.correction_active) {
      applyChordCorrection(data.chord_id, data.override_notes);
    }
  } else if (data.type === 'inference_error') {
    handleError(data.code, data.message);
  }
};

function sendInferenceRequest(vector: number[]) {
  ws.send(JSON.stringify({
    type: 'inference_request',
    timestamp: Date.now(),
    hand_anchor: 'left_wrist',
    left_hand_vector: vector,
    mode: 'chord_correction',
  }));
}
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2024-01-18 | Initial API specification |
