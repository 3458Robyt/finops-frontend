import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

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

    await expect(page.getByText(/consola técnica finops/i)).toBeVisible();
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
      const selectedTenant = await tenantSelector.selectOption({ label: manifest.tenants[1].name });
      expect(selectedTenant).toHaveLength(1);
      await tenantSelector.selectOption({ label: manifest.tenants[0]?.name ?? '' });
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

    await page.getByRole('button', { name: /ingesta y datos/i }).click();
    await expect(page.getByRole('heading', { name: 'Ingesta y calidad de datos', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /agregar y activar una cuenta cloud/i })).toBeVisible();
    const cloudConnectionSelector = page.getByLabel('Cuenta configurada');
    await cloudConnectionSelector.selectOption({ index: 1 });
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

  });
});

async function readManifest(): Promise<FixtureManifest> {
  const fixtureFile = resolve(process.env['E2E_FIXTURE_FILE'] ?? '../finops-backend/.test-artifacts/e2e-fixtures.json');
  return JSON.parse(await readFile(fixtureFile, 'utf8')) as FixtureManifest;
}
