import { expect, test, type Page } from '@playwright/test';

const moduleMatrix = [
  { label: 'Panel de Control', heading: /consumo y eficiencia focus|oportunidades abiertas/i },
  { label: 'Consola Técnica', heading: /recomendaciones técnicas|oportunidades detectadas/i },
  { label: 'Ingesta y Datos', heading: /ingesta y calidad de datos/i },
  { label: 'Métricas Técnicas', heading: /métricas de uso/i },
  { label: 'Inventario Cloud', heading: /inventario cloud/i },
  { label: 'Presupuestos', heading: /presupuestos/i },
  { label: 'Asignación de costos', heading: /asignación de costos|distribución del gasto/i },
  { label: 'Valor realizado', heading: /valor realizado/i },
  { label: 'Asistente IA', heading: /asistente finops|escribe tu consulta/i },
  { label: 'Historial', heading: /registro de auditoría|historial ops/i },
  { label: 'Agente IA', heading: /gobierno, evidencia y canales externos/i },
] as const;

const viewports = [
  { width: 390, height: 844, name: 'móvil' },
  { width: 1024, height: 768, name: 'portátil' },
  { width: 1366, height: 768, name: 'escritorio' },
  { width: 1920, height: 1080, name: 'escritorio amplio' },
] as const;

test.describe('FinOps real: smoke exhaustivo de solo lectura', () => {
  for (const viewport of viewports) {
    test(`recorre módulos y verifica estabilidad en ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const audit = observeReadOnlyPage(page);

      await login(page);
      await inspectTenantSelector(page);

      for (const module of moduleMatrix) {
        await openModule(page, module.label);
        await waitForModuleToSettle(page);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('main')).toContainText(module.heading, { timeout: 20_000 });
        await assertNoKnownRuntimeError(page, module.label);
        await assertNoHorizontalOverflow(page, module.label);
      }

      if (viewport.width < 640) {
        await expect(page.getByRole('button', { name: 'Más', exact: true })).toBeVisible();
      }

      expect(audit.unsafeRequests, `Se detectaron mutaciones durante la prueba: ${audit.unsafeRequests.join('\n')}`).toEqual([]);
      expect(audit.failures, `Fallos de red o errores de página: ${audit.failures.join('\n')}`).toEqual([]);
    });
  }

  test('ejercita filtros de métricas sin mutar datos', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    const audit = observeReadOnlyPage(page);
    await login(page);
    await openModule(page, 'Métricas Técnicas');
    await waitForModuleToSettle(page);

    const selects = page.locator('main select');
    await expect(selects).toHaveCount(6, { timeout: 20_000 });
    for (const index of [1, 2, 3, 4, 5]) {
      const select = selects.nth(index);
      const options = select.locator('option');
      if (await options.count() > 1) {
        await select.selectOption({ index: 1 });
        await waitForModuleToSettle(page);
        await assertNoKnownRuntimeError(page, `métrica select ${index}`);
      }
    }

    expect(audit.unsafeRequests).toEqual([]);
    expect(audit.failures).toEqual([]);
  });

  test('mantiene el chat en español y sin scroll del documento', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const audit = observeReadOnlyPage(page);
    await login(page);
    await openModule(page, 'Asistente IA');
    await expect(page.getByTestId('chat-module')).toBeVisible();
    await expect(page.getByTestId('chat-composer')).toBeVisible();
    await expect(page.getByTestId('chat-module')).toContainText(/asistente finops/i);
    await expect(page.locator('main')).toHaveCSS('overflow-y', 'hidden');
    expect(audit.unsafeRequests).toEqual([]);
    expect(audit.failures).toEqual([]);
  });
});

async function login(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(process.env['E2E_REAL_ADMIN_EMAIL']!);
  await page.locator('input[type="password"]').fill(process.env['E2E_REAL_ADMIN_PASSWORD']!);
  await page.getByRole('button', { name: /ingresar al panel/i }).click();

  const mfaPrompt = page.getByText(/verificación mfa/i);
  if (await mfaPrompt.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const code = process.env['E2E_REAL_MFA_CODE'];
    if (code === undefined || code.trim() === '') {
      throw new Error('La cuenta real exige MFA. Define E2E_REAL_MFA_CODE solo durante la ejecución local de esta suite.');
    }
    await page.locator('input[pattern="[0-9]{6}"]').fill(code);
    await page.getByRole('button', { name: /ingresar al panel/i }).click();
  }

  await expect(page.locator('header')).toBeVisible({ timeout: 30_000 });
}

async function inspectTenantSelector(page: Page): Promise<void> {
  const selector = page.getByLabel('Tenant activo');
  await expect(selector).toBeVisible();
  const values = await selector.locator('option').evaluateAll((options) => options.map((option) => ({
    value: (option as HTMLOptionElement).value,
    label: option.textContent?.trim() ?? '',
  })));
  expect(values.length).toBeGreaterThan(0);

  const originalValue = await selector.inputValue();
  for (const option of values) {
    if (option.value === originalValue) continue;
    await selector.selectOption(option.value);
    await expect(selector).toHaveValue(option.value, { timeout: 20_000 });
    await waitForModuleToSettle(page);
  }
}

async function openModule(page: Page, label: string): Promise<void> {
  const desktopButton = page.locator('aside').getByRole('button', { name: label, exact: true });
  if (await desktopButton.count() > 0 && await desktopButton.first().isVisible()) {
    await desktopButton.first().click();
    return;
  }

  const mobileMore = page.getByRole('button', { name: 'Más', exact: true });
  if (await mobileMore.isVisible()) {
    await mobileMore.click();
    const dialogButton = page.getByRole('dialog', { name: 'Todos los módulos' }).getByRole('button', { name: label, exact: true });
    await dialogButton.click();
    return;
  }

  await page.getByRole('button', { name: label, exact: true }).first().click();
}

async function waitForModuleToSettle(page: Page): Promise<void> {
  await page.waitForTimeout(1_500);
}

async function assertNoKnownRuntimeError(page: Page, module: string): Promise<void> {
  const text = await page.locator('body').innerText();
  expect(text, `Error visible en ${module}`).not.toMatch(
    /failed to fetch|no fue posible contactar al backend|budget operation failed|cost allocation operation failed|500 internal server error/i,
  );
}

async function assertNoHorizontalOverflow(page: Page, module: string): Promise<void> {
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  expect(overflow, `Desbordamiento horizontal en ${module}`).toBeLessThanOrEqual(2);
}

function observeReadOnlyPage(page: Page): { readonly unsafeRequests: string[]; readonly failures: string[] } {
  const unsafeRequests: string[] = [];
  const failures: string[] = [];

  page.on('request', (request) => {
    if (request.method() === 'GET' || isAllowedAuthMutation(request.url())) return;
    unsafeRequests.push(`${request.method()} ${request.url()}`);
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText ?? 'request failed';
    if (!/aborted|err_aborted/i.test(errorText)) {
      failures.push(`${request.method()} ${request.url()} · ${errorText}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      failures.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  page.on('pageerror', (error) => {
    failures.push(`pageerror: ${error.message}`);
  });

  return { unsafeRequests, failures };
}

function isAllowedAuthMutation(url: string): boolean {
  const path = new URL(url).pathname;
  return path.endsWith('/auth/login')
    || path.endsWith('/auth/refresh')
    || path.endsWith('/auth/switch-tenant');
}
