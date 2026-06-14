import tseslint from 'typescript-eslint';
import preferArrow from 'eslint-plugin-prefer-arrow-functions';

/**
 * Style enforcement for the packages (apps/web carries the same rule in its own
 * eslint config so `next lint` covers it). The house style is **arrow function
 * expressions** over `function` declarations (see docs/conventions.md);
 * `pnpm lint:style --fix` converts existing declarations.
 */
export default [
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/.turbo/**'] },
  {
    files: ['packages/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { 'prefer-arrow-functions': preferArrow },
    rules: {
      'prefer-arrow-functions/prefer-arrow-functions': ['error', { returnStyle: 'unchanged' }],
      'func-style': ['error', 'expression'],
    },
  },
];
