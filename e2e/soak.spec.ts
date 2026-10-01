import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureFile = resolve(process.env['E2E_FIXTURE_FILE'] ?? '../finops-backend/.test-artifacts/e2e-fixtures.json');
const soakMinutes = Number.parseInt(process.env['E2E_SOAK_MINUTES'] ?? '0', 10);
const enabled = existsSync(fixtureFile) && Number.isInteger(soakMinutes) && soakMinutes > 0;

test.skip(!enabled, 'Defina E2E_SOAK_MINUTES para ejecutar la prueba de resistencia con fixtures locales.');

interface FixtureManifest {
  readonly password: string;
  readonly admin: { readonly email: string };
}

test('mantiene estable la aplicación durante el soak local de UI', async ({ page }) => {
  const durationMs = soakMinutes * 60_000;
  test.setTimeout(durationMs + 180_000);
  const manifest = JSON.parse(await readFile(fixtureFile, 'utf8')) as FixtureManifest;
  const modules = [
    'Panel de Control',
    'Métricas Técnicas',
    'Inventario Cloud',
    'Presupuestos',
    'Asignación de costos',
    'Valor realizado',
    'Ingesta y Datos',
    'Historial',
  ];
  const failures: string[] = [];
  const serverErrors: number[] = [];
  const unsafeRequests: string[] = [];
  const cycles: { readonly cycle: number; readonly apiRequests: number; readonly heapBytes: number | null }[] = [];
  let apiRequests = 0;

  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/v1/')) apiRequests += 1;
    if (request.method() !== 'GET' && !url.pathname.endsWith('/auth/login') && !url.pathname.endsWith('/auth/refresh')) {
      unsafeRequests.push(request.method());
    }
  });
  page.on('requestfailed', (request) => {
    if (!/aborted|err_aborted/i.test(request.failure()?.errorText ?? '')) failures.push('request_failed');
  });
  page.on('response', (response) => {
    if (response.status() >= 500) serverErrors.push(response.status());
  });
  page.on('pageerror', () => failures.push('page_error'));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/status of 401 \(Unauthorized\)/i.test(message.text())) {
      failures.push('console_error');
    }
  });

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  const inputs = page.locator('form input');
  await inputs.nth(0).fill(manifest.admin.email);
  await inputs.nth(1).fill(manifest.password);
  await page.getByRole('button', { name: /ingresar al panel/i }).click();
  await expect(page.getByLabel('Tenant activo')).toBeVisible({ timeout: 30_000 });

  const deadline = Date.now() + durationMs;
  let cycle = 0;
  while (Date.now() < deadline) {
    cycle += 1;
    const cycleStartedAt = Date.now();
    const requestsBeforeCycle = apiRequests;
    for (const label of modules) {
      await page.locator('aside').getByRole('button', { name: label, exact: true }).click();
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByLabel('Tenant activo')).toBeVisible();
      const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      expect(overflow, `Desbordamiento horizontal al abrir ${label}`).toBeLessThanOrEqual(2);
      await page.waitForTimeout(1_000);
    }
    const heapBytes = await page.evaluate(() => {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
      return typeof memory?.usedJSHeapSize === 'number' ? memory.usedJSHeapSize : null;
    });
    cycles.push({ cycle, apiRequests: apiRequests - requestsBeforeCycle, heapBytes });

    const remainingMs = Math.min(60_000 - (Date.now() - cycleStartedAt), deadline - Date.now());
    if (remainingMs > 0) await page.waitForTimeout(remainingMs);
  }

  const heapSamples = cycles.map((item) => item.heapBytes).filter((value): value is number => value !== null);
  const firstRequestMean = mean(cycles.slice(0, 3).map((item) => item.apiRequests));
  const lastRequestMean = mean(cycles.slice(-3).map((item) => item.apiRequests));
  const firstHeapMean = mean(heapSamples.slice(0, 3));
  const lastHeapMean = mean(heapSamples.slice(-3));
  await test.info().attach('ui-soak-summary.json', {
    body: Buffer.from(JSON.stringify({
      durationMinutes: soakMinutes,
      cycles: cycles.length,
      navigations: cycles.length * modules.length,
      apiRequestsPerCycle: cycles.map((item) => item.apiRequests),
      heapBytesByCycle: cycles.map((item) => item.heapBytes),
      requestRateStartMean: firstRequestMean,
      requestRateEndMean: lastRequestMean,
      heapStartMeanBytes: heapSamples.length >= 3 ? firstHeapMean : null,
      heapEndMeanBytes: heapSamples.length >= 3 ? lastHeapMean : null,
      requestFailureCount: failures.length,
      serverErrorCount: serverErrors.length,
      unsafeRequestCount: unsafeRequests.length,
    }, null, 2)),
    contentType: 'application/json',
  });

  expect(cycles.length).toBeGreaterThanOrEqual(soakMinutes - 1);
  expect(failures).toEqual([]);
  expect(serverErrors).toEqual([]);
  expect(unsafeRequests).toEqual([]);
  if (firstRequestMean > 0) expect(lastRequestMean).toBeLessThanOrEqual(firstRequestMean * 1.5 + 5);
  if (heapSamples.length >= 6) expect(lastHeapMean - firstHeapMean).toBeLessThanOrEqual(64 * 1024 * 1024);
});

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}
