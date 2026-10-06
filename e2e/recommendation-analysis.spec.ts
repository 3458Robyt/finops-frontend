import { expect, test, type Page, type Route } from '@playwright/test';
import type { ApiRole } from '../src/components/navigation';

test('opera una corrida, muestra descartes, abre la recomendación y aísla el tenant', async ({ page }) => {
  await mockApi(page, 'ADMIN');
  await login(page);

  await page.getByRole('button', { name: /agente ia/i }).click();
  await expect(page.getByText(/hay evidencia auditable/i)).toBeVisible();
  const blockers = page.getByTestId('readiness-blocker-summary');
  await expect(blockers).toContainText('3 candidatos no superan la compuerta');
  await expect(blockers).toContainText('Se priorizarán hasta 1 borrador informativo');
  await expect(blockers.getByRole('listitem').filter({ hasText: 'Cobertura insuficiente.' })).toContainText('2 candidatos');
  await expect(blockers).toContainText('falta una métrica de memoria');
  await blockers.getByText('web-prod-01', { exact: false }).click();
  await expect(blockers).toContainText('Última métrica:');
  await expect(blockers).toContainText('Siguiente paso:');
  await expect(blockers).toContainText('plugin OCI');
  await page.getByRole('button', { name: /analizar datos disponibles/i }).click();
  await expect(page.getByText(/corrida quedó en cola/i)).toBeVisible();
  await expect(page.getByText('Pendiente', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Completada', { exact: true }).first()).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(/evidencia técnica suficiente/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Borradores de revisión técnica' })).toBeVisible();
  await expect(page.getByText('Validar telemetría de memoria en web-prod-02')).toBeVisible();
  await expect(page.getByText('Ahorro: No cuantificado')).toBeVisible();
  await expect(page.getByText(/no son recomendaciones publicadas/i)).toBeVisible();
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
  await expect(page.getByText(/puedo ayudarte a interpretar los costos/i)).toBeVisible();
  await expect(page.getByTestId('chat-quick-actions').getByRole('button', { name: /explica dónde está el mayor costo/i })).toBeVisible();
  await expect(page.getByTestId('chat-quick-actions').getByRole('button', { name: /detecta posibles oportunidades/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /previsualizar recomendaciones ia/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /guardar recomendaciones ia/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /analizar datos disponibles/i })).toHaveCount(0);
});

test('un cliente puede vincular Telegram en su tenant sin acceder al diagnóstico administrativo', async ({ page }) => {
  await mockApi(page, 'CLIENT_VIEWER');
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Mensajería', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Vincular con Tenant Uno' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vincular Telegram aquí' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Probar canales' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Encolar prueba de correo' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Vincular Telegram aquí' }).click();
  await expect(page.getByText(/enlace generado para Tenant Uno/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Abrir bot y vincular' })).toBeVisible();
});

test('la configuración SMTP indica el método Gmail y bloquea pruebas mientras falten credenciales', async ({ page }) => {
  await mockApi(page, 'ADMIN');
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Mensajería', exact: true }).click();

  await expect(page.getByRole('status')).toContainText('EMAIL_ADDRESS');
  await expect(page.getByRole('status')).toContainText('contraseña de aplicación de Google');
  await expect(page.getByRole('status')).toContainText('smtp.gmail.com');
  await expect(page.getByRole('status')).not.toContainText('SMTP_HOST');
  await expect(page.getByRole('button', { name: 'Encolar prueba de correo' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Verificar SMTP' })).toBeDisabled();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('el panel del agente bloquea el envío si SMTP no está configurado', async ({ page }) => {
  await mockApi(page, 'ADMIN');
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Agente IA', exact: true }).click();
  await page.getByRole('button', { name: /Canales/ }).click();

  await expect(page.getByRole('button', { name: 'Enviar prueba de correo', exact: true })).toBeDisabled();
  await expect(page.getByText(/smtp.gmail.com.*autom[aá]ticamente/i)).toBeVisible();
});

test('el técnico líder conserva la configuración del agente, pero no ve controles de administración de canales', async ({ page }) => {
  const forbiddenRequests: string[] = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.includes('/outbound-messages/') || path.includes('/telegram/links')) forbiddenRequests.push(path);
  });
  await mockApi(page, 'LEAD_TECHNICIAN');
  await login(page);
  await page.locator('aside').getByRole('button', { name: 'Agente IA', exact: true }).click();
  await page.getByRole('button', { name: /Canales/ }).click();

  await expect(page.getByText(/tu rol no tiene permiso para administrar telegram/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reconstruir contexto del agente' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar prueba de correo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Vincular chat' })).toHaveCount(0);
  expect(forbiddenRequests).toEqual([]);
});

test('descarta la respuesta del chat anterior al cambiar de tenant', async ({ page }) => {
  await mockApi(page, 'ADMIN', { chatDelayMs: 700 });
  await login(page);
  await page.getByRole('button', { name: 'Asistente IA', exact: true }).click();

  const privateQuestion = 'Consulta privada del tenant uno';
  await page.getByPlaceholder(/escribe tu consulta/i).fill(privateQuestion);
  await page.getByRole('button', { name: 'send' }).click();
  await expect(page.getByText(privateQuestion, { exact: true })).toBeVisible();
  await page.getByLabel('Tenant activo').selectOption('tenant-2');
  await expect(page.getByLabel('Tenant activo')).toHaveValue('tenant-2');
  await page.waitForTimeout(900);

  const history = page.getByTestId('chat-history');
  await expect(history).toContainText('Puedo ayudarte a interpretar los costos');
  await expect(history).not.toContainText(privateQuestion);
  await expect(history).not.toContainText('La mayor oportunidad');
});

test('conserva el historial al cambiar de módulo y lo envía como contexto del siguiente turno', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockApi(page, 'ADMIN');
  await login(page);
  const nav = page.locator('aside');
  await nav.getByRole('button', { name: 'Asistente IA', exact: true }).click();

  const firstQuestion = '¿Cuál es la mayor oportunidad del periodo?';
  await page.getByPlaceholder(/escribe tu consulta/i).fill(firstQuestion);
  await page.getByRole('button', { name: 'send' }).click();
  await expect(page.getByTestId('assistant-markdown').last()).toContainText('La mayor oportunidad');

  await nav.getByRole('button', { name: 'Panel de Control', exact: true }).click();
  await nav.getByRole('button', { name: 'Asistente IA', exact: true }).click();
  const history = page.getByTestId('chat-history');
  await expect(history).toContainText(firstQuestion);
  await expect(history).toContainText('La mayor oportunidad');

  const secondRequest = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/ai/chat'));
  await page.getByPlaceholder(/escribe tu consulta/i).fill('¿Por qué priorizarla?');
  await page.getByRole('button', { name: 'send' }).click();
  const requestBody = (await secondRequest).postDataJSON() as {
    readonly history: readonly { readonly role: string; readonly content: string }[];
  };
  expect(requestBody.history).toHaveLength(2);
  expect(requestBody.history[0]).toEqual({ role: 'user', content: firstQuestion });
  expect(requestBody.history[1]?.role).toBe('assistant');
  expect(requestBody.history[1]?.content).toContain('La mayor oportunidad');

  for (let turn = 3; turn <= 6; turn += 1) {
    const nextRequest = page.waitForRequest((request) =>
      request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/ai/chat'));
    await page.getByPlaceholder(/escribe tu consulta/i).fill(`Pregunta de seguimiento ${turn}`);
    await page.getByRole('button', { name: 'send' }).click();
    const nextBody = (await nextRequest).postDataJSON() as { readonly history: readonly unknown[] };
    if (turn === 6) expect(nextBody.history).toHaveLength(8);
    await expect(page.getByTestId('assistant-markdown')).toHaveCount(turn + 1);
  }
  await expect(history).toContainText(firstQuestion);
});

test('restaura el historial en sesión y lo limpia al cerrar sesión', async ({ page }) => {
  await mockApi(page, 'ADMIN');
  await login(page);
  await page.route('**/api/v1/auth/refresh', (route) => json(route, session('ADMIN', 'tenant-1', 'token-tenant-1')));
  await page.getByRole('button', { name: 'Asistente IA', exact: true }).click();
  await page.getByPlaceholder(/escribe tu consulta/i).fill('Resumen que debe sobrevivir a una recarga');
  await page.getByRole('button', { name: 'send' }).click();
  await expect(page.getByTestId('assistant-markdown').last()).toContainText('La mayor oportunidad');

  await page.reload();
  await page.locator('aside').getByRole('button', { name: 'Asistente IA', exact: true }).click();
  const history = page.getByTestId('chat-history');
  await expect(history).toContainText('Resumen que debe sobrevivir a una recarga');
  await expect(history).toContainText('La mayor oportunidad');

  await page.locator('aside').getByRole('button', { name: 'Perfil y Seguridad', exact: true }).click();
  await page.getByRole('button', { name: /cerrar sesión/i }).click();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.sessionStorage.getItem('finops:chat:v1:user-1:tenant-1'))).toBeNull();
});

const roleCases: readonly { readonly role: ApiRole; readonly technical: boolean; readonly master: boolean; readonly outboundManager: boolean }[] = [
  { role: 'MASTER_ADMIN', technical: true, master: true, outboundManager: true },
  { role: 'OPERATOR_ADMIN', technical: true, master: false, outboundManager: true },
  { role: 'LEAD_TECHNICIAN', technical: true, master: false, outboundManager: false },
  { role: 'FINOPS_TECHNICIAN', technical: true, master: false, outboundManager: false },
  { role: 'ADMIN', technical: true, master: false, outboundManager: true },
  { role: 'CLIENT_APPROVER', technical: false, master: false, outboundManager: false },
  { role: 'CLIENT_VIEWER', technical: false, master: false, outboundManager: false },
  { role: 'VIEWER', technical: false, master: false, outboundManager: false },
];

for (const roleCase of roleCases) {
  test(`la interfaz de ${roleCase.role} respeta navegación, módulos financieros y canales`, async ({ page }) => {
    await mockApi(page, roleCase.role);
    await login(page);

    const nav = page.locator('aside');
    await expect(nav.getByRole('button', { name: 'Panel de Control', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Asistente IA', exact: true })).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Administración MSP', exact: true })).toHaveCount(roleCase.master ? 1 : 0);
    await expect(nav.getByRole('button', { name: 'Consola Técnica', exact: true })).toHaveCount(roleCase.technical ? 1 : 0);

    await nav.getByRole('button', { name: 'Asistente IA', exact: true }).click();
    await expect(page.getByTestId('chat-quick-actions').getByRole('button', { name: /explica dónde está el mayor costo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /previsualizar recomendaciones ia/i })).toHaveCount(roleCase.technical ? 1 : 0);
    await expect(page.getByRole('button', { name: /guardar recomendaciones ia/i })).toHaveCount(roleCase.technical ? 1 : 0);

    await nav.getByRole('button', { name: 'Presupuestos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Presupuestos', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nuevo presupuesto', exact: true })).toHaveCount(roleCase.technical ? 1 : 0);
    if (roleCase.technical) {
      await page.getByRole('button', { name: 'Nuevo presupuesto', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Guardar presupuesto', exact: true })).toBeVisible();
    }

    await nav.getByRole('button', { name: 'Asignación de costos', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Asignación de costos', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva regla', exact: true })).toHaveCount(roleCase.technical ? 1 : 0);
    await expect(page.getByRole('button', { name: 'Cerrar período', exact: true })).toHaveCount(roleCase.technical ? 1 : 0);
    if (roleCase.technical) {
      await page.getByRole('button', { name: 'Nueva regla', exact: true }).click();
      await expect(page.getByPlaceholder('Nombre de la regla')).toBeVisible();
    }

    await nav.getByRole('button', { name: 'Valor realizado', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Valor realizado', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar mediciones', exact: true })).toHaveCount(roleCase.technical ? 1 : 0);

    await nav.getByRole('button', { name: 'Mensajería', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Mensajería FinOps', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Probar canales', exact: true })).toHaveCount(roleCase.outboundManager ? 1 : 0);
  });
}

for (const decisionCase of [
  { role: 'CLIENT_APPROVER', canDecide: true },
  { role: 'FINOPS_TECHNICIAN', canDecide: true },
  { role: 'CLIENT_VIEWER', canDecide: false },
] as const) {
  test(`${decisionCase.role} accede al detalle y respeta el permiso de decisión`, async ({ page }) => {
    await mockApi(page, decisionCase.role, { recommendationForReview: true });
    await login(page);
    await page.locator('aside').getByRole('button', { name: 'Historial', exact: true }).click();
    await page.getByRole('button', { name: 'Revisar recomendación', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Oportunidad auditada de prueba', exact: true })).toBeVisible();
    await expect(page.getByText('Plan auditado para revisión del cliente', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprobar plan', exact: true })).toHaveCount(decisionCase.canDecide ? 1 : 0);
    await expect(page.getByRole('button', { name: 'Rechazar', exact: true })).toHaveCount(decisionCase.canDecide ? 1 : 0);

    if (decisionCase.role === 'CLIENT_APPROVER') {
      await page.getByRole('button', { name: 'Aprobar plan', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Aprobar recomendacion', exact: true })).toBeVisible();
      const decisionRequest = page.waitForRequest((request) => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/recommendations/rec-1/decisions'));
      await page.getByRole('button', { name: 'Aprobar', exact: true }).click();
      const decisionBody = (await decisionRequest).postDataJSON() as { readonly decision: string; readonly executionPlanId: string };
      expect(decisionBody).toEqual({ decision: 'APPROVED', executionPlanId: 'execution-plan-e2e-1', reasonCode: 'APPROVED_HIGH_CONFIDENCE' });
      await expect(page.getByText('Decisión guardada. Aprendizaje en cola.')).toBeVisible();
      await page.getByRole('button', { name: 'Volver a recomendaciones', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Historial y estado operativo', exact: true })).toBeVisible();
    }
  });
}

test('no anuncia borradores técnicos en una corrida que sí tiene candidatos publicables', async ({ page }) => {
  await mockApi(page, 'ADMIN', { readinessHasPublicCandidate: true });
  await login(page);
  await page.getByRole('button', { name: /agente ia/i }).click();

  const draftMetric = page.getByText('Borradores técnicos posibles en esta corrida').locator('xpath=..');
  await expect(draftMetric).toContainText('0');
  await expect(page.getByTestId('readiness-blocker-summary')).not.toContainText('Se priorizarán hasta');
});

test('el chat responde en español y la generación directa conserva la auditoría', async ({ page }) => {
  await mockApi(page, 'ADMIN');
  await login(page);
  await page.getByRole('button', { name: 'Asistente IA', exact: true }).click();

  await page.getByPlaceholder(/escribe tu consulta/i).fill('¿Cuál es la mayor oportunidad del periodo?');
  await page.getByRole('button', { name: 'send' }).click();
  const assistantMessage = page.getByTestId('assistant-markdown').last();
  await expect(assistantMessage).toContainText('La mayor oportunidad');
  await expect(assistantMessage).toContainText('reducir el costo');
  await expect(assistantMessage.locator('strong')).toContainText('La mayor oportunidad');
  await expect(assistantMessage).not.toContainText('**');
  await expect(assistantMessage.locator('script')).toHaveCount(0);
  await expect(assistantMessage.locator('img')).toHaveCount(0);

  await page.getByRole('button', { name: /previsualizar recomendaciones ia/i }).click();
  await expect(page.getByText(/previsualizaci[oó]n de recomendaciones ia/i)).toBeVisible();
  await expect(page.getByText(/oportunidad validada por auditor/i)).toBeVisible();
});

test('explica un rechazo de recomendaciones sin exponer el identificador diagnóstico', async ({ page }) => {
  await mockApi(page, 'ADMIN', { recommendationsRejected: true });
  await login(page);
  await page.getByRole('button', { name: 'Asistente IA', exact: true }).click();
  await page.getByRole('button', { name: /previsualizar recomendaciones ia/i }).click();

  const error = page.getByRole('alert');
  await expect(error).toContainText('El auditor de IA rechazó las recomendaciones generadas.');
  await expect(error).toContainText('Puntaje auditor: 35/100.');
  await expect(error).toContainText('Motivos: No se puede comprobar el ahorro propuesto.');
  await expect(error).not.toContainText('audit-tenant-confidential-2026-09-25');
});

test('explica el rechazo del auditor al plan sin filtrar el identificador diagnóstico', async ({ page }) => {
  await mockApi(page, 'ADMIN', { planRejected: true });
  await login(page);

  await page.getByRole('button', { name: /agente ia/i }).click();
  await page.getByRole('button', { name: /analizar datos disponibles/i }).click();
  await expect(page.getByText(/corrida quedó en cola/i)).toBeVisible();
  await expect(page.getByText('Completada', { exact: true }).first()).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: /oportunidad auditada de prueba/i }).click();
  await page.getByRole('button', { name: /revisar plan de ejecucion/i }).click();

  const error = page.getByRole('alert');
  await expect(error).toContainText('El auditor de IA rechazó el plan de ejecución');
  await expect(error).toContainText('Puntaje del auditor: 62/100');
  await expect(error).toContainText('Motivos: La acción propuesta no coincide con la evidencia técnica.');
  await expect(error).toContainText('Comprobaciones fallidas: reversibilidad: Falta un paso de reversión.');
  await expect(error).toContainText('No se guardó.');
  await expect(error).not.toContainText('private-diagnostic-id');
});

test('explica el timeout del plan y deja disponible el reintento', async ({ page }) => {
  await mockApi(page, 'ADMIN', { planTimeout: true });
  await login(page);

  await page.getByRole('button', { name: /agente ia/i }).click();
  await page.getByRole('button', { name: /analizar datos disponibles/i }).click();
  await expect(page.getByText(/corrida quedó en cola/i)).toBeVisible();
  await expect(page.getByText('Completada', { exact: true }).first()).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: /oportunidad auditada de prueba/i }).click();
  const reviewButton = page.getByRole('button', { name: /revisar plan de ejecucion/i });
  await reviewButton.click();

  await expect(page.getByRole('alert')).toContainText('El plan tardó más de lo permitido. No se guardó; puedes volver a intentarlo.');
  await expect(reviewButton).toBeEnabled();
  await expect(page.getByText('Generando plan auditado...', { exact: true })).toBeHidden();
});

test('marca oportunidades obsoletas y actualiza el análisis desde la consola', async ({ page }) => {
  await mockApi(page, 'ADMIN', { staleOpportunities: true });
  await login(page);
  await page.getByRole('button', { name: 'Consola Técnica', exact: true }).click();

  const staleRow = page.getByRole('row').filter({ hasText: 'Compute desactualizado' });
  await expect(page.getByText(/oportunidades se calcularon antes de los datos de costos más recientes/i)).toBeVisible();
  await expect(staleRow).toContainText('Requiere recalcular');
  await expect(staleRow).not.toContainText('14.0%');

  const recomputeRequest = page.waitForRequest((request) =>
    request.method() === 'POST' && request.url().includes('/analytics/recompute'));
  await page.getByRole('button', { name: 'Actualizar análisis', exact: true }).click();
  await recomputeRequest;

  await expect(page.getByText(/oportunidades se calcularon antes de los datos de costos más recientes/i)).toBeHidden();
  await expect(page.getByRole('row').filter({ hasText: 'Compute actualizado' })).toContainText('14.0%');
});

test('conserva y permite reintentar una consulta tras una indisponibilidad temporal de IA', async ({ page }) => {
  await mockApi(page, 'ADMIN', { chatFailures: 1 });
  await login(page);
  await page.getByRole('button', { name: 'Asistente IA', exact: true }).click();

  const query = '¿Cuál es el mayor costo del periodo?';
  const input = page.getByPlaceholder(/escribe tu consulta/i);
  await input.fill(query);
  await page.getByRole('button', { name: 'send' }).click();

  const error = page.getByRole('alert');
  await expect(error).toContainText('El servicio de IA no está disponible temporalmente');
  await expect(error.getByRole('button', { name: 'Reintentar consulta' })).toBeEnabled();
  await expect(page.getByText('Procesando IA', { exact: true })).toBeHidden();
  await expect(page.getByText(query, { exact: true })).toHaveCount(1);

  await error.getByRole('button', { name: 'Reintentar consulta' }).click();
  await expect(page.getByTestId('assistant-markdown').last()).toContainText('La mayor oportunidad');
  await expect(page.getByText(query, { exact: true })).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const viewport of [
  { width: 320, height: 720, label: 'móvil compacto' },
  { width: 375, height: 812, label: 'móvil estándar' },
  { width: 414, height: 896, label: 'móvil amplio' },
  { width: 768, height: 1024, label: 'tablet' },
  { width: 1024, height: 768, label: 'portátil con rail' },
  { width: 1280, height: 720, label: 'escritorio con barra completa' },
]) {
  test(`mantiene la navegación accesible y sin desbordamiento en ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockApi(page, 'ADMIN');
    await login(page);

    if (viewport.width < 1024) {
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

test('mantiene separados los streams de dimensiones de un recurso seleccionado', async ({ page }) => {
  await mockApi(page, 'ADMIN');
  await login(page);
  await page.getByRole('button', { name: 'Métricas Técnicas', exact: true }).click();
  await page.getByLabel('Recurso').selectOption('resource-external-01');

  const legend = page.getByTestId('technical-metric-legend');
  await expect(legend).toContainText('2 series');
  await expect(legend).toContainText('dim aaaaaaaa');
  await expect(legend).toContainText('dim bbbbbbbb');
});

async function login(page: Page) {
  await page.goto('/');
  await page.locator('input[type="email"]').fill('user@example.com');
  await page.locator('input[type="password"]').fill('password');
  await page.getByRole('button', { name: /ingresar al panel/i }).click();
}

async function mockApi(
  page: Page,
  role: ApiRole,
  options: {
    readonly chatFailures?: number;
    readonly chatDelayMs?: number;
    readonly staleOpportunities?: boolean;
    readonly planRejected?: boolean;
    readonly planTimeout?: boolean;
    readonly recommendationsRejected?: boolean;
    readonly readinessHasPublicCandidate?: boolean;
    readonly recommendationForReview?: boolean;
  } = {},
) {
  let queued = false;
  let polls = 0;
  let chatRequests = 0;
  let analyticsRecomputed = false;
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
    if (path.endsWith('/auth/sessions')) return json(route, { success: true, sessions: [] });
    if (path.endsWith('/auth/mfa/status')) return json(route, { success: true, enabled: false, requiredForRole: false, recoveryCodesRemaining: 0 });
    if (path.endsWith('/notifications')) {
      return json(route, {
        success: true,
        notifications: [],
        meta: { count: 0, unreadCount: 0, previewCount: 0 },
      });
    }
    if (path.endsWith('/ai/chat')) {
      chatRequests += 1;
      if (options.chatDelayMs !== undefined) await new Promise((resolve) => setTimeout(resolve, options.chatDelayMs));
      if (chatRequests <= (options.chatFailures ?? 0)) {
        return json(route, {
          success: false,
          error: 'El servicio de IA no está disponible temporalmente (HTTP 503). Intenta nuevamente en unos minutos.',
          code: 'PROVIDER_UNAVAILABLE',
        }, 503);
      }
      return json(route, {
        success: true,
        answer: '## Resumen de costos\n\n**La mayor oportunidad** es reducir el costo de la instancia con baja utilización.\n\n- La evidencia técnica está disponible para revisión.\n\n<script>alert("no ejecutar")</script>\n\n![imagen no permitida](https://example.invalid/evidence.png)',
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
      if (options.recommendationsRejected) {
        return json(route, {
          success: false,
          error: 'Las recomendaciones generadas no superaron la auditoría.',
          code: 'AI_AUDIT_REJECTED',
          diagnosticId: 'audit-tenant-confidential-2026-09-25',
          audit: {
            verdict: 'REJECTED',
            score: 35,
            blockingIssues: ['No se puede comprobar el ahorro propuesto.'],
            requiredChanges: ['Aportar evidencia verificable de costos.'],
          },
        }, 409);
      }
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
      const recommendations = options.recommendationForReview ? [reviewRecommendation()] : [];
      return json(route, { success: true, recommendations, meta: { count: recommendations.length, tenantId: tenantTwo ? 'tenant-2' : 'tenant-1' } });
    }
    if (path.endsWith('/analytics/opportunities')) {
      if (options.staleOpportunities && !analyticsRecomputed) {
        return json(route, { success: true, opportunities: [costOpportunity(true)] });
      }
      if (options.staleOpportunities) {
        return json(route, { success: true, opportunities: [costOpportunity(false)] });
      }
      return json(route, { success: true, opportunities: [] });
    }
    if (path.endsWith('/analytics/efficiency-insights')) {
      return json(route, { success: true, insights: [] });
    }
    if (path.endsWith('/analytics/recompute')) {
      analyticsRecomputed = true;
      return json(route, { success: true, anomalies: [], usageInsights: [] });
    }
    if (path.endsWith('/costs')) {
      return json(route, { success: true, metrics: [], summary: { total: 0, currency: 'USD' } });
    }
    if (path.endsWith('/costs/history')) {
      return json(route, {
        success: true,
        reportingCurrency: 'USD',
        points: [],
        totalsByCurrency: [],
        coverage: {
          firstPeriod: null,
          lastPeriod: null,
          periodsWithData: 0,
          expectedPeriods: 0,
          missingPeriods: 0,
          conversionIssuePeriods: 0,
        },
        meta: { startDate: '2026-05-01', endDate: '2026-06-01', granularity: 'day' },
      });
    }
    if (path.endsWith('/analytics/forecast')) {
      return json(route, { success: true, forecasts: [] });
    }
    if (path.endsWith('/analytics/forecast/scenarios')) {
      return json(route, { success: true, scenarios: [] });
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
          verifiedMonthlySavings: 0,
          missedSavingsAmount: 0,
          currency: 'USD',
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
    if (path.endsWith('/costs/options')) {
      return json(route, { success: true, options: { reportingCurrency: 'USD', periods: [], cloudAccounts: [], services: [], regions: [], currencies: [] } });
    }
    if (path.endsWith('/cost-allocation/rules')) return json(route, { success: true, rules: [] });
    if (path.endsWith('/cost-allocation/summary')) return json(route, { success: true, summary: [] });
    if (path.endsWith('/cost-allocation/comparison')) return json(route, { success: true, comparison: { summary: [], previousSummary: [] } });
    if (path.endsWith('/cost-allocation/unallocated')) return json(route, { success: true, items: [] });
    if (path.endsWith('/cost-allocation/periods')) return json(route, { success: true, closures: [] });
    if (path.endsWith('/value-realization/summary')) return json(route, { success: true, summary: { generatedAt: '2026-07-23T12:00:00.000Z', currencies: [], counts: {} } });
    if (path.endsWith('/value-realization/items')) return json(route, { success: true, page: { items: [], hasMore: false } });
    if (path.endsWith('/value-realization/trend')) return json(route, { success: true, points: [] });
    if (path.endsWith('/value-realization/destinations')) return json(route, { success: true, destinations: [] });
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
    if (path.endsWith('/telegram/self-link-code')) {
      return json(route, {
        success: true,
        code: 'link-code-e2e',
        expiresAt: '2026-07-24T00:00:00.000Z',
        startCommand: '/start link-code-e2e',
        deepLink: 'https://t.me/FinOpsTestBot?start=link-code-e2e',
      });
    }
    if (path.endsWith('/outbound-messages/preferences')) {
      return json(route, {
        success: true,
        preferences: {
          id: 'preferences-1',
          tenantId: tenantTwo ? 'tenant-2' : 'tenant-1',
          userId: 'user-1',
          emailEnabled: true,
          telegramEnabled: false,
          operationalAlerts: true,
          recommendationAlerts: true,
          financialAlerts: true,
          executiveSummaries: true,
          createdAt: '2026-07-23T12:00:00.000Z',
          updatedAt: '2026-07-23T12:00:00.000Z',
        },
      });
    }
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
          candidatesFound: 3,
          candidatesSkipped: 3,
          readinessReport: {
            summary: 'Hay evidencia auditable.',
            candidates: options.readinessHasPublicCandidate
              ? [{ id: 'candidate-ready', readiness: 'GENERATABLE', reasons: [] }]
              : [],
            reviewCandidates: [{ id: 'blocked-3', resourceId: 'ocid1.instance.oc1.fixture', reasons: ['Falta memoria.'] }],
            blocked: [
              { id: 'blocked-1', reasons: ['Cobertura insuficiente.'] },
              { id: 'blocked-2', reasons: ['Cobertura insuficiente.'] },
              { id: 'blocked-3', resourceId: 'ocid1.instance.oc1.fixture', resourceName: 'web-prod-01',
                reasons: ['Reglas deterministicas detectaron bloqueos: MISSING_MEMORY_METRIC.'],
                evidencePeriod: { costStart: '2026-05-01T00:00:00.000Z', costEnd: '2026-06-01T00:00:00.000Z' },
                evidenceIssues: [{ code: 'MISSING_MEMORY_METRIC', action: 'Comprobar la emisión de memoria y el plugin OCI.' }] },
            ],
          },
        },
      });
    }
    if (path.endsWith('/ai/analysis-runs') && request.method() === 'POST') {
      queued = true;
      return json(route, { success: true, reused: false, run: pendingRun(), worker: workerStatus() }, 202);
    }
    if (path.endsWith('/ai/analysis-runs')) {
      if (tenantTwo) return json(route, { success: true, runs: [], worker: workerStatus() });
      if (queued) polls += 1;
      return json(route, { success: true, runs: queued ? [polls >= 1 ? completedRun() : pendingRun()] : [], worker: workerStatus() });
    }
    if (path.includes('/ai/analysis-runs/')) {
      return json(route, { success: true, run: polls >= 1 ? completedRun() : pendingRun(), worker: workerStatus() });
    }
    if (path.endsWith('/recommendations/rec-1/execution-plan') && request.method() === 'POST' && options.planRejected) {
      return json(route, {
        success: false,
        error: 'Execution plan generation rejected',
        code: 'AI_AUDIT_REJECTED',
        diagnosticId: 'private-diagnostic-id',
        audit: {
          verdict: 'REJECTED',
          score: 62,
          blockingIssues: ['La acción propuesta no coincide con la evidencia técnica.'],
          requiredChanges: ['Incluir un paso de reversión antes de ejecutar.'],
          failedChecks: [{ name: 'reversibilidad', notes: 'Falta un paso de reversión.' }],
        },
      }, 409);
    }
    if (path.endsWith('/recommendations/rec-1/execution-plan') && request.method() === 'POST' && options.planTimeout) {
      return json(route, {
        success: false,
        error: 'La generación del plan excedió el límite total de 120 segundos.',
        code: 'PROVIDER_TIMEOUT',
      }, 504);
    }
    if (path.endsWith('/recommendations/rec-1/execution-plans/latest')) {
      return json(route, { success: true, executionPlan: options.recommendationForReview ? approvedExecutionPlan() : null });
    }
    if (path.endsWith('/recommendations/rec-1/decisions') && request.method() === 'POST') {
      return json(route, { success: true, recommendation: { ...reviewRecommendation(), status: 'APPROVED' }, executionPlan: approvedExecutionPlan(), learning: { status: 'PENDING' } });
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

function reviewRecommendation() {
  return {
    id: 'rec-1', cloudAccountId: 'account-1', type: 'RIGHTSIZING', status: 'PENDING', severity: 'MEDIUM',
    title: 'Oportunidad auditada de prueba', description: 'Recomendación enlazada a un plan aprobado.',
    evidence: { candidateId: 'candidate-1' }, estimatedMonthlySavings: 10, currency: 'USD',
    createdAt: '2026-07-23T12:00:00.000Z', updatedAt: '2026-07-23T12:00:00.000Z',
  };
}

function approvedExecutionPlan() {
  return {
    id: 'execution-plan-e2e-1', recommendationId: 'rec-1', generatedByUserId: 'technician-1',
    model: 'gpt-5.6-luna', auditorModel: 'gpt-5.6-luna',
    content: {
      summary: 'Plan auditado para revisión del cliente', scope: { resource: 'compute-test' },
      prerequisites: ['Confirmar ventana de mantenimiento.'], steps: ['Revisar consumo.'],
      validation: ['Comprobar disponibilidad.'], risks: ['Interrupción temporal.'],
      rollback: ['Restaurar el tamaño anterior.'], successCriteria: ['La aplicación sigue disponible.'],
      estimatedSavings: { amount: 10, currency: 'USD' },
    },
    auditReport: { verdict: 'APPROVED', score: 95, checks: [], blockingIssues: [], requiredChanges: [] },
    auditVerdict: 'APPROVED', auditScore: 95, createdAt: '2026-07-23T12:00:00.000Z',
  };
}

function costOpportunity(isStale: boolean) {
  return {
    id: isStale ? 'stale-opportunity' : 'fresh-opportunity',
    serviceName: isStale ? 'Compute desactualizado' : 'Compute actualizado',
    periodStart: '2026-08-01T00:00:00.000Z',
    periodEnd: '2026-09-01T00:00:00.000Z',
    baselineCost: 1000,
    observedCost: 1140,
    deltaAmount: 140,
    deltaPercent: 14,
    severity: 'MEDIUM',
    status: 'OPEN',
    explanation: 'Variación del costo mensual.',
    detectedAt: '2026-09-01T00:00:00.000Z',
    isStale,
  };
}

function session(role: ApiRole, tenantId: string, accessToken: string) {
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
    candidateAudits: [{
      candidateId: 'resource-2',
      draftIndex: 0,
      auditVerdict: 'APPROVED',
      auditScore: 93,
      auditChecks: [],
      blockingIssues: [],
      requiredChanges: [],
      finalDisposition: 'REVIEW_DRAFT',
      draft: {
        title: 'Validar telemetría de memoria en web-prod-02',
        description: 'Confirmar en Monitoring si la métrica de memoria está habilitada y vinculada al recurso antes de evaluar capacidad.',
        estimatedMonthlySavings: undefined,
        evidence: { requiresTechnicalValidation: true, operationalAuthorization: 'NONE' },
      },
    }],
    recommendations: [{
      recommendationId: 'rec-1',
      candidateId: 'candidate-1',
      disposition: 'CREATED',
      title: 'Oportunidad auditada de prueba',
    }],
  };
}

function workerStatus() {
  return {
    available: true,
    processId: 'e2e-worker',
    processRole: 'recommendation-analysis-worker',
    lastHeartbeatAt: '2026-07-23T12:00:00.000Z',
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
  const requestedResource = url.searchParams.get('externalResourceId');
  const resources = technicalResources().filter((resource) => requestedResource === null || resource.externalResourceId === requestedResource);
  const points = resources.flatMap((resource, index) => {
    const dimensionHashes = requestedResource === null
      ? [`dimension-${index + 1}`]
      : ['aaaaaaaa11111111', 'bbbbbbbb22222222'];
    return dimensionHashes.map((dimensionsHash, streamIndex) => ({
      bucketStart: '2026-07-23T12:00:00.000Z',
      externalResourceId: resource.externalResourceId,
      cloudResourceId: resource.cloudResourceId,
      providerNamespace: 'oci_computeagent',
      regionId: resource.regionId,
      dimensionsHash,
      metricName: 'cpu_utilization',
      metricUnit: 'Percent',
      statistic,
      value: 10 + index + (streamIndex * 5),
      aggregationSemantics: 'MEAN_OF_NATIVE',
      sourceGranularitiesSeconds: [1800],
      avg: 10 + index + (streamIndex * 5),
      min: 8 + index + (streamIndex * 5),
      max: 12 + index + (streamIndex * 5),
      latest: 10 + index + (streamIndex * 5),
      sampleCount: 2,
      minSampledAt: '2026-07-23T11:30:00.000Z',
      maxSampledAt: '2026-07-23T12:00:00.000Z',
      latestSampledAt: '2026-07-23T12:00:00.000Z',
    }));
  });
  return {
    success: true,
    series: points,
    meta: {
      hasMore: false,
      returnedPoints: points.length,
      totalSamples: points.length * 2,
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
