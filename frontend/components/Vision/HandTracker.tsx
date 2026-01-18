/**
 * HandTracker Component
 * 
 * Integrates MediaPipe Hands for real-time hand landmark detection.
 * Processes webcam frames, normalizes landmarks, and emits to Zustand store.
 * 
 * @module components/Vision/HandTracker
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '@/stores/useStore';
import {
    MEDIAPIPE_CONFIG,
    EMA_ALPHA,
    VECTOR_LENGTH
} from '@/config/constants';
import {
    flattenLandmarks,
    normalizeLandmarks,
    smoothLandmarks,
    distance,
    midpoint
} from '@/lib/math';
import type { Point3D, ProcessedHand, HandLandmarks, LandmarkIndex } from '@/types/landmarks';

// MediaPipe types (simplified)
interface MediaPipeResults {
    multiHandLandmarks?: Point3D[][];
    multiHandWorldLandmarks?: Point3D[][];
    multiHandedness?: { label: string; score: number }[];
}

interface HandsInstance {
    setOptions: (options: Record<string, unknown>) => void;
    onResults: (callback: (results: MediaPipeResults) => void) => void;
    send: (input: { image: HTMLVideoElement }) => Promise<void>;
    close: () => void;
}

interface CameraInstance {
    start: () => Promise<void>;
    stop: () => void;
}

export default function HandTracker() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const handsRef = useRef<HandsInstance | null>(null);
    const cameraRef = useRef<CameraInstance | null>(null);
    const animationRef = useRef<number>(0);
    const prevLandmarksRef = useRef<{ left: Point3D[] | null; right: Point3D[] | null }>({
        left: null,
        right: null,
    });
    const fpsCounterRef = useRef<{ frames: number; lastTime: number }>({
        frames: 0,
        lastTime: performance.now(),
    });

    const [isLoading, setIsLoading] = useState(true);
    const [cameraError, setCameraError] = useState<string | null>(null);

    const {
        setLeftHand,
        setRightHand,
        setBodyAnchors,
        setIsTracking,
        setTrackingFps,
        setCameraReady,
        setError,
    } = useStore();

    /**
     * Process hand landmarks into normalized format
     */
    const processHand = useCallback((
        landmarks: Point3D[],
        worldLandmarks: Point3D[] | undefined,
        handedness: 'Left' | 'Right',
        prevLandmarks: Point3D[] | null
    ): ProcessedHand => {
        // Get wrist as anchor
        const wrist = landmarks[LandmarkIndex.WRIST];

        // Estimate scale from palm width (index MCP to pinky MCP)
        const indexMcp = landmarks[LandmarkIndex.INDEX_MCP];
        const pinkyMcp = landmarks[LandmarkIndex.PINKY_MCP];
        const palmWidth = distance(indexMcp, pinkyMcp);
        const scaleFactor = palmWidth > 0 ? palmWidth : 0.1;

        // Normalize relative to wrist
        const normalizedLandmarks = normalizeLandmarks(landmarks, wrist, scaleFactor);

        // Apply EMA smoothing
        const smoothed = smoothLandmarks(normalizedLandmarks, prevLandmarks, EMA_ALPHA);

        // Flatten to 63-float vector
        const flatVector = flattenLandmarks(smoothed);

        // Calculate palm center (average of MCP joints)
        const mcpJoints = [
            landmarks[LandmarkIndex.INDEX_MCP],
            landmarks[LandmarkIndex.MIDDLE_MCP],
            landmarks[LandmarkIndex.RING_MCP],
            landmarks[LandmarkIndex.PINKY_MCP],
        ];
        const palmCenter: Point3D = {
            x: mcpJoints.reduce((sum, p) => sum + p.x, 0) / 4,
            y: mcpJoints.reduce((sum, p) => sum + p.y, 0) / 4,
            z: mcpJoints.reduce((sum, p) => sum + p.z, 0) / 4,
        };

        // Get fingertips
        const fingerTips = [
            landmarks[LandmarkIndex.THUMB_TIP],
            landmarks[LandmarkIndex.INDEX_TIP],
            landmarks[LandmarkIndex.MIDDLE_TIP],
            landmarks[LandmarkIndex.RING_TIP],
            landmarks[LandmarkIndex.PINKY_TIP],
        ];

        // Detect if hand is open (fingertips above MCP joints)
        const isOpen = fingerTips.every((tip, i) => {
            const mcpIndex = [
                LandmarkIndex.THUMB_MCP,
                LandmarkIndex.INDEX_MCP,
                LandmarkIndex.MIDDLE_MCP,
                LandmarkIndex.RING_MCP,
                LandmarkIndex.PINKY_MCP,
            ][i];
            return tip.y < landmarks[mcpIndex].y; // Y is inverted in screen coords
        });

        return {
            raw: {
                landmarks,
                worldLandmarks,
                handedness,
            },
            normalized: flatVector,
            wristPosition: wrist,
            palmCenter,
            fingerTips,
            isOpen,
            confidence: 1.0, // MediaPipe doesn't expose per-landmark confidence
        };
    }, []);

    /**
     * Handle MediaPipe results
     */
    const onResults = useCallback((results: MediaPipeResults) => {
        const { multiHandLandmarks, multiHandWorldLandmarks, multiHandedness } = results;

        // Update FPS counter
        fpsCounterRef.current.frames++;
        const now = performance.now();
        const elapsed = now - fpsCounterRef.current.lastTime;
        if (elapsed >= 1000) {
            setTrackingFps(Math.round(fpsCounterRef.current.frames * 1000 / elapsed));
            fpsCounterRef.current.frames = 0;
            fpsCounterRef.current.lastTime = now;
        }

        if (!multiHandLandmarks || multiHandLandmarks.length === 0) {
            setLeftHand(null);
            setRightHand(null);
            setIsTracking(false);
            prevLandmarksRef.current = { left: null, right: null };
            return;
        }

        setIsTracking(true);

        // Process each detected hand
        for (let i = 0; i < multiHandLandmarks.length; i++) {
            const landmarks = multiHandLandmarks[i];
            const worldLandmarks = multiHandWorldLandmarks?.[i];
            const handedness = multiHandedness?.[i]?.label === 'Left' ? 'Left' : 'Right';

            // Note: MediaPipe labels are from camera's perspective, so they're mirrored
            const isLeft = handedness === 'Right'; // Mirrored!

            const prevKey = isLeft ? 'left' : 'right';
            const processedHand = processHand(
                landmarks,
                worldLandmarks,
                isLeft ? 'Left' : 'Right',
                prevLandmarksRef.current[prevKey]
            );

            // Store smoothed landmarks for next frame
            const normalizedPoints = normalizeLandmarks(
                landmarks,
                landmarks[LandmarkIndex.WRIST],
                distance(landmarks[LandmarkIndex.INDEX_MCP], landmarks[LandmarkIndex.PINKY_MCP]) || 0.1
            );

            if (isLeft) {
                prevLandmarksRef.current.left = normalizedPoints;
                setLeftHand(processedHand);
            } else {
                prevLandmarksRef.current.right = normalizedPoints;
                setRightHand(processedHand);
            }
        }

        // Clear hands that are no longer detected
        if (multiHandLandmarks.length === 1) {
            const detectedHandedness = multiHandedness?.[0]?.label;
            if (detectedHandedness === 'Left') {
                setLeftHand(null);
                prevLandmarksRef.current.left = null;
            } else {
                setRightHand(null);
                prevLandmarksRef.current.right = null;
            }
        }
    }, [processHand, setLeftHand, setRightHand, setIsTracking, setTrackingFps]);

    /**
     * Initialize MediaPipe Hands
     */
    useEffect(() => {
        let isMounted = true;

        const initializeMediaPipe = async () => {
            try {
                // Dynamically import MediaPipe
                const { Hands } = await import('@mediapipe/hands');
                const { Camera } = await import('@mediapipe/camera_utils');

                if (!isMounted || !videoRef.current) return;

                // Create Hands instance
                const hands = new Hands({
                    locateFile: (file: string) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
                });

                hands.setOptions({
                    maxNumHands: MEDIAPIPE_CONFIG.maxNumHands,
                    modelComplexity: MEDIAPIPE_CONFIG.modelComplexity,
                    minDetectionConfidence: MEDIAPIPE_CONFIG.minDetectionConfidence,
                    minTrackingConfidence: MEDIAPIPE_CONFIG.minTrackingConfidence,
                });

                hands.onResults(onResults);
                handsRef.current = hands;

                // Create Camera instance
                const camera = new Camera(videoRef.current, {
                    onFrame: async () => {
                        if (handsRef.current && videoRef.current) {
                            await handsRef.current.send({ image: videoRef.current });
                        }
                    },
                    width: 1280,
                    height: 720,
                });

                cameraRef.current = camera;

                await camera.start();

                if (isMounted) {
                    setCameraReady(true);
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Failed to initialize MediaPipe:', error);
                if (isMounted) {
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Failed to access camera';
                    setCameraError(errorMessage);
                    setError(errorMessage, 'ERR_CAM_001');
                    setIsLoading(false);
                }
            }
        };

        initializeMediaPipe();

        return () => {
            isMounted = false;
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            if (handsRef.current) {
                handsRef.current.close();
            }
        };
    }, [onResults, setCameraReady, setError]);

    if (cameraError) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-surface-dark p-8">
                <div className="text-red-400 text-6xl mb-4">📷</div>
                <h2 className="text-xl font-semibold text-white mb-2">Camera Access Required</h2>
                <p className="text-white/60 text-center max-w-md mb-4">
                    AIAR Guitar needs access to your camera for hand tracking.
                    Please allow camera access and refresh the page.
                </p>
                <p className="text-red-400 text-sm font-mono">{cameraError}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 btn-primary"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-surface-dark">
                <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 border-4 border-neon-cyan/30 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-neon-cyan rounded-full animate-spin"></div>
                </div>
                <p className="text-white/60">Initializing hand tracking...</p>
            </div>
        );
    }

    return (
        <div className="video-container w-full h-full">
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
            />
        </div>
    );
}
