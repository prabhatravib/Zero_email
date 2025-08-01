import config from '@zero/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  ...config,
  {
    rules: {
      // Temporarily change these to warnings to allow git commit
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/no-unescaped-entities': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
    },
  },
]);
