import type {
  AiAuditReport,
  Recommendation,
  RecommendationExecutionPlan,
} from '../../services/api';

export interface EvidenceRecord {
  readonly source?: string;
  readonly environment?: string;
  readonly service?: string;
  readonly metric?: string;
  readonly action?: string;
  readonly accountCost?: number;
  readonly serviceCost?: number;
  readonly metricCount?: number;
  readonly evidenceLevel?: string;
  readonly focusLimitation?: string;
  readonly requiresTechnicalValidation?: boolean;
  readonly consumedQuantity?: number;
  readonly consumedUnit?: string;
  readonly unitCost?: number;
  readonly deltaConsumptionPercent?: number;
  readonly deltaCostPercent?: number;
  readonly schedulingPotential?: string;
  readonly utilizationCheckRequired?: boolean;
  readonly lifecyclePolicyRequired?: boolean;
  readonly raw: Readonly<Record<string, unknown>>;
}

export interface CanonicalEvidenceSnapshot {
  readonly hash: string;
  readonly availability: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly resources: readonly {
    readonly externalResourceId: string;
    readonly linkQuality: string;
    readonly metrics: readonly {
      readonly metricName: string;
      readonly avg?: number;
      readonly p95?: number;
      readonly sampleCount?: number;
      readonly coverageDays?: number;
      readonly evidenceRef?: string;
    }[];
    readonly ruleMatches: readonly string[];
    readonly blockers: readonly string[];
  }[];
}

export function normalizeAuditReport(
  value: unknown,
  score: number,
  verdict: RecommendationExecutionPlan['auditVerdict'],
): AiAuditReport {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Partial<AiAuditReport>;

    return {
      verdict: record.verdict ?? verdict,
      score: typeof record.score === 'number' ? record.score : score,
      checks: Array.isArray(record.checks) ? record.checks : [],
      blockingIssues: Array.isArray(record.blockingIssues) ? record.blockingIssues : [],
      requiredChanges: Array.isArray(record.requiredChanges) ? record.requiredChanges : [],
    };
  }

  return {
    verdict,
    score,
    checks: [],
    blockingIssues: [],
    requiredChanges: [],
  };
}

export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function readEvidence(value: unknown): EvidenceRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { raw: {} };
  }

  const raw = value as Record<string, unknown>;

  return {
    source: readString(raw, 'source'),
    environment: readString(raw, 'environment'),
    service: readString(raw, 'service') ?? readStringArray(raw, 'services')?.join(', '),
    metric: readString(raw, 'metric'),
    action: readString(raw, 'action'),
    accountCost: readNumber(raw, 'accountCost'),
    serviceCost: readNumber(raw, 'serviceCost'),
    metricCount: readNumber(raw, 'metricCount'),
    evidenceLevel: readString(raw, 'evidenceLevel'),
    focusLimitation: readString(raw, 'focusLimitation'),
    requiresTechnicalValidation: readBoolean(raw, 'requiresTechnicalValidation'),
    consumedQuantity: readNumber(raw, 'consumedQuantity'),
    consumedUnit: readString(raw, 'consumedUnit'),
    unitCost: readNumber(raw, 'unitCost'),
    deltaConsumptionPercent: readNumber(raw, 'deltaConsumptionPercent'),
    deltaCostPercent: readNumber(raw, 'deltaCostPercent'),
    schedulingPotential: readString(raw, 'schedulingPotential'),
    utilizationCheckRequired: readBoolean(raw, 'utilizationCheckRequired'),
    lifecyclePolicyRequired: readBoolean(raw, 'lifecyclePolicyRequired'),
    raw,
  };
}

export function readCanonicalEvidenceSnapshot(value: unknown): CanonicalEvidenceSnapshot | undefined {
  const record = asRecord(value);
  if (record === undefined) {
    return undefined;
  }

  const hash = readString(record, 'hash');
  const availability = readString(record, 'availability');
  const periodStart = readString(record, 'periodStart');
  const periodEnd = readString(record, 'periodEnd');
  const rawResources = Array.isArray(record['resources']) ? record['resources'] : [];
  if (hash === undefined || availability === undefined || periodStart === undefined || periodEnd === undefined) {
    return undefined;
  }

  return {
    hash,
    availability,
    periodStart,
    periodEnd,
    resources: rawResources.flatMap((item) => {
      const resource = asRecord(item);
      const externalResourceId = resource === undefined ? undefined : readString(resource, 'externalResourceId');
      if (resource === undefined || externalResourceId === undefined) {
        return [];
      }
      const metrics = Array.isArray(resource['metrics']) ? resource['metrics'] : [];
      const ruleEvaluation = asRecord(resource['ruleEvaluation']) ?? {};
      return [{
        externalResourceId,
        linkQuality: readString(resource, 'linkQuality') ?? 'UNKNOWN',
        metrics: metrics.flatMap((metric) => {
          const value = asRecord(metric);
          const metricName = value === undefined ? undefined : readString(value, 'metricName');
          if (value === undefined || metricName === undefined) {
            return [];
          }
          return [{
            metricName,
            avg: readNumber(value, 'avg'),
            p95: readNumber(value, 'p95'),
            sampleCount: readNumber(value, 'sampleCount'),
            coverageDays: readNumber(value, 'coverageDays'),
            evidenceRef: readString(value, 'evidenceRef'),
          }];
        }),
        ruleMatches: readUnknownStringArray(ruleEvaluation['ruleMatches']),
        blockers: readUnknownStringArray(ruleEvaluation['blockers']),
      }];
    }),
  };
}

export function readLearningInfluence(value: unknown): { readonly memoryIds: number; readonly caseIds: number } | null {
  const record = asRecord(value);
  if (record === undefined) {
    return null;
  }
  return {
    memoryIds: Array.isArray(record['memoryIds']) ? record['memoryIds'].length : 0,
    caseIds: Array.isArray(record['caseIds']) ? record['caseIds'].length : 0,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function readUnknownStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    : [];
}

export function formatNullableNumber(value: number | undefined): string {
  return value === undefined ? '—' : formatNumber(value);
}

export function formatEvidenceLevel(value: string | undefined): string {
  switch (value) {
    case 'COST_USAGE_AND_TECHNICAL':
      return 'Costo + consumo + metrica tecnica';
    case 'COST_AND_USAGE':
      return 'Costo + consumo FOCUS';
    case 'COST_ONLY':
      return 'Solo costo';
    default:
      return 'No especificado';
  }
}

export function formatUsageEvidence(evidence: EvidenceRecord): string {
  if (evidence.consumedQuantity === undefined || evidence.consumedUnit === undefined) {
    return 'No disponible';
  }

  return `${formatNumber(evidence.consumedQuantity)} ${evidence.consumedUnit}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

export function calculateMissedSavings(recommendation: Recommendation): number {
  const estimatedMonthlySavings = recommendation.estimatedMonthlySavings ?? 0;
  const createdAt = new Date(recommendation.createdAt);

  if (!Number.isFinite(createdAt.getTime()) || estimatedMonthlySavings <= 0) {
    return 0;
  }

  const elapsedDays = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / (24 * 60 * 60 * 1000)));
  return Math.round(((estimatedMonthlySavings / 30) * elapsedDays) * 100) / 100;
}

export function buildUsageChart(recommendation: Recommendation | null, evidence: EvidenceRecord): {
  readonly baselinePath: string;
  readonly costPath: string;
} {
  const cost = evidence.serviceCost ?? evidence.accountCost ?? recommendation?.estimatedMonthlySavings ?? 1;
  const severityBoost = recommendation?.severity === 'CRITICAL'
    ? 36
    : recommendation?.severity === 'HIGH'
      ? 28
      : recommendation?.severity === 'MEDIUM'
        ? 18
        : 10;
  const base = Math.max(35, Math.min(180, cost * 1.4 + severityBoost));
  const points = Array.from({ length: 11 }, (_, index) => {
    const x = index * 80;
    const variance = Math.sin(index * 1.7 + base) * 16;
    const y = Math.max(24, Math.min(224, 230 - base - variance));
    return `${x},${Math.round(y)}`;
  });
  const baseline = Array.from({ length: 11 }, (_, index) => {
    const x = index * 80;
    const y = Math.max(40, Math.min(230, 205 - severityBoost / 2 + Math.cos(index) * 8));
    return `${x},${Math.round(y)}`;
  });

  return {
    costPath: `M${points.join(' L')}`,
    baselinePath: `M${baseline.join(' L')}`,
  };
}

function readString(record: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function readStringArray(record: Readonly<Record<string, unknown>>, key: string): string[] | undefined {
  const value = record[key];

  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

function readNumber(record: Readonly<Record<string, unknown>>, key: string): number | undefined {
  const value = record[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readBoolean(record: Readonly<Record<string, unknown>>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

export function shortenType(type: string): string {
  return type
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
