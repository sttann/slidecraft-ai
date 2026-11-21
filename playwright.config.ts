import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const windowsChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(windowsChrome) ? windowsChrome : undefined);
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:5174', launchOptions: { executablePath }, screenshot: 'only-on-failure' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 1100 } } }, { name: 'mobile', use: { viewport: { width: 390, height: 844 } } }],
  webServer: { command: 'npm run dev -- --port 5174', url: 'http://127.0.0.1:5174', reuseExistingServer: !process.env.CI, timeout: 30000 },
});
