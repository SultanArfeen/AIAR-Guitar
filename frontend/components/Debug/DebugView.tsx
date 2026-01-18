/**
 * DebugView Component
 * 
 * Overlay rendering of hand landmarks, velocity vectors, collision zones,
 * and performance metrics for debugging and development.
 * 
 * @module components/Debug/DebugView
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore, selectVision, selectWebSocket, selectUI } from '@/stores/useStore';
import { DEBUG_CONFIG, GUITAR_TUNING, STRING_COLLISION_HEIGHT } from '@/config/constants';
import { subtract, magnitude, normalize as normalizeVec } from '@/lib/math';
import type { Point3D, LandmarkIndex } from '@/types/landmarks';

// Landmark connections for drawing skeleton
const HAND_CONNECTIONS: [number, number][] = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm
    [5, 9], [9, 13], [13, 17],
];

const LANDMARK_COLORS: Record<string, string> = {
    wrist: '#00FFFF',
    thumb: '#FF6600',
    index: '#00FF00',
    middle: '#FFFF00',
    ring: '#FF00FF',
    pinky: '#00FFFF',
};

export default function DebugView() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    const vision = useStore(selectVision);
    const ws = useStore(selectWebSocket);
    const ui = useStore(selectUI);
    const trackingFps = useStore((state) => state.trackingFps);
    const lastStrumEvent = useStore((state) => state.lastStrumEvent);
    const currentChord = useStore((state) => state.currentChord);
    const correctionActive = useStore((state) => state.correctionActive);

    /**
     * Get color for a landmark based on finger
     */
    const getLandmarkColor = (index: number): string => {
        if (index === 0) return LANDMARK_COLORS.wrist;
        if (index <= 4) return LANDMARK_COLORS.thumb;
        if (index <= 8) return LANDMARK_COLORS.index;
        if (index <= 12) return LANDMARK_COLORS.middle;
        if (index <= 16) return LANDMARK_COLORS.ring;
        return LANDMARK_COLORS.pinky;
    };

    /**
     * Convert normalized landmark to canvas coordinates
     */
    const toCanvasCoords = (
        point: Point3D,
        width: number,
        height: number
    ): { x: number; y: number } => {
        return {
            x: point.x * width,
            y: point.y * height,
        };
    };

    /**
     * Draw hand skeleton
     */
    const drawHandSkeleton = useCallback((
        ctx: CanvasRenderingContext2D,
        landmarks: Point3D[],
        width: number,
        height: number,
        color: string
    ) => {
        // Draw connections
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        for (const [start, end] of HAND_CONNECTIONS) {
            const p1 = toCanvasCoords(landmarks[start], width, height);
            const p2 = toCanvasCoords(landmarks[end], width, height);

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        // Draw landmarks
        if (DEBUG_CONFIG.showLandmarks) {
            for (let i = 0; i < landmarks.length; i++) {
                const point = toCanvasCoords(landmarks[i], width, height);
                const pointColor = getLandmarkColor(i);

                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = pointColor;
                ctx.fill();

                // Draw glow effect for fingertips
                if ([4, 8, 12, 16, 20].includes(i)) {
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
                    ctx.strokeStyle = pointColor;
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = 0.5;
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
    }, []);

    /**
     * Draw velocity vector
     */
    const drawVelocityVector = useCallback((
        ctx: CanvasRenderingContext2D,
        start: Point3D,
        velocity: Point3D,
        width: number,
        height: number
    ) => {
        if (!DEBUG_CONFIG.showVectors) return;

        const startCoords = toCanvasCoords(start, width, height);
        const mag = magnitude(velocity);

        if (mag < 0.01) return;

        const normalized = normalizeVec(velocity);
        const scale = Math.min(mag * 200, 100);

        const endCoords = {
            x: startCoords.x + normalized.x * scale,
            y: startCoords.y + normalized.y * scale,
        };

        // Draw arrow
        const gradient = ctx.createLinearGradient(
            startCoords.x, startCoords.y,
            endCoords.x, endCoords.y
        );
        gradient.addColorStop(0, '#00FF00');
        gradient.addColorStop(1, '#FF0000');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(startCoords.x, startCoords.y);
        ctx.lineTo(endCoords.x, endCoords.y);
        ctx.stroke();

        // Draw arrowhead
        const angle = Math.atan2(
            endCoords.y - startCoords.y,
            endCoords.x - startCoords.x
        );
        const headLength = 10;

        ctx.beginPath();
        ctx.moveTo(endCoords.x, endCoords.y);
        ctx.lineTo(
            endCoords.x - headLength * Math.cos(angle - Math.PI / 6),
            endCoords.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endCoords.x, endCoords.y);
        ctx.lineTo(
            endCoords.x - headLength * Math.cos(angle + Math.PI / 6),
            endCoords.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }, []);

    /**
     * Draw string collision zones
     */
    const drawStringZones = useCallback((
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number
    ) => {
        if (!DEBUG_CONFIG.showCollisionZones) return;

        const centerX = width / 2;
        const guitarWidth = width * 0.3;
        const startY = height * 0.35;
        const stringSpacing = height * 0.05;

        ctx.globalAlpha = 0.2;

        for (let i = 0; i < GUITAR_TUNING.length; i++) {
            const stringY = startY + i * stringSpacing;
            const zoneHeight = STRING_COLLISION_HEIGHT * height;

            // Draw collision zone
            ctx.fillStyle = i % 2 === 0 ? '#00FFFF' : '#FF00FF';
            ctx.fillRect(
                centerX - guitarWidth / 2,
                stringY - zoneHeight / 2,
                guitarWidth,
                zoneHeight
            );

            // Draw string line
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(centerX - guitarWidth / 2, stringY);
            ctx.lineTo(centerX + guitarWidth / 2, stringY);
            ctx.stroke();

            // Draw string label
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px monospace';
            ctx.fillText(
                GUITAR_TUNING[i].note,
                centerX + guitarWidth / 2 + 10,
                stringY + 4
            );
        }

        ctx.globalAlpha = 1;
    }, []);

    /**
     * Draw debug info panel
     */
    const drawDebugPanel = useCallback((
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number
    ) => {
        const panelX = 20;
        const panelY = height - 200;
        const panelWidth = 250;
        const panelHeight = 180;

        // Draw panel background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8);
        ctx.fill();

        // Draw panel border
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px monospace';

        const lines = [
            `FPS: ${ui.fps.toFixed(0)} | Track: ${trackingFps}`,
            `WebSocket: ${ws.wsConnected ? '🟢 Connected' : '🔴 Offline'}`,
            `Latency: ${ws.inferenceLatency.toFixed(0)}ms`,
            ``,
            `Left Hand: ${vision.leftHand ? '✓' : '✗'}`,
            `Right Hand: ${vision.rightHand ? '✓' : '✗'}`,
            ``,
            `Chord: ${currentChord}`,
            `AI Active: ${correctionActive ? 'Yes' : 'No'}`,
            `Last Strum: ${lastStrumEvent ? `S${lastStrumEvent.stringIndex}` : 'None'}`,
        ];

        lines.forEach((line, i) => {
            ctx.fillText(line, panelX + 12, panelY + 20 + i * 16);
        });
    }, [ui.fps, trackingFps, ws.wsConnected, ws.inferenceLatency, vision.leftHand, vision.rightHand, currentChord, correctionActive, lastStrumEvent]);

    /**
     * Main render loop
     */
    const render = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Match canvas size to window
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw string zones
        drawStringZones(ctx, width, height);

        // Draw left hand (fretting hand)
        if (vision.leftHand?.raw.landmarks) {
            drawHandSkeleton(
                ctx,
                vision.leftHand.raw.landmarks,
                width,
                height,
                '#00FF00'
            );
        }

        // Draw right hand (strumming hand)
        if (vision.rightHand?.raw.landmarks) {
            drawHandSkeleton(
                ctx,
                vision.rightHand.raw.landmarks,
                width,
                height,
                '#FF6600'
            );

            // TODO: Draw strum velocity vector when we have previous frame data
        }

        // Draw debug panel
        if (DEBUG_CONFIG.showFps) {
            drawDebugPanel(ctx, width, height);
        }

        // Continue animation loop
        animationRef.current = requestAnimationFrame(render);
    }, [vision, drawHandSkeleton, drawVelocityVector, drawStringZones, drawDebugPanel]);

    /**
     * Start render loop
     */
    useEffect(() => {
        animationRef.current = requestAnimationFrame(render);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [render]);

    return (
        <canvas
            ref={canvasRef}
            className="debug-canvas"
        />
    );
}
