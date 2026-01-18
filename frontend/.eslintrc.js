module.exports = {
    extends: ['next/core-web-vitals', 'next/typescript'],
    rules: {
        // TypeScript rules
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
            'warn',
            { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/explicit-function-return-type': 'off',

        // React rules
        'react-hooks/exhaustive-deps': 'warn',
        'react/no-unescaped-entities': 'off',

        // General rules
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'prefer-const': 'error',
        'no-var': 'error',
    },
};
