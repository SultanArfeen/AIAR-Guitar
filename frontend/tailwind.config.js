/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Neon guitar theme colors
                guitar: {
                    wood: '#8B4513',
                    'wood-dark': '#5C2E0A',
                    string: '#C0C0C0',
                    'string-glow': '#00FFFF',
                    fretboard: '#2C1810',
                    fret: '#D4AF37',
                },
                // Neon accent colors
                neon: {
                    cyan: '#00FFFF',
                    magenta: '#FF00FF',
                    yellow: '#FFFF00',
                    green: '#00FF00',
                    orange: '#FF6600',
                },
                // UI colors
                surface: {
                    dark: '#0A0A0F',
                    'dark-alt': '#12121A',
                    glass: 'rgba(255, 255, 255, 0.05)',
                },
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'strum': 'strum 0.15s ease-out',
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
                    '100%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' },
                },
                strum: {
                    '0%': { transform: 'translateX(0)' },
                    '50%': { transform: 'translateX(3px)' },
                    '100%': { transform: 'translateX(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
            fontFamily: {
                mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
            },
        },
    },
    plugins: [],
};
