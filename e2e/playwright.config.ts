import { defineConfig, devices } from '@playwright/test';

/**
 * Every example app gets its own dev server on a fixed port so the
 * demo-apps smoke suite can open all of them in one run. The feature
 * showcase stays on 5173 and is the `baseURL` for the plugin specs.
 */
export const APP_PORTS = {
  'feature-showcase': 5173,
  'react-demo': 5181,
  spreadsheet: 5182,
  'financial-trading': 5183,
  'analytics-explorer': 5184,
  cookbook: 5185,
  playground: 5186,
  'pdf-viewer': 5187,
  hub: 5188,
} as const;

export type AppName = keyof typeof APP_PORTS;

export const appUrl = (app: AppName): string => `http://localhost:${APP_PORTS[app]}`;

const pkgName: Record<AppName, string> = {
  'feature-showcase': '@gridstorm/feature-showcase',
  'react-demo': '@gridstorm/react-demo',
  spreadsheet: '@gridstorm/spreadsheet-demo',
  'financial-trading': '@gridstorm/financial-trading-demo',
  'analytics-explorer': '@gridstorm/analytics-explorer-demo',
  cookbook: '@gridstorm/cookbook',
  playground: '@gridstorm/playground',
  'pdf-viewer': '@gridstorm/pdf-viewer-demo',
  hub: '@gridstorm/hub',
};

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  timeout: 45_000,

  use: {
    baseURL: appUrl('feature-showcase'),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: (Object.keys(APP_PORTS) as AppName[]).map((app) => ({
    command: `pnpm --filter ${pkgName[app]} exec vite --port ${APP_PORTS[app]} --strictPort`,
    url: appUrl(app),
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore' as const,
    stderr: 'pipe' as const,
  })),
});
