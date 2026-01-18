# AIAR Guitar - Testing Guide

## Overview

This guide covers testing strategies, tools, and best practices for the AIAR Guitar project.

---

## Test Structure

```
/
├── frontend/
│   ├── __tests__/           # Component tests
│   ├── lib/__tests__/       # Utility tests
│   └── jest.config.js
└── backend/
    ├── app/tests/           # API and service tests
    └── pytest.ini
```

---

## Frontend Testing

### Setup

```bash
cd frontend
pnpm install
pnpm test
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test:watch

# Run specific test file
pnpm test -- HandTracker.test.tsx
```

### Test Categories

#### 1. Unit Tests - Math Utilities

Test vector operations, normalization, and collision detection:

```typescript
// lib/__tests__/math.test.ts
import { midpoint, normalize, distance, velocityToGain } from '@/lib/math';

describe('Math Utilities', () => {
  test('midpoint calculates correctly', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 2, y: 2, z: 2 };
    const result = midpoint(a, b);
    expect(result).toEqual({ x: 1, y: 1, z: 1 });
  });

  test('velocityToGain maps correctly', () => {
    const gain = velocityToGain(0.5, 0.1, 0.9, 0.9);
    expect(gain).toBeGreaterThan(0.1);
    expect(gain).toBeLessThan(0.9);
  });
});
```

#### 2. Component Tests

Test React components with Testing Library:

```typescript
// components/__tests__/HUD.test.tsx
import { render, screen } from '@testing-library/react';
import HUD from '@/components/UI/HUD';

describe('HUD', () => {
  test('displays chord name', () => {
    // Mock store with chord
    render(<HUD />);
    expect(screen.getByText(/tracking/i)).toBeInTheDocument();
  });
});
```

#### 3. Integration Tests

Test component interactions and state management:

```typescript
// stores/__tests__/useStore.test.ts
import { useStore } from '@/stores/useStore';

describe('Store', () => {
  test('setLeftHand updates state', () => {
    const { setLeftHand, leftHand } = useStore.getState();
    expect(leftHand).toBeNull();
    
    setLeftHand({ /* mock hand data */ });
    expect(useStore.getState().leftHand).not.toBeNull();
  });
});
```

### Mocking

The Jest setup includes mocks for:

- `window.matchMedia`
- `ResizeObserver`
- `AudioContext` (Web Audio API)
- WebGL context
- `navigator.mediaDevices`

See `frontend/jest.setup.js` for details.

---

## Backend Testing

### Setup

```bash
cd backend
pip install -r requirements.txt
pytest
```

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest app/tests/test_inference.py

# Run specific test class
pytest app/tests/test_inference.py::TestWebSocket

# Run marked tests
pytest -m websocket
```

### Test Categories

#### 1. Model Validation Tests

Test Pydantic model validation:

```python
# app/tests/test_inference.py
class TestInferenceModels:
    def test_valid_request(self, sample_vector):
        request = InferenceRequest(
            type="inference_request",
            timestamp=1700000000,
            hand_anchor="left_wrist",
            left_hand_vector=sample_vector,
        )
        assert len(request.left_hand_vector) == 63
    
    def test_invalid_vector_length(self):
        with pytest.raises(ValueError):
            InferenceRequest(
                left_hand_vector=[0.1] * 50,  # Wrong!
            )
```

#### 2. Service Tests

Test chord recognition logic:

```python
class TestChordRecognition:
    @pytest.mark.asyncio
    async def test_process_inference(self, chord_service, sample_vector):
        request = InferenceRequest(
            type="inference_request",
            timestamp=1700000000,
            hand_anchor="left_wrist",
            left_hand_vector=sample_vector,
        )
        
        result = await chord_service.process_inference(request)
        
        assert result.type == "inference_result"
        assert 0 <= result.confidence <= 1
```

#### 3. WebSocket Tests

Test real-time communication:

```python
class TestWebSocket:
    def test_websocket_valid_request(self, client, valid_request):
        with client.websocket_connect("/ws/inference") as ws:
            ws.send_json(valid_request)
            response = ws.receive_json()
            
            assert response["type"] == "inference_result"
            assert "chord_id" in response
```

### Fixtures

Common test fixtures in `conftest.py`:

```python
@pytest.fixture
def sample_vector() -> List[float]:
    return [0.1 * i for i in range(63)]

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
async def chord_service():
    service = ChordRecognitionService()
    await service.initialize()
    yield service
    await service.close()
```

---

## Integration Testing

### Docker Compose Tests

Test the full stack with Docker:

```bash
# Start services
docker-compose -f ops/docker-compose.yml up -d

# Wait for healthy
sleep 30

# Run smoke tests
curl http://localhost:3000
curl http://localhost:8000/health
curl http://localhost:6333/

# Run WebSocket test
python ops/smoke_test.py

# Cleanup
docker-compose down
```

### Smoke Test Script

```python
# ops/smoke_test.py
import asyncio
import websockets
import json

async def smoke_test():
    uri = "ws://localhost:8000/ws/inference"
    async with websockets.connect(uri) as ws:
        # Send request
        request = {
            "type": "inference_request",
            "timestamp": 1700000000,
            "hand_anchor": "left_wrist",
            "left_hand_vector": [0.1] * 63,
        }
        await ws.send(json.dumps(request))
        
        # Receive response
        response = await ws.recv()
        data = json.loads(response)
        
        assert data["type"] == "inference_result"
        print("✅ Smoke test passed!")

if __name__ == "__main__":
    asyncio.run(smoke_test())
```

---

## E2E Testing (Future)

For browser-based E2E tests, we recommend Playwright:

```typescript
// e2e/app.spec.ts
import { test, expect } from '@playwright/test';

test('app loads and shows intro', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text=AIAR GUITAR')).toBeVisible();
});

test('debug mode shows overlay', async ({ page }) => {
  await page.goto('http://localhost:3000?debug=true');
  // Grant camera permission via browser context
  // Assert debug panel is visible
});
```

---

## Coverage Requirements

### Frontend

| Metric | Minimum | Target |
|--------|---------|--------|
| Statements | 50% | 70% |
| Branches | 50% | 70% |
| Functions | 50% | 70% |
| Lines | 50% | 70% |

### Backend

| Metric | Minimum | Target |
|--------|---------|--------|
| Coverage | 60% | 80% |

---

## CI Integration

Tests run automatically on GitHub Actions:

1. **Push to main/develop**: Full test suite
2. **Pull requests**: Full test suite + Docker build
3. **Coverage reports**: Uploaded to Codecov

See `.github/workflows/ci.yml` for details.

---

## Test Data

### Sample Vectors

Pre-computed test vectors for common chords:

```python
# Located in app/tests/fixtures/
C_MAJOR_VECTOR = [...]  # Vector for C Major chord pose
G_MAJOR_VECTOR = [...]  # Vector for G Major chord pose
```

### Mock Responses

The backend includes mock chord recognition when Qdrant is unavailable, enabling frontend development without the full stack.

---

## Debugging Tests

### Frontend

```bash
# Debug in VS Code
pnpm test -- --runInBand --debug

# Debug specific test
pnpm test -- --testNamePattern="midpoint"
```

### Backend

```bash
# Debug with pdb
pytest --pdb

# Stop on first failure
pytest -x

# Show print statements
pytest -s
```

---

## Best Practices

1. **Test names should describe behavior**, not implementation
2. **Use fixtures** for common setup
3. **Mock external dependencies** (Qdrant, MediaPipe, Web Audio)
4. **Test edge cases**: empty vectors, null values, network errors
5. **Keep tests fast**: mock expensive operations
6. **Avoid testing implementation details**: focus on public API
