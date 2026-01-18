"""
AIAR Guitar Backend - Tests for Inference

Tests for the WebSocket inference endpoint and chord recognition service.

Usage: pytest -v app/tests/
"""

import pytest
import asyncio
from typing import List

from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket

from app.main import app
from app.models.inference_models import (
    InferenceRequest,
    InferenceResult,
    InferenceError,
)
from app.services.chord_recognition import (
    ChordRecognitionService,
    l2_normalize,
    validate_normalization,
    CHORD_DATABASE,
)


# ==============================================
# Fixtures
# ==============================================

@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_vector() -> List[float]:
    """Generate a sample 63-float vector."""
    return [0.1 * i for i in range(63)]


@pytest.fixture
def valid_request(sample_vector) -> dict:
    """Create a valid inference request."""
    return {
        "type": "inference_request",
        "timestamp": 1700000000,
        "hand_anchor": "left_wrist",
        "left_hand_vector": sample_vector,
        "mode": "chord_correction",
    }


@pytest.fixture
async def chord_service():
    """Create and initialize chord service."""
    service = ChordRecognitionService()
    await service.initialize()
    yield service
    await service.close()


# ==============================================
# Health Check Tests
# ==============================================

class TestHealthEndpoints:
    """Tests for health check endpoints."""
    
    def test_root_endpoint(self, client):
        """Test root endpoint returns API info."""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == "AIAR Guitar API"
        assert "version" in data
        assert data["status"] == "running"
    
    def test_health_endpoint(self, client):
        """Test health endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data


# ==============================================
# Model Validation Tests
# ==============================================

class TestInferenceModels:
    """Tests for Pydantic model validation."""
    
    def test_valid_request(self, sample_vector):
        """Test that valid request passes validation."""
        request = InferenceRequest(
            type="inference_request",
            timestamp=1700000000,
            hand_anchor="left_wrist",
            left_hand_vector=sample_vector,
        )
        
        assert request.type == "inference_request"
        assert len(request.left_hand_vector) == 63
    
    def test_invalid_vector_length(self):
        """Test that wrong vector length fails validation."""
        with pytest.raises(ValueError):
            InferenceRequest(
                type="inference_request",
                timestamp=1700000000,
                hand_anchor="left_wrist",
                left_hand_vector=[0.1] * 50,  # Wrong length
            )
    
    def test_invalid_vector_values(self, sample_vector):
        """Test that out-of-range values fail validation."""
        bad_vector = sample_vector.copy()
        bad_vector[0] = 100.0  # Out of range
        
        with pytest.raises(ValueError):
            InferenceRequest(
                type="inference_request",
                timestamp=1700000000,
                hand_anchor="left_wrist",
                left_hand_vector=bad_vector,
            )
    
    def test_valid_result(self):
        """Test that valid result passes validation."""
        result = InferenceResult(
            type="inference_result",
            timestamp=1700000001,
            chord_id="C_Major",
            confidence=0.95,
            fingering_map=[0, 3, 2, 0, 1, 0],
            correction_active=True,
            override_notes=[48, 52, 55, 60, 64, 67],
        )
        
        assert result.chord_id == "C_Major"
        assert result.correction_active is True
    
    def test_invalid_fingering(self):
        """Test that invalid fingering fails validation."""
        with pytest.raises(ValueError):
            InferenceResult(
                type="inference_result",
                timestamp=1700000001,
                chord_id="C_Major",
                confidence=0.95,
                fingering_map=[0, 3, 2, 0, 30, 0],  # 30 > 24
                correction_active=True,
            )


# ==============================================
# Vector Processing Tests
# ==============================================

class TestVectorProcessing:
    """Tests for vector normalization and processing."""
    
    def test_l2_normalize(self):
        """Test L2 normalization produces unit vector."""
        import numpy as np
        
        vector = [1.0, 2.0, 3.0]
        normalized = l2_normalize(vector)
        
        # Check unit length
        norm = np.linalg.norm(normalized)
        assert abs(norm - 1.0) < 1e-6
    
    def test_l2_normalize_zero_vector(self):
        """Test L2 normalization handles zero vector."""
        import numpy as np
        
        vector = [0.0, 0.0, 0.0]
        normalized = l2_normalize(vector)
        
        # Should return zero vector
        assert np.all(normalized == 0)
    
    def test_validate_normalization(self, sample_vector):
        """Test input validation cleans bad values."""
        import numpy as np
        
        bad_vector = sample_vector.copy()
        bad_vector[0] = float('nan')
        bad_vector[1] = float('inf')
        
        cleaned = validate_normalization(bad_vector)
        
        # NaN should be replaced with 0
        assert cleaned[0] == 0.0
        # Inf should be replaced with 1
        assert cleaned[1] == 1.0


# ==============================================
# Chord Recognition Tests
# ==============================================

class TestChordRecognition:
    """Tests for chord recognition service."""
    
    @pytest.mark.asyncio
    async def test_service_initialization(self, chord_service):
        """Test service initializes correctly."""
        assert chord_service.use_mock is True  # Mock mode without Qdrant
        assert len(chord_service.chord_embeddings) > 0
    
    @pytest.mark.asyncio
    async def test_mock_search_returns_results(self, chord_service, sample_vector):
        """Test mock search returns chord matches."""
        import numpy as np
        
        query = l2_normalize(sample_vector)
        results = await chord_service._search_mock(query)
        
        assert len(results) > 0
        assert results[0].chord_id in CHORD_DATABASE
        assert 0 <= results[0].score <= 1
    
    @pytest.mark.asyncio
    async def test_process_inference(self, chord_service, sample_vector):
        """Test full inference pipeline."""
        request = InferenceRequest(
            type="inference_request",
            timestamp=1700000000,
            hand_anchor="left_wrist",
            left_hand_vector=sample_vector,
        )
        
        result = await chord_service.process_inference(request)
        
        assert result.type == "inference_result"
        assert result.chord_id is not None
        assert 0 <= result.confidence <= 1
        assert len(result.fingering_map) == 6
    
    def test_chord_database_complete(self):
        """Test chord database has required fields."""
        for chord_id, data in CHORD_DATABASE.items():
            assert "fingering" in data
            assert "midi_notes" in data
            assert len(data["fingering"]) == 6


# ==============================================
# WebSocket Tests
# ==============================================

class TestWebSocket:
    """Tests for WebSocket inference endpoint."""
    
    def test_websocket_connect(self, client):
        """Test WebSocket connection."""
        with client.websocket_connect("/ws/inference") as websocket:
            # Connection should be accepted
            assert websocket is not None
    
    def test_websocket_invalid_json(self, client):
        """Test WebSocket handles invalid JSON."""
        with client.websocket_connect("/ws/inference") as websocket:
            # Send invalid data
            websocket.send_text("not valid json")
            
            # Should receive error
            response = websocket.receive_json()
            assert response["type"] == "inference_error"
            assert response["code"] == "ERR_AI_400"
    
    def test_websocket_valid_request(self, client, valid_request):
        """Test WebSocket handles valid request."""
        with client.websocket_connect("/ws/inference") as websocket:
            websocket.send_json(valid_request)
            
            response = websocket.receive_json()
            
            # Should receive result
            assert response["type"] == "inference_result"
            assert "chord_id" in response
            assert "confidence" in response


# ==============================================
# Math Utility Tests
# ==============================================

class TestMathUtilities:
    """Tests for math utility functions."""
    
    def test_similarity_same_vector(self, chord_service, sample_vector):
        """Test similarity of identical vectors is 1."""
        import numpy as np
        
        vec = l2_normalize(sample_vector)
        sim = chord_service._compute_similarity(vec, vec)
        
        assert abs(sim - 1.0) < 1e-6
    
    def test_similarity_orthogonal(self, chord_service):
        """Test similarity of orthogonal vectors is 0."""
        import numpy as np
        
        vec_a = np.array([1, 0, 0], dtype=np.float32)
        vec_b = np.array([0, 1, 0], dtype=np.float32)
        
        sim = chord_service._compute_similarity(vec_a, vec_b)
        
        assert abs(sim) < 1e-6
