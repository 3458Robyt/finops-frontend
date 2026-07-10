const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/$/, '');

export type ApiRole =
  | 'ADMIN'
  | 'MASTER_ADMIN'
  | 'VIEWER'
  | 'OPERATOR_ADMIN'
  | 'FINOPS_TECHNICIAN'
  | 'CLIENT_APPROVER'
  | 'CLIENT_VIEWER';
export type AppRole = 'admin' | 'client';

export interface ApiUser {
  readonly id: string;
  readonly tenantId: string;
  readonly homeTenantId: string;
  readonly email: string;
  readonly name: string;
  readonly role: ApiRole;
}

export type TenantAccessRole = 'HOME' | 'TECHNICIAN' | 'LEAD_TECHNICIAN' | 'OPERATOR_ADMIN' | 'MASTER';

export interface AuthTenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly accessRole: TenantAccessRole;
  readonly isCurrent: boolean;
}

export interface AuthSession {
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly user: ApiUser;
  readonly activeTenant: AuthTenant;
  readonly availableTenants: readonly AuthTenant[];
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

export interface ContextBackfillResponse {
  readonly success: true;
  readonly summaries: {
    readonly runId: string;
    readonly summaryCount: number;
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

export type OutboundMessageChannel = 'TELEGRAM' | 'EMAIL';
export type OutboundMessageType = 'TEST' | 'SAVINGS_REMINDER' | 'AI_CHAT_RESPONSE' | 'RECOMMENDATION_SUMMARY' | 'EXECUTION_PLAN_READY';
export type OutboundMessageStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface OutboundMessageDelivery {
  readonly id: string;
  readonly tenantId: string;
  readonly userId?: string;
  readonly recommendationId?: string;
  readonly channel: OutboundMessageChannel;
  readonly messageType: OutboundMessageType;
  readonly status: OutboundMessageStatus;
  readonly subject?: string;
  readonly preview: string;
  readonly providerMessageId?: string;
  readonly errorMessage?: string;
  readonly sentAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OutboundChannelStatusResponse {
  readonly success: true;
  readonly status: {
    readonly telegram: {
      readonly enabled: boolean;
      readonly botUsernameConfigured: boolean;
      readonly webhookSecretConfigured: boolean;
      readonly activeLinks: number;
      readonly totalLinks: number;
    };
    readonly email: {
      readonly enabled: boolean;
      readonly smtpConfigured: boolean;
    };
  };
}

export interface OutboundDeliveriesResponse {
  readonly success: true;
  readonly deliveries: readonly OutboundMessageDelivery[];
}

export interface OutboundSendResponse {
  readonly success: true;
  readonly deliveries: readonly OutboundMessageDelivery[];
  readonly attemptedUsers?: number;
}

export type CloudConnectionStatus = 'ACTIVE' | 'DISABLED' | 'ERROR' | 'PENDING_VALIDATION';

export interface CloudConnectionSummary {
  readonly id: string;
  readonly tenantId: string;
  readonly providerCode: string;
  readonly rootExternalId: string;
  readonly name: string;
  readonly status: CloudConnectionStatus;
  readonly defaultRegion?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly lastValidatedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CloudConnectionsResponse {
  readonly success: true;
  readonly connections: readonly CloudConnectionSummary[];
}

export type MasterAdminTenantStatus = 'ACTIVE' | 'SUSPENDED';
export type MasterAdminStaffRole = 'MASTER_ADMIN' | 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN' | 'ADMIN';
export type MasterAdminAssignmentRole = 'TECHNICIAN' | 'LEAD_TECHNICIAN' | 'OPERATOR_ADMIN';

export interface MasterAdminTenant {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: MasterAdminTenantStatus;
  readonly assignedUsers: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MasterAdminUser {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly email: string;
  readonly role: MasterAdminStaffRole;
  readonly status: 'ACTIVE' | 'DISABLED';
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MasterAdminAssignment {
  readonly id: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly userId: string;
  readonly userName: string;
  readonly userEmail: string;
  readonly role: MasterAdminAssignmentRole;
  readonly createdAt: string;
  readonly disabledAt: string | null;
}

export interface MasterAdminTenantsResponse {
  readonly success: true;
  readonly tenants: readonly MasterAdminTenant[];
}

export interface MasterAdminTenantResponse {
  readonly success: true;
  readonly tenant: MasterAdminTenant;
}

export interface MasterAdminUsersResponse {
  readonly success: true;
  readonly users: readonly MasterAdminUser[];
}

export interface MasterAdminUserResponse {
  readonly success: true;
  readonly user: MasterAdminUser;
}

export interface MasterAdminAssignmentsResponse {
  readonly success: true;
  readonly assignments: readonly MasterAdminAssignment[];
}

export interface MasterAdminAssignmentResponse {
  readonly success: true;
  readonly assignment: MasterAdminAssignment;
}

interface ApiErrorBody {
  readonly error?: string;
  readonly code?: string;
  readonly diagnosticId?: string;
  readonly audit?: unknown;
}

export class ApiRequestError extends Error {
  public readonly code?: string;
  public readonly status: number;
  public readonly diagnosticId?: string;
  public readonly audit?: unknown;

  constructor(message: string, input: { readonly status: number; readonly code?: string; readonly diagnosticId?: string; readonly audit?: unknown }) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = input.status;
    this.code = input.code;
    this.diagnosticId = input.diagnosticId;
    this.audit = input.audit;
  }
}

export function mapApiRoleToAppRole(role: ApiRole): AppRole {
  return role === 'ADMIN' || role === 'MASTER_ADMIN' || role === 'OPERATOR_ADMIN' || role === 'FINOPS_TECHNICIAN'
    ? 'admin'
    : 'client';
}

export async function login(email: string, password: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchAccessibleTenants(token: string): Promise<{
  readonly success: true;
  readonly activeTenant: AuthTenant | null;
  readonly availableTenants: readonly AuthTenant[];
}> {
  return apiRequest('/auth/tenants', { token });
}

export async function switchTenant(token: string, tenantId: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/switch-tenant', {
    method: 'POST',
    token,
    body: JSON.stringify({ tenantId }),
  });
}

export async function fetchCloudConnections(token: string): Promise<CloudConnectionsResponse> {
  return apiRequest<CloudConnectionsResponse>('/cloud-connections', { token });
}

export async function fetchMasterAdminTenants(token: string): Promise<MasterAdminTenantsResponse> {
  return apiRequest<MasterAdminTenantsResponse>('/master-admin/tenants', { token });
}

export async function createMasterAdminTenant(
  token: string,
  input: { readonly name: string; readonly slug?: string },
): Promise<MasterAdminTenantResponse> {
  return apiRequest<MasterAdminTenantResponse>('/master-admin/tenants', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function updateMasterAdminTenant(
  token: string,
  tenantId: string,
  input: { readonly name?: string; readonly status?: MasterAdminTenantStatus },
): Promise<MasterAdminTenantResponse> {
  return apiRequest<MasterAdminTenantResponse>(`/master-admin/tenants/${encodeURIComponent(tenantId)}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(input),
  });
}

export async function fetchMasterAdminUsers(token: string): Promise<MasterAdminUsersResponse> {
  return apiRequest<MasterAdminUsersResponse>('/master-admin/users', { token });
}

export async function createMasterAdminUser(
  token: string,
  input: {
    readonly name: string;
    readonly email: string;
    readonly role: 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN';
    readonly temporaryPassword: string;
  },
): Promise<MasterAdminUserResponse> {
  return apiRequest<MasterAdminUserResponse>('/master-admin/users', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function fetchMasterAdminAssignments(token: string): Promise<MasterAdminAssignmentsResponse> {
  return apiRequest<MasterAdminAssignmentsResponse>('/master-admin/assignments', { token });
}

export async function assignMasterAdminTenant(
  token: string,
  tenantId: string,
  userId: string,
  input: { readonly accessRole: MasterAdminAssignmentRole },
): Promise<MasterAdminAssignmentResponse> {
  return apiRequest<MasterAdminAssignmentResponse>(
    `/master-admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      token,
      body: JSON.stringify(input),
    },
  );
}

export async function revokeMasterAdminTenant(
  token: string,
  tenantId: string,
  userId: string,
): Promise<MasterAdminAssignmentResponse> {
  return apiRequest<MasterAdminAssignmentResponse>(
    `/master-admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      token,
    },
  );
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

export async function fetchOutboundChannelStatus(token: string): Promise<OutboundChannelStatusResponse> {
  return apiRequest<OutboundChannelStatusResponse>('/outbound-messages/status', { token });
}

export async function fetchOutboundDeliveries(token: string, limit = 30): Promise<OutboundDeliveriesResponse> {
  return apiRequest<OutboundDeliveriesResponse>(`/outbound-messages/deliveries?limit=${encodeURIComponent(String(limit))}`, { token });
}

export async function sendOutboundTestMessage(
  token: string,
  input: { readonly email?: string; readonly telegramLinkId?: string },
): Promise<OutboundSendResponse> {
  return apiRequest<OutboundSendResponse>('/outbound-messages/test', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function sendSavingsRemindersNow(token: string): Promise<OutboundSendResponse> {
  return apiRequest<OutboundSendResponse>('/outbound-messages/savings-reminders/send', {
    method: 'POST',
    token,
  });
}

export async function sendRecommendationSummaryNow(token: string): Promise<OutboundSendResponse> {
  return apiRequest<OutboundSendResponse>('/outbound-messages/recommendations/summary/send', {
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

export interface QueueIngestionJobInput {
  readonly cloudConnectionId: string;
  readonly sourceType: IngestionSourceType;
  readonly targetStart: string;
  readonly targetEnd: string;
}

export interface QueueIngestionJobResponse {
  readonly success: true;
  readonly job: IngestionJobHistoryItem;
}

export interface QueueTechnicalBackfillInput {
  readonly cloudConnectionId: string;
  readonly lookbackDays?: number;
  readonly windowHours?: number;
}

export interface QueueTechnicalBackfillResponse {
  readonly success: true;
  readonly backfill: {
    readonly cloudConnectionId: string;
    readonly sourceType: 'TECHNICAL_METRIC';
    readonly lookbackDays: number;
    readonly windowHours: number;
    readonly rangeStart: string;
    readonly rangeEnd: string;
    readonly createdJobs: readonly IngestionJobHistoryItem[];
    readonly skippedWindows: readonly {
      readonly targetStart: string;
      readonly targetEnd: string;
    }[];
  };
}

export interface ConfigureFocusSourceInput {
  readonly cloudConnectionId: string;
  readonly mode: 'location' | 'object';
  readonly replace: boolean;
  readonly values: Readonly<Record<string, string>>;
}

export interface ConfigureFocusSourceResponse {
  readonly success: true;
  readonly focusSource: {
    readonly cloudConnectionId: string;
    readonly providerCode: string;
    readonly mode: 'location' | 'object';
    readonly updatedKey: string;
    readonly configuredCount: number;
    readonly replaced: boolean;
  };
}

export interface IngestionReadinessIssue {
  readonly provider: string;
  readonly severity: 'INFO' | 'WARNING' | 'BLOCKER';
  readonly message: string;
}

export interface IngestionReadinessConnectionSummary {
  readonly id: string;
  readonly name: string;
  readonly providerCode: string;
  readonly defaultRegion?: string;
  readonly credentialPurposes: readonly string[];
  readonly metadataCounts: Readonly<Record<string, number>>;
  readonly recentJobs: readonly {
    readonly id: string;
    readonly sourceType: IngestionSourceType;
    readonly status: IngestionJobStatus;
    readonly targetStart: string;
    readonly targetEnd: string;
    readonly completedAt?: string;
    readonly hasError: boolean;
    readonly summary: Readonly<Record<string, unknown>> | null;
  }[];
}

export interface IngestionReadinessResponse {
  readonly success: true;
  readonly readiness: {
    readonly ok: boolean;
    readonly generatedAt: string;
    readonly connections: readonly IngestionReadinessConnectionSummary[];
    readonly issues: readonly IngestionReadinessIssue[];
  };
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

export async function fetchIngestionReadiness(token: string): Promise<IngestionReadinessResponse> {
  return apiRequest<IngestionReadinessResponse>('/ingestion/readiness', { token });
}

/**
 * Encola un trabajo de ingesta SDK para una conexion cloud del tenant.
 */
export async function queueIngestionJob(
  token: string,
  input: QueueIngestionJobInput,
): Promise<QueueIngestionJobResponse> {
  return apiRequest<QueueIngestionJobResponse>('/ingestion/jobs', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function queueTechnicalMetricBackfill(
  token: string,
  input: QueueTechnicalBackfillInput,
): Promise<QueueTechnicalBackfillResponse> {
  return apiRequest<QueueTechnicalBackfillResponse>('/ingestion/backfill', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function configureFocusSource(
  token: string,
  input: ConfigureFocusSourceInput,
): Promise<ConfigureFocusSourceResponse> {
  return apiRequest<ConfigureFocusSourceResponse>('/ingestion/focus-sources', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export type CloudResourceStatus = 'ACTIVE' | 'STOPPED' | 'TERMINATED' | 'UNKNOWN';

export interface CloudResourceItem {
  readonly id: string;
  readonly provider: string;
  readonly externalResourceId: string;
  readonly name?: string;
  readonly resourceType: string;
  readonly serviceName: string;
  readonly regionId?: string;
  readonly status: CloudResourceStatus;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
}

export interface ResourceMetricSampleItem {
  readonly id: string;
  readonly provider: string;
  readonly externalResourceId: string;
  readonly cloudResourceId?: string;
  readonly metricName: string;
  readonly metricUnit?: string;
  readonly value: number;
  readonly sampledAt: string;
  readonly granularitySeconds: number;
}

export interface TechnicalResourcesResponse {
  readonly success: true;
  readonly resources: readonly CloudResourceItem[];
}

export interface TechnicalSamplesResponse {
  readonly success: true;
  readonly samples: readonly ResourceMetricSampleItem[];
}

export type TechnicalMetricGroup = 'CPU' | 'MEMORY' | 'NETWORK' | 'DISK' | 'SYSTEM' | 'OTHER';
export type TechnicalMetricBucket = 'auto' | 'raw' | '30m' | 'hour' | 'day';
export type TechnicalCostMatchLevel = 'EXACT' | 'SERVICE' | 'NONE';

export interface TechnicalMetricCatalogItem {
  readonly metricName: string;
  readonly metricUnit?: string;
  readonly group: TechnicalMetricGroup;
  readonly sampleCount: number;
  readonly minSampledAt: string;
  readonly maxSampledAt: string;
}

export interface TechnicalMetricKpi {
  readonly id: string;
  readonly label: string;
  readonly group: TechnicalMetricGroup;
  readonly metricNames: readonly string[];
  readonly unit?: string;
  readonly average: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly latest: number;
  readonly latestSampledAt: string;
  readonly sampleCount: number;
}

export interface TechnicalMetricResourceSummary {
  readonly externalResourceId: string;
  readonly provider: string;
  readonly name?: string;
  readonly serviceName?: string;
  readonly resourceType?: string;
  readonly regionId?: string;
  readonly status?: string;
  readonly metricNames: readonly string[];
  readonly sampleCount: number;
  readonly minSampledAt: string;
  readonly maxSampledAt: string;
  readonly cost?: {
    readonly totalCost: number;
    readonly currency: string;
    readonly metricCount: number;
    readonly matchLevel: TechnicalCostMatchLevel;
  };
}

export interface TechnicalMetricOpportunity {
  readonly id: string;
  readonly severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';
  readonly title: string;
  readonly description: string;
  readonly externalResourceId?: string;
  readonly metricName?: string;
  readonly value?: number;
  readonly unit?: string;
  readonly cost?: number;
  readonly currency?: string;
}

export interface TechnicalMetricsOverview {
  readonly minSampledAt?: string;
  readonly maxSampledAt?: string;
  readonly latestSampledAt?: string;
  readonly resourceCount: number;
  readonly metricCount: number;
  readonly sampleCount: number;
  readonly resources: readonly TechnicalMetricResourceSummary[];
  readonly metrics: readonly TechnicalMetricCatalogItem[];
  readonly kpis: readonly TechnicalMetricKpi[];
  readonly opportunities: readonly TechnicalMetricOpportunity[];
}

export interface TechnicalMetricSeriesPoint {
  readonly bucketStart: string;
  readonly externalResourceId: string;
  readonly metricName: string;
  readonly metricUnit?: string;
  readonly avg: number;
  readonly min: number;
  readonly max: number;
  readonly latest: number;
  readonly sampleCount: number;
  readonly minSampledAt?: string;
  readonly maxSampledAt?: string;
  readonly latestSampledAt?: string;
}

export interface TechnicalMetricCoverageMetric {
  readonly metricName: string;
  readonly sampleCount: number;
  readonly daysWithData: number;
  readonly expectedDays: number;
  readonly coveragePercent: number;
  readonly minSampledAt?: string;
  readonly maxSampledAt?: string;
}

export interface TechnicalMetricCoverageDay {
  readonly date: string;
  readonly sampleCount: number;
  readonly metricCount: number;
  readonly status: 'WITH_DATA' | 'NO_DATA';
}

export interface TechnicalMetricCoverage {
  readonly rangeStart?: string;
  readonly rangeEnd?: string;
  readonly minSampledAt?: string;
  readonly maxSampledAt?: string;
  readonly totalSamples: number;
  readonly metricCount: number;
  readonly resourceCount: number;
  readonly expectedDays: number;
  readonly daysWithData: number;
  readonly coveragePercent: number;
  readonly metrics: readonly TechnicalMetricCoverageMetric[];
  readonly days: readonly TechnicalMetricCoverageDay[];
}

export interface TechnicalOverviewResponse {
  readonly success: true;
  readonly overview: TechnicalMetricsOverview;
}

export interface TechnicalSeriesResponse {
  readonly success: true;
  readonly series: readonly TechnicalMetricSeriesPoint[];
  readonly meta: {
    readonly hasMore: boolean;
    readonly nextCursor?: string;
    readonly returnedPoints: number;
    readonly totalSamples: number;
    readonly queryMs: number;
    readonly bucket: Exclude<TechnicalMetricBucket, 'auto'>;
    readonly pageSize: number;
  };
}

export interface TechnicalCoverageResponse {
  readonly success: true;
  readonly coverage: TechnicalMetricCoverage;
}

/**
 * Obtiene el inventario de recursos cloud del tenant autenticado.
 * Métricas técnicas reales (no derivadas de FOCUS). `limit` acotado a [1, 200].
 */
export async function fetchTechnicalResources(
  token: string,
  limit?: number,
): Promise<TechnicalResourcesResponse> {
  const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiRequest<TechnicalResourcesResponse>(`/technical-metrics/resources${query}`, { token });
}

/**
 * Obtiene las muestras de métricas técnicas (CPU, memoria, IOPS, etc.) del
 * tenant autenticado. No provienen de FOCUS. `limit` acotado a [1, 200].
 */
export async function fetchTechnicalMetricSamples(
  token: string,
  limit?: number,
): Promise<TechnicalSamplesResponse> {
  const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiRequest<TechnicalSamplesResponse>(`/technical-metrics/samples${query}`, { token });
}

export async function fetchTechnicalMetricsOverview(
  token: string,
  params: {
    readonly startDate?: string;
    readonly endDate?: string;
    readonly externalResourceId?: string;
    readonly metricNames?: readonly string[];
  } = {},
): Promise<TechnicalOverviewResponse> {
  const query = buildTechnicalMetricsQuery(params);
  return apiRequest<TechnicalOverviewResponse>(`/technical-metrics/overview${query}`, { token });
}

export async function fetchTechnicalMetricSeries(
  token: string,
  params: {
    readonly startDate?: string;
    readonly endDate?: string;
    readonly externalResourceId?: string;
    readonly metricNames?: readonly string[];
    readonly bucket?: TechnicalMetricBucket;
    readonly cursor?: string;
    readonly pageSize?: number;
  } = {},
  options: { readonly signal?: AbortSignal } = {},
): Promise<TechnicalSeriesResponse> {
  const query = buildTechnicalMetricsQuery(params);
  return apiRequest<TechnicalSeriesResponse>(`/technical-metrics/series${query}`, {
    token,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });
}

export async function fetchTechnicalMetricsCoverage(
  token: string,
  params: {
    readonly startDate?: string;
    readonly endDate?: string;
    readonly externalResourceId?: string;
  } = {},
): Promise<TechnicalCoverageResponse> {
  const query = buildTechnicalMetricsQuery(params);
  return apiRequest<TechnicalCoverageResponse>(`/technical-metrics/coverage${query}`, { token });
}

function buildTechnicalMetricsQuery(params: {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly externalResourceId?: string;
  readonly metricNames?: readonly string[];
  readonly bucket?: TechnicalMetricBucket;
  readonly cursor?: string;
  readonly pageSize?: number;
}): string {
  const query = new URLSearchParams();

  if (params.startDate !== undefined) {
    query.set('startDate', params.startDate);
  }
  if (params.endDate !== undefined) {
    query.set('endDate', params.endDate);
  }
  if (params.externalResourceId !== undefined) {
    query.set('externalResourceId', params.externalResourceId);
  }
  if (params.metricNames !== undefined && params.metricNames.length > 0) {
    query.set('metricNames', params.metricNames.join(','));
  }
  if (params.bucket !== undefined) {
    query.set('bucket', params.bucket);
  }
  if (params.cursor !== undefined) {
    query.set('cursor', params.cursor);
  }
  if (params.pageSize !== undefined) {
    query.set('pageSize', String(params.pageSize));
  }

  const serialized = query.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
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

    throw new ApiRequestError(body.error ?? `API request failed with status ${response.status}`, {
      status: response.status,
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.diagnosticId !== undefined ? { diagnosticId: body.diagnosticId } : {}),
      ...(body.audit !== undefined ? { audit: body.audit } : {}),
    });
  }

  return response.json() as Promise<T>;
}
