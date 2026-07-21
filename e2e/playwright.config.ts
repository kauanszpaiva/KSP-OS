import { defineConfig, devices } from '@playwright/test';

/**
 * Critical-journey browser tests. These require a running Command app pointed at
 * a seeded Supabase project (see docs/testing/KSP_OS_TEST_STRATEGY.md). They are
 * intentionally NOT part of the default CI `test` job, which has no database.
 * Run with: pnpm e2e (set E2E_BASE_URL and seeded test credentials first).
 */
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone SE'] } }
  ]
});
