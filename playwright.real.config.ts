import { defineConfig, devices } from '@playwright/test';

const requiredEnvironment = [
  'E2E_REAL_BASE_URL',
  'E2E_REAL_ADMIN_EMAIL',
  'E2E_REAL_ADMIN_PASSWORD',
] as const;

const missingEnvironment = requiredEnvironment.filter((key) => {
  const value = process.env[key];
  return value === undefined || value.trim() === '';
});

if (missingEnvironment.length > 0) {
  throw new Error(
    `[test:e2e:real] Faltan variables obligatorias: ${missingEnvironment.join(', ')}. `
      + 'La suite real es de solo lectura y no usa credenciales embebidas.',
  );
}

export default defineConfig({
  testDir: './e2e-real',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-real' }]],
  use: {
    baseURL: process.env['E2E_REAL_BASE_URL'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30_000,
    actionTimeout: 20_000,
  },
  projects: [
    {
      name: 'real-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
