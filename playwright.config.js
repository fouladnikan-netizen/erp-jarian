import { defineConfig, devices } from '@playwright/test';
import { loadRepoEnv } from './tests/e2e/helpers/loadEnv.js';

loadRepoEnv();

/**
 * Jarian E2E — Chromium only.
 * Requires: Vite on :3000, Backend+Postgres on :3100 (real API, not mock).
 * Credentials: E2E_QA_USERNAME / E2E_QA_PASSWORD from env or repo .env
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 120_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    // Prefer installed Google Chrome when bundled headless shell is unavailable/arch-mismatched.
    channel: process.env.E2E_BROWSER_CHANNEL || 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
