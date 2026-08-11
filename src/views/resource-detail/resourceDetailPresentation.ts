import type {
  RecommendationFeedbackReason,
  RecommendationSeverity,
} from '../../services/api';

export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export const severityLabel: Readonly<Record<RecommendationSeverity, string>> = {
  CRITICAL: 'Critica',
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

export const approvalReasons: ReadonlyArray<{
  readonly value: RecommendationFeedbackReason;
  readonly label: string;
}> = [
  { value: 'APPROVED_HIGH_CONFIDENCE', label: 'Evidencia suficiente y accion viable' },
  { value: 'APPROVED_LOW_RISK_QUICK_WIN', label: 'Accion simple, bajo riesgo y beneficio claro' },
];

export const rejectionReasons: ReadonlyArray<{
  readonly value: RecommendationFeedbackReason;
  readonly label: string;
}> = [
  { value: 'REJECTED_INSUFFICIENT_EVIDENCE', label: 'Faltan metricas o evidencia tecnica' },
  { value: 'REJECTED_SAVINGS_UNREALISTIC', label: 'Ahorro estimado no creible' },
  { value: 'REJECTED_OPERATIONAL_RISK', label: 'Riesgo operativo mayor al beneficio' },
  { value: 'REJECTED_BUSINESS_EXCEPTION', label: 'Existe una excepcion de negocio' },
  { value: 'REJECTED_ALREADY_HANDLED', label: 'Ya fue implementada o esta en curso' },
  { value: 'REJECTED_WRONG_SCOPE', label: 'Cuenta, servicio, ambiente o recurso incorrecto' },
  { value: 'REJECTED_NOT_ACTIONABLE', label: 'Recomendacion demasiado generica' },
];
