/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,

    // Enable WebGL and Three.js optimizations
    webpack: (config) => {
        // Handle GLSL shader files
        config.module.rules.push({
            test: /\.(glsl|vs|fs|vert|frag)$/,
            exclude: /node_modules/,
            use: ['raw-loader'],
        });

        // Handle GLTF/GLB 3D model files
        config.module.rules.push({
            test: /\.(gltf|glb)$/,
            type: 'asset/resource',
        });

        return config;
    },

    // Allow loading 3D models and assets from CDNs
    images: {
        domains: ['cdn.jsdelivr.net'],
    },

    // Environment variables exposed to the browser
    env: {
        NEXT_PUBLIC_WSS_URL: process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:8000/ws/inference',
    },
};

module.exports = nextConfig;
