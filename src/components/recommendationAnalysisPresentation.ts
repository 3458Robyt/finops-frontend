import type {
  RecommendationAnalysisRun,
  RecommendationAnalysisStage,
  RecommendationAnalysisStatus,
} from '../services/api';

export const stages: readonly RecommendationAnalysisStage[] = [
  'QUEUED',
  'SELECTING_DATA',
  'DETERMINISTIC_ANALYSIS',
  'EVIDENCE_GATE',
  'AI_GENERATION',
  'AI_AUDIT',
  'PERSISTENCE',
  'NOTIFICATION',
  'FINISHED',
];

export const stageLabels: Record<RecommendationAnalysisStage, string> = {
  QUEUED: 'En cola',
  SELECTING_DATA: 'Seleccionando datos',
  DETERMINISTIC_ANALYSIS: 'Análisis determinístico',
  EVIDENCE_GATE: 'Validando evidencia',
  AI_GENERATION: 'Generación IA',
  AI_AUDIT: 'Auditoría independiente',
  PERSISTENCE: 'Publicando recomendaciones',
  NOTIFICATION: 'Creando notificación',
  FINISHED: 'Finalizada',
};

export const statusLabels: Record<RecommendationAnalysisStatus, string> = {
  PENDING: 'Pendiente',
  RUNNING: 'En ejecución',
  COMPLETED: 'Completada',
  PARTIAL: 'Completada parcialmente',
  SKIPPED: 'Omitida',
  FAILED: 'Fallida',
  CANCELLED: 'Cancelada',
};

export function outcomeLabel(run: RecommendationAnalysisRun): string {
  if (run.errorCode === 'INSUFFICIENT_EVIDENCE') return 'Evidencia insuficiente';
  if (run.errorCode === 'NO_NEW_OPPORTUNITIES') return 'Sin oportunidades nuevas';
  if (run.errorCode === 'AI_AUDIT_REJECTED') return 'Rechazada por el auditor';
  if (run.errorCode === 'ANALYSIS_PROVIDER_ERROR') return 'Proveedor IA no disponible';
  return statusLabels[run.status];
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
