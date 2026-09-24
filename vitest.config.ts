import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match the existing tsconfig.base.json source aliases used by Next.js, so a
  // test can import a workspace package by name (e.g. `@ksp/ui`) even when the
  // app that owns the test does not list it as a runtime dependency yet.
  resolve: {
    alias: {
      '@ksp/domain': fileURLToPath(new URL('./packages/domain/src/index.ts', import.meta.url)),
      '@ksp/ui': fileURLToPath(new URL('./packages/ui/src/index.tsx', import.meta.url))
    }
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.tsx']
  }
});
