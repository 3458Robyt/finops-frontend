import { expect, test, type BrowserContext, type Page } from '@playwright/test';

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
  { label: 'Mensajería', heading: /mensajería finops|probar canales/i },
  { label: 'Perfil y Seguridad', heading: /seguridad y acceso|sesiones activas/i },
  { label: 'Administración MSP', heading: /tenants, usuarios y accesos|vista global/i },
] as const;

const viewports = [
  { width: 390, height: 844, name: 'móvil' },
  { width: 768, height: 1024, name: 'tableta' },
  { width: 1024, height: 768, name: 'portátil' },
  { width: 1366, height: 768, name: 'escritorio' },
  { width: 1920, height: 1080, name: 'escritorio amplio' },
] as const;

let sharedContext: BrowserContext | undefined;
let sharedPage: Page | undefined;

test.describe('FinOps real: smoke exhaustivo de solo lectura', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ baseURL: process.env['E2E_REAL_BASE_URL'] });
    sharedPage = await sharedContext.newPage();
    await authenticate(sharedPage);
  });

  test.afterAll(async () => {
    await sharedContext?.close();
    sharedContext = undefined;
    sharedPage = undefined;
  });

  for (const viewport of viewports) {
    test(`recorre módulos y verifica estabilidad en ${viewport.name}`, async () => {
      const page = getSharedPage();
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
        if (module.label === 'Métricas Técnicas') await assertMetricLegendLayout(page);
      }

      if (viewport.width < 640) {
        await expect(page.getByRole('button', { name: 'Más', exact: true })).toBeVisible();
      }

      expect(audit.unsafeRequests, `Se detectaron mutaciones durante la prueba: ${audit.unsafeRequests.join('\n')}`).toEqual([]);
      const failures = [...audit.failures, ...audit.unrecoveredAuthFailures()];
      expect(failures, `Fallos de red o errores de página: ${failures.join('\n')}`).toEqual([]);
    });
  }

  test('ejercita filtros de métricas sin mutar datos', async () => {
    const page = getSharedPage();
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
    await assertMetricLegendLayout(page);

    expect(audit.unsafeRequests).toEqual([]);
    const failures = [...audit.failures, ...audit.unrecoveredAuthFailures()];
    expect(failures).toEqual([]);
  });

  test('mantiene el chat en español y sin scroll del documento', async () => {
    const page = getSharedPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const audit = observeReadOnlyPage(page);
    await login(page);
    await openModule(page, 'Asistente IA');
    await expect(page.getByTestId('chat-module')).toBeVisible();
    await expect(page.getByTestId('chat-composer')).toBeVisible();
    await expect(page.getByTestId('chat-module')).toContainText(/asistente finops/i);
    await expect(page.locator('main')).toHaveCSS('overflow-y', 'hidden');
    await assertKeyboardNavigation(page);
    expect(audit.unsafeRequests).toEqual([]);
    const failures = [...audit.failures, ...audit.unrecoveredAuthFailures()];
    expect(failures).toEqual([]);
  });

  test('responde una consulta real del chat sin persistir recomendaciones', async () => {
    const page = getSharedPage();
    await page.setViewportSize({ width: 1366, height: 768 });
    const audit = observeReadOnlyPage(page);
    await login(page);
    await openModule(page, 'Asistente IA');
    await expect(page.getByTestId('chat-module')).toBeVisible();

    const assistantLabels = page.getByText('Asistente FinOps', { exact: true });
    const initialAssistantMessages = await assistantLabels.count();
    const input = page.getByPlaceholder(/Escribe tu consulta a la IA/i);
    await input.fill('¿Cuál es el mayor costo del periodo y qué evidencia respalda la respuesta?');
    await page.locator('form button[type="submit"]').click();

    await expect.poll(() => assistantLabels.count(), { timeout: 105_000, intervals: [500, 1_000, 2_000] })
      .toBeGreaterThan(initialAssistantMessages);
    await expect(page.getByText('Procesando IA', { exact: true })).toBeHidden({ timeout: 10_000 });

    const historyText = await page.getByTestId('chat-history').innerText();
    expect(historyText).not.toMatch(/failed to fetch|no fue posible contactar al backend|500 internal server error/i);
    expect(audit.unsafeRequests).toEqual([]);
    const failures = [...audit.failures, ...audit.unrecoveredAuthFailures()];
    expect(failures).toEqual([]);
  });
});

async function login(page: Page): Promise<void> {
  if (await page.getByLabel('Tenant activo').isVisible().catch(() => false)) return;
  await authenticate(page);
}

async function assertMetricLegendLayout(page: Page): Promise<void> {
  const legend = page.getByTestId('technical-metric-legend');
  const opportunities = page.getByTestId('technical-metric-opportunities');
  if (!(await legend.isVisible().catch(() => false)) || !(await opportunities.isVisible().catch(() => false))) return;
  const [legendBox, opportunitiesBox] = await Promise.all([legend.boundingBox(), opportunities.boundingBox()]);
  if (legendBox === null || opportunitiesBox === null) return;
  const overlapsHorizontally = legendBox.x < opportunitiesBox.x + opportunitiesBox.width
    && legendBox.x + legendBox.width > opportunitiesBox.x;
  const overlapsVertically = legendBox.y < opportunitiesBox.y + opportunitiesBox.height
    && legendBox.y + legendBox.height > opportunitiesBox.y;
  expect(overlapsHorizontally && overlapsVertically, 'La leyenda de métricas se sobrepone a oportunidades técnicas').toBe(false);
}

async function assertKeyboardNavigation(page: Page): Promise<void> {
  await page.getByLabel('Tenant activo').focus();
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return null;
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, width: rect.width, height: rect.height };
    });
    expect(focus, 'El foco de teclado salió del documento').not.toBeNull();
    expect((focus?.width ?? 0) + (focus?.height ?? 0), 'El foco cayó en un control no visible').toBeGreaterThan(0);
  }
}

async function authenticate(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('input[type="email"], [aria-label="Tenant activo"]').first()).toBeVisible({ timeout: 30_000 });
  const email = page.locator('input[type="email"]');
  if (await email.isVisible().catch(() => false)) {
    await email.fill(process.env['E2E_REAL_ADMIN_EMAIL']!);
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
  }
  await expect(page.getByLabel('Tenant activo')).toBeVisible({ timeout: 30_000 });
}

function getSharedPage(): Page {
  if (sharedPage === undefined) throw new Error('La sesión compartida de Playwright no está inicializada.');
  return sharedPage;
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
  const alternate = values.find((option) => option.value !== originalValue);
  if (alternate === undefined) return;

  await expect(selector).toBeEnabled();
  await selector.selectOption(alternate.value);
  await expect(selector).toHaveValue(alternate.value, { timeout: 20_000 });
  await waitForModuleToSettle(page);

  await expect(selector).toBeEnabled();
  await selector.selectOption(originalValue);
  await expect(selector).toHaveValue(originalValue, { timeout: 20_000 });
  await waitForModuleToSettle(page);
}

async function openModule(page: Page, label: string): Promise<void> {
  const desktopButton = page.locator('aside').getByRole('button', { name: label, exact: true });
  if (await desktopButton.count() > 0 && await desktopButton.first().isVisible()) {
    await desktopButton.first().click();
    return;
  }

  const mobilePrimaryButton = page.locator('nav[aria-label="Navegación móvil"]').getByRole('button', { name: label, exact: true });
  if (await mobilePrimaryButton.count() > 0 && await mobilePrimaryButton.first().isVisible()) {
    await mobilePrimaryButton.first().click();
    return;
  }

  const mobileMore = page.getByRole('button', { name: 'Más', exact: true });
  if (await mobileMore.isVisible()) {
    await mobileMore.click();
    const dialog = page.getByRole('dialog', { name: 'Todos los módulos' });
    await expect(dialog).toBeVisible();
    const dialogButton = dialog.locator('button').filter({ hasText: label }).first();
    await expect(dialogButton).toBeVisible();
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

function observeReadOnlyPage(page: Page): {
  readonly unsafeRequests: string[];
  readonly failures: string[];
  readonly unrecoveredAuthFailures: () => string[];
} {
  const unsafeRequests: string[] = [];
  const failures: string[] = [];
  const pendingAuthRecovery = new Map<string, number>();

  page.on('request', (request) => {
    if (request.method() === 'GET' || isAllowedReadOnlyMutation(request.url())) return;
    unsafeRequests.push(`${request.method()} ${request.url()}`);
  });
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText ?? 'request failed';
    if (!/aborted|err_aborted/i.test(errorText)) {
      failures.push(`${request.method()} ${request.url()} · ${errorText}`);
    }
  });
  page.on('response', (response) => {
    const request = response.request();
    const requestKey = `${request.method()} ${response.url()}`;
    if (response.status() === 401 && !response.url().endsWith('/auth/refresh')) {
      pendingAuthRecovery.set(requestKey, (pendingAuthRecovery.get(requestKey) ?? 0) + 1);
      return;
    }
    if ((response.status() >= 200 && response.status() < 300) || response.status() === 304) {
      const pending = pendingAuthRecovery.get(requestKey) ?? 0;
      if (pending <= 1) pendingAuthRecovery.delete(requestKey);
      else pendingAuthRecovery.set(requestKey, pending - 1);
    }
    if (response.status() >= 500) {
      failures.push(`${response.status()} ${request.method()} ${response.url()}`);
    }
  });
  page.on('pageerror', (error) => {
    failures.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && !/status of 401 \(Unauthorized\)/i.test(message.text())) {
      const location = message.location().url;
      failures.push(`console.error: ${message.text()}${location === '' ? '' : ` (${location})`}`);
    }
  });

  return {
    unsafeRequests,
    failures,
    unrecoveredAuthFailures: () => Array.from(pendingAuthRecovery.entries()).flatMap(([requestKey, count]) =>
      Array.from({ length: count }, () => `401 no recuperado ${requestKey}`)),
  };
}

function isAllowedReadOnlyMutation(url: string): boolean {
  const path = new URL(url).pathname;
  return path.endsWith('/auth/login')
    || path.endsWith('/auth/refresh')
    || path.endsWith('/auth/switch-tenant')
    || path.endsWith('/ai/chat');
}
