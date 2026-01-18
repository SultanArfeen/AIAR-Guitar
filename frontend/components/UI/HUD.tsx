/**
 * HUD Component
 * 
 * Heads-up display showing chord indicator, fret markers,
 * and connection status.
 * 
 * @module components/UI/HUD
 */

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/stores/useStore';
import { GUITAR_TUNING, CHORD_DATABASE } from '@/config/constants';

export default function HUD() {
    const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);

    const {
        currentChord,
        correctionActive,
        lastStrumEvent,
        activeStrings,
        wsConnected,
        isMuted,
        masterVolume,
        setMuted,
        setMasterVolume,
        isTracking,
        trackingFps,
        inferenceLatency,
    } = useStore();

    // Get chord data if available
    const chordData = CHORD_DATABASE[currentChord as keyof typeof CHORD_DATABASE];
    const fingering = chordData?.fingering || [0, 0, 0, 0, 0, 0];

    // Format chord name for display
    const formatChordName = (chord: string): string => {
        if (chord === 'unknown') return '—';
        return chord.replace('_', ' ').replace('Major', 'maj').replace('Minor', 'm');
    };

    // Handle volume change
    const handleVolumeChange = (delta: number) => {
        const newVolume = Math.max(0, Math.min(1, masterVolume + delta));
        setMasterVolume(newVolume);
        setShowVolumeIndicator(true);
        setTimeout(() => setShowVolumeIndicator(false), 1500);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'm' || e.key === 'M') {
                setMuted(!isMuted);
            } else if (e.key === 'ArrowUp') {
                handleVolumeChange(0.1);
            } else if (e.key === 'ArrowDown') {
                handleVolumeChange(-0.1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMuted, masterVolume, setMuted]);

    return (
        <div className="pointer-events-none">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-start">
                {/* Left: Tracking Status */}
                <div className="glass-dark rounded-lg px-4 py-2">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                        <span className="text-white/80 text-sm font-medium">
                            {isTracking ? 'Tracking' : 'No Hands'}
                        </span>
                        {isTracking && (
                            <span className="text-white/50 text-xs font-mono">
                                {trackingFps} FPS
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Reserved for debug toggle (in page.tsx) */}
            </div>

            {/* Center: Chord Display */}
            <div className="fixed top-1/4 left-1/2 -translate-x-1/2 text-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentChord}
                        initial={{ opacity: 0, y: -20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center"
                    >
                        {/* Chord Name */}
                        <h2
                            className={`chord-display ${correctionActive ? 'text-neon-cyan' : 'text-white/80'
                                }`}
                        >
                            {formatChordName(currentChord)}
                        </h2>

                        {/* AI Indicator */}
                        {correctionActive && (
                            <motion.span
                                className="mt-2 text-xs text-neon-cyan uppercase tracking-widest"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                AI Corrected
                            </motion.span>
                        )}

                        {/* Fingering Diagram */}
                        {currentChord !== 'unknown' && (
                            <div className="mt-6 flex flex-col items-center gap-1">
                                <div className="flex gap-3">
                                    {GUITAR_TUNING.map((string, i) => (
                                        <div
                                            key={string.note}
                                            className="flex flex-col items-center"
                                        >
                                            {/* String label */}
                                            <span className="text-xs text-white/40 mb-1">
                                                {string.note.charAt(0)}
                                            </span>

                                            {/* Fret indicator */}
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${activeStrings.has(i)
                                                        ? 'bg-neon-cyan text-black scale-110'
                                                        : fingering[i] === -1
                                                            ? 'bg-red-500/30 text-red-400'
                                                            : 'bg-white/10 text-white/80'
                                                    }`}
                                            >
                                                {fingering[i] === -1 ? 'X' : fingering[i]}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Bottom Left: Last Strum */}
            <div className="fixed bottom-4 left-4">
                <AnimatePresence>
                    {lastStrumEvent && (
                        <motion.div
                            key={lastStrumEvent.timestamp}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="glass-dark rounded-lg px-4 py-2"
                        >
                            <div className="text-xs text-white/50 uppercase tracking-wide mb-1">
                                Last Strum
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-neon-cyan">
                                    {GUITAR_TUNING[lastStrumEvent.stringIndex]?.note || '?'}
                                </span>
                                <div className="h-4 w-px bg-white/20" />
                                <span className="text-sm text-white/60">
                                    Fret {lastStrumEvent.fretIndex}
                                </span>
                                <div className="h-4 w-px bg-white/20" />
                                <div className="flex items-center gap-1">
                                    {/* Velocity meter */}
                                    {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
                                        <div
                                            key={threshold}
                                            className={`w-1 h-3 rounded-full transition-colors ${lastStrumEvent.velocity >= threshold
                                                    ? 'bg-neon-green'
                                                    : 'bg-white/20'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Center: Volume Indicator */}
            <AnimatePresence>
                {showVolumeIndicator && (
                    <motion.div
                        className="fixed bottom-4 left-1/2 -translate-x-1/2 glass-dark rounded-lg px-6 py-3"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-white/50 text-sm">
                                {isMuted ? '🔇' : '🔊'}
                            </span>
                            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-neon-cyan rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${masterVolume * 100}%` }}
                                />
                            </div>
                            <span className="text-white/80 text-sm font-mono w-8">
                                {Math.round(masterVolume * 100)}%
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Right: Latency */}
            {wsConnected && inferenceLatency > 0 && (
                <div className="fixed bottom-4 right-4 glass-dark rounded-lg px-3 py-1">
                    <span className="text-xs text-white/50 font-mono">
                        {inferenceLatency.toFixed(0)}ms
                    </span>
                </div>
            )}

            {/* Keyboard Shortcuts Hint (shows briefly) */}
            <motion.div
                className="fixed bottom-20 left-1/2 -translate-x-1/2 text-center text-white/30 text-xs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
            >
                Press <kbd className="px-1 py-0.5 bg-white/10 rounded">M</kbd> to mute •{' '}
                <kbd className="px-1 py-0.5 bg-white/10 rounded">↑/↓</kbd> to adjust volume
            </motion.div>
        </div>
    );
}
