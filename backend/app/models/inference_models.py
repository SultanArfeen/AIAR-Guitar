"""
AIAR Guitar Backend - Pydantic Models

Data models for WebSocket communication and API responses.
Implements strict validation for inference requests and results.

Author: AIAR Guitar Team
"""

from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


# ==============================================
# Request Models
# ==============================================

class InferenceRequest(BaseModel):
    """
    Inference request from the frontend client.
    
    Contains the normalized hand landmark vector for chord recognition.
    """
    
    type: Literal["inference_request"] = "inference_request"
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")
    hand_anchor: Literal["left_wrist", "right_wrist", "body_center"] = Field(
        "left_wrist",
        description="Anchor point used for normalization",
    )
    left_hand_vector: List[float] = Field(
        ...,
        min_length=63,
        max_length=63,
        description="Flattened 21 landmarks × 3 coordinates = 63 floats",
    )
    mode: Optional[Literal["chord_correction"]] = Field(
        None,
        description="Inference mode",
    )
    meta: Optional[Dict[str, Any]] = Field(
        None,
        description="Optional metadata (frame_id, fps, etc.)",
    )
    
    @field_validator("left_hand_vector")
    @classmethod
    def validate_vector_values(cls, v: List[float]) -> List[float]:
        """Validate that vector values are in reasonable range."""
        for i, val in enumerate(v):
            if not isinstance(val, (int, float)):
                raise ValueError(f"Vector element {i} must be a number, got {type(val)}")
            if val < -10 or val > 10:
                raise ValueError(f"Vector element {i} out of range [-10, 10]: {val}")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "type": "inference_request",
                "timestamp": 1700000000,
                "hand_anchor": "left_wrist",
                "left_hand_vector": [0.0] * 63,
                "mode": "chord_correction",
                "meta": {"frame_id": 1234, "fps": 60},
            }
        }


# ==============================================
# Response Models
# ==============================================

class InferenceResult(BaseModel):
    """
    Successful inference result with chord recognition data.
    """
    
    type: Literal["inference_result"] = "inference_result"
    timestamp: int = Field(..., description="Unix timestamp")
    chord_id: str = Field(..., description="Recognized chord identifier (e.g., 'C_Major')")
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score [0.0, 1.0]",
    )
    fingering_map: List[int] = Field(
        ...,
        min_length=6,
        max_length=6,
        description="Fret positions for each string (E A D G B e), -1 for muted",
    )
    correction_active: bool = Field(
        ...,
        description="Whether AI chord correction should be applied",
    )
    override_notes: Optional[List[int]] = Field(
        None,
        description="MIDI note numbers to play when correction is active",
    )
    message: Optional[str] = Field(
        None,
        description="Optional human-readable message",
    )

    @field_validator("fingering_map")
    @classmethod
    def validate_fingering(cls, v: List[int]) -> List[int]:
        """Validate fingering values are in valid range."""
        for i, fret in enumerate(v):
            if not isinstance(fret, int):
                raise ValueError(f"Fingering element {i} must be an integer")
            if fret < -1 or fret > 24:
                raise ValueError(f"Fingering element {i} out of range [-1, 24]: {fret}")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "type": "inference_result",
                "timestamp": 1700000001,
                "chord_id": "C_Major",
                "confidence": 0.982,
                "fingering_map": [0, 3, 2, 0, 1, 0],
                "correction_active": True,
                "override_notes": [48, 52, 55, 60, 64, 67],
                "message": "",
            }
        }


class InferenceError(BaseModel):
    """
    Error response for failed inference requests.
    """
    
    type: Literal["inference_error"] = "inference_error"
    code: Literal[
        "ERR_CAM_001",   # Webcam permission denied
        "ERR_WS_002",    # WebSocket unreachable
        "ERR_AI_003",    # Low confidence
        "ERR_AI_400",    # Bad request
        "ERR_DEP_500",   # Dependency error (Qdrant)
    ] = Field(..., description="Error code")
    message: str = Field(..., description="Human-readable error message")

    class Config:
        json_schema_extra = {
            "example": {
                "type": "inference_error",
                "code": "ERR_AI_400",
                "message": "Invalid vector length: expected 63 floats",
            }
        }


# ==============================================
# Health Check Models
# ==============================================

class HealthResponse(BaseModel):
    """Response for /health endpoint."""
    
    status: Literal["healthy", "unhealthy"]
    timestamp: int
    version: str


class QdrantHealthResponse(BaseModel):
    """Response for /health/qdrant endpoint."""
    
    status: Literal["healthy", "unhealthy"]
    connected: bool
    url: str


# ==============================================
# Chord Data Models
# ==============================================

class ChordData(BaseModel):
    """
    Chord definition with fingering and MIDI notes.
    Used for the chord database.
    """
    
    chord_id: str
    name: str
    fingering: List[int] = Field(..., min_length=6, max_length=6)
    midi_notes: List[int]
    category: Literal["major", "minor", "seventh", "diminished", "augmented", "other"]
    difficulty: int = Field(..., ge=1, le=5)


class ChordMatch(BaseModel):
    """
    Result of a chord similarity search.
    """
    
    chord_id: str
    score: float
    fingering: List[int]
    midi_notes: List[int]
