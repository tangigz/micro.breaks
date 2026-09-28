import { defineConfig } from '@playwright/test';

// End-to-end tests run a dev build (.output/chrome-mv3-e2e, with the dev clock)
// in Chrome for Testing. `npm run e2e` builds it first.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
});
