/**
 * IntroSequence Component
 * 
 * Animated intro sequence with split→expand→dissolve effect.
 * Initializes webcam on completion.
 * 
 * @module components/UI/IntroSequence
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/stores/useStore';

interface IntroSequenceProps {
    onComplete: () => void;
}

type Stage = 'logo' | 'split' | 'expand' | 'dissolve' | 'complete';

export default function IntroSequence({ onComplete }: IntroSequenceProps) {
    const [stage, setStage] = useState<Stage>('logo');
    const setIntroComplete = useStore((state) => state.setIntroComplete);

    useEffect(() => {
        const timeline = [
            { stage: 'logo' as Stage, delay: 0 },
            { stage: 'split' as Stage, delay: 1500 },
            { stage: 'expand' as Stage, delay: 2500 },
            { stage: 'dissolve' as Stage, delay: 3500 },
            { stage: 'complete' as Stage, delay: 4500 },
        ];

        const timers: NodeJS.Timeout[] = [];

        timeline.forEach(({ stage, delay }) => {
            const timer = setTimeout(() => {
                setStage(stage);
                if (stage === 'complete') {
                    setIntroComplete(true);
                    onComplete();
                }
            }, delay);
            timers.push(timer);
        });

        return () => {
            timers.forEach(clearTimeout);
        };
    }, [onComplete, setIntroComplete]);

    // Skip intro on click
    const handleSkip = () => {
        setStage('complete');
        setIntroComplete(true);
        onComplete();
    };

    if (stage === 'complete') return null;

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-surface-dark flex items-center justify-center overflow-hidden"
            onClick={handleSkip}
            initial={{ opacity: 1 }}
            animate={{ opacity: stage === 'dissolve' ? 0 : 1 }}
            transition={{ duration: 0.8 }}
        >
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
            `,
                        backgroundSize: '50px 50px',
                    }}
                />
            </div>

            {/* Animated Background Glow */}
            <motion.div
                className="absolute w-96 h-96 rounded-full blur-3xl"
                style={{
                    background: 'radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, transparent 70%)',
                }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            {/* Logo Container */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={stage}
                    className="relative z-10 flex flex-col items-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* Guitar Icon */}
                    <motion.div
                        className="text-8xl mb-8"
                        animate={
                            stage === 'split'
                                ? { rotate: [0, -5, 5, 0], scale: [1, 1.1, 1] }
                                : stage === 'expand'
                                    ? { scale: 1.5, filter: 'blur(10px)' }
                                    : {}
                        }
                        transition={{ duration: 0.5 }}
                    >
                        🎸
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        className="text-6xl font-bold mb-4 tracking-wider"
                        style={{
                            background: 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 50%, #00FFFF 100%)',
                            backgroundSize: '200% 200%',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                        animate={{
                            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                    >
                        AIAR GUITAR
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        className="text-white/60 text-lg tracking-widest uppercase"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        Augmented Reality Instrument
                    </motion.p>

                    {/* Loading Indicator */}
                    {stage === 'logo' && (
                        <motion.div
                            className="mt-12 flex gap-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                        >
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    className="w-3 h-3 rounded-full bg-neon-cyan"
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.5, 1, 0.5],
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                    }}
                                />
                            ))}
                        </motion.div>
                    )}

                    {/* Split Stage Text */}
                    {stage === 'split' && (
                        <motion.p
                            className="mt-8 text-neon-cyan text-sm uppercase tracking-widest"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            Initializing Vision System...
                        </motion.p>
                    )}

                    {/* Expand Stage Text */}
                    {stage === 'expand' && (
                        <motion.p
                            className="mt-8 text-neon-magenta text-sm uppercase tracking-widest"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            Preparing Audio Engine...
                        </motion.p>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Skip Hint */}
            <motion.p
                className="absolute bottom-8 text-white/30 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
            >
                Click anywhere to skip
            </motion.p>

            {/* Side Decorative Lines */}
            <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-32 h-px bg-gradient-to-r from-transparent to-neon-cyan"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.5 }}
                transition={{ delay: 0.5, duration: 1 }}
                style={{ transformOrigin: 'left' }}
            />
            <motion.div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-32 h-px bg-gradient-to-l from-transparent to-neon-magenta"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 0.5 }}
                transition={{ delay: 0.5, duration: 1 }}
                style={{ transformOrigin: 'right' }}
            />
        </motion.div>
    );
}
