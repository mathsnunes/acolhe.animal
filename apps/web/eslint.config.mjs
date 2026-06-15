import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FlatCompat } from '@eslint/eslintrc';
import preferArrow from 'eslint-plugin-prefer-arrow-functions';

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
  }),
  {
    // House style: arrow function expressions over `function` declarations.
    plugins: { 'prefer-arrow-functions': preferArrow },
    rules: {
      'prefer-arrow-functions/prefer-arrow-functions': ['error', { returnStyle: 'unchanged' }],
      'func-style': ['error', 'expression'],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
];
