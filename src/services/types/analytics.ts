// Cost analytics DTOs.
import type { RecommendationSeverity } from './recommendations';
export type AnalyticsGroupBy = 'provider' | 'account' | 'service' | 'resource' | 'environment';
export interface CostAnomaly {
  readonly id: string;
  readonly cloudAccountId?: string;
  readonly provider?: string;
  readonly serviceName?: string;
  readonly resourceId?: string;
  readonly environment?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly baselineCost: number;
  readonly observedCost: number;
  readonly deltaAmount: number;
  readonly deltaPercent: number;
  readonly zScore?: number;
  readonly severity: RecommendationSeverity;
  readonly status: 'OPEN' | 'LINKED_TO_RECOMMENDATION' | 'RESOLVED';
  readonly explanation: string;
  readonly evidence?: unknown;
  readonly detectedAt: string;
}
export type CostOpportunity = CostAnomaly;
export interface CostForecast {
  readonly id: string;
  readonly cloudAccountId?: string;
  readonly provider?: string;
  readonly serviceName?: string;
  readonly groupBy: AnalyticsGroupBy | 'total';
  readonly groupKey: string;
  readonly forecastMonth: string;
  readonly predictedCost: number;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly method: string;
  readonly confidence: number;
  readonly currency: string;
  readonly evidence?: unknown;
  readonly generatedAt: string;
}
export interface CostTrendPoint {
  readonly month: string;
  readonly groupBy: AnalyticsGroupBy;
  readonly groupKey: string;
  readonly provider?: string;
  readonly cloudAccountId?: string;
  readonly serviceName?: string;
  readonly resourceId?: string;
  readonly environment?: string;
  readonly cost: number;
  readonly currency: string;
  readonly metricCount: number;
}
export interface CostTrend {
  readonly groupBy: AnalyticsGroupBy | 'total';
  readonly groupKey: string;
  readonly provider?: string;
  readonly cloudAccountId?: string;
  readonly serviceName?: string;
  readonly points: readonly CostTrendPoint[];
  readonly totalCost: number;
  readonly deltaAmount: number;
  readonly deltaPercent: number;
  readonly currency: string;
}
export interface MonthlyUsagePoint {
  readonly month: string;
  readonly groupBy: AnalyticsGroupBy;
  readonly groupKey: string;
  readonly provider?: string;
  readonly cloudAccountId?: string;
  readonly serviceName?: string;
  readonly resourceId?: string;
  readonly environment?: string;
  readonly consumedQuantity: number;
  readonly consumedUnit: string;
  readonly cost: number;
  readonly unitCost?: number;
  readonly currency: string;
  readonly metricCount: number;
}
export type UsageInsightKind =
  | 'CONSUMPTION_GROWTH'
  | 'UNIT_COST_INCREASE'
  | 'COST_USAGE_DIVERGENCE'
  | 'HIGH_USAGE_LOW_COST'
  | 'INSUFFICIENT_USAGE_DATA';
export interface UsageInsight {
  readonly id: string;
  readonly kind: UsageInsightKind;
  readonly severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
  readonly groupBy: AnalyticsGroupBy;
  readonly groupKey: string;
  readonly provider?: string;
  readonly cloudAccountId?: string;
  readonly serviceName?: string;
  readonly title: string;
  readonly description: string;
  readonly consumedQuantity?: number;
  readonly consumedUnit?: string;
  readonly cost?: number;
  readonly unitCost?: number;
  readonly deltaConsumptionPercent?: number;
  readonly deltaCostPercent?: number;
  readonly evidenceLevel: 'COST_ONLY' | 'COST_AND_USAGE' | 'COST_USAGE_AND_TECHNICAL';
  readonly currency: string;
  readonly evidence: unknown;
}
export interface AnalyticsOpportunitiesResponse {
  readonly success: true;
  readonly opportunities: readonly CostOpportunity[];
}
export interface AnalyticsForecastResponse {
  readonly success: true;
  readonly forecasts: readonly CostForecast[];
}
export type ForecastScenarioKind = 'BASELINE' | 'CURRENT_TREND' | 'APPROVED' | 'EXECUTED' | 'VERIFIED';
export interface CostForecastScenario {
  readonly scenario: ForecastScenarioKind;
  readonly groupBy: 'total';
  readonly groupKey: 'TENANT';
  readonly forecastMonth: string;
  readonly predictedCost: number;
  readonly savingsApplied: number;
  readonly confidence: number;
  readonly currency: string;
  readonly sourceForecastIds: readonly string[];
  readonly evidence: {
    readonly forecastCount: number;
    readonly baselineSource: 'WEIGHTED_AVERAGE' | 'PREDICTED_COST';
    readonly savingsSource: 'NONE' | 'APPROVED_ESTIMATE' | 'EXECUTED_MEASUREMENT' | 'VERIFIED_MEASUREMENT';
    readonly savingsScope: 'TENANT' | 'FILTERED_SCOPE' | 'NOT_AVAILABLE';
  };
}
export interface AnalyticsForecastScenariosResponse {
  readonly success: true;
  readonly scenarios: readonly CostForecastScenario[];
}
export interface AnalyticsUnitEconomicsResponse {
  readonly success: true;
  readonly unitEconomics: readonly MonthlyUsagePoint[];
}
export interface AnalyticsEfficiencyInsightsResponse {
  readonly success: true;
  readonly insights: readonly UsageInsight[];
}
export interface AnalyticsRecomputeResponse {
  readonly success: true;
  readonly anomalies: readonly CostAnomaly[];
  readonly forecasts: readonly CostForecast[];
  readonly trends: readonly CostTrend[];
  readonly usageInsights: readonly UsageInsight[];
  readonly insufficientData: boolean;
}
