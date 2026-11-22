import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'instant-navigation.spec.ts',
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
