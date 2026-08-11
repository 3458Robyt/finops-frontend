import type {
  CostMetric,
  CostOpportunity,
  MonthlyUsagePoint,
  Recommendation,
  SavingsKpisResponse,
  UsageInsight,
} from '../../services/api';

export interface ChartPoint {
  readonly name: string;
  readonly asIs: number;
  readonly toBe: number;
}

export interface Suggestion {
  readonly id: string;
  readonly service: string;
  readonly title: string;
  readonly description: string;
  readonly saving: number;
  readonly source: 'AI' | 'FOCUS';
  readonly usageLabel?: string;
}

export const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function buildChartData(metrics: readonly CostMetric[]): ChartPoint[] {
  const dailyTotals = new Map<string, { label: string; total: number }>();

  for (const metric of metrics) {
    const date = new Date(metric.timestamp);
    const key = date.toISOString().slice(0, 10);
    const existing = dailyTotals.get(key);

    dailyTotals.set(key, {
      label: existing?.label ?? date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
      total: (existing?.total ?? 0) + metric.amount,
    });
  }

  return [...dailyTotals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => ({
      name: value.label,
      asIs: roundCurrency(value.total),
      toBe: roundCurrency(value.total * 0.86),
    }));
}

export function buildSuggestions(
  metrics: readonly CostMetric[],
  recommendations: readonly Recommendation[],
): Suggestion[] {
  const recommendationSuggestions = recommendations.slice(0, 6).map((recommendation) => ({
    id: recommendation.id,
    service: recommendation.type,
    title: recommendation.title,
    description: recommendation.description,
    saving: roundCurrency(recommendation.estimatedMonthlySavings ?? 0),
    source: readRecommendationSource(recommendation),
  }));

  if (recommendationSuggestions.length > 0) {
    return recommendationSuggestions;
  }

  const serviceTotals = new Map<string, number>();
  const serviceUsage = new Map<string, { usage: number; usageUnit: string }>();
  for (const metric of metrics) {
    serviceTotals.set(metric.service, (serviceTotals.get(metric.service) ?? 0) + metric.amount);
    if (metric.usage !== undefined && metric.usageUnit !== undefined) {
      const existing = serviceUsage.get(metric.service);
      if (existing === undefined || existing.usageUnit === metric.usageUnit) {
        serviceUsage.set(metric.service, {
          usage: (existing?.usage ?? 0) + metric.usage,
          usageUnit: metric.usageUnit,
        });
      }
    }
  }

  return [...serviceTotals.entries()]
    .sort(([, leftCost], [, rightCost]) => rightCost - leftCost)
    .slice(0, 3)
    .map(([service, cost]) => ({
      id: service,
      service,
      title: `Insight FOCUS preliminar: ${shortenServiceName(service)}`,
      description: 'Servicio priorizado por gasto y consumo facturado. Requiere IA y validación técnica antes de tratarlo como recomendación.',
      saving: roundCurrency(cost * 0.12),
      source: 'FOCUS',
      usageLabel: formatUsageLabel(serviceUsage.get(service)),
    }));
}

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function readRecommendationSource(recommendation: Recommendation): Suggestion['source'] {
  const source = readEvidenceString(recommendation.evidence, 'source')?.trim().toLowerCase();
  return source === 'nvidia-nim' ? 'AI' : 'FOCUS';
}

function readEvidenceString(value: unknown, key: string): string | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const property = (value as Record<string, unknown>)[key];
  return typeof property === 'string' ? property : undefined;
}

function shortenServiceName(service: string): string {
  return service
    .replace('Amazon ', '')
    .replace('Elastic Compute Cloud', 'EC2')
    .replace('Relational Database Service', 'RDS')
    .replace('Simple Storage Service', 'S3');
}

function formatUsageLabel(value: { readonly usage: number; readonly usageUnit: string } | undefined): string | undefined {
  return value === undefined ? undefined : `${formatCompactNumber(value.usage)} ${value.usageUnit}`;
}

export function buildDashboardCostRange(): { readonly startDate: string; readonly endDate: string } {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 900);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
}

export interface DashboardDerivedState {
  readonly totalCost: number;
  readonly chartData: readonly ChartPoint[];
  readonly suggestions: readonly Suggestion[];
  readonly identifiedWaste: number;
  readonly verifiedSavings: number;
  readonly roi: number;
  readonly openOpportunities: number;
  readonly acceptanceRate: number;
  readonly topUnitEconomics: readonly MonthlyUsagePoint[];
  readonly missedSavingsAmount: number;
  readonly dashboardBudget: { readonly amount: number } | undefined;
  readonly budgetUsage: number;
  readonly opportunities: readonly CostOpportunity[];
  readonly usageInsights: readonly UsageInsight[];
  readonly savingsKpis: SavingsKpisResponse['savings'] | null;
}
