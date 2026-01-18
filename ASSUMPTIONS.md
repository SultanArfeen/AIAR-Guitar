# AIAR Guitar - Assumptions & Design Decisions

> This document records assumptions made during development when specifications were ambiguous or when tradeoffs were required. Update this file as new decisions are made.

---

## Architecture Decisions

### 1. Monorepo Structure

**Decision**: Use a flat monorepo with `frontend/`, `backend/`, and `ops/` directories.
**Rationale**: Simpler than Nx/Turborepo for a project of this size. pnpm workspaces handle frontend dependencies.

### 2. Client-Side Hand Tracking

**Decision**: All MediaPipe processing happens in the browser; only 63-float landmark vectors are sent to the backend.
**Rationale**: Privacy-first design. Raw video frames never leave the client.

### 3. WebSocket for Real-Time Inference

**Decision**: Use WebSocket instead of REST for chord recognition.
**Rationale**: Lower latency for real-time interaction. Maintains persistent connection.

---

## Hand Tracking

### 4. Left Wrist as Anchor

**Decision**: Use `left_wrist` as the canonical anchor point for fretting hand normalization.
**Rationale**: Most guitar players fret with left hand. Future: add right-hand mode for left-handed players.

### 5. Normalization Scale Factor

**Decision**: Scale landmarks by shoulder-to-shoulder distance for depth invariance.
**Rationale**: Makes hand poses comparable across different distances from camera.

### 6. EMA Smoothing Alpha

**Decision**: Use α = 0.3 for exponential moving average smoothing.
**Rationale**: Balances responsiveness vs. jitter reduction. Tunable via config.

---

## Audio Engine

### 7. Standard Guitar Tuning

**Decision**: E2-A2-D3-G3-B3-E4 (standard tuning) as default.
**Rationale**: Most common tuning. Future: support alternate tunings.

### 8. Gamma Curve for Velocity Mapping

**Decision**: Use `gain = lerp(min, max, velocity^0.9)` for velocity-to-gain mapping.
**Rationale**: More natural feel than linear mapping. Gamma < 1 makes soft playing more audible.

### 9. Polyphony Limit

**Decision**: Maximum 6 concurrent voices (one per string).
**Rationale**: Matches physical guitar. Prevents audio clipping.

---

## AI Chord Recognition

### 10. Confidence Threshold

**Decision**: Default threshold of 0.85 for activating chord correction.
**Rationale**: High enough to avoid false positives; low enough to be useful.

### 11. Embedding Mode Default

**Decision**: Use raw 63D vectors by default (`EMBEDDING_MODE=raw`).
**Rationale**: No additional model required. MLP embedding is optional for better accuracy.

### 12. Mock Responses for Development

**Decision**: Return canned chord responses when Qdrant is unavailable.
**Rationale**: Enables frontend development without full backend stack.

---

## 3D Rendering

### 13. Procedural Fallback

**Decision**: Generate procedural low-poly guitar if GLTF fails to load or exceeds 2MB.
**Rationale**: Ensures app always renders something.

### 14. Guitar Body Anchor

**Decision**: Anchor guitar body at midpoint between left shoulder and right hip.
**Rationale**: Matches natural guitar position for a seated or standing player.

---

## Networking

### 15. WebSocket Retry Strategy

**Decision**: Exponential backoff (1s, 2s, 4s, 8s max) on WebSocket disconnection.
**Rationale**: Avoids hammering server while ensuring eventual reconnection.

### 16. Geometric Mode Fallback

**Decision**: Switch to geometry-based chord detection when backend is unavailable.
**Rationale**: App remains functional offline.

---

## DevOps

### 17. Docker Compose for Development

**Decision**: Use Docker Compose to orchestrate frontend, backend, and Qdrant.
**Rationale**: Single command to start all services. Matches production-like environment.

### 18. GitHub Actions CI

**Decision**: Run lint → unit tests → build on every push/PR.
**Rationale**: Catch issues early. No deployment stage in CI (manual deploys for now).

---

## Future Considerations

- [ ] Right-handed mode for left-handed players
- [ ] Alternate guitar tunings
- [ ] Multi-user jam sessions via WebRTC
- [ ] MIDI export for recorded performances
- [ ] Mobile app port (React Native)

---

## Changelog

| Date | Decision | Author |
|------|----------|--------|
| 2024-01-18 | Initial assumptions documented | AI Agent |
