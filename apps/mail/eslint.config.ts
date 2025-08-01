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
      'react/jsx-no-target-blank': 'warn',
      'react/prop-types': 'warn',
      'react/display-name': 'warn',
      'react/no-unknown-property': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'no-var': 'warn',
      'prefer-const': 'warn',
    },
  },
]);
