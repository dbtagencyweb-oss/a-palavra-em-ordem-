import { defineConfig, devices } from '@playwright/test'

const PORT = 5199
const devUrl = process.env.PAO_E2E_URL

export default defineConfig({
  testDir: './e2e',
  timeout: 10 * 60 * 1000,
  expect: { timeout: 8000 },
  reporter: [['list']],
  use: {
    baseURL: devUrl ?? `http://localhost:${PORT}`,
    // Reference width from CLAUDE.md: 390 px.
    ...devices['iPhone 13'],
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  webServer: devUrl ? undefined : {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
