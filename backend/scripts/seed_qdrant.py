#!/usr/bin/env python3
"""
Qdrant Database Seeder for AIAR Guitar

This script populates the Qdrant vector database with chord embeddings.
Each chord is represented as a 63-dimensional vector (21 landmarks × 3 coordinates).

Run this script after starting Qdrant:
    python scripts/seed_qdrant.py
"""

import os
import sys
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    PointStruct,
)

# Configuration
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = "chords_v1"
VECTOR_SIZE = 63  # 21 landmarks × 3 coordinates

# Chord definitions with realistic hand position vectors
# These are normalized vectors representing typical finger positions for each chord
CHORD_DATABASE = [
    {
        "id": 1,
        "name": "C",
        "fingering": [0, 3, 2, 0, 1, 0],  # Standard C major
        "category": "major",
        "difficulty": "beginner",
        # Simulated normalized vector for C chord hand position
        "vector": None,  # Will be generated
    },
    {
        "id": 2,
        "name": "D",
        "fingering": [2, 3, 2, 0, -1, -1],  # D major (x x 0 2 3 2)
        "category": "major",
        "difficulty": "beginner",
        "vector": None,
    },
    {
        "id": 3,
        "name": "E",
        "fingering": [0, 2, 2, 1, 0, 0],  # E major
        "category": "major",
        "difficulty": "beginner",
        "vector": None,
    },
    {
        "id": 4,
        "name": "F",
        "fingering": [1, 1, 2, 3, 3, 1],  # F major (barre)
        "category": "major",
        "difficulty": "intermediate",
        "vector": None,
    },
    {
        "id": 5,
        "name": "G",
        "fingering": [3, 2, 0, 0, 0, 3],  # G major
        "category": "major",
        "difficulty": "beginner",
        "vector": None,
    },
    {
        "id": 6,
        "name": "A",
        "fingering": [0, 0, 2, 2, 2, 0],  # A major
        "category": "major",
        "difficulty": "beginner",
        "vector": None,
    },
    {
        "id": 7,
        "name": "Am",
        "fingering": [0, 0, 2, 2, 1, 0],  # A minor
        "category": "minor",
        "difficulty": "beginner",
        "vector": None,
    },
    {
        "id": 8,
        "name": "Em",
        "fingering": [0, 2, 2, 0, 0, 0],  # E minor
        "category": "minor",
        "difficulty": "beginner",
        "vector": None,
    },
    {
        "id": 9,
        "name": "Dm",
        "fingering": [1, 3, 2, 0, -1, -1],  # D minor
        "category": "minor",
        "difficulty": "beginner",
        "vector": None,
    },
    {
        "id": 10,
        "name": "B7",
        "fingering": [2, 1, 2, 0, 2, -1],  # B7
        "category": "seventh",
        "difficulty": "intermediate",
        "vector": None,
    },
    {
        "id": 11,
        "name": "C7",
        "fingering": [0, 3, 2, 3, 1, 0],  # C7
        "category": "seventh",
        "difficulty": "intermediate",
        "vector": None,
    },
    {
        "id": 12,
        "name": "G7",
        "fingering": [1, 2, 0, 0, 0, 3],  # G7
        "category": "seventh",
        "difficulty": "beginner",
        "vector": None,
    },
]


def generate_chord_vector(fingering: list[int], chord_id: int) -> list[float]:
    """
    Generate a 63-dimensional vector based on chord fingering.
    
    This creates a reproducible vector that represents the hand position
    for a given chord. The vector is normalized to unit length.
    """
    np.random.seed(chord_id * 42)  # Reproducible randomness per chord
    
    # Base vector with some structure based on fingering
    vector = np.zeros(VECTOR_SIZE)
    
    # Encode fingering positions into the vector
    for i, fret in enumerate(fingering):
        if fret >= 0:
            # Distribute fingering info across multiple dimensions
            base_idx = i * 10
            if base_idx + 5 < VECTOR_SIZE:
                vector[base_idx] = fret / 5.0  # Normalized fret position
                vector[base_idx + 1] = 1.0 if fret > 0 else 0.0  # Finger active
                vector[base_idx + 2] = (i + 1) / 6.0  # String position
    
    # Add some controlled variation to make vectors distinguishable
    noise = np.random.randn(VECTOR_SIZE) * 0.1
    vector = vector + noise
    
    # L2 normalize
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector = vector / norm
    
    return vector.tolist()


def create_collection(client: QdrantClient) -> bool:
    """Create the chords collection if it doesn't exist."""
    try:
        # Check if collection exists
        collections = client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)
        
        if exists:
            print(f"Collection '{COLLECTION_NAME}' already exists.")
            # Delete and recreate to ensure fresh data
            client.delete_collection(COLLECTION_NAME)
            print(f"Deleted existing collection for fresh seed.")
        
        # Create collection
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )
        print(f"✅ Created collection '{COLLECTION_NAME}'")
        return True
        
    except Exception as e:
        print(f"❌ Error creating collection: {e}")
        return False


def seed_chords(client: QdrantClient) -> bool:
    """Insert chord vectors into the collection."""
    try:
        points = []
        
        for chord in CHORD_DATABASE:
            # Generate vector based on fingering
            vector = generate_chord_vector(chord["fingering"], chord["id"])
            
            point = PointStruct(
                id=chord["id"],
                vector=vector,
                payload={
                    "name": chord["name"],
                    "fingering": chord["fingering"],
                    "category": chord["category"],
                    "difficulty": chord["difficulty"],
                },
            )
            points.append(point)
            print(f"  📝 Prepared: {chord['name']} ({chord['category']})")
        
        # Upsert all points
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points,
        )
        
        print(f"\n✅ Seeded {len(points)} chords into '{COLLECTION_NAME}'")
        return True
        
    except Exception as e:
        print(f"❌ Error seeding chords: {e}")
        return False


def verify_data(client: QdrantClient) -> bool:
    """Verify the seeded data by running a test query."""
    try:
        # Get collection info
        info = client.get_collection(COLLECTION_NAME)
        print(f"\n📊 Collection Info:")
        print(f"   Points: {info.points_count}")
        print(f"   Vectors: {info.vectors_count}")
        
        # Run a test similarity search
        test_vector = generate_chord_vector([0, 3, 2, 0, 1, 0], 1)  # C chord
        results = client.query_points(
            collection_name=COLLECTION_NAME,
            query=test_vector,
            limit=3,
        )
        
        print(f"\n🔍 Test Query (C chord vector):")
        for result in results.points:
            print(f"   - {result.payload['name']}: score={result.score:.4f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying data: {e}")
        return False


def main():
    print("🎸 AIAR Guitar - Qdrant Database Seeder")
    print("=" * 50)
    print(f"Qdrant URL: {QDRANT_URL}")
    print(f"Collection: {COLLECTION_NAME}")
    print(f"Vector Size: {VECTOR_SIZE}")
    print()
    
    # Connect to Qdrant
    try:
        client = QdrantClient(url=QDRANT_URL)
        print("✅ Connected to Qdrant")
    except Exception as e:
        print(f"❌ Failed to connect to Qdrant: {e}")
        print("\nMake sure Qdrant is running:")
        print("  docker run -p 6333:6333 qdrant/qdrant")
        sys.exit(1)
    
    # Create collection
    if not create_collection(client):
        sys.exit(1)
    
    # Seed chords
    if not seed_chords(client):
        sys.exit(1)
    
    # Verify
    if not verify_data(client):
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✅ Database seeding complete!")
    print("🎸 AIAR Guitar is ready for AI chord recognition!")


if __name__ == "__main__":
    main()
