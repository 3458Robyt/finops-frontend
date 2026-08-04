import { expect, test, type Route } from '@playwright/test';

test('crea, previsualiza, cierra y consulta una asignación SPLIT', async ({ page }) => {
  let saved = false;
  let closed = false;
  let previewed = false;
  const period = currentMonth();

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith('/auth/login')) return json(route, { success: true, ...session() });
    if (path.endsWith('/notifications')) return json(route, { success: true, notifications: [], meta: { count: 0, unreadCount: 0, previewCount: 0 } });
    if (path.endsWith('/recommendations')) return json(route, { success: true, recommendations: [] });
    if (path.endsWith('/analytics/opportunities')) return json(route, { success: true, opportunities: [] });
    if (path.endsWith('/analytics/efficiency-insights')) return json(route, { success: true, insights: [] });
    if (path.endsWith('/analytics/recompute')) return json(route, { success: true, anomalies: [], usageInsights: [] });
    if (path.endsWith('/costs/options')) return json(route, { success: true, options: { periods: [{ period, metricCount: 2 }], latestPeriod: period, cloudAccounts: [{ id: 'account-1', name: 'OCI de prueba', provider: 'OCI' }], services: ['Compute'], regions: ['us-ashburn-1'], currencies: ['USD'] } });
    if (path.endsWith('/value-realization/destinations')) return json(route, { success: true, destinations: [] });
    if (path.endsWith('/cost-allocation/rules')) {
      if (request.method() === 'POST') {
        saved = true;
        return json(route, { success: true, rule: rule() }, 201);
      }
      return json(route, { success: true, rules: saved ? [rule()] : [] });
    }
    if (path.endsWith('/cost-allocation/summary')) return json(route, { success: true, summary: [summary()] });
    if (path.endsWith('/cost-allocation/comparison')) return json(route, { success: true, comparison: { summary: [summary()], previousSummary: [previousSummary()] } });
    if (path.endsWith('/cost-allocation/unallocated')) return json(route, { success: true, items: [] });
    if (path.endsWith('/cost-allocation/periods/close')) {
      closed = true;
      return json(route, { success: true, closures: [closure()] }, 201);
    }
    if (path.endsWith('/cost-allocation/periods') && request.method() === 'GET') return json(route, { success: true, closures: closed ? [closure()] : [] });
    if (path.includes('/cost-allocation/periods/') && path.endsWith('/compare')) return json(route, { success: true, current: closure(), previous: previousClosure() });
    if (path.includes('/cost-allocation/periods/')) return json(route, { success: true, closure: closure() });
    if (path.endsWith('/cost-allocation/preview')) {
      previewed = true;
      return json(route, { success: true, preview: preview() });
    }
    if (path.endsWith('/cost-allocation/export.csv')) {
      await route.fulfill({ status: 200, contentType: 'text/csv', headers: { 'content-disposition': `attachment; filename="showback-${period}.csv"` }, body: 'currency,allocation,cost,metrics,resources\nUSD,Equipo A,50,1,1' });
      return;
    }
    return json(route, { success: true });
  });

  await page.goto('/');
  await page.locator('input[type="email"]').fill('finops@example.com');
  await page.locator('input[type="password"]').fill('password');
  await page.getByRole('button', { name: /ingresar al panel/i }).click();
  await page.getByRole('button', { name: /Asignación de costos/i }).click();
  await expect(page.getByRole('main').getByRole('heading', { name: 'Asignación de costos' })).toBeVisible();

  await page.getByRole('button', { name: 'Nueva regla', exact: true }).click();
  await page.locator('input[name="name"]').fill('Regla compartida');
  await page.locator('select[name="provider"]').selectOption('OCI');
  await page.locator('select[name="allocationMode"]').selectOption('SPLIT');
  await page.locator('input[name="target0CostCenter"]').fill('Equipo A');
  await page.locator('input[name="target1CostCenter"]').fill('Equipo B');
  await page.locator('input[name="target0Percentage"]').fill('60');
  await page.locator('input[name="target1Percentage"]').fill('50');
  await page.getByRole('button', { name: 'Previsualizar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(/sumar exactamente 100/);

  await page.locator('input[name="target0Percentage"]').fill('50');
  await page.getByRole('button', { name: 'Previsualizar', exact: true }).click();
  await expect(page.getByText('Previsualización sin guardar')).toBeVisible();
  await expect(page.getByText('100.0000 % de 100 %')).toBeVisible();
  expect(previewed).toBe(true);

  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByText('Regla compartida')).toBeVisible();
  expect(saved).toBe(true);

  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Cerrar período', exact: true }).click();
  await expect(page.getByText('Cierres reproducibles')).toBeVisible();
  expect(closed).toBe(true);

  await page.getByRole('button', { name: 'Ver detalle', exact: true }).click();
  await expect(page.getByTestId('allocation-closure-detail')).toBeVisible();
  await page.getByRole('button', { name: 'Comparar versión', exact: true }).click();
  await expect(page.getByTestId('allocation-closure-comparison')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  await expect((await downloadPromise).suggestedFilename()).toBe(`showback-${period}.csv`);
});

function currentMonth(): string {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function session() {
  return {
    accessToken: 'token-allocation-e2e',
    expiresAt: '2026-12-31T00:00:00.000Z',
    user: { id: 'user-1', tenantId: 'tenant-1', homeTenantId: 'tenant-1', email: 'finops@example.com', name: 'Técnico E2E', role: 'ADMIN' },
    activeTenant: { id: 'tenant-1', name: 'Tenant E2E', slug: 'tenant-e2e', accessRole: 'HOME', isCurrent: true },
    availableTenants: [{ id: 'tenant-1', name: 'Tenant E2E', slug: 'tenant-e2e', accessRole: 'HOME', isCurrent: true }],
  };
}

function rule() {
  return {
    id: 'rule-1', name: 'Regla compartida', priority: 100, status: 'DRAFT', allocationMode: 'SPLIT',
    allocationTargets: [{ percentage: 50, costCenter: 'Equipo A' }, { percentage: 50, costCenter: 'Equipo B' }],
    configurationVersion: 1, configurationHash: 'rule-hash',
  };
}

function summary() {
  return { period: currentMonth(), currency: 'USD', totalCost: 100, allocatedCost: 100, unallocatedCost: 0, sharedCost: 100, coveragePercent: 100, dimensions: [{ allocationKey: 'Equipo A', cost: 50, metricCount: 1, resourceCount: 1, shared: true }, { allocationKey: 'Equipo B', cost: 50, metricCount: 1, resourceCount: 1, shared: true }] };
}

function previousSummary() {
  return { ...summary(), totalCost: 90, allocatedCost: 90, sharedCost: 90, dimensions: [{ allocationKey: 'Equipo A', cost: 45, metricCount: 1, resourceCount: 1, shared: true }, { allocationKey: 'Equipo B', cost: 45, metricCount: 1, resourceCount: 1, shared: true }] };
}

function preview() {
  return { summary: [summary()], previousSummary: [previousSummary()], rulesUsed: [{ id: 'rule-1', name: 'Regla compartida', allocationMode: 'SPLIT', configurationVersion: 1 }], metricCount: 2, resourceCount: 1, examples: [{ currency: 'USD', cost: 100, cloudAccountId: 'account-1', serviceName: 'Compute' }], financialImpact: { budgets: [], savings: [] } };
}

function closure() {
  return { id: 'closure-1', tenantId: 'tenant-1', period: currentMonth(), currency: 'USD', version: 1, status: 'CLOSED', sourceTotal: 100, allocatedTotal: 100, sharedTotal: 100, unallocatedTotal: 0, sourceHash: 'source-hash', rulesHash: 'rules-hash', results: summary().dimensions, closedByUserId: 'user-1', createdAt: '2026-08-04T12:00:00.000Z' };
}

function previousClosure() {
  return { ...closure(), id: 'closure-0', version: 0, sourceTotal: 90, allocatedTotal: 90, sharedTotal: 90 };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}
