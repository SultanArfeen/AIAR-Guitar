/**
 * AudioEngine
 * 
 * Tone.js-based audio synthesis engine with strum detection,
 * velocity mapping, and chord correction support.
 * 
 * @module systems/AudioEngine
 */

import * as Tone from 'tone';
import { useStore } from '@/stores/useStore';
import {
    GUITAR_TUNING,
    AUDIO_CONFIG,
    STRUM_SPEED_THRESHOLD,
    STRUM_SPEED_MAX,
    STRUM_DEBOUNCE_MS,
    NUM_FRETS,
} from '@/config/constants';
import { velocityToGain, getFrettedMidi, clamp, magnitude, subtract } from '@/lib/math';
import type { Point3D, StrumEvent, StrumState } from '@/types/landmarks';

// ==============================================
// Types
// ==============================================

interface StringVoice {
    synth: Tone.Synth | Tone.Sampler;
    envelope: Tone.AmplitudeEnvelope;
    gain: Tone.Gain;
    isPlaying: boolean;
    lastNoteTime: number;
}

interface AudioEngineState {
    isInitialized: boolean;
    voices: StringVoice[];
    masterGain: Tone.Gain;
    strumState: StrumState;
}

// ==============================================
// AudioEngine Class
// ==============================================

class AudioEngine {
    private state: AudioEngineState | null = null;
    private animationFrame: number | null = null;
    private lastFrameTime: number = 0;
    private lastStrumTime: number = 0;

    /**
     * Initialize the audio engine
     */
    async initialize(): Promise<boolean> {
        if (this.state?.isInitialized) {
            return true;
        }

        try {
            // Start Tone.js context
            await Tone.start();

            // Create master gain
            const masterGain = new Tone.Gain(AUDIO_CONFIG.maxGain).toDestination();

            // Create voices for each string
            const voices: StringVoice[] = GUITAR_TUNING.map((string) => {
                // Create synth (using PluckSynth for guitar-like sound)
                const synth = new Tone.PluckSynth({
                    attackNoise: 1,
                    dampening: 4000,
                    resonance: 0.95,
                });

                // Create envelope
                const envelope = new Tone.AmplitudeEnvelope({
                    attack: AUDIO_CONFIG.attackTime,
                    decay: AUDIO_CONFIG.decayTime,
                    sustain: AUDIO_CONFIG.sustainLevel,
                    release: AUDIO_CONFIG.releaseTime,
                });

                // Create gain for velocity control
                const gain = new Tone.Gain(0.5);

                // Connect: synth -> envelope -> gain -> master
                synth.connect(envelope);
                envelope.connect(gain);
                gain.connect(masterGain);

                return {
                    synth,
                    envelope,
                    gain,
                    isPlaying: false,
                    lastNoteTime: 0,
                };
            });

            this.state = {
                isInitialized: true,
                voices,
                masterGain,
                strumState: {
                    lastPosition: null,
                    lastTimestamp: 0,
                    velocity: 0,
                    isStrumming: false,
                },
            };

            // Update store
            useStore.getState().setAudioInitialized(true);

            console.info('[AudioEngine] Initialized successfully');
            return true;
        } catch (error) {
            console.error('[AudioEngine] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Play a note on a specific string
     */
    playNote(stringIndex: number, fret: number, velocity: number): void {
        if (!this.state?.isInitialized) {
            console.warn('[AudioEngine] Not initialized');
            return;
        }

        if (stringIndex < 0 || stringIndex >= this.state.voices.length) {
            console.warn('[AudioEngine] Invalid string index:', stringIndex);
            return;
        }

        // Get the voice for this string
        const voice = this.state.voices[stringIndex];
        const now = Tone.now();

        // Apply debounce
        if (now - voice.lastNoteTime < STRUM_DEBOUNCE_MS / 1000) {
            return;
        }

        // Calculate MIDI note
        const openStringMidi = GUITAR_TUNING[stringIndex].midi;
        const midiNote = getFrettedMidi(openStringMidi, fret);

        if (midiNote < 0) {
            // Muted string
            return;
        }

        // Calculate gain from velocity
        const gain = velocityToGain(
            velocity,
            AUDIO_CONFIG.minGain,
            AUDIO_CONFIG.maxGain,
            AUDIO_CONFIG.gainGamma
        );

        // Apply master volume
        const isMuted = useStore.getState().isMuted;
        const masterVolume = useStore.getState().masterVolume;

        if (isMuted) {
            return;
        }

        voice.gain.gain.setValueAtTime(gain * masterVolume, now);

        // Convert MIDI to frequency
        const frequency = Tone.Midi(midiNote).toFrequency();

        // Trigger the note
        try {
            (voice.synth as Tone.PluckSynth).triggerAttack(frequency, now);
            voice.envelope.triggerAttack(now);
            voice.isPlaying = true;
            voice.lastNoteTime = now;

            // Auto-release after a duration
            setTimeout(() => {
                this.releaseNote(stringIndex);
            }, 1500);

            // Update store
            useStore.getState().addActiveString(stringIndex);
        } catch (error) {
            console.error('[AudioEngine] Failed to play note:', error);
        }
    }

    /**
     * Release a note on a specific string
     */
    releaseNote(stringIndex: number): void {
        if (!this.state?.isInitialized) return;

        const voice = this.state.voices[stringIndex];
        if (!voice?.isPlaying) return;

        try {
            voice.envelope.triggerRelease(Tone.now());
            voice.isPlaying = false;

            // Update store
            useStore.getState().removeActiveString(stringIndex);
        } catch (error) {
            console.error('[AudioEngine] Failed to release note:', error);
        }
    }

    /**
     * Play a chord (all notes simultaneously)
     */
    playChord(fingering: number[], velocity: number): void {
        if (!this.state?.isInitialized) return;

        fingering.forEach((fret, stringIndex) => {
            if (fret >= 0) {
                // Small delay between strings for more natural strum
                setTimeout(() => {
                    this.playNote(stringIndex, fret, velocity);
                }, stringIndex * 20);
            }
        });
    }

    /**
     * Process strum detection from hand movement
     */
    processStrumMovement(currentPosition: Point3D, timestamp: number): StrumEvent | null {
        if (!this.state) return null;

        const { strumState } = this.state;

        if (!strumState.lastPosition) {
            strumState.lastPosition = currentPosition;
            strumState.lastTimestamp = timestamp;
            return null;
        }

        // Calculate velocity
        const dt = (timestamp - strumState.lastTimestamp) / 1000; // seconds
        if (dt <= 0) {
            return null;
        }

        const movement = subtract(currentPosition, strumState.lastPosition);
        const speed = magnitude(movement) / dt;

        // Update state
        strumState.lastPosition = currentPosition;
        strumState.lastTimestamp = timestamp;
        strumState.velocity = speed;

        // Check for strum
        if (speed > STRUM_SPEED_THRESHOLD) {
            // Debounce
            if (timestamp - this.lastStrumTime < STRUM_DEBOUNCE_MS) {
                return null;
            }
            this.lastStrumTime = timestamp;

            // Calculate normalized velocity
            const normalizedVelocity = clamp(speed / STRUM_SPEED_MAX, 0, 1);

            // Determine string based on Y position (simplified)
            const stringIndex = Math.floor((1 - currentPosition.y) * 6);
            const clampedString = clamp(stringIndex, 0, 5);

            // Get current fret from chord correction or default to open
            const currentChord = useStore.getState().currentChord;
            const correctionActive = useStore.getState().correctionActive;
            const overrideNotes = useStore.getState().overrideNotes;

            let fret = 0;
            if (correctionActive && overrideNotes.length > clampedString) {
                // Use override notes from AI
                const midiNote = overrideNotes[clampedString];
                const openMidi = GUITAR_TUNING[clampedString].midi;
                fret = Math.max(0, midiNote - openMidi);
            }

            // Determine direction
            const direction = movement.y > 0 ? 'down' : 'up';

            const strumEvent: StrumEvent = {
                timestamp,
                stringIndex: clampedString,
                fretIndex: fret,
                velocity: normalizedVelocity,
                direction,
            };

            // Update store
            useStore.getState().setLastStrumEvent(strumEvent);

            // Play the note
            this.playNote(clampedString, fret, normalizedVelocity);

            return strumEvent;
        }

        return null;
    }

    /**
     * Set master volume
     */
    setVolume(volume: number): void {
        if (!this.state?.isInitialized) return;

        const clampedVolume = clamp(volume, 0, 1);
        this.state.masterGain.gain.setValueAtTime(clampedVolume, Tone.now());
    }

    /**
     * Stop all playing notes
     */
    stopAll(): void {
        if (!this.state?.isInitialized) return;

        this.state.voices.forEach((voice, i) => {
            if (voice.isPlaying) {
                this.releaseNote(i);
            }
        });

        useStore.getState().clearActiveStrings();
    }

    /**
     * Cleanup and dispose
     */
    dispose(): void {
        if (!this.state) return;

        this.stopAll();

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        this.state.voices.forEach((voice) => {
            voice.synth.dispose();
            voice.envelope.dispose();
            voice.gain.dispose();
        });

        this.state.masterGain.dispose();
        this.state = null;

        console.info('[AudioEngine] Disposed');
    }
}

// ==============================================
// Singleton Export
// ==============================================

export const audioEngine = new AudioEngine();

// ==============================================
// React Hook
// ==============================================

import { useEffect, useCallback } from 'react';

export function useAudioEngine() {
    const isInitialized = useStore((state) => state.isInitialized);
    const rightHand = useStore((state) => state.rightHand);

    // Initialize on first user interaction
    const initialize = useCallback(async () => {
        if (!isInitialized) {
            await audioEngine.initialize();
        }
    }, [isInitialized]);

    // Process hand movement for strum detection
    useEffect(() => {
        if (!isInitialized || !rightHand) return;

        // Use index finger tip for strum detection
        const indexTip = rightHand.fingerTips[1]; // Index finger
        if (!indexTip) return;

        audioEngine.processStrumMovement(indexTip, performance.now());
    }, [isInitialized, rightHand]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Don't dispose immediately as component might remount
        };
    }, []);

    return {
        initialize,
        playNote: audioEngine.playNote.bind(audioEngine),
        playChord: audioEngine.playChord.bind(audioEngine),
        stopAll: audioEngine.stopAll.bind(audioEngine),
        setVolume: audioEngine.setVolume.bind(audioEngine),
    };
}
