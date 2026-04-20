module.exports = {
  root: true,
  extends: '@react-native',
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-shadow': ['error'],
        'no-shadow': 'off',
        'no-undef': 'off',
      },
    },
    {
      // P0 C1 hardening — Math.random is not cryptographically secure.
      // Every production service file must use `crypto.getRandomValues`
      // (via react-native-get-random-values) or `@noble/ed25519` helpers.
      files: ['src/services/**/*.ts', 'src/utils/**/*.ts', 'src/screens/**/*.{ts,tsx}'],
      excludedFiles: ['**/__tests__/**', '**/__mocks__/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
            message:
              'Math.random() is not cryptographically secure. Use crypto.getRandomValues or @noble/ed25519 utilities (P0 C1).',
          },
          {
            selector: "MemberExpression[object.name='Math'][property.name='random']",
            message:
              'Math.random is not cryptographically secure. Use crypto.getRandomValues or @noble/ed25519 utilities (P0 C1).',
          },
        ],
      },
    },
  ],
};
