import { expect, test, type Route } from '@playwright/test';

test('previews AWS CloudWatch metrics and persists only selected resource-linked series', async ({ page }) => {
  let discoveryScope: unknown;
  let savedPayload: unknown;
  const ingestionMutations: string[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.endsWith('/auth/login')) return json(route, session());
    if (path.endsWith('/notifications')) return json(route, { success: true, notifications: [], meta: { count: 0, unreadCount: 0, previewCount: 0 } });
    if (path === '/api/v1/cloud-connections' && request.method() === 'GET') return json(route, { success: true, connections: [connection] });
    if (path.endsWith('/cloud-connections/providers')) return json(route, { success: true, providers: [{ code: 'aws', displayName: 'Amazon Web Services', enabled: true }] });
    if (path.endsWith('/aws-test/onboarding')) return json(route, { success: true, onboarding: { connection, credentials: [], readiness: null, issues: [] } });
    if (path.endsWith('/metric-definitions/discover')) {
      discoveryScope = (request.postDataJSON() as { scope: unknown }).scope;
      return json(route, { success: true, discovery: {
        definitions: [
          { compartmentId: '123456789012', namespace: 'AWS/EC2', metricName: 'CPUUtilization', resourceId: 'i-0123456789abcdef0', regionId: 'us-east-1', dimensions: { InstanceId: 'i-0123456789abcdef0' }, statistics: ['MEAN', 'MAX'], unit: 'Percent' },
          { compartmentId: '123456789012', namespace: 'AWS/EC2', metricName: 'NetworkIn', resourceId: '', regionId: 'us-east-1', dimensions: { AutoScalingGroupName: 'app' }, statistics: ['MEAN'], unit: 'Bytes' },
        ],
        regions: ['us-east-1'], compartments: ['123456789012'], apiCallCount: 1, truncated: false, warnings: [],
      } });
    }
    if (path.endsWith('/metric-definitions') && request.method() === 'PUT') {
      savedPayload = request.postDataJSON();
      return json(route, { success: true, metricDefinitions: { configuredCount: 1, updatedKey: 'awsMetricDefinitions', replaced: false } });
    }
    if (path.includes('/ingestion-jobs') && request.method() !== 'GET') ingestionMutations.push(path);
    if (path.endsWith('/ingestion/history')) return json(route, { success: true, jobs: [] });
    if (path.endsWith('/ingestion/data-quality')) return json(route, { success: true, checks: [] });
    if (path.endsWith('/ingestion/readiness')) return json(route, { success: true, readiness: { ok: true, generatedAt: '2026-10-02T00:00:00.000Z', connections: [], issues: [], operational: null } });
    if (path.endsWith('/ingestion/resource-linkage')) return json(route, { success: true, readiness: null });
    if (path.endsWith('/ingestion/coverage')) return json(route, { success: true, coverage: null });
    return json(route, { success: true, recommendations: [], metrics: [], summary: { total: 0, currency: 'USD' }, forecasts: [], insights: [] });
  });

  await page.goto('/');
  await page.locator('input[type="email"]').fill('finops-e2e@example.test');
  await page.locator('input[type="password"]').fill('local-test-password');
  await page.getByRole('button', { name: /ingresar al panel/i }).click();
  await page.getByRole('button', { name: /ingesta y datos/i }).click();
  await expect(page.getByRole('heading', { name: 'Ingesta y calidad de datos' })).toBeVisible();
  await page.getByText(/configuración técnica avanzada/i).click();

  const panel = page.getByRole('region', { name: 'Descubrimiento de métricas AWS' });
  await expect(panel).toBeVisible();
  await panel.getByPlaceholder('AWS/EC2').fill('AWS/EC2');
  await panel.getByRole('button', { name: /previsualizar/i }).click();
  await expect(panel.getByText('CPUUtilization', { exact: true })).toBeVisible();
  await expect(panel.getByText(/sin identificador exacto de recurso/i)).toBeVisible();
  expect(await panel.getByRole('checkbox').nth(1).isDisabled()).toBe(true);
  await panel.getByRole('checkbox').nth(0).check();
  await panel.getByRole('button', { name: /guardar 1 seleccionada/i }).click();

  expect(discoveryScope).toEqual({ regionId: 'us-east-1', compartmentId: '123456789012', namespace: 'AWS/EC2' });
  expect(savedPayload).toMatchObject({ replace: false, definitions: [{
    externalResourceId: 'i-0123456789abcdef0', namespace: 'AWS/EC2', metricName: 'CPUUtilization',
    region: 'us-east-1', dimensions: { InstanceId: 'i-0123456789abcdef0' }, statistics: ['MEAN', 'MAX'],
  }] });
  expect(ingestionMutations).toEqual([]);
  await expect(panel.getByText(/ingesta se inicia desde sincronización/i)).toBeVisible();
});

const connection = {
  id: 'aws-test', tenantId: 'tenant-1', providerCode: 'aws', rootExternalId: '123456789012',
  name: 'AWS de prueba', status: 'ACTIVE', defaultRegion: 'us-east-1',
  createdAt: '2026-10-02T00:00:00.000Z', updatedAt: '2026-10-02T00:00:00.000Z',
};

function session() {
  return {
    accessToken: 'e2e-access-token', expiresAt: '2026-10-03T00:00:00.000Z',
    user: { id: 'user-1', tenantId: 'tenant-1', homeTenantId: 'tenant-1', email: 'finops-e2e@example.test', name: 'Técnico E2E', role: 'ADMIN' },
    activeTenant: { id: 'tenant-1', name: 'Tenant de prueba', slug: 'tenant-prueba', accessRole: 'HOME', isCurrent: true },
    availableTenants: [{ id: 'tenant-1', name: 'Tenant de prueba', slug: 'tenant-prueba', accessRole: 'HOME', isCurrent: true }],
  };
}

async function json(route: Route, body: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}
