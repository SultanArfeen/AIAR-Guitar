"""
AIAR Guitar Backend - FastAPI Application

Main entry point for the WebSocket inference server.
Handles chord recognition requests and returns AI-corrected chord data.

Author: AIAR Guitar Team
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.models.inference_models import (
    InferenceRequest,
    InferenceResult,
    InferenceError,
    HealthResponse,
    QdrantHealthResponse,
)
from app.services.chord_recognition import ChordRecognitionService

# ==============================================
# Configuration
# ==============================================

# Load environment variables
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("aiar-guitar")

# ==============================================
# Service Instances
# ==============================================

chord_service: Optional[ChordRecognitionService] = None


# ==============================================
# Application Lifecycle
# ==============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    global chord_service
    
    logger.info("Starting AIAR Guitar Backend...")
    
    # Initialize chord recognition service
    chord_service = ChordRecognitionService(qdrant_url=QDRANT_URL)
    await chord_service.initialize()
    
    logger.info("Backend initialized successfully")
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down AIAR Guitar Backend...")
    if chord_service:
        await chord_service.close()
    logger.info("Shutdown complete")


# ==============================================
# FastAPI Application
# ==============================================

app = FastAPI(
    title="AIAR Guitar API",
    description="Real-time chord recognition and AI correction for AR guitar",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================
# REST Endpoints
# ==============================================

@app.get("/", response_model=dict)
async def root():
    """Root endpoint - API information."""
    return {
        "name": "AIAR Guitar API",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=int(time.time()),
        version="0.1.0",
    )


@app.get("/health/qdrant", response_model=QdrantHealthResponse)
async def qdrant_health_check():
    """Check Qdrant vector database health."""
    if not chord_service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    is_healthy = await chord_service.check_qdrant_health()
    
    return QdrantHealthResponse(
        status="healthy" if is_healthy else "unhealthy",
        connected=is_healthy,
        url=QDRANT_URL,
    )


# ==============================================
# WebSocket Endpoint
# ==============================================

@app.websocket("/ws/inference")
async def websocket_inference(websocket: WebSocket):
    """
    WebSocket endpoint for real-time chord inference.
    
    Accepts InferenceRequest messages and returns InferenceResult
    or InferenceError responses.
    """
    await websocket.accept()
    logger.info(f"WebSocket connection accepted from {websocket.client}")
    
    try:
        while True:
            # Receive JSON message
            try:
                data = await websocket.receive_json()
            except Exception as e:
                logger.warning(f"Failed to receive JSON: {e}")
                await websocket.send_json(
                    InferenceError(
                        code="ERR_AI_400",
                        message=f"Invalid JSON format: {str(e)}",
                    ).model_dump()
                )
                continue
            
            # Validate request
            try:
                request = InferenceRequest.model_validate(data)
            except ValidationError as e:
                error_msg = str(e.errors()[0]["msg"]) if e.errors() else str(e)
                logger.warning(f"Validation error: {error_msg}")
                await websocket.send_json(
                    InferenceError(
                        code="ERR_AI_400",
                        message=f"Invalid request: {error_msg}",
                    ).model_dump()
                )
                continue
            
            # Process inference
            start_time = time.time()
            
            try:
                if not chord_service:
                    raise RuntimeError("Chord service not initialized")
                
                result = await chord_service.process_inference(request)
                
                # Log processing time
                elapsed_ms = (time.time() - start_time) * 1000
                logger.debug(
                    f"Inference completed in {elapsed_ms:.1f}ms | "
                    f"Chord: {result.chord_id} | Confidence: {result.confidence:.2f}"
                )
                
                # Send result
                await websocket.send_json(result.model_dump())
                
            except Exception as e:
                logger.error(f"Inference error: {e}")
                await websocket.send_json(
                    InferenceError(
                        code="ERR_DEP_500",
                        message=f"Inference failed: {str(e)}",
                    ).model_dump()
                )
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {websocket.client}")
    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass


# ==============================================
# Development Server
# ==============================================

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=LOG_LEVEL.lower(),
    )
