# Qdrant Configuration

This directory contains configuration for the Qdrant vector database.

## Development Setup

For local development, Qdrant runs as a Docker container:

```bash
# Start Qdrant only
docker run -p 6333:6333 -v qdrant_data:/qdrant/storage qdrant/qdrant

# Or use docker-compose
docker-compose up qdrant
```

## Dashboard

Access the Qdrant dashboard at: <http://localhost:6333/dashboard>

## Creating the Chords Collection

The `chords_v1` collection needs to be created before the backend can use it.
You can create it using the Qdrant API:

```bash
curl -X PUT http://localhost:6333/collections/chords_v1 \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 63,
      "distance": "Cosine"
    }
  }'
```

## Seeding Chord Data

A seed script will be provided to populate the collection with chord embeddings.
For now, the backend uses mock data when Qdrant is unavailable or empty.

## Production Notes

For production:

1. Use a managed Qdrant cloud instance
2. Enable authentication
3. Configure proper backups
4. Set appropriate resource limits
