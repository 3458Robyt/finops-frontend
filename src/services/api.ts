const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

export type ApiRole =
  | 'ADMIN'
  | 'VIEWER'
  | 'OPERATOR_ADMIN'
  | 'FINOPS_TECHNICIAN'
  | 'CLIENT_APPROVER'
  | 'CLIENT_VIEWER';
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

export interface AnalyticsAnomaliesResponse {
  readonly success: true;
  readonly anomalies: readonly CostAnomaly[];
}

export interface AnalyticsOpportunitiesResponse {
  readonly success: true;
  readonly opportunities: readonly CostOpportunity[];
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
    readonly missedSavingsAmount: number;
    readonly currency: string;
    readonly executedRecommendations: number;
    readonly pendingSavingsRecommendations: number;
    readonly topMissedSavingsRecommendation?: {
      readonly id: string;
      readonly title: string;
      readonly missedSavingsAmount: number;
      readonly estimatedMonthlySavings: number;
      readonly currency: string;
      readonly createdAt: string;
      readonly status: RecommendationStatus;
    };
  };
}

export type InAppNotificationStatus = 'UNREAD' | 'READ' | 'DISMISSED';
export type InAppNotificationType = 'SAVINGS_REMINDER';

export interface InAppNotification {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly recommendationId?: string;
  readonly type: InAppNotificationType;
  readonly status: InAppNotificationStatus;
  readonly title: string;
  readonly message: string;
  readonly missedSavingsAmount?: number;
  readonly estimatedMonthlySavings?: number;
  readonly currency: string;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly generatedForDate?: string;
  readonly metadata?: unknown;
  readonly persisted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface NotificationsResponse {
  readonly success: true;
  readonly notifications: readonly InAppNotification[];
  readonly meta: {
    readonly count: number;
    readonly unreadCount: number;
    readonly previewCount: number;
  };
}

export interface NotificationResponse {
  readonly success: true;
  readonly notification: InAppNotification;
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

export interface AgentInstructionRules {
  readonly objective: string;
  readonly tone: string;
  readonly recommendationPriorities: readonly string[];
  readonly evidenceRequirements: readonly string[];
  readonly riskPolicy: string;
  readonly forbiddenActions: readonly string[];
}

export interface AgentInstructionProfile {
  readonly id: string;
  readonly version: number;
  readonly status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'REJECTED';
  readonly structuredRules: AgentInstructionRules;
  readonly freeformNotes?: string;
  readonly validationReport?: {
    readonly passed: boolean;
    readonly issues: readonly string[];
    readonly warnings: readonly string[];
  };
  readonly activatedAt?: string;
}

export interface TenantAgentRule {
  readonly id: string;
  readonly tenantId: string;
  readonly category: string;
  readonly ruleText: string;
  readonly priority: number;
  readonly status: 'ACTIVE' | 'DISABLED';
}

export interface AiContextTrace {
  readonly id: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly operation: 'CHAT' | 'RECOMMENDATION' | 'EXECUTION_PLAN' | 'AUDIT' | 'LEARNING';
  readonly model: string;
  readonly status: string;
  readonly profileVersion?: number;
  readonly promptTokenEstimate: number;
  readonly responseTokenEstimate?: number;
  readonly latencyMs?: number;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface KnowledgeGraphNode {
  readonly id: string;
  readonly nodeType: string;
  readonly label: string;
  readonly externalId?: string;
  readonly metadata?: unknown;
}

export interface KnowledgeGraphEdge {
  readonly id: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly relationType: string;
  readonly confidence: number;
  readonly metadata?: unknown;
}

export interface AgentProfileResponse {
  readonly success: true;
  readonly profile: AgentInstructionProfile;
}

export interface TenantRulesResponse {
  readonly success: true;
  readonly rules: readonly TenantAgentRule[];
}

export interface TenantRuleResponse {
  readonly success: true;
  readonly rule: TenantAgentRule;
}

export interface AiContextTracesResponse {
  readonly success: true;
  readonly traces: readonly AiContextTrace[];
}

export interface KnowledgeGraphResponse {
  readonly success: true;
  readonly graph: {
    readonly nodes: readonly KnowledgeGraphNode[];
    readonly edges: readonly KnowledgeGraphEdge[];
  };
}

export interface ContextBackfillResponse {
  readonly success: true;
  readonly summaries: {
    readonly runId: string;
    readonly summaryCount: number;
  };
  readonly graph: {
    readonly runId: string;
    readonly nodeCount: number;
    readonly edgeCount: number;
  };
}

export interface TelegramLinkedUser {
  readonly id: string;
  readonly tenantId: string;
  readonly email: string;
  readonly name: string;
  readonly role: ApiRole;
  readonly status: 'ACTIVE' | 'DISABLED';
}

export interface TelegramChatLink {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly chatId: string;
  readonly telegramUserId?: string;
  readonly telegramUsername?: string;
  readonly status: 'ACTIVE' | 'DISABLED';
  readonly linkedByUserId: string;
  readonly disabledAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly user?: TelegramLinkedUser;
}

export interface TelegramLinksResponse {
  readonly success: true;
  readonly links: readonly TelegramChatLink[];
}

export interface TelegramLinkResponse {
  readonly success: true;
  readonly link: TelegramChatLink;
}

interface ApiErrorBody {
  readonly error?: string;
  readonly code?: string;
}

export function mapApiRoleToAppRole(role: ApiRole): AppRole {
  return role === 'ADMIN' || role === 'OPERATOR_ADMIN' || role === 'FINOPS_TECHNICIAN'
    ? 'admin'
    : 'client';
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

export async function fetchAnalyticsOpportunities(token: string): Promise<AnalyticsOpportunitiesResponse> {
  return apiRequest<AnalyticsOpportunitiesResponse>('/analytics/opportunities', { token });
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

export async function fetchNotifications(token: string): Promise<NotificationsResponse> {
  return apiRequest<NotificationsResponse>('/notifications', { token });
}

export async function markNotificationRead(token: string, notificationId: string): Promise<NotificationResponse> {
  return apiRequest<NotificationResponse>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
    token,
  });
}

export async function dismissNotification(token: string, notificationId: string): Promise<NotificationResponse> {
  return apiRequest<NotificationResponse>(`/notifications/${encodeURIComponent(notificationId)}/dismiss`, {
    method: 'PATCH',
    token,
  });
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

export async function fetchAgentProfile(token: string): Promise<AgentProfileResponse> {
  return apiRequest<AgentProfileResponse>('/agent/profile', { token });
}

export async function activateAgentProfile(
  token: string,
  input: {
    readonly structuredRules: AgentInstructionRules;
    readonly freeformNotes?: string;
  },
): Promise<AgentProfileResponse> {
  return apiRequest<AgentProfileResponse>('/agent/profile/activate', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function fetchTenantAgentRules(token: string): Promise<TenantRulesResponse> {
  return apiRequest<TenantRulesResponse>('/agent/tenant-rules', { token });
}

export async function createTenantAgentRule(
  token: string,
  input: {
    readonly category: string;
    readonly ruleText: string;
    readonly priority?: number;
  },
): Promise<TenantRuleResponse> {
  return apiRequest<TenantRuleResponse>('/agent/tenant-rules', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function disableTenantAgentRule(token: string, ruleId: string): Promise<TenantRuleResponse> {
  return apiRequest<TenantRuleResponse>(`/agent/tenant-rules/${encodeURIComponent(ruleId)}/disable`, {
    method: 'PATCH',
    token,
  });
}

export async function fetchAiContextTraces(token: string): Promise<AiContextTracesResponse> {
  return apiRequest<AiContextTracesResponse>('/agent/context-traces', { token });
}

export async function fetchKnowledgeGraph(
  token: string,
  params: {
    readonly recommendationId?: string;
    readonly resourceId?: string;
  },
): Promise<KnowledgeGraphResponse> {
  const queryParams = new URLSearchParams();

  if (params.recommendationId !== undefined && params.recommendationId.trim().length > 0) {
    queryParams.set('recommendationId', params.recommendationId);
  }

  if (params.resourceId !== undefined && params.resourceId.trim().length > 0) {
    queryParams.set('resourceId', params.resourceId);
  }

  const query = queryParams.toString();
  return apiRequest<KnowledgeGraphResponse>(`/agent/knowledge-graph${query.length > 0 ? `?${query}` : ''}`, { token });
}

export async function backfillAgentContext(token: string): Promise<ContextBackfillResponse> {
  return apiRequest<ContextBackfillResponse>('/agent/context/backfill', {
    method: 'POST',
    token,
  });
}

export async function fetchTelegramLinks(token: string): Promise<TelegramLinksResponse> {
  return apiRequest<TelegramLinksResponse>('/telegram/links', { token });
}

export async function createTelegramLink(
  token: string,
  input: {
    readonly email: string;
    readonly chatId: string;
    readonly telegramUserId?: string;
    readonly telegramUsername?: string;
  },
): Promise<TelegramLinkResponse> {
  return apiRequest<TelegramLinkResponse>('/telegram/links', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function disableTelegramLink(token: string, linkId: string): Promise<TelegramLinkResponse> {
  return apiRequest<TelegramLinkResponse>(`/telegram/links/${encodeURIComponent(linkId)}/disable`, {
    method: 'PATCH',
    token,
  });
}

export async function sendTelegramTestMessage(token: string, linkId: string): Promise<TelegramLinkResponse> {
  return apiRequest<TelegramLinkResponse>(`/telegram/links/${encodeURIComponent(linkId)}/test-message`, {
    method: 'POST',
    token,
  });
}

export type IngestionSourceType =
  | 'BILLING_EXPORT'
  | 'INVENTORY'
  | 'TECHNICAL_METRIC'
  | 'AGENT_METRIC';

export type IngestionJobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type DataQualityStatus = 'PASSED' | 'WARNING' | 'FAILED';

export interface IngestionJobHistoryItem {
  readonly id: string;
  readonly cloudConnectionId: string;
  readonly sourceType: IngestionSourceType;
  readonly status: IngestionJobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly targetStart: string;
  readonly targetEnd: string;
  readonly errorMessage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DataQualityCheckItem {
  readonly id: string;
  readonly cloudConnectionId?: string;
  readonly sourceType: IngestionSourceType;
  readonly checkName: string;
  readonly status: DataQualityStatus;
  readonly observedAt: string;
  readonly expectedAt?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface IngestionHistoryResponse {
  readonly success: true;
  readonly jobs: readonly IngestionJobHistoryItem[];
}

export interface DataQualityResponse {
  readonly success: true;
  readonly checks: readonly DataQualityCheckItem[];
}

/**
 * Obtiene el historial de trabajos de ingesta del tenant autenticado.
 * El backend acota `limit` al rango [1, 200] (por defecto 50).
 */
export async function fetchIngestionHistory(
  token: string,
  limit?: number,
): Promise<IngestionHistoryResponse> {
  const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiRequest<IngestionHistoryResponse>(`/ingestion/history${query}`, { token });
}

/**
 * Obtiene los controles de calidad de datos del tenant autenticado.
 * El backend acota `limit` al rango [1, 200] (por defecto 50).
 */
export async function fetchDataQualityChecks(
  token: string,
  limit?: number,
): Promise<DataQualityResponse> {
  const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiRequest<DataQualityResponse>(`/ingestion/data-quality${query}`, { token });
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
