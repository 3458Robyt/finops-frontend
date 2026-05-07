const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

export type ApiRole = 'ADMIN' | 'VIEWER';
export type AppRole = 'admin' | 'client';

export interface ApiUser {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly name: string;
  readonly role: ApiRole;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly user: ApiUser;
}

export interface CostMetric {
  readonly resourceId: string;
  readonly service: string;
  readonly amount: number;
  readonly currency: string;
  readonly usage?: number;
  readonly usageUnit?: string;
  readonly timestamp: string;
  readonly tags: Readonly<Record<string, string>>;
}

export interface CostsResponse {
  readonly success: true;
  readonly summary: {
    readonly totalCost: number;
    readonly currency: string;
    readonly serviceBreakdown: Readonly<Record<string, {
      readonly cost: number;
      readonly currency: string;
      readonly usage?: number;
      readonly usageUnit?: string;
    }>>;
  };
  readonly metrics: readonly CostMetric[];
  readonly meta: {
    readonly count: number;
    readonly tenantId: string;
    readonly startDate: string;
    readonly endDate: string;
  };
}

export type RecommendationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL_COMPLETED';
export type RecommendationSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RecommendationFeedbackReason =
  | 'APPROVED_HIGH_CONFIDENCE'
  | 'APPROVED_LOW_RISK_QUICK_WIN'
  | 'REJECTED_INSUFFICIENT_EVIDENCE'
  | 'REJECTED_SAVINGS_UNREALISTIC'
  | 'REJECTED_OPERATIONAL_RISK'
  | 'REJECTED_BUSINESS_EXCEPTION'
  | 'REJECTED_ALREADY_HANDLED'
  | 'REJECTED_WRONG_SCOPE'
  | 'REJECTED_NOT_ACTIONABLE';

export interface Recommendation {
  readonly id: string;
  readonly cloudAccountId: string;
  readonly type: string;
  readonly status: RecommendationStatus;
  readonly severity: RecommendationSeverity;
  readonly title: string;
  readonly description: string;
  readonly evidence: unknown;
  readonly estimatedMonthlySavings?: number;
  readonly currency: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RecommendationsResponse {
  readonly success: true;
  readonly recommendations: readonly Recommendation[];
  readonly meta: {
    readonly count: number;
    readonly tenantId: string;
  };
}

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

export interface AnalyticsAnomaliesResponse {
  readonly success: true;
  readonly anomalies: readonly CostAnomaly[];
}

export interface AnalyticsForecastResponse {
  readonly success: true;
  readonly forecasts: readonly CostForecast[];
}

export interface AnalyticsTrendsResponse {
  readonly success: true;
  readonly trends: readonly CostTrend[];
}

export interface AnalyticsUsageResponse {
  readonly success: true;
  readonly usage: readonly MonthlyUsagePoint[];
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

export interface RecommendationDetailResponse {
  readonly success: true;
  readonly recommendation: Recommendation;
}

export type AiAuditVerdict = 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';

export interface AiAuditCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly notes: string;
}

export interface AiAuditReport {
  readonly verdict: AiAuditVerdict;
  readonly score: number;
  readonly checks: readonly AiAuditCheck[];
  readonly blockingIssues: readonly string[];
  readonly requiredChanges: readonly string[];
}

export interface RecommendationExecutionPlanContent {
  readonly summary: string;
  readonly scope: Readonly<Record<string, unknown>>;
  readonly prerequisites: readonly string[];
  readonly steps: readonly string[];
  readonly validation: readonly string[];
  readonly risks: readonly string[];
  readonly rollback: readonly string[];
  readonly successCriteria: readonly string[];
  readonly estimatedSavings?: {
    readonly amount?: number;
    readonly currency?: string;
  };
  readonly [key: string]: unknown;
}

export interface RecommendationExecutionPlan {
  readonly id: string;
  readonly recommendationId: string;
  readonly generatedByUserId: string;
  readonly model: string;
  readonly auditorModel: string;
  readonly content: RecommendationExecutionPlanContent;
  readonly auditReport: AiAuditReport;
  readonly auditVerdict: AiAuditVerdict;
  readonly auditScore: number;
  readonly createdAt: string;
}

export interface ExecutionPlanResponse {
  readonly success: true;
  readonly executionPlan: RecommendationExecutionPlan;
}

export interface LatestExecutionPlanResponse {
  readonly success: true;
  readonly executionPlan: RecommendationExecutionPlan | null;
}

export interface RecommendationDecisionResponse {
  readonly success: true;
  readonly recommendation: Recommendation;
  readonly executionPlan: RecommendationExecutionPlan;
  readonly learning: {
    readonly status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED' | 'ERROR';
    readonly eventId?: string;
    readonly error?: string;
  };
}

export type ManualExecutionStatus = 'PLANNED' | 'EXECUTED' | 'PARTIAL' | 'CANCELLED';

export interface RecommendationManualExecution {
  readonly id: string;
  readonly tenantId: string;
  readonly recommendationId: string;
  readonly executionPlanId?: string;
  readonly userId: string;
  readonly status: ManualExecutionStatus;
  readonly executedAt?: string;
  readonly observedMonthlySavings?: number;
  readonly currency: string;
  readonly notes?: string;
  readonly evidence?: unknown;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ManualExecutionResponse {
  readonly success: true;
  readonly execution: RecommendationManualExecution;
  readonly recommendation: Recommendation | null;
}

export interface RecommendationTimelineEvent {
  readonly id: string;
  readonly type: 'RECOMMENDATION_CREATED' | 'PLAN_GENERATED' | 'DECISION_RECORDED' | 'MANUAL_EXECUTION_RECORDED' | 'LEARNING_EVENT';
  readonly title: string;
  readonly description: string;
  readonly createdAt: string;
  readonly metadata?: unknown;
}

export interface RecommendationTimelineResponse {
  readonly success: true;
  readonly timeline: readonly RecommendationTimelineEvent[];
}

export interface SavingsKpisResponse {
  readonly success: true;
  readonly savings: {
    readonly estimatedMonthlySavings: number;
    readonly observedMonthlySavings: number;
    readonly confirmedMonthlySavings: number;
    readonly currency: string;
    readonly executedRecommendations: number;
  };
}

export interface AdoptionKpisResponse {
  readonly success: true;
  readonly adoption: {
    readonly totalRecommendations: number;
    readonly pendingRecommendations: number;
    readonly approvedRecommendations: number;
    readonly rejectedRecommendations: number;
    readonly completedRecommendations: number;
    readonly acceptanceRate: number;
    readonly rejectionRate: number;
    readonly executionRate: number;
  };
}

export interface AiChatMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

export interface AiContextSummary {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalCost: number;
  readonly currency: string;
  readonly metricCount: number;
}

export interface AiChatResponse {
  readonly success: true;
  readonly answer: string;
  readonly context: AiContextSummary;
}

export interface AiRecommendationGenerationResponse {
  readonly success: true;
  readonly persisted: boolean;
  readonly recommendations: readonly Recommendation[];
  readonly context: AiContextSummary;
}

interface ApiErrorBody {
  readonly error?: string;
  readonly code?: string;
}

export function mapApiRoleToAppRole(role: ApiRole): AppRole {
  return role === 'ADMIN' ? 'admin' : 'client';
}

export async function login(email: string, password: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchCosts(
  token: string,
  input?: { readonly startDate: string; readonly endDate: string },
): Promise<CostsResponse> {
  const params = input !== undefined
    ? new URLSearchParams({
      startDate: input.startDate,
      endDate: input.endDate,
    })
    : null;
  const query = params !== null ? `?${params.toString()}` : '';

  return apiRequest<CostsResponse>(`/costs${query}`, {
    token,
  });
}

export async function fetchRecommendations(token: string): Promise<RecommendationsResponse> {
  return apiRequest<RecommendationsResponse>('/recommendations', {
    token,
  });
}

export async function fetchAnalyticsAnomalies(token: string): Promise<AnalyticsAnomaliesResponse> {
  return apiRequest<AnalyticsAnomaliesResponse>('/analytics/anomalies', { token });
}

export async function fetchAnalyticsForecast(token: string): Promise<AnalyticsForecastResponse> {
  return apiRequest<AnalyticsForecastResponse>('/analytics/forecast', { token });
}

export async function fetchAnalyticsTrends(
  token: string,
  groupBy: AnalyticsGroupBy = 'service',
): Promise<AnalyticsTrendsResponse> {
  return apiRequest<AnalyticsTrendsResponse>(`/analytics/trends?groupBy=${encodeURIComponent(groupBy)}`, { token });
}

export async function fetchAnalyticsUsage(
  token: string,
  groupBy: AnalyticsGroupBy = 'service',
): Promise<AnalyticsUsageResponse> {
  return apiRequest<AnalyticsUsageResponse>(`/analytics/usage?groupBy=${encodeURIComponent(groupBy)}`, { token });
}

export async function fetchAnalyticsUnitEconomics(
  token: string,
  groupBy: AnalyticsGroupBy = 'service',
): Promise<AnalyticsUnitEconomicsResponse> {
  return apiRequest<AnalyticsUnitEconomicsResponse>(
    `/analytics/unit-economics?groupBy=${encodeURIComponent(groupBy)}`,
    { token },
  );
}

export async function fetchAnalyticsEfficiencyInsights(
  token: string,
  groupBy: AnalyticsGroupBy = 'service',
): Promise<AnalyticsEfficiencyInsightsResponse> {
  return apiRequest<AnalyticsEfficiencyInsightsResponse>(
    `/analytics/efficiency-insights?groupBy=${encodeURIComponent(groupBy)}`,
    { token },
  );
}

export async function recomputeAnalytics(token: string): Promise<AnalyticsRecomputeResponse> {
  return apiRequest<AnalyticsRecomputeResponse>('/analytics/recompute', {
    method: 'POST',
    token,
  });
}

export async function fetchRecommendationById(
  token: string,
  recommendationId: string,
): Promise<RecommendationDetailResponse> {
  return apiRequest<RecommendationDetailResponse>(`/recommendations/${encodeURIComponent(recommendationId)}`, {
    token,
  });
}

export async function generateRecommendationExecutionPlan(
  token: string,
  recommendationId: string,
): Promise<ExecutionPlanResponse> {
  return apiRequest<ExecutionPlanResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/execution-plan`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({}),
    },
  );
}

export async function fetchLatestRecommendationExecutionPlan(
  token: string,
  recommendationId: string,
): Promise<LatestExecutionPlanResponse> {
  return apiRequest<LatestExecutionPlanResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/execution-plans/latest`,
    {
      token,
    },
  );
}

export async function submitRecommendationDecision(
  token: string,
  recommendationId: string,
  input: {
    readonly executionPlanId: string;
    readonly decision: 'APPROVED' | 'REJECTED';
    readonly reasonCode: RecommendationFeedbackReason;
    readonly reason?: string;
  },
): Promise<RecommendationDecisionResponse> {
  return apiRequest<RecommendationDecisionResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/decisions`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    },
  );
}

export async function submitManualExecution(
  token: string,
  recommendationId: string,
  input: {
    readonly executionPlanId?: string;
    readonly status: ManualExecutionStatus;
    readonly executedAt?: string;
    readonly observedMonthlySavings?: number;
    readonly currency?: string;
    readonly notes?: string;
  },
): Promise<ManualExecutionResponse> {
  return apiRequest<ManualExecutionResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/manual-execution`,
    {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    },
  );
}

export async function fetchRecommendationTimeline(
  token: string,
  recommendationId: string,
): Promise<RecommendationTimelineResponse> {
  return apiRequest<RecommendationTimelineResponse>(
    `/recommendations/${encodeURIComponent(recommendationId)}/timeline`,
    { token },
  );
}

export async function fetchSavingsKpis(token: string): Promise<SavingsKpisResponse> {
  return apiRequest<SavingsKpisResponse>('/kpis/savings', { token });
}

export async function fetchAdoptionKpis(token: string): Promise<AdoptionKpisResponse> {
  return apiRequest<AdoptionKpisResponse>('/kpis/adoption', { token });
}

export async function sendAiChatMessage(
  token: string,
  input: {
    readonly message: string;
    readonly history?: readonly AiChatMessage[];
  },
): Promise<AiChatResponse> {
  return apiRequest<AiChatResponse>('/ai/chat', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function generateAiRecommendations(
  token: string,
  persist = false,
): Promise<AiRecommendationGenerationResponse> {
  return apiRequest<AiRecommendationGenerationResponse>('/ai/recommendations/generate', {
    method: 'POST',
    token,
    body: JSON.stringify({ persist }),
  });
}

async function apiRequest<T>(
  path: string,
  options: RequestInit & { readonly token?: string } = {},
): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'application/json');

  if (token !== undefined) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let body: ApiErrorBody = {};

    try {
      body = await response.json() as ApiErrorBody;
    } catch {
      body = {};
    }

    throw new Error(body.error ?? `API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
