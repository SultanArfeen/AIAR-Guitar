'use client';

/**
 * WebSocket Hook for AIAR Guitar
 * 
 * Manages real-time connection to the backend inference service.
 * Handles automatic reconnection, message parsing, and error handling.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import type { InferenceRequest, InferenceResult, InferenceError, ChordId } from '@/types/ws';

const WS_URL = process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:8000/ws/inference';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

    const {
        setWsConnected,
        setCurrentChord,
        setLastInferenceResult,
        setCorrectionActive,
        setOverrideNotes,
        setError,
    } = useStore();

    const connect = useCallback(() => {
        // Don't reconnect if already connected or connecting
        if (wsRef.current?.readyState === WebSocket.OPEN ||
            wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        try {
            console.log(`[WebSocket] Connecting to ${WS_URL}...`);
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WebSocket] Connected');
                setWsConnected(true);
                setError(null);
                reconnectAttempts.current = 0;
            };

            ws.onclose = (event) => {
                console.log(`[WebSocket] Disconnected (code: ${event.code})`);
                setWsConnected(false);
                wsRef.current = null;

                // Attempt reconnection
                if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts.current++;
                    console.log(`[WebSocket] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
                    reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
                } else {
                    setError('Unable to connect to AI service. Running in offline mode.');
                }
            };

            ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'inference_result') {
                        const result = data as InferenceResult;
                        setLastInferenceResult(result);
                        setCurrentChord(result.chord_id as ChordId);
                        setCorrectionActive(result.correction_active);
                        if (result.override_notes) {
                            setOverrideNotes(result.override_notes);
                        }
                    } else if (data.type === 'inference_error') {
                        const error = data as InferenceError;
                        console.warn('[WebSocket] Inference error:', error.message);
                    }
                } catch (e) {
                    console.error('[WebSocket] Failed to parse message:', e);
                }
            };
        } catch (error) {
            console.error('[WebSocket] Connection error:', error);
            setError('Failed to establish WebSocket connection');
        }
    }, [setWsConnected, setCurrentChord, setLastInferenceResult, setCorrectionActive, setOverrideNotes, setError]);

    const disconnect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setWsConnected(false);
    }, [setWsConnected]);

    const sendInference = useCallback((request: InferenceRequest) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(request));
        }
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        connect,
        disconnect,
        sendInference,
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    };
}
