/**
 * ARScene Component
 * 
 * React Three Fiber scene containing the 3D guitar rendering.
 * 
 * @module components/AR/ARScene
 */

'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import GuitarMesh from './GuitarMesh';
import { useStore } from '@/stores/useStore';

export default function ARScene() {
    const debugMode = useStore((state) => state.debugMode);

    return (
        <Canvas
            className="ar-canvas"
            gl={{
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
            }}
            style={{ background: 'transparent' }}
        >
            {/* Camera */}
            <PerspectiveCamera
                makeDefault
                position={[0, 0, 2]}
                fov={60}
                near={0.1}
                far={100}
            />

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[5, 5, 5]}
                intensity={1}
                castShadow
            />
            <pointLight
                position={[-5, -5, 5]}
                intensity={0.5}
                color="#00FFFF"
            />

            {/* 3D Content */}
            <Suspense fallback={null}>
                <GuitarMesh />
            </Suspense>

            {/* Debug Controls */}
            {debugMode && (
                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                />
            )}
        </Canvas>
    );
}
