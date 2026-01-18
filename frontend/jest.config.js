const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // Path to Next.js app for loading next.config.js and .env files
    dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',

    // Module path aliases matching tsconfig paths
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^@/components/(.*)$': '<rootDir>/components/$1',
        '^@/stores/(.*)$': '<rootDir>/stores/$1',
        '^@/systems/(.*)$': '<rootDir>/systems/$1',
        '^@/types/(.*)$': '<rootDir>/types/$1',
        '^@/lib/(.*)$': '<rootDir>/lib/$1',
        '^@/config/(.*)$': '<rootDir>/config/$1',
    },

    // Collect coverage from these directories
    collectCoverageFrom: [
        'components/**/*.{js,jsx,ts,tsx}',
        'systems/**/*.{js,jsx,ts,tsx}',
        'stores/**/*.{js,jsx,ts,tsx}',
        'lib/**/*.{js,jsx,ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/__tests__/**',
    ],

    // Test file patterns
    testMatch: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)',
    ],

    // Transform ES modules
    transformIgnorePatterns: [
        '/node_modules/(?!(three|@react-three|tone)/)',
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 50,
            lines: 50,
            statements: 50,
        },
    },
};

module.exports = createJestConfig(customJestConfig);
