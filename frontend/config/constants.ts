/**
 * AIAR Guitar - Application Constants
 * 
 * Centralized configuration for tuning, thresholds, and defaults.
 * These can be adjusted via environment variables or UI debug panel.
 */

// ==============================================
// Guitar Configuration
// ==============================================

/**
 * Standard guitar tuning (E2 to E4)
 * Each entry: { note: note name, midi: MIDI note number, frequency: Hz }
 */
export const GUITAR_TUNING = [
    { note: 'E2', midi: 40, frequency: 82.41, string: 0 },  // Low E
    { note: 'A2', midi: 45, frequency: 110.0, string: 1 },  // A
    { note: 'D3', midi: 50, frequency: 146.83, string: 2 }, // D
    { note: 'G3', midi: 55, frequency: 196.0, string: 3 },  // G
    { note: 'B3', midi: 59, frequency: 246.94, string: 4 }, // B
    { note: 'E4', midi: 64, frequency: 329.63, string: 5 }, // High e
] as const;

/**
 * Number of frets on the virtual guitar
 */
export const NUM_FRETS = 12;

/**
 * Semitone ratio for calculating fretted notes
 */
export const SEMITONE_RATIO = Math.pow(2, 1 / 12);

// ==============================================
// Vision Constants
// ==============================================

/**
 * MediaPipe Hands configuration
 */
export const MEDIAPIPE_CONFIG = {
    maxNumHands: 2,
    modelComplexity: 1, // 0: lite, 1: full
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
} as const;

/**
 * EMA (Exponential Moving Average) smoothing factor
 * Lower = smoother but more latency; Higher = responsive but jittery
 */
export const EMA_ALPHA = 0.3;

/**
 * Number of landmarks per hand
 */
export const LANDMARKS_PER_HAND = 21;

/**
 * Dimensions per landmark (x, y, z)
 */
export const DIMS_PER_LANDMARK = 3;

/**
 * Total floats in normalized hand vector
 */
export const VECTOR_LENGTH = LANDMARKS_PER_HAND * DIMS_PER_LANDMARK; // 63

// ==============================================
// Strum Detection
// ==============================================

/**
 * Minimum speed threshold to trigger strum (normalized units per second)
 */
export const STRUM_SPEED_THRESHOLD = 0.15;

/**
 * Maximum speed for velocity calculation (clamp above this)
 */
export const STRUM_SPEED_MAX = 0.8;

/**
 * Minimum time between strums (ms) - prevents double-triggering
 */
export const STRUM_DEBOUNCE_MS = 50;

/**
 * String collision zone height (normalized)
 */
export const STRING_COLLISION_HEIGHT = 0.02;

// ==============================================
// Audio Engine
// ==============================================

/**
 * Gain mapping parameters
 */
export const AUDIO_CONFIG = {
    minGain: 0.1,
    maxGain: 0.9,
    gainGamma: 0.9, // < 1 makes soft playing more audible
    attackTime: 0.01, // seconds
    decayTime: 0.1,
    sustainLevel: 0.7,
    releaseTime: 0.3,
    maxPolyphony: 6,
} as const;

/**
 * Sample paths (if using Sampler)
 */
export const SAMPLE_PATHS = {
    acoustic: '/samples/acoustic/',
    electric: '/samples/electric/',
    nylon: '/samples/nylon/',
} as const;

// ==============================================
// WebSocket Configuration
// ==============================================

export const WS_CONFIG = {
    /** Base reconnect delay in ms */
    reconnectBaseDelay: 1000,
    /** Maximum reconnect delay in ms */
    reconnectMaxDelay: 8000,
    /** Maximum reconnection attempts before giving up */
    maxReconnectAttempts: 10,
    /** Inference request throttle interval in ms */
    inferenceThrottleMs: 200,
    /** WebSocket connection timeout in ms */
    connectionTimeout: 5000,
} as const;

// ==============================================
// AI Chord Correction
// ==============================================

export const AI_CONFIG = {
    /** Minimum confidence to apply chord correction */
    confidenceThreshold: 0.85,
    /** Confidence below which to show warning */
    lowConfidenceThreshold: 0.4,
    /** Fall back to geometric mode when confidence is below */
    fallbackThreshold: 0.3,
} as const;

// ==============================================
// 3D Rendering
// ==============================================

export const RENDER_CONFIG = {
    /** Target FPS for rendering loop */
    targetFps: 60,
    /** Guitar model scale factor */
    guitarScale: 1.0,
    /** Distance from camera to body center */
    guitarDepth: 0.5,
    /** Neck tilt angle in radians */
    neckTiltAngle: Math.PI / 6, // 30 degrees
} as const;

// ==============================================
// Debug Configuration
// ==============================================

export const DEBUG_CONFIG = {
    /** Show landmark points */
    showLandmarks: true,
    /** Show velocity vectors */
    showVectors: true,
    /** Show collision zones */
    showCollisionZones: true,
    /** Show FPS counter */
    showFps: true,
    /** Log WebSocket messages */
    logWsMessages: false,
    /** Log audio events */
    logAudioEvents: false,
} as const;

// ==============================================
// Chord Database (for geometric fallback)
// ==============================================

export const CHORD_DATABASE = {
    C_Major: { fingering: [0, 3, 2, 0, 1, 0], notes: [48, 52, 55, 60, 64, 67] },
    C_Minor: { fingering: [3, 3, 5, 5, 4, 3], notes: [48, 51, 55, 60, 63, 67] },
    D_Major: { fingering: [-1, -1, 0, 2, 3, 2], notes: [50, 54, 57, 62, 66, 69] },
    D_Minor: { fingering: [-1, -1, 0, 2, 3, 1], notes: [50, 53, 57, 62, 65, 69] },
    E_Major: { fingering: [0, 2, 2, 1, 0, 0], notes: [40, 47, 52, 56, 59, 64] },
    E_Minor: { fingering: [0, 2, 2, 0, 0, 0], notes: [40, 47, 52, 55, 59, 64] },
    F_Major: { fingering: [1, 3, 3, 2, 1, 1], notes: [41, 48, 53, 57, 60, 65] },
    G_Major: { fingering: [3, 2, 0, 0, 0, 3], notes: [43, 47, 50, 55, 59, 67] },
    G_Minor: { fingering: [3, 5, 5, 3, 3, 3], notes: [43, 46, 50, 55, 58, 67] },
    A_Major: { fingering: [0, 0, 2, 2, 2, 0], notes: [45, 52, 57, 61, 64, 69] },
    A_Minor: { fingering: [0, 0, 2, 2, 1, 0], notes: [45, 52, 57, 60, 64, 69] },
    B_Major: { fingering: [-1, 2, 4, 4, 4, 2], notes: [47, 54, 59, 63, 66, 71] },
    B_Minor: { fingering: [-1, 2, 4, 4, 3, 2], notes: [47, 54, 59, 62, 66, 71] },
} as const;

export type ChordName = keyof typeof CHORD_DATABASE;
