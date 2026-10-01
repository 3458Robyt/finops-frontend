import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const fixtureFile = resolve(process.env['E2E_FIXTURE_FILE'] ?? '../finops-backend/.test-artifacts/e2e-fixtures.json');
test.skip(!existsSync(fixtureFile), 'Requiere fixtures PostgreSQL aislados; usa npm run test:e2e:full.');

interface RoleFixtureManifest {
  readonly password: string;
  readonly admin: { readonly email: string };
  readonly tenants: readonly { readonly id: string; readonly name: string; readonly slug: string }[];
  readonly technician: { readonly email: string };
  readonly operatorAdmin: { readonly email: string };
  readonly leadTechnician: { readonly email: string };
  readonly clientApprover: { readonly email: string };
  readonly clientViewer: { readonly email: string };
}

const technicalModules = [
  'Consola Técnica',
  'Ingesta y Datos',
  'Métricas Técnicas',
  'Inventario Cloud',
  'Agente IA',
] as const;
const clientModules = [
  'Panel de Control',
  'Presupuestos',
  'Asignación de costos',
  'Valor realizado',
  'Asistente IA',
  'Historial',
  'Mensajería',
] as const;

test('el técnico FinOps obtiene los módulos operativos, pero no Administración MSP @role-matrix', async ({ page }) => {
  const manifest = await readManifest();
  const failures = observeFailures(page);
  await login(page, manifest.technician.email, manifest.password, 'Técnico FinOps');

  for (const module of [...clientModules, ...technicalModules]) await expectNavVisible(page, module);
  await expectNavHidden(page, 'Administración MSP');
  await expect(page.getByLabel('Perfil y Seguridad')).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Métricas Técnicas', exact: true }).click();
  await expect(page.getByRole('heading', { name: /métricas técnicas/i })).toBeVisible();
  await openAgentSettings(page, false);
  expect(failures).toEqual([]);
});

test('el administrador maestro puede cambiar de tenant y abrir la consola MSP @role-matrix', async ({ page }) => {
  const manifest = await readManifest();
  const failures = observeFailures(page);
  await login(page, manifest.admin.email, manifest.password, 'Administrador maestro');

  for (const module of [...clientModules, ...technicalModules, 'Administración MSP']) {
    await expectNavVisible(page, module);
  }
  const tenantSelector = page.getByLabel('Tenant activo');
  const tenantOptions = tenantSelector.locator('option');
  await expect(tenantOptions).toHaveCount(2);
  const originalTenant = await tenantSelector.inputValue();
  const alternateTenant = await tenantOptions.nth(1).getAttribute('value');
  if (alternateTenant === null) throw new Error('El selector no expone el segundo tenant de fixture.');
  await tenantSelector.selectOption(alternateTenant);
  await expect(tenantSelector).toHaveValue(alternateTenant);
  await tenantSelector.selectOption(originalTenant);
  await expect(tenantSelector).toHaveValue(originalTenant);

  await page.locator('aside').getByRole('button', { name: 'Administración MSP', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tenants, usuarios y accesos', exact: true })).toBeVisible();
  for (const tenant of manifest.tenants) await expect(page.locator('main')).toContainText(tenant.name);
  expect(failures).toEqual([]);
});

test('el administrador operador puede configurar el agente sin privilegios MSP @role-matrix', async ({ page }) => {
  const manifest = await readManifest();
  const failures = observeFailures(page);

  await login(page, manifest.operatorAdmin.email, manifest.password, 'Administrador operador');
  for (const module of [...clientModules, ...technicalModules]) await expectNavVisible(page, module);
  await expectNavHidden(page, 'Administración MSP');
  await openAgentSettings(page, true);
  await expect(page.getByLabel('Objetivo principal')).not.toHaveAttribute('readonly', '');
  expect(failures).toEqual([]);
});

test('el técnico líder puede configurar el agente sin privilegios MSP @role-matrix', async ({ page }) => {
  const manifest = await readManifest();
  const failures = observeFailures(page);

  await login(page, manifest.leadTechnician.email, manifest.password, 'Técnico líder');
  for (const module of [...clientModules, ...technicalModules]) await expectNavVisible(page, module);
  await expectNavHidden(page, 'Administración MSP');
  await openAgentSettings(page, true);
  await expect(page.getByLabel('Objetivo principal')).not.toHaveAttribute('readonly', '');
  expect(failures).toEqual([]);
});

for (const role of [
  { key: 'clientViewer', label: 'Cliente lector' },
  { key: 'clientApprover', label: 'Cliente aprobador' },
] as const) {
  test(`${role.label} recibe navegación de cliente y no ve módulos operativos ni MSP @role-matrix`, async ({ page }) => {
    const manifest = await readManifest();
    const failures = observeFailures(page);
    await login(page, manifest[role.key].email, manifest.password, role.label);

    for (const module of clientModules) await expectNavVisible(page, module);
    for (const module of [...technicalModules, 'Administración MSP']) await expectNavHidden(page, module);
    await expect(page.getByLabel('Perfil y Seguridad')).toBeVisible();
    await page.locator('aside').getByRole('button', { name: 'Presupuestos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Presupuestos', exact: true })).toBeVisible();
    await openFirstValueRealizationRecommendation(page);
    await expect(page.getByText(/Este plan es una guia de ejecucion manual/i)).toBeVisible();
    if (role.key === 'clientViewer') {
      await expect(page.getByRole('button', { name: 'Aprobar plan', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Rechazar', exact: true })).toHaveCount(0);
    } else {
      await page.getByRole('button', { name: 'Aprobar plan', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Aprobar recomendacion', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
      await expect(page.getByText('Decision guardada. Aprendizaje en cola.', { exact: true })).toBeVisible();
      await expect(page.getByText('Esta recomendacion ya fue marcada como APPROVED.')).toBeVisible();
    }
    expect(failures).toEqual([]);
  });
}

async function login(page: Page, email: string, password: string, roleLabel: string): Promise<void> {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /ingresar al panel/i }).click();
  await expect(page.getByLabel('Tenant activo')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('aside')).toBeVisible();
  await expect(page.locator('aside')).toContainText(roleLabel);
  await expect(page.getByRole('heading', { name: /decisiones cloud con evidencia/i })).toBeVisible();
}

async function expectNavVisible(page: Page, label: string): Promise<void> {
  await expect(page.locator('aside').getByRole('button', { name: label, exact: true })).toBeVisible();
}

async function expectNavHidden(page: Page, label: string): Promise<void> {
  await expect(page.locator('aside').getByRole('button', { name: label, exact: true })).toHaveCount(0);
}

async function openFirstValueRealizationRecommendation(page: Page): Promise<void> {
  await page.locator('aside').getByRole('button', { name: 'Valor realizado', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Valor realizado', exact: true })).toBeVisible();
  const detailButton = page.getByRole('button', { name: 'Ver detalle', exact: true }).first();
  await expect(detailButton).toBeVisible();
  await detailButton.click();
  await expect(page.getByText('Recomendacion seleccionada', { exact: true })).toBeVisible();
}

async function openAgentSettings(page: Page, canConfigure: boolean): Promise<void> {
  await page.locator('aside').getByRole('button', { name: 'Agente IA', exact: true }).click();
  await expect(page.getByRole('heading', { name: /gobierno, evidencia y canales externos/i })).toBeVisible();
  const governanceTab = page.getByRole('button', { name: /Gobierno/ });
  if (!canConfigure) {
    await expect(governanceTab).toBeVisible();
    await governanceTab.click();
    await expect(page.getByLabel('Objetivo principal')).toHaveAttribute('readonly', '');
    await expect(page.getByRole('button', { name: 'Activar perfil validado', exact: true })).toHaveCount(0);
    return;
  }
  await expect(governanceTab).toBeVisible();
  await governanceTab.click();
  await expect(page.getByRole('button', { name: 'Activar perfil validado', exact: true })).toBeVisible();
}

function observeFailures(page: Page): string[] {
  const failures: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 500) failures.push(`${response.status()} ${response.url()}`);
  });
  page.on('pageerror', (error) => failures.push(error.message));
  return failures;
}

async function readManifest(): Promise<RoleFixtureManifest> {
  return JSON.parse(await readFile(fixtureFile, 'utf8')) as RoleFixtureManifest;
}
