import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:4175',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: 'npm.cmd run design:mobile',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
