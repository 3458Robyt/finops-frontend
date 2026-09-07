import type {
  CostMetric,
  CostOpportunity,
  CostHistoryResponse,
  MonthlyUsagePoint,
  Recommendation,
  SavingsKpisResponse,
  UsageInsight,
} from '../../services/api';

export interface ChartPoint {
  readonly timestamp: string;
  readonly asIs: number | null;
  readonly toBe: number | null;
  readonly conversionStatus: CostHistoryResponse['points'][number]['conversionStatus'];
}

export interface Suggestion {
  readonly id: string;
  readonly service: string;
  readonly title: string;
  readonly description: string;
  readonly saving: number;
  readonly currency: string;
  readonly source: 'AI' | 'FOCUS';
  readonly usageLabel?: string;
}

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function buildChartData(history: CostHistoryResponse | null): ChartPoint[] {
  return history?.points.map((point) => ({
    timestamp: point.periodStart,
    asIs: point.amount === null ? null : roundCurrency(point.amount),
    toBe: null,
    conversionStatus: point.conversionStatus,
  })) ?? [];
}

export function hasPlottableCostData(points: readonly ChartPoint[]): boolean {
  return points.some((point) => point.asIs !== null && Number.isFinite(point.asIs));
}

export function buildSuggestions(
  _metrics: readonly CostMetric[],
  recommendations: readonly Recommendation[],
): Suggestion[] {
  const recommendationSuggestions = recommendations.slice(0, 6).map((recommendation) => ({
    id: recommendation.id,
    service: recommendation.type,
    title: recommendation.title,
    description: recommendation.description,
    saving: roundCurrency(recommendation.estimatedMonthlySavings ?? 0),
    currency: recommendation.currency,
    source: readRecommendationSource(recommendation),
  }));
  return recommendationSuggestions;
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
  return source === 'nvidia-nim' || source === 'openai-compatible' ? 'AI' : 'FOCUS';
}

function readEvidenceString(value: unknown, key: string): string | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const property = (value as Record<string, unknown>)[key];
  return typeof property === 'string' ? property : undefined;
}

export function buildDashboardCostRange(): { readonly startDate: string; readonly endDate: string } {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 90);
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
