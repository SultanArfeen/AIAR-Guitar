/**
 * Hand Landmark Types for MediaPipe Integration
 * 
 * Defines the structure of hand landmark data from MediaPipe Hands.
 */

// ==============================================
// Landmark Types
// ==============================================

/**
 * Single 3D point
 */
export interface Point3D {
    x: number;
    y: number;
    z: number;
}

/**
 * MediaPipe landmark indices
 */
export enum LandmarkIndex {
    WRIST = 0,
    THUMB_CMC = 1,
    THUMB_MCP = 2,
    THUMB_IP = 3,
    THUMB_TIP = 4,
    INDEX_MCP = 5,
    INDEX_PIP = 6,
    INDEX_DIP = 7,
    INDEX_TIP = 8,
    MIDDLE_MCP = 9,
    MIDDLE_PIP = 10,
    MIDDLE_DIP = 11,
    MIDDLE_TIP = 12,
    RING_MCP = 13,
    RING_PIP = 14,
    RING_DIP = 15,
    RING_TIP = 16,
    PINKY_MCP = 17,
    PINKY_PIP = 18,
    PINKY_DIP = 19,
    PINKY_TIP = 20,
}

/**
 * Hand landmark data from MediaPipe
 */
export interface HandLandmarks {
    landmarks: Point3D[];
    worldLandmarks?: Point3D[];
    handedness: 'Left' | 'Right';
}

/**
 * Processed hand data with computed properties
 */
export interface ProcessedHand {
    raw: HandLandmarks;
    normalized: number[]; // 63-float flattened vector
    wristPosition: Point3D;
    palmCenter: Point3D;
    fingerTips: Point3D[];
    isOpen: boolean;
    confidence: number;
}

// ==============================================
// Body Landmarks (for anchor points)
// ==============================================

export interface BodyAnchors {
    leftShoulder?: Point3D;
    rightShoulder?: Point3D;
    leftHip?: Point3D;
    rightHip?: Point3D;
    bodyCenter?: Point3D;
    shoulderWidth?: number;
}

// ==============================================
// Strum Detection Types
// ==============================================

export interface StrumEvent {
    timestamp: number;
    stringIndex: number;
    fretIndex: number;
    velocity: number; // 0-1 normalized
    direction: 'up' | 'down';
}

export interface StrumState {
    lastPosition: Point3D | null;
    lastTimestamp: number;
    velocity: number;
    isStrumming: boolean;
}
