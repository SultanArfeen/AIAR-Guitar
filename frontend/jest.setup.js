// Jest DOM matchers for enhanced assertions
import '@testing-library/jest-dom';

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));

// Mock Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
    createOscillator: jest.fn(() => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { setValueAtTime: jest.fn() },
    })),
    createGain: jest.fn(() => ({
        connect: jest.fn(),
        gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn() },
    })),
    destination: {},
    currentTime: 0,
    state: 'running',
    resume: jest.fn(),
    suspend: jest.fn(),
    close: jest.fn(),
}));

// Mock WebGL context for Three.js
HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
    if (type === 'webgl' || type === 'webgl2') {
        return {
            getExtension: jest.fn(),
            getParameter: jest.fn(() => []),
            createShader: jest.fn(),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            getShaderParameter: jest.fn(() => true),
            createProgram: jest.fn(),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            getProgramParameter: jest.fn(() => true),
            useProgram: jest.fn(),
            createBuffer: jest.fn(),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            drawArrays: jest.fn(),
            viewport: jest.fn(),
            clearColor: jest.fn(),
            clear: jest.fn(),
        };
    }
    return null;
});

// Mock navigator.mediaDevices for webcam access
Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
        getUserMedia: jest.fn().mockResolvedValue({
            getTracks: () => [{ stop: jest.fn() }],
        }),
        enumerateDevices: jest.fn().mockResolvedValue([]),
    },
});

// Suppress console errors during tests (optional)
// const originalError = console.error;
// console.error = (...args) => {
//   if (/Warning.*not wrapped in act/.test(args[0])) return;
//   originalError.call(console, ...args);
// };
