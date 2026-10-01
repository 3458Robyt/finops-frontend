export function leaseRecoveryDescription(summary: Readonly<Record<string, unknown>>): string | undefined {
  const history = summary['leaseRecoveryHistory'];
  if (!Array.isArray(history)) return undefined;
  const recovery = [...history].reverse().find(isRecord);
  if (recovery === undefined) return undefined;

  const actions: Readonly<Record<string, string>> = {
    FAILED: 'Lease vencido tras agotar reintentos',
    REQUEUED: 'Lease vencido; job reencolado',
    CANCELLED: 'Job cancelado tras vencer el lease',
  };
  const action = typeof recovery['action'] === 'string' ? actions[recovery['action']] : undefined;
  if (action === undefined) return undefined;

  const attempt = typeof recovery['attempt'] === 'number' && typeof recovery['maxAttempts'] === 'number'
    ? ` · intento ${recovery['attempt']}/${recovery['maxAttempts']}`
    : '';
  const lastHeartbeat = typeof recovery['lastHeartbeatAt'] === 'string'
    ? ` · último heartbeat ${formatDateTime(recovery['lastHeartbeatAt'])}`
    : '';
  const previousProgress = isRecord(recovery['lastProgress']) ? recovery['lastProgress'] : undefined;
  const progressMessage = typeof previousProgress?.['message'] === 'string'
    ? ` · último avance: ${previousProgress['message'].slice(0, 140)}`
    : '';
  return `${action}${attempt}${lastHeartbeat}${progressMessage}`;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'fecha no disponible'
    : new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
