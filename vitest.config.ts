import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match the existing tsconfig.base.json source alias used by Next.js.
  resolve: { alias: { '@ksp/domain': fileURLToPath(new URL('./packages/domain/src/index.ts', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.tsx']
  }
});
