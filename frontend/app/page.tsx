'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '@/stores/useStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import IntroSequence from '@/components/UI/IntroSequence';
import HUD from '@/components/UI/HUD';
import ErrorBoundary from '@/components/UI/ErrorBoundary';

// Dynamically import heavy components to reduce initial bundle
const HandTracker = dynamic(() => import('@/components/Vision/HandTracker'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-screen">Loading vision system...</div>,
});

const ARScene = dynamic(() => import('@/components/AR/ARScene'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-screen">Loading AR scene...</div>,
});

const DebugView = dynamic(() => import('@/components/Debug/DebugView'), {
    ssr: false,
});

export default function Home() {
    const [showIntro, setShowIntro] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const { debugMode, setDebugMode, wsConnected, error } = useStore();

    // Initialize WebSocket connection
    useWebSocket();

    // Check for debug mode in URL
    useEffect(() => {
        setIsClient(true);
        const params = new URLSearchParams(window.location.search);
        if (params.get('debug') === 'true') {
            setDebugMode(true);
        }
    }, [setDebugMode]);

    // Handle intro completion
    const handleIntroComplete = () => {
        setShowIntro(false);
    };

    if (!isClient) {
        return (
            <div className="flex items-center justify-center h-screen bg-surface-dark">
                <div className="text-xl text-white/60">Initializing...</div>
            </div>
        );
    }

    return (
        <main className="relative w-screen h-screen overflow-hidden bg-surface-dark">
            {/* Intro Sequence */}
            {showIntro && (
                <IntroSequence onComplete={handleIntroComplete} />
            )}

            {/* Main Application */}
            {!showIntro && (
                <ErrorBoundary>
                    {/* Video + Hand Tracking Layer */}
                    <div className="absolute inset-0 z-0">
                        <HandTracker />
                    </div>

                    {/* AR Scene Layer */}
                    <div className="absolute inset-0 z-10 pointer-events-none">
                        <ARScene />
                    </div>

                    {/* Debug Overlay */}
                    {debugMode && (
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            <DebugView />
                        </div>
                    )}

                    {/* HUD */}
                    <div className="absolute inset-0 z-30 pointer-events-none">
                        <HUD />
                    </div>

                    {/* Connection Status */}
                    {!wsConnected && (
                        <div className="fixed bottom-4 right-4 z-40 px-4 py-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-300 text-sm">
                            ⚠️ Offline Mode - AI chord correction unavailable
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm max-w-md text-center">
                            {error}
                        </div>
                    )}

                    {/* Debug Mode Toggle (always visible in corner) */}
                    <button
                        onClick={() => setDebugMode(!debugMode)}
                        className="fixed top-4 right-4 z-40 p-2 glass rounded-lg hover:bg-white/10 transition-colors pointer-events-auto"
                        title={debugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
                    >
                        <svg
                            className={`w-5 h-5 ${debugMode ? 'text-neon-cyan' : 'text-white/50'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </button>
                </ErrorBoundary>
            )}
        </main>
    );
}
