/**
 * WebSocket Message Types for AIAR Guitar
 * 
 * Defines the TypeScript interfaces for all WebSocket communication
 * between the frontend and backend inference service.
 */

// ==============================================
// Request Types
// ==============================================

/**
 * Hand anchor point for normalization
 */
export type HandAnchor = 'left_wrist' | 'right_wrist' | 'body_center';

/**
 * Inference mode
 */
export type InferenceMode = 'chord_correction';

/**
 * Request metadata
 */
export interface RequestMeta {
    frame_id?: number;
    fps?: number;
}

/**
 * Inference request sent from client to server
 */
export interface InferenceRequest {
    type: 'inference_request';
    timestamp: number;
    hand_anchor: HandAnchor;
    left_hand_vector: number[]; // Exactly 63 floats (21 landmarks × 3 coords)
    mode?: InferenceMode;
    meta?: RequestMeta;
}

// ==============================================
// Response Types
// ==============================================

/**
 * Successful inference result
 */
export interface InferenceResult {
    type: 'inference_result';
    timestamp: number;
    chord_id: string;
    confidence: number;
    fingering_map: number[]; // Exactly 6 integers (one per string)
    correction_active: boolean;
    override_notes?: number[]; // MIDI note numbers
    message?: string;
}

/**
 * Inference error response
 */
export interface InferenceError {
    type: 'inference_error';
    code: ErrorCode;
    message: string;
}

/**
 * Union type for all server responses
 */
export type ServerMessage = InferenceResult | InferenceError;

// ==============================================
// Error Codes
// ==============================================

export type ErrorCode =
    | 'ERR_CAM_001'   // Webcam permission denied
    | 'ERR_WS_002'    // WebSocket unreachable or timed out
    | 'ERR_AI_003'    // Low confidence (score < 0.40)
    | 'ERR_AI_400'    // Bad request (invalid vector length)
    | 'ERR_DEP_500';  // Qdrant internal error

// ==============================================
// Chord Types
// ==============================================

/**
 * Known chord identifiers
 */
export type ChordId =
    | 'C_Major' | 'C_Minor' | 'C_7'
    | 'D_Major' | 'D_Minor' | 'D_7'
    | 'E_Major' | 'E_Minor' | 'E_7'
    | 'F_Major' | 'F_Minor' | 'F_7'
    | 'G_Major' | 'G_Minor' | 'G_7'
    | 'A_Major' | 'A_Minor' | 'A_7'
    | 'B_Major' | 'B_Minor' | 'B_7'
    | 'unknown';

/**
 * Chord data with fingering information
 */
export interface ChordData {
    id: ChordId;
    name: string;
    fingering: number[];
    midiNotes: number[];
    category: 'major' | 'minor' | 'seventh' | 'other';
}

// ==============================================
// Helper Functions
// ==============================================

/**
 * Create an inference request from a hand vector
 */
export function createInferenceRequest(
    leftHandVector: number[],
    meta?: RequestMeta
): InferenceRequest {
    return {
        type: 'inference_request',
        timestamp: Date.now(),
        hand_anchor: 'left_wrist',
        left_hand_vector: leftHandVector,
        mode: 'chord_correction',
        meta,
    };
}

/**
 * Type guard for inference result
 */
export function isInferenceResult(msg: ServerMessage): msg is InferenceResult {
    return msg.type === 'inference_result';
}

/**
 * Type guard for inference error
 */
export function isInferenceError(msg: ServerMessage): msg is InferenceError {
    return msg.type === 'inference_error';
}
