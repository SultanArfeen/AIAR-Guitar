/**
 * AIAR Guitar - Zustand State Store
 * 
 * Central state management for the entire application.
 * Uses slices pattern to organize state by domain.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Point3D, ProcessedHand, StrumEvent, BodyAnchors } from '@/types/landmarks';
import type { InferenceResult, ChordId } from '@/types/ws';

// ==============================================
// State Interface
// ==============================================

interface VisionState {
    // Raw hand data
    leftHand: ProcessedHand | null;
    rightHand: ProcessedHand | null;

    // Body anchors for AR positioning
    bodyAnchors: BodyAnchors;

    // Tracking status
    isTracking: boolean;
    trackingFps: number;
    cameraReady: boolean;
}

interface AudioState {
    // Engine state
    isInitialized: boolean;
    isMuted: boolean;
    masterVolume: number;

    // Currently active
    activeStrings: Set<number>;
    lastStrumEvent: StrumEvent | null;

    // Chord correction
    correctionActive: boolean;
    currentChord: ChordId;
    overrideNotes: number[];
}

interface WebSocketState {
    // Connection status
    wsConnected: boolean;
    wsUrl: string;
    reconnectAttempts: number;

    // Last inference
    lastInferenceResult: InferenceResult | null;
    inferenceLatency: number;
}

interface UIState {
    // Mode flags
    debugMode: boolean;
    introComplete: boolean;

    // Error handling
    error: string | null;
    errorCode: string | null;

    // Performance metrics
    fps: number;
    frameTime: number;
}

interface AppState extends VisionState, AudioState, WebSocketState, UIState {
    // Vision actions
    setLeftHand: (hand: ProcessedHand | null) => void;
    setRightHand: (hand: ProcessedHand | null) => void;
    setBodyAnchors: (anchors: BodyAnchors) => void;
    setIsTracking: (tracking: boolean) => void;
    setTrackingFps: (fps: number) => void;
    setCameraReady: (ready: boolean) => void;

    // Audio actions
    setAudioInitialized: (initialized: boolean) => void;
    setMuted: (muted: boolean) => void;
    setMasterVolume: (volume: number) => void;
    addActiveString: (stringIndex: number) => void;
    removeActiveString: (stringIndex: number) => void;
    clearActiveStrings: () => void;
    setLastStrumEvent: (event: StrumEvent | null) => void;
    setCorrectionActive: (active: boolean) => void;
    setCurrentChord: (chord: ChordId) => void;
    setOverrideNotes: (notes: number[]) => void;

    // WebSocket actions
    setWsConnected: (connected: boolean) => void;
    setWsUrl: (url: string) => void;
    incrementReconnectAttempts: () => void;
    resetReconnectAttempts: () => void;
    setLastInferenceResult: (result: InferenceResult | null) => void;
    setInferenceLatency: (latency: number) => void;

    // UI actions
    setDebugMode: (debug: boolean) => void;
    setIntroComplete: (complete: boolean) => void;
    setError: (error: string | null, code?: string | null) => void;
    clearError: () => void;
    setFps: (fps: number) => void;
    setFrameTime: (time: number) => void;

    // Computed getters
    getNormalizedLeftVector: () => number[] | null;
    getNormalizedRightVector: () => number[] | null;
}

// ==============================================
// Default State
// ==============================================

const defaultVisionState: VisionState = {
    leftHand: null,
    rightHand: null,
    bodyAnchors: {},
    isTracking: false,
    trackingFps: 0,
    cameraReady: false,
};

const defaultAudioState: AudioState = {
    isInitialized: false,
    isMuted: false,
    masterVolume: 0.8,
    activeStrings: new Set(),
    lastStrumEvent: null,
    correctionActive: false,
    currentChord: 'unknown',
    overrideNotes: [],
};

const defaultWebSocketState: WebSocketState = {
    wsConnected: false,
    wsUrl: process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:8000/ws/inference',
    reconnectAttempts: 0,
    lastInferenceResult: null,
    inferenceLatency: 0,
};

const defaultUIState: UIState = {
    debugMode: false,
    introComplete: false,
    error: null,
    errorCode: null,
    fps: 0,
    frameTime: 0,
};

// ==============================================
// Store Creation
// ==============================================

export const useStore = create<AppState>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        ...defaultVisionState,
        ...defaultAudioState,
        ...defaultWebSocketState,
        ...defaultUIState,

        // Vision actions
        setLeftHand: (hand) => set({ leftHand: hand }),
        setRightHand: (hand) => set({ rightHand: hand }),
        setBodyAnchors: (anchors) => set({ bodyAnchors: anchors }),
        setIsTracking: (tracking) => set({ isTracking: tracking }),
        setTrackingFps: (fps) => set({ trackingFps: fps }),
        setCameraReady: (ready) => set({ cameraReady: ready }),

        // Audio actions
        setAudioInitialized: (initialized) => set({ isInitialized: initialized }),
        setMuted: (muted) => set({ isMuted: muted }),
        setMasterVolume: (volume) => set({ masterVolume: Math.max(0, Math.min(1, volume)) }),
        addActiveString: (stringIndex) => set((state) => ({
            activeStrings: new Set([...state.activeStrings, stringIndex]),
        })),
        removeActiveString: (stringIndex) => set((state) => {
            const newSet = new Set(state.activeStrings);
            newSet.delete(stringIndex);
            return { activeStrings: newSet };
        }),
        clearActiveStrings: () => set({ activeStrings: new Set() }),
        setLastStrumEvent: (event) => set({ lastStrumEvent: event }),
        setCorrectionActive: (active) => set({ correctionActive: active }),
        setCurrentChord: (chord) => set({ currentChord: chord }),
        setOverrideNotes: (notes) => set({ overrideNotes: notes }),

        // WebSocket actions
        setWsConnected: (connected) => set({ wsConnected: connected }),
        setWsUrl: (url) => set({ wsUrl: url }),
        incrementReconnectAttempts: () => set((state) => ({
            reconnectAttempts: state.reconnectAttempts + 1,
        })),
        resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
        setLastInferenceResult: (result) => set({ lastInferenceResult: result }),
        setInferenceLatency: (latency) => set({ inferenceLatency: latency }),

        // UI actions
        setDebugMode: (debug) => set({ debugMode: debug }),
        setIntroComplete: (complete) => set({ introComplete: complete }),
        setError: (error, code = null) => set({ error, errorCode: code }),
        clearError: () => set({ error: null, errorCode: null }),
        setFps: (fps) => set({ fps }),
        setFrameTime: (time) => set({ frameTime: time }),

        // Computed getters
        getNormalizedLeftVector: () => {
            const { leftHand } = get();
            return leftHand?.normalized || null;
        },
        getNormalizedRightVector: () => {
            const { rightHand } = get();
            return rightHand?.normalized || null;
        },
    }))
);

// ==============================================
// Selectors (for performance optimization)
// ==============================================

export const selectVision = (state: AppState) => ({
    leftHand: state.leftHand,
    rightHand: state.rightHand,
    bodyAnchors: state.bodyAnchors,
    isTracking: state.isTracking,
});

export const selectAudio = (state: AppState) => ({
    isInitialized: state.isInitialized,
    isMuted: state.isMuted,
    activeStrings: state.activeStrings,
    currentChord: state.currentChord,
    correctionActive: state.correctionActive,
});

export const selectWebSocket = (state: AppState) => ({
    wsConnected: state.wsConnected,
    lastInferenceResult: state.lastInferenceResult,
    inferenceLatency: state.inferenceLatency,
});

export const selectUI = (state: AppState) => ({
    debugMode: state.debugMode,
    error: state.error,
    fps: state.fps,
});
