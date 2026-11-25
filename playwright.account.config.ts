import { defineConfig, devices } from '@playwright/test'

const port = 5198
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e-account',
  outputDir: './test-results/account',
  reporter: 'list',
  use: {
    ...devices['iPhone 13'],
    browserName: 'chromium',
    baseURL,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    env: {
      VITE_SUPABASE_URL: 'https://pao-account-test.invalid',
      VITE_SUPABASE_ANON_KEY: 'local-account-test',
    },
  },
})
