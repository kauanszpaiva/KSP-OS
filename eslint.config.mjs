import js from '@eslint/js';

/**
 * Root ESLint flat config.
 *
 * TypeScript is linted by `tsc --noEmit` (turbo typecheck) and the repository's
 * `check-source.mjs` guard (turbo lint) — the CI gates. This config only exists
 * for plain JS/MJS/CJS files, and must NOT try to parse `.ts`/`.tsx`: the base
 * `espree` parser can't read TS type syntax, which surfaces as repo-wide
 * "Parsing error: Unexpected token" noise in editors. So TS/TSX are ignored
 * here and the two rules that fire spuriously on config/script files are off.
 */
export default [
  { ignores: ['**/.next/**', '**/node_modules/**', '**/coverage/**', '**/dist/**', '**/*.ts', '**/*.tsx'] },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        Buffer: 'readonly'
      }
    },
    rules: { 'no-unused-vars': 'off', 'no-undef': 'off' }
  }
];
