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

    const tenantSelector = page.locator('select').first();
    await expect(tenantSelector).toContainText(manifest.tenants[0]?.name ?? '');
    await expect(tenantSelector).toContainText(manifest.tenants[1]?.name ?? '');
    if (manifest.tenants[1] !== undefined) {
      const selectedTenant = await tenantSelector.selectOption({ label: manifest.tenants[1].name });
      expect(selectedTenant).toHaveLength(1);
      await tenantSelector.selectOption({ label: manifest.tenants[0]?.name ?? '' });
    }

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
    await expect(page.getByText(/ejecuci[oó]n manual registrada y kpi actualizado/i)).toBeVisible();
    await expect(page.getByText(/recomendaci[oó]n aprobada/i)).toBeVisible();
    await expect(page.getByText('Ejecucion manual registrada', { exact: true })).toBeVisible();

  });
});

async function readManifest(): Promise<FixtureManifest> {
  const fixtureFile = resolve(process.env['E2E_FIXTURE_FILE'] ?? '../finops-backend/.test-artifacts/e2e-fixtures.json');
  return JSON.parse(await readFile(fixtureFile, 'utf8')) as FixtureManifest;
}
