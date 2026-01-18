/**
 * GuitarMesh Component
 * 
 * 3D guitar model that anchors to body landmarks.
 * Uses procedural geometry as fallback when GLTF is unavailable.
 * 
 * @module components/AR/GuitarMesh
 */

'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, selectVision, selectAudio } from '@/stores/useStore';
import { GUITAR_TUNING, RENDER_CONFIG } from '@/config/constants';
import { lerp } from '@/lib/math';

// String colors for visual feedback
const STRING_COLORS = {
    default: '#C0C0C0',
    active: '#00FFFF',
    glow: '#00FFFF',
};

export default function GuitarMesh() {
    const groupRef = useRef<THREE.Group>(null);
    const stringsRef = useRef<THREE.Mesh[]>([]);
    const stringGlowRef = useRef<THREE.Mesh[]>([]);

    const vision = useStore(selectVision);
    const audio = useStore(selectAudio);
    const leftHand = useStore((state) => state.leftHand);

    // Create procedural guitar geometry
    const { body, neck, frets, strings, stringGlows } = useMemo(() => {
        // Guitar body (simplified shape)
        const bodyShape = new THREE.Shape();
        bodyShape.moveTo(0, -0.3);
        bodyShape.bezierCurveTo(0.3, -0.3, 0.4, -0.1, 0.4, 0.15);
        bodyShape.bezierCurveTo(0.4, 0.35, 0.25, 0.45, 0, 0.45);
        bodyShape.bezierCurveTo(-0.25, 0.45, -0.4, 0.35, -0.4, 0.15);
        bodyShape.bezierCurveTo(-0.4, -0.1, -0.3, -0.3, 0, -0.3);

        const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, {
            depth: 0.08,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelSegments: 3,
        });

        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: '#8B4513',
            roughness: 0.4,
            metalness: 0.1,
        });

        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.x = Math.PI / 2;
        body.position.z = -0.04;

        // Neck
        const neckGeometry = new THREE.BoxGeometry(0.12, 0.8, 0.03);
        const neckMaterial = new THREE.MeshStandardMaterial({
            color: '#2C1810',
            roughness: 0.6,
        });
        const neck = new THREE.Mesh(neckGeometry, neckMaterial);
        neck.position.y = 0.65;
        neck.position.z = 0;

        // Frets
        const frets: THREE.Mesh[] = [];
        const fretGeometry = new THREE.BoxGeometry(0.11, 0.003, 0.035);
        const fretMaterial = new THREE.MeshStandardMaterial({
            color: '#D4AF37',
            metalness: 0.8,
            roughness: 0.2,
        });

        for (let i = 0; i <= 12; i++) {
            const fret = new THREE.Mesh(fretGeometry, fretMaterial);
            const fretPosition = 0.25 + i * 0.06; // Simplified fret spacing
            fret.position.y = fretPosition;
            fret.position.z = 0.015;
            frets.push(fret);
        }

        // Strings
        const strings: THREE.Mesh[] = [];
        const stringGlows: THREE.Mesh[] = [];
        const stringWidth = 0.08;

        for (let i = 0; i < 6; i++) {
            // Main string
            const radius = 0.001 + i * 0.0003; // Thicker for lower strings
            const stringGeometry = new THREE.CylinderGeometry(radius, radius, 1.0, 8);
            const stringMaterial = new THREE.MeshStandardMaterial({
                color: STRING_COLORS.default,
                metalness: 0.9,
                roughness: 0.1,
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0,
            });

            const string = new THREE.Mesh(stringGeometry, stringMaterial);
            const xPos = -stringWidth / 2 + (i * stringWidth) / 5;
            string.position.x = xPos;
            string.position.y = 0.5;
            string.position.z = 0.02;
            strings.push(string);

            // String glow (for active strings)
            const glowGeometry = new THREE.CylinderGeometry(radius * 3, radius * 3, 1.0, 8);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: STRING_COLORS.glow,
                transparent: true,
                opacity: 0,
            });

            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            glow.position.copy(string.position);
            stringGlows.push(glow);
        }

        return { body, neck, frets, strings, stringGlows };
    }, []);

    // Update string refs
    useEffect(() => {
        stringsRef.current = strings;
        stringGlowRef.current = stringGlows;
    }, [strings, stringGlows]);

    // Animation loop
    useFrame((state, delta) => {
        if (!groupRef.current) return;

        // Update guitar position based on body anchors
        // For now, use a fixed position (will be updated with pose detection)
        const targetX = 0;
        const targetY = -0.2;
        const targetZ = -0.5;

        groupRef.current.position.x = lerp(groupRef.current.position.x, targetX, 0.1);
        groupRef.current.position.y = lerp(groupRef.current.position.y, targetY, 0.1);
        groupRef.current.position.z = lerp(groupRef.current.position.z, targetZ, 0.1);

        // Subtle rotation based on hand position
        if (leftHand) {
            const wristX = leftHand.wristPosition.x - 0.5;
            groupRef.current.rotation.y = lerp(
                groupRef.current.rotation.y,
                wristX * 0.3,
                0.05
            );
        }

        // Animate string glow based on active strings
        stringsRef.current.forEach((string, i) => {
            const isActive = audio.activeStrings.has(i);
            const material = string.material as THREE.MeshStandardMaterial;
            const glowMaterial = stringGlowRef.current[i]?.material as THREE.MeshBasicMaterial;

            if (isActive) {
                // Activate string
                material.emissive.setHex(0x00FFFF);
                material.emissiveIntensity = lerp(material.emissiveIntensity, 0.5, 0.2);

                if (glowMaterial) {
                    glowMaterial.opacity = lerp(glowMaterial.opacity, 0.3, 0.2);
                }

                // Vibration effect
                const vibration = Math.sin(state.clock.elapsedTime * 100) * 0.001;
                string.position.x += vibration;
            } else {
                // Deactivate string
                material.emissiveIntensity = lerp(material.emissiveIntensity, 0, 0.1);

                if (glowMaterial) {
                    glowMaterial.opacity = lerp(glowMaterial.opacity, 0, 0.1);
                }
            }
        });

        // Subtle floating animation
        groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5) * 0.001;
    });

    return (
        <group
            ref={groupRef}
            scale={RENDER_CONFIG.guitarScale}
            rotation={[RENDER_CONFIG.neckTiltAngle, 0, 0]}
        >
            {/* Guitar Body */}
            <primitive object={body} />

            {/* Neck */}
            <primitive object={neck} />

            {/* Frets */}
            {frets.map((fret, i) => (
                <primitive key={`fret-${i}`} object={fret} />
            ))}

            {/* Strings */}
            {strings.map((string, i) => (
                <primitive key={`string-${i}`} object={string} />
            ))}

            {/* String Glows */}
            {stringGlows.map((glow, i) => (
                <primitive key={`glow-${i}`} object={glow} />
            ))}

            {/* Sound Hole */}
            <mesh position={[0, 0.1, 0.05]}>
                <circleGeometry args={[0.08, 32]} />
                <meshBasicMaterial color="#1a1a1a" />
            </mesh>

            {/* Bridge */}
            <mesh position={[0, -0.15, 0.05]}>
                <boxGeometry args={[0.15, 0.02, 0.01]} />
                <meshStandardMaterial color="#5C2E0A" roughness={0.5} />
            </mesh>

            {/* Nut (top of fretboard) */}
            <mesh position={[0, 0.97, 0.015]}>
                <boxGeometry args={[0.12, 0.015, 0.02]} />
                <meshStandardMaterial color="#FFFFF0" roughness={0.3} />
            </mesh>
        </group>
    );
}
