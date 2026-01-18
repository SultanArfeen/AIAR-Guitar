"""
AIAR Guitar Backend - Chord Recognition Service

Processes hand landmark vectors and returns chord predictions
using vector similarity search against the chord database.

Supports two embedding modes:
- raw: Uses normalized 63D vector directly
- mlp: Passes through small MLP to produce 128D embedding

Author: AIAR Guitar Team
"""

import os
import time
import logging
import math
from typing import List, Optional, Dict, Any

import numpy as np

from app.models.inference_models import (
    InferenceRequest,
    InferenceResult,
    ChordMatch,
)

# ==============================================
# Configuration
# ==============================================

EMBEDDING_MODE = os.getenv("EMBEDDING_MODE", "raw")  # "raw" or "mlp"
SCORE_THRESHOLD = float(os.getenv("SCORE_THRESHOLD", "0.85"))
LOW_CONFIDENCE_THRESHOLD = 0.4
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "chords_v1")

logger = logging.getLogger("aiar-guitar.chord_recognition")


# ==============================================
# Chord Database (Mock Data for Development)
# ==============================================

CHORD_DATABASE: Dict[str, Dict[str, Any]] = {
    "C_Major": {
        "fingering": [0, 3, 2, 0, 1, 0],
        "midi_notes": [48, 52, 55, 60, 64, 67],
        "category": "major",
    },
    "C_Minor": {
        "fingering": [3, 3, 5, 5, 4, 3],
        "midi_notes": [48, 51, 55, 60, 63, 67],
        "category": "minor",
    },
    "D_Major": {
        "fingering": [-1, -1, 0, 2, 3, 2],
        "midi_notes": [50, 54, 57, 62, 66, 69],
        "category": "major",
    },
    "D_Minor": {
        "fingering": [-1, -1, 0, 2, 3, 1],
        "midi_notes": [50, 53, 57, 62, 65, 69],
        "category": "minor",
    },
    "E_Major": {
        "fingering": [0, 2, 2, 1, 0, 0],
        "midi_notes": [40, 47, 52, 56, 59, 64],
        "category": "major",
    },
    "E_Minor": {
        "fingering": [0, 2, 2, 0, 0, 0],
        "midi_notes": [40, 47, 52, 55, 59, 64],
        "category": "minor",
    },
    "F_Major": {
        "fingering": [1, 3, 3, 2, 1, 1],
        "midi_notes": [41, 48, 53, 57, 60, 65],
        "category": "major",
    },
    "G_Major": {
        "fingering": [3, 2, 0, 0, 0, 3],
        "midi_notes": [43, 47, 50, 55, 59, 67],
        "category": "major",
    },
    "G_Minor": {
        "fingering": [3, 5, 5, 3, 3, 3],
        "midi_notes": [43, 46, 50, 55, 58, 67],
        "category": "minor",
    },
    "A_Major": {
        "fingering": [0, 0, 2, 2, 2, 0],
        "midi_notes": [45, 52, 57, 61, 64, 69],
        "category": "major",
    },
    "A_Minor": {
        "fingering": [0, 0, 2, 2, 1, 0],
        "midi_notes": [45, 52, 57, 60, 64, 69],
        "category": "minor",
    },
    "B_Major": {
        "fingering": [-1, 2, 4, 4, 4, 2],
        "midi_notes": [47, 54, 59, 63, 66, 71],
        "category": "major",
    },
    "B_Minor": {
        "fingering": [-1, 2, 4, 4, 3, 2],
        "midi_notes": [47, 54, 59, 62, 66, 71],
        "category": "minor",
    },
}


# ==============================================
# Vector Processing
# ==============================================

def l2_normalize(vector: List[float]) -> np.ndarray:
    """L2 normalize a vector for cosine similarity."""
    arr = np.array(vector, dtype=np.float32)
    norm = np.linalg.norm(arr)
    if norm == 0:
        return arr
    return arr / norm


def validate_normalization(vector: List[float]) -> np.ndarray:
    """Validate and clean the input vector."""
    arr = np.array(vector, dtype=np.float32)
    
    # Replace any NaN or Inf with 0
    arr = np.nan_to_num(arr, nan=0.0, posinf=1.0, neginf=-1.0)
    
    return arr


# ==============================================
# Mock Embedding Generation
# ==============================================

def generate_mock_embedding(chord_id: str, noise_level: float = 0.1) -> np.ndarray:
    """
    Generate a deterministic mock embedding for a chord.
    In production, these would come from the Qdrant database.
    """
    # Use chord ID as seed for reproducibility
    seed = sum(ord(c) for c in chord_id)
    rng = np.random.RandomState(seed)
    
    # Generate base embedding
    base = rng.randn(63).astype(np.float32)
    
    # Add some structure based on chord type
    if "Major" in chord_id:
        base[0:10] += 0.5
    elif "Minor" in chord_id:
        base[0:10] -= 0.5
    
    return l2_normalize(base.tolist())


# ==============================================
# Chord Recognition Service
# ==============================================

class ChordRecognitionService:
    """
    Service for chord recognition using vector similarity.
    
    Supports:
    - Qdrant vector database (when available)
    - Mock fallback for development
    """
    
    def __init__(self, qdrant_url: str = "http://localhost:6333"):
        self.qdrant_url = qdrant_url
        self.qdrant_client = None
        self.use_mock = True  # Start with mock until Qdrant is confirmed
        self.chord_embeddings: Dict[str, np.ndarray] = {}
        
    async def initialize(self) -> None:
        """Initialize the service and connect to Qdrant if available."""
        logger.info("Initializing ChordRecognitionService...")
        
        # Try to connect to Qdrant
        try:
            from qdrant_client import QdrantClient
            from qdrant_client.http.exceptions import UnexpectedResponse
            
            self.qdrant_client = QdrantClient(url=self.qdrant_url)
            
            # Check if collection exists
            collections = self.qdrant_client.get_collections()
            collection_names = [c.name for c in collections.collections]
            
            if QDRANT_COLLECTION in collection_names:
                logger.info(f"Connected to Qdrant, using collection: {QDRANT_COLLECTION}")
                self.use_mock = False
            else:
                logger.warning(f"Collection '{QDRANT_COLLECTION}' not found, using mock")
                self.use_mock = True
                
        except Exception as e:
            logger.warning(f"Qdrant not available ({e}), using mock")
            self.use_mock = True
        
        # Pre-generate mock embeddings
        if self.use_mock:
            for chord_id in CHORD_DATABASE:
                self.chord_embeddings[chord_id] = generate_mock_embedding(chord_id)
            logger.info(f"Generated {len(self.chord_embeddings)} mock embeddings")
    
    async def close(self) -> None:
        """Clean up resources."""
        if self.qdrant_client:
            self.qdrant_client.close()
            self.qdrant_client = None
    
    async def check_qdrant_health(self) -> bool:
        """Check if Qdrant is healthy."""
        if not self.qdrant_client:
            return False
        
        try:
            # Simple health check
            self.qdrant_client.get_collections()
            return True
        except Exception:
            return False
    
    def _compute_similarity(self, vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        """Compute cosine similarity between two vectors."""
        dot = np.dot(vec_a, vec_b)
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return float(dot / (norm_a * norm_b))
    
    async def _search_mock(self, query_vector: np.ndarray, top_k: int = 3) -> List[ChordMatch]:
        """Search using mock embeddings."""
        similarities = []
        
        for chord_id, embedding in self.chord_embeddings.items():
            sim = self._compute_similarity(query_vector, embedding)
            similarities.append((chord_id, sim))
        
        # Sort by similarity descending
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        # Return top K
        results = []
        for chord_id, score in similarities[:top_k]:
            chord_data = CHORD_DATABASE[chord_id]
            results.append(ChordMatch(
                chord_id=chord_id,
                score=score,
                fingering=chord_data["fingering"],
                midi_notes=chord_data["midi_notes"],
            ))
        
        return results
    
    async def _search_qdrant(self, query_vector: np.ndarray, top_k: int = 3) -> List[ChordMatch]:
        """Search using Qdrant vector database."""
        if not self.qdrant_client:
            return await self._search_mock(query_vector, top_k)
        
        try:
            results = self.qdrant_client.search(
                collection_name=QDRANT_COLLECTION,
                query_vector=query_vector.tolist(),
                limit=top_k,
            )
            
            matches = []
            for result in results:
                payload = result.payload or {}
                matches.append(ChordMatch(
                    chord_id=payload.get("chord_id", "unknown"),
                    score=result.score,
                    fingering=payload.get("fingering", [0, 0, 0, 0, 0, 0]),
                    midi_notes=payload.get("midi_notes", []),
                ))
            
            return matches
            
        except Exception as e:
            logger.error(f"Qdrant search failed: {e}")
            return await self._search_mock(query_vector, top_k)
    
    async def process_inference(self, request: InferenceRequest) -> InferenceResult:
        """
        Process an inference request and return chord prediction.
        
        Pipeline:
        1. Validate input vector
        2. Normalize/embed vector
        3. Search for similar chords
        4. Apply confidence thresholds
        5. Return result
        """
        # Validate and clean input
        input_vector = validate_normalization(request.left_hand_vector)
        
        # Normalize for similarity search
        if EMBEDDING_MODE == "mlp":
            # TODO: Implement MLP embedding
            # For now, just use raw vector
            query_vector = l2_normalize(input_vector.tolist())
        else:
            query_vector = l2_normalize(input_vector.tolist())
        
        # Search for similar chords
        if self.use_mock:
            matches = await self._search_mock(query_vector)
        else:
            matches = await self._search_qdrant(query_vector)
        
        if not matches:
            # No matches found
            return InferenceResult(
                timestamp=int(time.time()),
                chord_id="unknown",
                confidence=0.0,
                fingering_map=[0, 0, 0, 0, 0, 0],
                correction_active=False,
                message="No chord matches found",
            )
        
        # Get top match
        top_match = matches[0]
        
        # Determine if correction should be active
        correction_active = top_match.score >= SCORE_THRESHOLD
        
        # Build message
        message = None
        if top_match.score < LOW_CONFIDENCE_THRESHOLD:
            message = "Low confidence - try adjusting hand position"
        
        return InferenceResult(
            timestamp=int(time.time()),
            chord_id=top_match.chord_id,
            confidence=top_match.score,
            fingering_map=top_match.fingering,
            correction_active=correction_active,
            override_notes=top_match.midi_notes if correction_active else None,
            message=message,
        )
