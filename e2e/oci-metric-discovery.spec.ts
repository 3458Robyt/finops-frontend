import { expect, test, type Page, type Route } from '@playwright/test';

test('discovers OCI metrics in a bounded scope and saves only explicitly selected definitions', async ({ page }) => {
  const mutations: { method: string; path: string }[] = [];
  let discoveryBody: unknown;
  let savedDefinitions: unknown;
  await installApiMocks(page, (request) => {
    const url = new URL(request.url());
    if (request.method() !== 'GET') mutations.push({ method: request.method(), path: url.pathname });
    if (url.pathname.endsWith('/metric-definitions/discover')) {
      discoveryBody = request.postDataJSON();
      return {
        success: true,
        discovery: {
          definitions: [
            { compartmentId: 'ocid1.compartment.test', namespace: 'oci_computeagent', metricName: 'CpuUtilization', resourceId: 'ocid1.instance.test', regionId: 'us-ashburn-1', dimensions: { resourceId: 'ocid1.instance.test', availabilityDomain: 'AD-1' }, statistics: ['MEAN', 'MIN', 'MAX', 'P95'], unit: 'Percent', inventoryLinkage: { status: 'MATCHED', resourceName: 'Producción API' } },
            { compartmentId: 'ocid1.compartment.test', namespace: 'oci_computeagent', metricName: 'MemoryUtilization', resourceId: '', regionId: 'us-ashburn-1', statistics: ['MEAN'], unit: 'Percent' },
            { compartmentId: 'ocid1.compartment.test', namespace: 'oci_computeagent', metricName: 'DiskBytesRead', resourceId: 'ocid1.instance.not-in-inventory', regionId: 'us-ashburn-1', statistics: ['MEAN'], unit: 'Bytes', inventoryLinkage: { status: 'NOT_FOUND' } },
          ],
          regions: ['us-ashburn-1'], compartments: ['ocid1.compartment.test'], apiCallCount: 2, truncated: true, warnings: [],
        },
      };
    }
    if (url.pathname.endsWith('/metric-definitions') && request.method() === 'PUT') {
      savedDefinitions = request.postDataJSON();
      return { success: true, metricDefinitions: { configuredCount: 1, updatedKey: 'ociMetricDefinitions', replaced: false } };
    }
    return null;
  });

  await page.goto('/');
  await page.locator('input[type="email"]').fill('tech@example.com');
  await page.locator('input[type="password"]').fill('local-test-password');
  await page.getByRole('button', { name: /ingresar al panel/i }).click();
  await page.getByRole('button', { name: /ingesta y datos/i }).click();
  await expect(page.getByRole('heading', { name: 'Ingesta y calidad de datos' })).toBeVisible();
  await page.getByText(/configuración técnica avanzada/i).click();

  const panel = page.getByRole('region', { name: 'Descubrimiento de métricas OCI' });
  await expect(panel).toBeVisible();
  await panel.getByPlaceholder('ocid1.compartment...').fill('ocid1.compartment.test');
  await panel.getByRole('button', { name: /previsualizar/i }).click();
  await expect(panel.getByText('CpuUtilization', { exact: true })).toBeVisible();
  await expect(panel.getByText(/Coincidencia exacta en inventario: Producción API/i)).toBeVisible();
  await expect(panel.getByText(/Sin coincidencia exacta en el inventario de esta conexión/i)).toBeVisible();
  await expect(panel.getByText(/resultado parcial por límite de seguridad/i)).toBeVisible();
  await expect(panel.getByRole('checkbox').nth(1)).toBeDisabled();
  await panel.getByRole('checkbox').nth(0).check();
  await panel.getByRole('button', { name: /guardar 1 seleccionada/i }).click();

  expect(discoveryBody).toEqual({ scope: { regionId: 'us-ashburn-1', compartmentId: 'ocid1.compartment.test' } });
  expect(savedDefinitions).toMatchObject({
    replace: false,
    definitions: [{ compartmentId: 'ocid1.compartment.test', namespace: 'oci_computeagent', metricName: 'CpuUtilization', resourceId: 'ocid1.instance.test', regionId: 'us-ashburn-1', dimensions: { resourceId: 'ocid1.instance.test', availabilityDomain: 'AD-1' } }],
  });
  expect(mutations.filter(({ path }) => path.includes('/ingestion-jobs'))).toEqual([]);
  await expect(panel.getByText(/la ingesta no se inicia automáticamente/i)).toBeVisible();
});

test('invalidates an OCI preview when its region, compartment or namespace changes', async ({ page }) => {
  let saved = false;
  await installApiMocks(page, (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('/metric-definitions/discover')) return {
      success: true,
      discovery: {
        definitions: [{ compartmentId: 'ocid1.compartment.test', namespace: 'oci_computeagent', metricName: 'CpuUtilization', resourceId: 'ocid1.instance.test' }],
        regions: ['us-ashburn-1'], compartments: ['ocid1.compartment.test'], apiCallCount: 1, truncated: false, warnings: [],
      },
    };
    if (url.pathname.endsWith('/metric-definitions') && request.method() === 'PUT') saved = true;
    return null;
  });

  await page.goto('/');
  await page.locator('input[type="email"]').fill('tech@example.com');
  await page.locator('input[type="password"]').fill('local-test-password');
  await page.getByRole('button', { name: /ingresar al panel/i }).click();
  await page.getByRole('button', { name: /ingesta y datos/i }).click();
  await expect(page.getByRole('heading', { name: 'Ingesta y calidad de datos' })).toBeVisible();
  await page.getByText(/configuración técnica avanzada/i).click();

  const panel = page.getByRole('region', { name: 'Descubrimiento de métricas OCI' });
  await panel.getByPlaceholder('ocid1.compartment...').fill('ocid1.compartment.test');
  await panel.getByRole('button', { name: /previsualizar/i }).click();
  await panel.getByRole('checkbox').check();
  await panel.getByPlaceholder('oci_computeagent').fill('oci_blockstore');
  await expect(panel.getByRole('button', { name: /guardar/i })).toHaveCount(0);
  expect(saved).toBe(false);
});

test('explains an empty OCI discovery result and keeps saving unavailable', async ({ page }) => {
  let savedDefinitions = false;
  let ingestionStarted = false;
  await installApiMocks(page, (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith('/metric-definitions/discover')) {
      return {
        success: true,
        discovery: { definitions: [], regions: ['us-ashburn-1'], compartments: ['ocid1.compartment.test'], apiCallCount: 1, truncated: false, warnings: [] },
      };
    }
    if (url.pathname.endsWith('/metric-definitions') && request.method() === 'PUT') savedDefinitions = true;
    if (url.pathname.includes('/ingestion-jobs')) ingestionStarted = true;
    return null;
  });

  await page.goto('/');
  await page.locator('input[type="email"]').fill('tech@example.com');
  await page.locator('input[type="password"]').fill('local-test-password');
  await page.getByRole('button', { name: /ingresar al panel/i }).click();
  await page.getByRole('button', { name: /ingesta y datos/i }).click();
  await expect(page.getByRole('heading', { name: 'Ingesta y calidad de datos' })).toBeVisible();
  await page.getByText(/configuración técnica avanzada/i).click();

  const panel = page.getByRole('region', { name: 'Descubrimiento de métricas OCI' });
  await panel.getByPlaceholder('ocid1.compartment...').fill('ocid1.compartment.test');
  await panel.getByRole('button', { name: /previsualizar/i }).click();
  await expect(panel.getByText(/no se encontraron series en este scope/i)).toBeVisible();
  await expect(panel.getByRole('button', { name: /guardar/i })).toBeDisabled();
  expect(savedDefinitions).toBe(false);
  expect(ingestionStarted).toBe(false);
});

async function installApiMocks(page: Page, onRequest: (request: import('@playwright/test').Request) => Record<string, unknown> | null) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const custom = onRequest(request);
    if (custom !== null) return json(route, custom);
    if (path.endsWith('/auth/login')) return json(route, session());
    if (path.endsWith('/notifications')) return json(route, { success: true, notifications: [], meta: { count: 0, unreadCount: 0, previewCount: 0 } });
    if (path === '/api/v1/cloud-connections' && request.method() === 'GET') return json(route, { success: true, connections: [connection()] });
    if (path.endsWith('/cloud-connections/providers')) return json(route, { success: true, providers: [{ code: 'oci', displayName: 'Oracle Cloud', enabled: true }] });
    if (path.endsWith('/cloud-connections/oci-test/onboarding')) return json(route, { success: true, onboarding: { connection: connection(), credentials: [], readiness: null, issues: [] } });
    if (path.endsWith('/ingestion/history')) return json(route, { success: true, jobs: [] });
    if (path.endsWith('/ingestion/data-quality')) return json(route, { success: true, checks: [] });
    if (path.endsWith('/ingestion/readiness')) return json(route, { success: true, readiness: { ok: true, generatedAt: '2026-09-23T00:00:00.000Z', connections: [], issues: [], operational: null } });
    if (path.endsWith('/ingestion/resource-linkage')) return json(route, { success: true, readiness: null });
    if (path.endsWith('/ingestion/coverage')) return json(route, { success: true, coverage: null });
    return json(route, { success: true, recommendations: [], metrics: [], summary: { total: 0, currency: 'COP' }, forecasts: [], insights: [] });
  });
}

async function json(route: Route, body: Record<string, unknown>) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

function connection() {
  return { id: 'oci-test', tenantId: 'tenant-1', providerCode: 'oci', rootExternalId: 'ocid1.tenancy.test', name: 'OCI Prueba', status: 'ACTIVE', defaultRegion: 'us-ashburn-1', createdAt: '2026-09-23T00:00:00.000Z', updatedAt: '2026-09-23T00:00:00.000Z' };
}

function session() {
  return {
    accessToken: 'e2e-access-token', expiresAt: '2026-09-24T00:00:00.000Z',
    user: { id: 'user-1', tenantId: 'tenant-1', homeTenantId: 'tenant-1', email: 'tech@example.com', name: 'Técnico E2E', role: 'ADMIN' },
    activeTenant: { id: 'tenant-1', name: 'Tenant de prueba', slug: 'tenant-prueba', accessRole: 'HOME', isCurrent: true },
    availableTenants: [{ id: 'tenant-1', name: 'Tenant de prueba', slug: 'tenant-prueba', accessRole: 'HOME', isCurrent: true }],
  };
}
