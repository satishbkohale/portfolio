import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against dist/ served by scripts/serve-dist.mjs, which
 * applies public/_headers, so every test runs under the production CSP.
 * Uses the locally installed Google Chrome (channel: 'chrome') to avoid
 * downloading browser builds. Run `pnpm build` first.
 */
const PORT = 4329;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  // Each worker renders software WebGL and runs axe; too many at once starve
  // the CPU (especially with Docker running) and cause timeouts.
  workers: 3,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
  },
  webServer: {
    command: `node scripts/serve-dist.mjs`,
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
});
