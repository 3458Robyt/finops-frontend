import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const fixtureFile = resolve(process.env['E2E_FIXTURE_FILE'] ?? '../finops-backend/.test-artifacts/e2e-fixtures.json');
test.skip(!existsSync(fixtureFile), 'Requiere la suite E2E completa con fixtures aislados. Usa npm run test:e2e:full.');

interface FixtureManifest {
  readonly password: string;
  readonly admin: {
    readonly email: string;
  };
  readonly tenants: readonly {
    readonly name: string;
  }[];
  readonly recommendationIds: readonly string[];
}

test.describe('FinOps app E2E', () => {
  test('login, tenant switch, recommendations and technical resource detail', async ({ page }) => {
    const manifest = await readManifest();

    await page.goto('/');
    const loginInputs = page.locator('form input');
    await loginInputs.nth(0).fill(manifest.admin.email);
    await loginInputs.nth(1).fill(manifest.password);
    await page.getByRole('button', { name: /ingresar al panel/i }).click();

    await expect(page.getByRole('heading', { name: /decisiones cloud con evidencia/i })).toBeVisible();
    await expect(page.getByText(/tenant activo/i)).toBeVisible();

    await page.getByRole('button', { name: /presupuestos/i }).click();
    await expect(page.getByRole('heading', { name: 'Presupuestos', exact: true })).toBeVisible();
    await page.getByLabel(/per[ií]odo de presupuesto/i).fill('2026-05');
    await expect(page.getByText(/gasto real/i).first()).toBeVisible();
    await page.getByRole('button', { name: /consola técnica/i }).click();

    const tenantSelector = page.locator('select').first();
    await expect(tenantSelector).toContainText(manifest.tenants[0]?.name ?? '');
    await expect(tenantSelector).toContainText(manifest.tenants[1]?.name ?? '');
    if (manifest.tenants[1] !== undefined) {
      const switchToSecondTenant = page.waitForResponse((response) => (
        response.url().includes('/api/v1/auth/switch-tenant')
        && response.request().method() === 'POST'
        && response.ok()
      ));
      const selectedTenant = await tenantSelector.selectOption({ label: manifest.tenants[1].name });
      expect(selectedTenant).toHaveLength(1);
      // Tenant switching rotates the session asynchronously and disables the
      // selector while the request is in flight. Wait for the response and the
      // controlled value before switching back, otherwise the next assertions
      // can run against the previous tenant's token and remount the analysis
      // panel.
      await switchToSecondTenant;
      await expect(tenantSelector).toHaveValue(selectedTenant[0]!);
      const switchBackToFirstTenant = page.waitForResponse((response) => (
        response.url().includes('/api/v1/auth/switch-tenant')
        && response.request().method() === 'POST'
        && response.ok()
      ));
      const restoredTenant = await tenantSelector.selectOption({ label: manifest.tenants[0]?.name ?? '' });
      expect(restoredTenant).toHaveLength(1);
      await switchBackToFirstTenant;
      await expect(tenantSelector).toHaveValue(restoredTenant[0]!);
    }

    const recommendationId = manifest.recommendationIds[0]!;
    let analysisQueued = false;
    let analysisPolls = 0;
    await page.route('**/api/v1/ai/analysis-runs**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const baseRun = {
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
      const completedRun = {
        ...baseRun,
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
          recommendationId,
        }],
        recommendations: [{
          recommendationId,
          candidateId: 'candidate-1',
          disposition: 'CREATED',
          title: 'Oportunidad auditada de prueba',
        }],
      };
      if (url.pathname.endsWith('/readiness')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            preview: {
              scope: 'TENANT',
              periodStart: '2026-05-01T00:00:00.000Z',
              periodEnd: '2026-06-01T00:00:00.000Z',
              evidenceHash: 'e2e-hash',
              resourcesEvaluated: 1,
              candidatesFound: 1,
              candidatesSkipped: 1,
              readinessReport: { summary: 'Hay evidencia auditable.', candidates: [], blocked: [] },
            },
          }),
        });
        return;
      }
      if (request.method() === 'POST' && url.pathname.endsWith('/analysis-runs')) {
        analysisQueued = true;
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, reused: false, run: baseRun }),
        });
        return;
      }
      if (url.pathname.endsWith('/analysis-runs')) {
        if (analysisQueued) analysisPolls += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            runs: analysisQueued ? [analysisPolls >= 1 ? completedRun : baseRun] : [],
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, run: analysisPolls >= 1 ? completedRun : baseRun }),
      });
    });

    await page.getByRole('button', { name: /agente ia/i }).click();
    await expect(page.getByRole('button', { name: /analizar datos disponibles/i })).toBeVisible();
    await expect(page.getByText(/hay evidencia auditable/i)).toBeVisible();
    await page.getByRole('button', { name: /analizar datos disponibles/i }).click();
    await expect(page.getByText(/corrida quedó en cola/i)).toBeVisible();
    await expect(page.getByText('Pendiente', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Completada', { exact: true }).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/oportunidad auditada de prueba/i)).toBeVisible();
    await page.getByRole('button', { name: /oportunidad auditada de prueba/i }).click();
    await expect(page.getByTestId('canonical-evidence-panel')).toBeVisible();

    await page.route('**/api/v1/cloud-connections/*/onboarding', async (route) => {
      const response = await route.fetch();
      const payload = await response.json() as {
        success: boolean;
        onboarding: {
          connection: Record<string, unknown>;
          credentials: readonly Record<string, unknown>[];
          readiness: Record<string, unknown> | null;
        };
      };
      if (payload.onboarding.readiness === null) {
        await route.fulfill({ response });
        return;
      }
      await route.fulfill({
        response,
        body: JSON.stringify({
          ...payload,
          onboarding: {
            ...payload.onboarding,
            connection: { ...payload.onboarding.connection, lastValidatedAt: '2026-09-19T15:18:50.000Z' },
            credentials: [{
              id: 'e2e-active-credential',
              purpose: 'OPERATIONAL',
              status: 'ACTIVE',
              label: 'Credencial operativa de prueba',
              createdAt: '2026-09-19T15:18:50.000Z',
            }],
            readiness: { ...payload.onboarding.readiness, onboardingStatus: 'REQUIRES_VALIDATION' },
          },
        }),
      });
    });

    await page.getByRole('button', { name: /ingesta y datos/i }).click();
    await expect(page.getByRole('heading', { name: 'Ingesta y calidad de datos', exact: true })).toBeVisible();
    await expect(page.getByText(/Esquema FOCUS: no conforme · 2 archivos · faltan ChargeClass, ContractedCost/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /agregar y activar una cuenta cloud/i })).toBeVisible();
    const cloudConnectionSelector = page.getByLabel('Cuenta configurada');
    await cloudConnectionSelector.selectOption({ index: 1 });
    await expect(page.getByRole('alert').filter({ hasText: /validación de acceso ya no está vigente/i })).toBeVisible();
    await page.getByText(/configuración técnica avanzada/i).click();
    await expect(page.getByRole('button', { name: 'Activar cuenta' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Validar acceso' })).toBeEnabled();
    await expect(page.getByText(/acceso seguro de solo lectura/i)).toBeVisible();
    await expect(page.getByText(/validar capacidades/i)).toBeVisible();
    await expect(page.getByText(/sincronización inicial/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /abrir inventario/i })).toBeVisible();

    await page.getByRole('button', { name: /métricas técnicas/i }).click();
    await expect(page.getByRole('heading', { name: /métricas técnicas/i })).toBeVisible();
    await expect(page.getByText(/cpu|memoria|red|disco/i).first()).toBeVisible();

    await page.getByRole('button', { name: /inventario cloud/i }).click();
    await expect(page.getByRole('heading', { name: /inventario cloud/i })).toBeVisible();
    const resourceDetail = page.getByRole('button', { name: /ver detalle/i }).first();
    if (await resourceDetail.count() > 0) {
      await resourceDetail.click();
      await expect(page.getByRole('heading', { name: 'Evidencia técnica' })).toBeVisible();
      await expect(page.getByText(/oportunidades relacionadas/i)).toBeVisible();
      await expect(page.getByText(/detectado desde/i)).toBeVisible();
    }

    await page.getByRole('button', { name: /consola técnica/i }).click();
    await expect(page.getByText(/recomendaciones|oportunidades/i).first()).toBeVisible();

    await page.getByRole('button', { name: /ver detalle/i }).first().click();
    await expect(page.getByTestId('canonical-evidence-panel')).toBeVisible();
    await expect(page.getByText(/evidencia técnica verificable/i)).toBeVisible();
    await expect(page.getByText(/aprendizaje: 1 memorias y 1 casos relevantes/i)).toBeVisible();
    await expect(page.getByText(/plan de ejecucion auditado/i).first()).toBeVisible();
    await expect(page.getByText(/rollback|validaciones|criterios/i).first()).toBeVisible();

    await page.getByRole('button', { name: /^aprobar plan$/i }).click();
    await expect(page.getByRole('heading', { name: /aprobar recomendacion/i })).toBeVisible();
    await page.getByRole('button', { name: /^aprobar$/i }).click();
    await expect(page.getByText(/decisi[oó]n guardada\. aprendizaje en cola/i)).toBeVisible();

    await page.locator('input').last().fill('31.75');
    await page.locator('textarea').last().fill('Ejecución manual validada en el entorno de prueba.');
    await page.getByRole('button', { name: /guardar ejecuci[oó]n manual/i }).click();
    await expect(page.getByText(/ejecuci[oó]n registrada\. el ahorro se calculara/i)).toBeVisible();
    await expect(page.getByText(/recomendaci[oó]n aprobada/i)).toBeVisible();
    await expect(page.getByText('Ejecucion manual registrada', { exact: true })).toBeVisible();

    await page.route('**/api/v1/master-admin/ingestion-jobs**', async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          jobs: [{
            id: 'lease-recovery-ui-fixture', tenantId: 'tenant-fixture', tenantName: 'TAK QA', tenantSlug: 'tak-qa',
            cloudConnectionId: 'connection-fixture', connectionName: 'OCI QA', providerCode: 'oci',
            sourceType: 'TECHNICAL_METRIC', status: 'FAILED', attempts: 3, maxAttempts: 3,
            targetStart: '2026-09-20T00:00:00.000Z', targetEnd: '2026-09-20T01:00:00.000Z',
            errorMessage: 'El bloqueo del trabajo venció tras agotar los intentos; la causa inicial no quedó registrada.',
            progress: { phase: 'FAILED', message: 'Revisa la evidencia de recuperación del lease.' },
            resultSummary: {
              coverage: { focusSchemaValidation: { status: 'NONCONFORMANT', filesChecked: 2, missingMandatoryColumns: ['ChargeClass', 'ContractedCost'] } },
              leaseRecoveryHistory: [{
              action: 'FAILED', reason: 'retry_attempts_exhausted', attempt: 3, maxAttempts: 3,
              leaseDurationMs: 300000, recoveredAt: '2026-09-26T10:17:00.000Z',
              attemptStartedAt: '2026-09-26T09:45:00.000Z', lastHeartbeatAt: '2026-09-26T10:10:00.000Z',
              leaseExpiredAt: '2026-09-26T10:15:00.000Z',
              lastProgress: { phase: 'FETCHING', message: 'Consultando proveedor: 4 llamadas, 18 muestras.' },
              }],
            },
            priority: 100, availableAt: '2026-09-26T09:00:00.000Z', createdAt: '2026-09-26T09:00:00.000Z',
            updatedAt: '2026-09-26T10:17:00.000Z',
          }],
          summary: { total: 1, pending: 0, running: 0, success: 0, failed: 1, cancelled: 0, skipped: 0 },
          hasMore: false,
        }),
      });
    });
    await page.locator('aside').getByRole('button', { name: 'Administración MSP', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Consola central de jobs' })).toBeVisible();
    await expect(page.getByText(/Esquema FOCUS: no conforme · 2 archivos · faltan ChargeClass, ContractedCost/i)).toBeVisible();
    await expect(page.getByText(/Lease vencido tras agotar reintentos · intento 3\/3/i)).toBeVisible();
    await expect(page.getByText(/la causa inicial no quedó registrada/i)).toBeVisible();
    await expect(page.getByText(/último avance: Consultando proveedor: 4 llamadas, 18 muestras/i)).toBeVisible();

  });
});

async function readManifest(): Promise<FixtureManifest> {
  return JSON.parse(await readFile(fixtureFile, 'utf8')) as FixtureManifest;
}
