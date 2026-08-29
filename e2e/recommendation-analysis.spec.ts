import { expect, test, type Page, type Route } from '@playwright/test';

test('opera una corrida, muestra descartes, abre la recomendación y aísla el tenant', async ({ page }) => {
  await mockApi(page, 'ADMIN');
  await login(page);

  await page.getByRole('button', { name: /agente ia/i }).click();
  await expect(page.getByText(/hay evidencia auditable/i)).toBeVisible();
  await page.getByRole('button', { name: /analizar datos disponibles/i }).click();
  await expect(page.getByText(/corrida quedó en cola/i)).toBeVisible();
  await expect(page.getByText('Pendiente', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Completada', { exact: true }).first()).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(/evidencia técnica suficiente/i)).toBeVisible();
  await page.getByRole('button', { name: /oportunidad auditada de prueba/i }).click();
  await expect(page.getByRole('heading', { name: /oportunidad auditada de prueba/i })).toBeVisible();

  await page.getByRole('button', { name: /agente ia/i }).click();
  await page.locator('select').first().selectOption('tenant-2');
  await expect(page.getByText(/todavía no se han ejecutado análisis/i)).toBeVisible();
  await expect(page.getByText(/oportunidad auditada de prueba/i)).toHaveCount(0);
});

test('un rol de cliente puede consultar pero no disparar análisis', async ({ page }) => {
  await mockApi(page, 'CLIENT_VIEWER');
  await login(page);

  await page.getByRole('button', { name: /asistente ia/i }).click();
  await expect(page.getByText(/estoy conectado al motor ia/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /analizar datos disponibles/i })).toHaveCount(0);
});

test('el chat responde en español y la generación directa conserva la auditoría', async ({ page }) => {
  await mockApi(page, 'ADMIN');
  await login(page);
  await page.getByRole('button', { name: 'Asistente IA', exact: true }).click();

  await page.getByPlaceholder(/escribe tu consulta/i).fill('¿Cuál es la mayor oportunidad del periodo?');
  await page.getByRole('button', { name: 'send' }).click();
  await expect(page.getByText(/la mayor oportunidad es reducir/i)).toBeVisible();

  await page.getByRole('button', { name: /previsualizar recomendaciones ia/i }).click();
  await expect(page.getByText(/previsualizacion de recomendaciones ia/i)).toBeVisible();
  await expect(page.getByText(/oportunidad validada por auditor/i)).toBeVisible();
});

for (const viewport of [
  { width: 390, height: 844, label: 'móvil' },
  { width: 1024, height: 768, label: 'portátil con rail' },
  { width: 1280, height: 720, label: 'escritorio con barra completa' },
]) {
  test(`mantiene la navegación accesible y sin desbordamiento en ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockApi(page, 'ADMIN');
    await login(page);

    if (viewport.width < 640) {
      await expect(page.getByRole('button', { name: 'Más', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Más', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Todos los módulos' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Ingesta y Datos/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Inventario Cloud/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Perfil y Seguridad/i })).toBeVisible();
    } else {
      await expect(page.locator('aside')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Métricas Técnicas', exact: true })).toBeVisible();
      const sidebarWidth = await page.locator('aside').evaluate((element) => Math.round(element.getBoundingClientRect().width));
      expect(sidebarWidth).toBe(viewport.width >= 1280 ? 280 : 80);
    }

    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2);
  });
}

test('mantiene fijo el compositor y limita el scroll al historial del chat', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, 'ADMIN');
  await login(page);
  await page.getByRole('button', { name: 'Asistente IA', exact: true }).click();

  const module = page.getByTestId('chat-module');
  const history = page.getByTestId('chat-history');
  const composer = page.getByTestId('chat-composer');
  await expect(module).toBeVisible();
  await expect(history).toHaveCSS('overflow-y', 'auto');
  await expect(page.locator('main')).toHaveCSS('overflow-y', 'hidden');

  const moduleBox = await module.boundingBox();
  const composerBox = await composer.boundingBox();
  expect(moduleBox).not.toBeNull();
  expect(composerBox).not.toBeNull();
  expect(Math.abs((moduleBox!.y + moduleBox!.height) - (composerBox!.y + composerBox!.height))).toBeLessThanOrEqual(2);
  expect(composerBox!.y + composerBox!.height).toBeLessThanOrEqual(844);
});

test('mantiene la leyenda de métricas dentro del flujo y permite identificar recursos por nombre', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await mockApi(page, 'ADMIN');
  await login(page);
  await page.getByRole('button', { name: 'Métricas Técnicas', exact: true }).click();

  await expect(page.getByTestId('technical-metric-plot')).toBeVisible();
  await expect(page.getByTestId('technical-metric-legend')).toBeVisible();
  await expect(page.getByTestId('technical-metric-legend').getByText('web-prod-01', { exact: false })).toBeVisible();
  await expect(page.locator('.u-legend')).toHaveCount(0);

  const plotBox = await page.getByTestId('technical-metric-plot').boundingBox();
  const legendBox = await page.getByTestId('technical-metric-legend').boundingBox();
  const opportunitiesBox = await page.getByTestId('technical-metric-opportunities').boundingBox();
  expect(plotBox).not.toBeNull();
  expect(legendBox).not.toBeNull();
  expect(opportunitiesBox).not.toBeNull();
  expect(legendBox!.y).toBeGreaterThanOrEqual(plotBox!.y + plotBox!.height - 1);
  expect(legendBox!.y + legendBox!.height).toBeLessThanOrEqual(opportunitiesBox!.y + 1);

  await page.getByRole('button', { name: /ver todas/i }).click();
  await page.getByLabel('Buscar serie').fill('web-prod-08');
  await expect(page.getByTestId('technical-metric-legend').getByText('web-prod-08', { exact: false })).toBeVisible();
});

async function login(page: Page) {
  await page.goto('/');
  await page.locator('input[type="email"]').fill('user@example.com');
  await page.locator('input[type="password"]').fill('password');
  await page.getByRole('button', { name: /ingresar al panel/i }).click();
}

async function mockApi(page: Page, role: 'ADMIN' | 'CLIENT_VIEWER') {
  let queued = false;
  let polls = 0;
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const authorization = request.headers()['authorization'] ?? '';
    const tenantTwo = authorization.includes('token-tenant-2');

    if (path.endsWith('/auth/login')) {
      return json(route, session(role, 'tenant-1', 'token-tenant-1'));
    }
    if (path.endsWith('/auth/switch-tenant')) {
      return json(route, session(role, 'tenant-2', 'token-tenant-2'));
    }
    if (path.endsWith('/notifications')) {
      return json(route, {
        success: true,
        notifications: [],
        meta: { count: 0, unreadCount: 0, previewCount: 0 },
      });
    }
    if (path.endsWith('/ai/chat')) {
      return json(route, {
        success: true,
        answer: 'La mayor oportunidad es reducir el costo de la instancia con baja utilización. La evidencia técnica está disponible para revisión.',
        context: {
          periodStart: '2026-07-01T00:00:00.000Z',
          periodEnd: '2026-07-23T12:00:00.000Z',
          totalCost: 100,
          currency: 'USD',
          metricCount: 2,
        },
      });
    }
    if (path.endsWith('/ai/recommendations/generate')) {
      const body = request.postDataJSON() as { readonly persist?: boolean };
      return json(route, {
        success: true,
        persisted: body.persist === true,
        recommendations: [{
          id: 'direct-rec-1',
          cloudAccountId: 'account-1',
          type: 'RIGHTSIZING',
          status: 'PENDING',
          severity: 'MEDIUM',
          title: 'Oportunidad validada por auditor',
          description: 'Reducir una instancia con baja utilización.',
          estimatedMonthlySavings: 25,
          currency: 'USD',
          createdAt: '2026-07-23T12:00:00.000Z',
          updatedAt: '2026-07-23T12:00:00.000Z',
        }],
        context: {
          periodStart: '2026-07-01T00:00:00.000Z',
          periodEnd: '2026-07-23T12:00:00.000Z',
          totalCost: 100,
          currency: 'USD',
          metricCount: 2,
        },
      });
    }
    if (path.endsWith('/technical-metrics/coverage')) return json(route, technicalCoverage());
    if (path.endsWith('/technical-metrics/overview')) return json(route, technicalOverview());
    if (path.endsWith('/technical-metrics/series')) return json(route, technicalSeries(url));
    if (path.endsWith('/technical-metrics/samples')) return json(route, {
      success: true,
      samples: [{
        id: 'sample-1',
        provider: 'OCI',
        externalResourceId: 'resource-external-01',
        cloudResourceId: 'resource-01',
        metricName: 'cpu_utilization',
        metricUnit: 'Percent',
        statistic: 'MEAN',
        value: 12,
        sampledAt: '2026-07-23T12:00:00.000Z',
        granularitySeconds: 1800,
      }],
    });
    if (path.endsWith('/recommendations')) {
      return json(route, { success: true, recommendations: [], meta: { count: 0, tenantId: tenantTwo ? 'tenant-2' : 'tenant-1' } });
    }
    if (path.endsWith('/analytics/opportunities')) {
      return json(route, { success: true, opportunities: [] });
    }
    if (path.endsWith('/analytics/efficiency-insights')) {
      return json(route, { success: true, insights: [] });
    }
    if (path.endsWith('/analytics/recompute')) {
      return json(route, { success: true, anomalies: [], usageInsights: [] });
    }
    if (path.endsWith('/costs')) {
      return json(route, { success: true, metrics: [], summary: { total: 0, currency: 'USD' } });
    }
    if (path.endsWith('/analytics/forecast')) {
      return json(route, { success: true, forecasts: [] });
    }
    if (path.endsWith('/analytics/unit-economics')) {
      return json(route, { success: true, unitEconomics: [] });
    }
    if (path.endsWith('/kpis/savings')) {
      return json(route, {
        success: true,
        savings: {
          estimatedMonthlySavings: 0,
          observedMonthlySavings: 0,
          missedSavingsAmount: 0,
        },
      });
    }
    if (path.endsWith('/kpis/adoption')) {
      return json(route, {
        success: true,
        adoption: {
          totalRecommendations: 0,
          pendingRecommendations: 0,
          approvedRecommendations: 0,
          rejectedRecommendations: 0,
          completedRecommendations: 0,
          acceptanceRate: 0,
          rejectionRate: 0,
          executionRate: 0,
        },
      });
    }
    if (path.endsWith('/budgets')) {
      return json(route, { success: true, budgets: [] });
    }
    if (path.endsWith('/agent/profile')) {
      return json(route, {
        success: true,
        profile: {
          id: 'profile-1',
          version: 1,
          status: 'ACTIVE',
          structuredRules: {
            objective: 'Generar oportunidades auditables.',
            tone: 'Español claro.',
            recommendationPriorities: [],
            evidenceRequirements: [],
            riskPolicy: 'Aprobación humana.',
            forbiddenActions: [],
          },
        },
      });
    }
    if (path.endsWith('/agent/tenant-rules')) return json(route, { success: true, rules: [] });
    if (path.endsWith('/agent/context-traces')) return json(route, { success: true, traces: [] });
    if (path.endsWith('/telegram/links')) return json(route, { success: true, links: [] });
    if (path.endsWith('/outbound-messages/status')) {
      return json(route, {
        success: true,
        status: {
          telegram: { enabled: false, botUsernameConfigured: false, webhookSecretConfigured: false, activeLinks: 0, totalLinks: 0 },
          email: { enabled: false, smtpConfigured: false },
        },
      });
    }
    if (path.endsWith('/outbound-messages/deliveries')) return json(route, { success: true, deliveries: [] });
    if (path.endsWith('/ai/analysis-runs/readiness')) {
      return json(route, {
        success: true,
        preview: {
          scope: 'TENANT',
          periodStart: '2026-05-01T00:00:00.000Z',
          periodEnd: '2026-06-01T00:00:00.000Z',
          evidenceHash: tenantTwo ? 'tenant-2-hash' : 'tenant-1-hash',
          resourcesEvaluated: 1,
          candidatesFound: 1,
          candidatesSkipped: 1,
          readinessReport: {
            summary: 'Hay evidencia auditable.',
            candidates: [],
            blocked: [{ id: 'blocked-1', reasons: ['Cobertura insuficiente.'] }],
          },
        },
      });
    }
    if (path.endsWith('/ai/analysis-runs') && request.method() === 'POST') {
      queued = true;
      return json(route, { success: true, reused: false, run: pendingRun() }, 202);
    }
    if (path.endsWith('/ai/analysis-runs')) {
      if (tenantTwo) return json(route, { success: true, runs: [] });
      if (queued) polls += 1;
      return json(route, { success: true, runs: queued ? [polls >= 1 ? completedRun() : pendingRun()] : [] });
    }
    if (path.includes('/ai/analysis-runs/')) {
      return json(route, { success: true, run: polls >= 1 ? completedRun() : pendingRun() });
    }
    if (path.endsWith('/recommendations/rec-1/execution-plans/latest')) {
      return json(route, { success: true, executionPlan: null });
    }
    if (path.endsWith('/recommendations/rec-1/savings-measurements/readiness')) {
      return json(route, {
        success: true,
        readiness: {
          recommendationId: 'rec-1',
          status: 'NO_EXECUTION',
          windowDays: 7,
          reasons: ['Aún no existe una ejecución manual.'],
        },
      });
    }
    if (path.endsWith('/recommendations/rec-1/savings-measurements')) {
      return json(route, { success: true, measurements: [] });
    }
    if (path.endsWith('/recommendations/rec-1/timeline')) {
      return json(route, { success: true, timeline: [] });
    }
    if (path.endsWith('/recommendations/rec-1')) {
      return json(route, {
        success: true,
        recommendation: {
          id: 'rec-1',
          cloudAccountId: 'account-1',
          type: 'RIGHTSIZING',
          status: 'PENDING',
          severity: 'MEDIUM',
          title: 'Oportunidad auditada de prueba',
          description: 'Recomendación enlazada a la corrida.',
          evidence: { candidateId: 'candidate-1' },
          estimatedMonthlySavings: 10,
          currency: 'USD',
          createdAt: '2026-07-23T12:00:00.000Z',
          updatedAt: '2026-07-23T12:00:00.000Z',
        },
      });
    }

    return json(route, { success: true, recommendations: [], meta: { count: 0, tenantId: tenantTwo ? 'tenant-2' : 'tenant-1' } });
  });
}

function session(role: 'ADMIN' | 'CLIENT_VIEWER', tenantId: string, accessToken: string) {
  const tenants = [
    { id: 'tenant-1', name: 'Tenant Uno', slug: 'tenant-uno', accessRole: 'HOME', isCurrent: tenantId === 'tenant-1' },
    { id: 'tenant-2', name: 'Tenant Dos', slug: 'tenant-dos', accessRole: 'TECHNICIAN', isCurrent: tenantId === 'tenant-2' },
  ];
  return {
    accessToken,
    expiresAt: '2026-07-24T00:00:00.000Z',
    user: {
      id: 'user-1',
      tenantId,
      homeTenantId: 'tenant-1',
      email: 'user@example.com',
      name: 'Usuario E2E',
      role,
    },
    activeTenant: tenants.find((tenant) => tenant.id === tenantId),
    availableTenants: tenants,
  };
}

function pendingRun() {
  return {
    id: 'analysis-e2e-1',
    trigger: 'MANUAL',
    scope: 'TENANT',
    status: 'PENDING',
    stage: 'QUEUED',
    attempts: 0,
    maxAttempts: 2,
    resourcesEvaluated: 1,
    candidatesFound: 1,
    candidatesSkipped: 1,
    recommendationsGenerated: 0,
    recommendationsRejected: 0,
    recommendationsPersisted: 0,
    promptTokenEstimate: 0,
    responseTokenEstimate: 0,
    createdAt: '2026-07-23T12:00:00.000Z',
    updatedAt: '2026-07-23T12:00:00.000Z',
    recommendations: [],
  };
}

function completedRun() {
  return {
    ...pendingRun(),
    status: 'COMPLETED',
    stage: 'FINISHED',
    attempts: 1,
    recommendationsGenerated: 1,
    recommendationsPersisted: 1,
    candidateResults: [{
      candidateId: 'candidate-1',
      resourceId: 'fixture-resource',
      readiness: 'GENERATABLE',
      outcome: 'PUBLISHED',
      reasons: ['Evidencia técnica suficiente.'],
      recommendationId: 'rec-1',
    }],
    recommendations: [{
      recommendationId: 'rec-1',
      candidateId: 'candidate-1',
      disposition: 'CREATED',
      title: 'Oportunidad auditada de prueba',
    }],
  };
}

function technicalResources() {
  return Array.from({ length: 8 }, (_, index) => {
    const suffix = String(index + 1).padStart(2, '0');
    return {
      id: `resource-${suffix}`,
      cloudResourceId: `resource-${suffix}`,
      provider: 'OCI',
      externalResourceId: `resource-external-${suffix}`,
      name: `web-prod-${suffix}`,
      resourceType: 'compute_instance',
      serviceName: 'OCI Compute',
      regionId: 'us-ashburn-1',
      status: 'ACTIVE',
      firstSeenAt: '2026-07-01T00:00:00.000Z',
      lastSeenAt: '2026-07-23T12:00:00.000Z',
    };
  });
}

function technicalOverview() {
  const resources = technicalResources();
  return {
    success: true,
    overview: {
      minSampledAt: '2026-07-23T11:30:00.000Z',
      maxSampledAt: '2026-07-23T12:00:00.000Z',
      latestSampledAt: '2026-07-23T12:00:00.000Z',
      resourceCount: resources.length,
      metricCount: 2,
      sampleCount: resources.length * 2,
      resources: resources.map((resource) => ({
        ...resource,
        metricNames: ['cpu_utilization', 'memory_utilization'],
        sampleCount: 2,
        minSampledAt: '2026-07-23T11:30:00.000Z',
        maxSampledAt: '2026-07-23T12:00:00.000Z',
      })),
      metrics: [
        { metricName: 'cpu_utilization', metricUnit: 'Percent', group: 'CPU', sampleCount: resources.length, minSampledAt: '2026-07-23T11:30:00.000Z', maxSampledAt: '2026-07-23T12:00:00.000Z', availableStatistics: ['MEAN', 'MIN', 'MAX', 'P95'] },
        { metricName: 'memory_utilization', metricUnit: 'Percent', group: 'MEMORY', sampleCount: resources.length, minSampledAt: '2026-07-23T11:30:00.000Z', maxSampledAt: '2026-07-23T12:00:00.000Z', availableStatistics: ['MEAN', 'MIN', 'MAX', 'P95'] },
      ],
      kpis: [{ id: 'cpu', label: 'CPU', group: 'CPU', metricNames: ['cpu_utilization'], unit: '%', average: 15, minimum: 8, maximum: 22, latest: 18, latestSampledAt: '2026-07-23T12:00:00.000Z', sampleCount: resources.length }],
      opportunities: [],
    },
  };
}

function technicalCoverage() {
  return {
    success: true,
    coverage: {
      rangeStart: '2026-07-23T11:30:00.000Z',
      rangeEnd: '2026-07-23T12:00:00.000Z',
      minSampledAt: '2026-07-23T11:30:00.000Z',
      maxSampledAt: '2026-07-23T12:00:00.000Z',
      totalSamples: 16,
      metricCount: 2,
      resourceCount: 8,
      expectedDays: 1,
      daysWithData: 1,
      coveragePercent: 100,
      metrics: [
        { metricName: 'cpu_utilization', sampleCount: 8, daysWithData: 1, expectedDays: 1, coveragePercent: 100, minSampledAt: '2026-07-23T11:30:00.000Z', maxSampledAt: '2026-07-23T12:00:00.000Z' },
        { metricName: 'memory_utilization', sampleCount: 8, daysWithData: 1, expectedDays: 1, coveragePercent: 100, minSampledAt: '2026-07-23T11:30:00.000Z', maxSampledAt: '2026-07-23T12:00:00.000Z' },
      ],
      days: [{ date: '2026-07-23', sampleCount: 16, metricCount: 2, status: 'WITH_DATA' }],
    },
  };
}

function technicalSeries(url: URL) {
  const statistic = url.searchParams.get('statistic') ?? 'MEAN';
  return {
    success: true,
    series: technicalResources().map((resource, index) => ({
      bucketStart: '2026-07-23T12:00:00.000Z',
      externalResourceId: resource.externalResourceId,
      cloudResourceId: resource.cloudResourceId,
      providerNamespace: 'oci_computeagent',
      regionId: resource.regionId,
      dimensionsHash: `dimension-${index + 1}`,
      metricName: 'cpu_utilization',
      metricUnit: 'Percent',
      statistic,
      value: 10 + index,
      aggregationSemantics: 'MEAN_OF_NATIVE',
      sourceGranularitiesSeconds: [1800],
      avg: 10 + index,
      min: 8 + index,
      max: 12 + index,
      latest: 10 + index,
      sampleCount: 2,
      minSampledAt: '2026-07-23T11:30:00.000Z',
      maxSampledAt: '2026-07-23T12:00:00.000Z',
      latestSampledAt: '2026-07-23T12:00:00.000Z',
    })),
    meta: {
      hasMore: false,
      returnedPoints: 8,
      totalSamples: 16,
      queryMs: 4,
      bucket: '30m',
      pageSize: 1000,
      statistic,
    },
  };
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
