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

  await page.getByRole('button', { name: /agente ia/i }).click();
  await expect(page.getByText(/readiness previo/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /analizar datos disponibles/i })).toHaveCount(0);
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

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}
