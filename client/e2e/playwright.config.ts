import path from 'node:path'

import { defineConfig, devices } from '@playwright/test'

import { API_URL, E2E_CLIENT_PORT, E2E_SERVER_PORT, WEB_URL } from './env'

const clientDir = path.resolve(__dirname, '..')
const serverDir = path.resolve(clientDir, '../server')

export default defineConfig({
  testDir: './specs',
  // Every test runs in a fresh browser context, i.e. as a new anonymous
  // visitor with its own event stream, so tests don't share state
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'bun run start',
      cwd: serverDir,
      port: E2E_SERVER_PORT,
      env: {
        NODE_ENV: 'e2e',
        PORT: String(E2E_SERVER_PORT),
        CLIENT_ORIGIN: WEB_URL,
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `bun x next dev --port ${E2E_CLIENT_PORT}`,
      cwd: clientDir,
      url: WEB_URL,
      env: {
        NEXT_DIST_DIR: '.next-e2e',
        NEXT_PUBLIC_API_URL: API_URL,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 2 * 60 * 1000,
    },
  ],
})
