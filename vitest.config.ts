import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Match Next.js: components use the automatic React JSX runtime.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.tsx']
  }
});
