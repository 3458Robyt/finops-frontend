import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const fixtureFile = resolve(process.env['E2E_FIXTURE_FILE'] ?? '../finops-backend/.test-artifacts/e2e-fixtures.json');
test.skip(!existsSync(fixtureFile), 'Requiere fixtures PostgreSQL aislados; usa npm run test:e2e:full.');

interface RoleFixtureManifest {
  readonly password: string;
  readonly technician: { readonly email: string };
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

test('el técnico FinOps obtiene los módulos operativos, pero no Administración MSP', async ({ page }) => {
  const manifest = await readManifest();
  const failures = observeFailures(page);
  await login(page, manifest.technician.email, manifest.password, 'Técnico FinOps');

  for (const module of [...clientModules, ...technicalModules]) await expectNavVisible(page, module);
  await expectNavHidden(page, 'Administración MSP');
  await expect(page.getByLabel('Perfil y Seguridad')).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Métricas Técnicas', exact: true }).click();
  await expect(page.getByRole('heading', { name: /métricas técnicas/i })).toBeVisible();
  expect(failures).toEqual([]);
});

for (const role of [
  { key: 'clientApprover', label: 'Cliente aprobador' },
  { key: 'clientViewer', label: 'Cliente lector' },
] as const) {
  test(`${role.label} recibe navegación de cliente y no ve módulos operativos ni MSP`, async ({ page }) => {
    const manifest = await readManifest();
    const failures = observeFailures(page);
    await login(page, manifest[role.key].email, manifest.password, role.label);

    for (const module of clientModules) await expectNavVisible(page, module);
    for (const module of [...technicalModules, 'Administración MSP']) await expectNavHidden(page, module);
    await expect(page.getByLabel('Perfil y Seguridad')).toBeVisible();
    await page.locator('aside').getByRole('button', { name: 'Presupuestos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Presupuestos', exact: true })).toBeVisible();
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
