import type { IngestionDataOutcome } from './types/ingestion';

export function ingestionOutcomePresentation(outcome: IngestionDataOutcome): { readonly label: string; readonly tone: string } {
  const presentations: Readonly<Record<IngestionDataOutcome, { readonly label: string; readonly tone: string }>> = {
    DATA_WRITTEN: { label: 'Datos recibidos', tone: 'text-emerald-300' },
    NO_DATA: { label: 'Sin datos para el periodo', tone: 'text-amber-300' },
    PARTIAL: { label: 'Datos parciales', tone: 'text-amber-300' },
    INVALID_CONFIGURATION: { label: 'Configuración inválida', tone: 'text-red-300' },
    PROVIDER_ERROR: { label: 'Error del proveedor', tone: 'text-red-300' },
  };
  return presentations[outcome];
}

export function safeBillingWarning(summary: Readonly<Record<string, unknown>>): string | undefined {
  const warnings = summary['warnings'];
  if (!Array.isArray(warnings)) return undefined;
  for (const warning of warnings) {
    if (typeof warning !== 'string') continue;
    if (warning.startsWith('OCI no devolvió archivos de Cost Reports FOCUS')) {
      return 'OCI no devolvió reportes FOCUS. Verifica que Cost Reports esté habilitado y que exista permiso de lectura; la ausencia de archivos no equivale a costo cero.';
    }
    if (warning.startsWith('No se encontraron objetos de reporte FOCUS OCI en la ubicación consultada.')) {
      return 'OCI no devolvió reportes FOCUS. Verifica que Cost Reports esté habilitado y que exista permiso de lectura; la ausencia de archivos no equivale a costo cero.';
    }
    if (warning.startsWith('No se encontraron objetos de reporte FOCUS OCI configurados o descubiertos.')) {
      return 'OCI no devolvió reportes FOCUS. Verifica que Cost Reports esté habilitado y que exista permiso de lectura; la ausencia de archivos no equivale a costo cero.';
    }
    if (warning.startsWith('No se encontraron objetos de reporte FOCUS OCI para el periodo solicitado.')) {
      return 'No se encontraron reportes FOCUS para el rango solicitado. Verifica las fechas y vuelve a sincronizar cuando OCI publique ese periodo.';
    }
    if (warning.startsWith('OCI Usage API tampoco estuvo disponible;')) {
      return 'El respaldo OCI Usage API tampoco estuvo disponible; el periodo queda pendiente de una nueva sincronización.';
    }
  }
  return undefined;
}

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
