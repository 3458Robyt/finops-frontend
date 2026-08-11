// API DTOs shared by the frontend service modules. Keep transport functions out of this file.
import type { ApiRole } from './authTypes';

export interface ValueRealizationFilters {
  readonly status?: string;
  readonly currency?: string;
  readonly provider?: string;
  readonly cloudAccountId?: string;
  readonly serviceName?: string;
  readonly severity?: string;
  readonly search?: string;
  readonly onlyIncreases?: boolean;
  readonly onlyPending?: boolean;
  readonly cursor?: string;
  readonly pageSize?: number;
}
export interface ValueRealizationCurrencySummary {
  readonly currency: string;
  readonly estimatedMonthlySavings: number;
  readonly reportedMonthlySavings: number;
  readonly observedSavings: number;
  readonly projectedMonthlySavings: number;
  readonly verifiedMonthlySavings: number;
  readonly costIncreaseMonthlyAmount: number;
  readonly realizationRate: number;
  readonly varianceAgainstEstimate: number;
}
export interface ValueRealizationSummary {
  readonly generatedAt: string;
  readonly currencies: readonly ValueRealizationCurrencySummary[];
  readonly counts: Readonly<Record<string, number>>;
}
export interface ValueRealizationItem {
  readonly recommendationId: string;
  readonly title: string;
  readonly description: string;
  readonly recommendationStatus: string;
  readonly severity: string;
  readonly type: string;
  readonly cloudAccountId: string;
  readonly cloudAccountName: string;
  readonly provider: string;
  readonly serviceName?: string;
  readonly resourceId?: string;
  readonly currency: string;
  readonly estimatedMonthlySavings: number;
  readonly reportedMonthlySavings: number;
  readonly observedSavings?: number;
  readonly projectedMonthlySavings?: number;
  readonly verifiedMonthlySavings: number;
  readonly costIncreaseMonthlyAmount: number;
  readonly varianceAgainstEstimate: number;
  readonly coverageRatio?: number;
  readonly confidenceLevel?: string;
  readonly billingSource?: string;
  readonly costBasis?: string;
  readonly measurementStatus?: string;
  readonly executedAt?: string;
  readonly observationEnd?: string;
  readonly verifiedAt?: string;
  readonly nextAction: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface ValueRealizationTrendPoint {
  readonly period: string;
  readonly currency: string;
  readonly observedSavings: number;
  readonly verifiedMonthlySavings: number;
  readonly costIncreaseMonthlyAmount: number;
  readonly verifiedMeasurements: number;
}
export interface ValueRealizationDestinationSummary { readonly period: string; readonly allocationKey: string; readonly currency: string; readonly potentialSavings: number; readonly approvedSavings: number; readonly verifiedSavings: number; readonly observedSavings: number; readonly attributedRecommendations: number; }
export type CostAllocationRuleStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type CostAllocationMode = 'DIRECT' | 'SPLIT';
export type CostAllocationClosureStatus = 'CLOSED' | 'REPLACED';
export interface CostAllocationTarget { readonly percentage: number; readonly costCenter?: string; readonly businessUnit?: string; readonly project?: string; readonly team?: string; readonly environment?: string; }
export interface CostAllocationRule { readonly id: string; readonly name: string; readonly description?: string; readonly priority: number; readonly status: CostAllocationRuleStatus; readonly allocationMode: CostAllocationMode; readonly allocationTargets: readonly CostAllocationTarget[]; readonly configurationVersion: number; readonly configurationHash?: string; readonly lastPreviewedHash?: string; readonly lastPreviewedAt?: string; readonly cloudAccountId?: string; readonly provider?: string; readonly serviceName?: string; readonly regionId?: string; readonly resourceId?: string; readonly tagKey?: string; readonly tagValue?: string; readonly costCenter?: string; readonly businessUnit?: string; readonly project?: string; readonly team?: string; readonly environment?: string; }
export type CostAllocationRuleInput = Omit<CostAllocationRule, 'id' | 'allocationMode' | 'allocationTargets' | 'configurationHash' | 'configurationVersion'> & { readonly allocationMode?: CostAllocationMode; readonly allocationTargets?: readonly CostAllocationTarget[]; readonly configurationVersion?: number; readonly configurationHash?: string };
export interface AllocationBreakdown { readonly allocationKey: string; readonly cost: number; readonly metricCount: number; readonly resourceCount: number; readonly percentage?: number; readonly ruleId?: string; readonly shared: boolean; readonly costCenter?: string; readonly businessUnit?: string; readonly project?: string; readonly team?: string; readonly environment?: string; }
export interface AllocationSummary { readonly period: string; readonly currency: string; readonly totalCost: number; readonly allocatedCost: number; readonly unallocatedCost: number; readonly sharedCost: number; readonly coveragePercent: number; readonly dimensions: readonly AllocationBreakdown[]; }
export interface AllocationPreview { readonly summary: readonly AllocationSummary[]; readonly previousSummary: readonly AllocationSummary[]; readonly rulesUsed: readonly { readonly id: string; readonly name: string; readonly allocationMode: CostAllocationMode; readonly configurationVersion: number }[]; readonly metricCount: number; readonly resourceCount: number; readonly examples: readonly { readonly currency: string; readonly cost: number; readonly cloudAccountId: string; readonly serviceName: string; readonly resourceId?: string }[]; readonly financialImpact: { readonly budgets: readonly { readonly allocationKey: string; readonly currency: string; readonly budgetAmount: number; readonly projectedCost: number; readonly remainingBudget: number; readonly consumedPercent: number }[]; readonly savings: readonly ValueRealizationDestinationSummary[]; }; }
export interface CostAllocationClosure { readonly id: string; readonly tenantId: string; readonly period: string; readonly currency: string; readonly version: number; readonly status: CostAllocationClosureStatus; readonly sourceTotal: number; readonly allocatedTotal: number; readonly sharedTotal: number; readonly unallocatedTotal: number; readonly sourceHash: string; readonly rulesHash: string; readonly results: readonly AllocationBreakdown[]; readonly replacementReason?: string; readonly closedByUserId: string; readonly createdAt: string; }
export type BudgetScope = 'TENANT' | 'CLOUD_ACCOUNT' | 'SERVICE' | 'ALLOCATION_DESTINATION';
export type BudgetHealth = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'EXCEEDED' | 'UNAVAILABLE';
export interface Budget { readonly id: string; readonly scope: BudgetScope; readonly scopeKey: string; readonly cloudAccountId?: string; readonly serviceName?: string; readonly periodStart: string; readonly amount: number; readonly currency: string; readonly warningThreshold: number; readonly criticalThreshold: number; readonly exceededThreshold: number; readonly status: 'ACTIVE' | 'ARCHIVED'; }
export interface BudgetPerformance { readonly budget: Budget; readonly actualCost: number; readonly actualCostAvailable: boolean; readonly actualCostSource: 'COST_METRICS' | 'CLOSED_ALLOCATION' | 'NO_CLOSED_ALLOCATION'; readonly remainingBudget: number; readonly consumedPercent: number; readonly forecastCost?: number; readonly varianceAmount?: number; readonly variancePercent?: number; readonly health: BudgetHealth; readonly estimatedDepletionDate?: string; }
export interface BudgetsResponse { readonly success: true; readonly budgets: readonly Budget[]; }
export interface CostDataOptions {
  readonly periods: readonly { readonly period: string; readonly metricCount: number }[];
  readonly latestPeriod?: string;
  readonly cloudAccounts: readonly { readonly id: string; readonly name: string; readonly provider: string }[];
  readonly services: readonly string[];
  readonly regions: readonly string[];
  readonly currencies: readonly string[];
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
export interface AnalyticsOpportunitiesResponse {
  readonly success: true;
  readonly opportunities: readonly CostOpportunity[];
}
export interface AnalyticsForecastResponse {
  readonly success: true;
  readonly forecasts: readonly CostForecast[];
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
  readonly reportedMonthlySavings?: number;
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
  readonly type: 'RECOMMENDATION_CREATED' | 'PLAN_GENERATED' | 'DECISION_RECORDED' | 'MANUAL_EXECUTION_RECORDED' | 'SAVINGS_MEASUREMENT' | 'LEARNING_EVENT';
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
    readonly userReportedMonthlySavings: number;
    readonly verifiedMonthlySavings: number;
    readonly costIncreaseMonthlyAmount: number;
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
export type InAppNotificationType =
  | 'SAVINGS_REMINDER'
  | 'BUDGET_ALERT'
  | 'RECOMMENDATION_ANALYSIS_COMPLETED';
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
export type SavingsMeasurementStatus =
  | 'WAITING_FOR_DATA'
  | 'READY'
  | 'CALCULATED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'VERIFIED'
  | 'REJECTED'
  | 'FAILED';
export interface SavingsMeasurement {
  readonly id: string;
  readonly tenantId: string;
  readonly recommendationId: string;
  readonly manualExecutionId: string;
  readonly executionPlanId?: string;
  readonly status: SavingsMeasurementStatus;
  readonly scope: string;
  readonly provider: string;
  readonly cloudAccountId: string;
  readonly resourceId?: string;
  readonly serviceName?: string;
  readonly executedAt: string;
  readonly baselineStart: string;
  readonly baselineEnd: string;
  readonly observationStart: string;
  readonly observationEnd: string;
  readonly windowDays: number;
  readonly baselineCoveredDays: number;
  readonly observationCoveredDays: number;
  readonly coverageRatio: number;
  readonly billingSource: string;
  readonly costBasis?: 'EFFECTIVE' | 'BILLED';
  readonly currency: string;
  readonly baselineCost?: number;
  readonly observationCost?: number;
  readonly baselineDailyCost?: number;
  readonly observationDailyCost?: number;
  readonly observedSavings?: number;
  readonly projectedMonthlySavings?: number;
  readonly costIncreaseMonthlyAmount?: number;
  readonly baselineQuantity?: number;
  readonly observationQuantity?: number;
  readonly consumedUnit?: string;
  readonly calculationMethod: 'COST_DELTA' | 'UNIT_NORMALIZED';
  readonly baselineUnitCost?: number;
  readonly observationUnitCost?: number;
  readonly quantityChangeRatio?: number;
  readonly confidence?: number;
  readonly confidenceLevel?: string;
  readonly technicalValidationStatus: string;
  readonly reasons: readonly string[];
  readonly formula?: unknown;
  readonly evidence?: unknown;
  readonly evidenceHash: string;
  readonly calculationVersion: string;
  readonly verificationNote?: string;
  readonly rejectionReason?: string;
  readonly calculatedAt?: string;
  readonly verifiedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface SavingsMeasurementReadiness {
  readonly recommendationId: string;
  readonly manualExecutionId?: string;
  readonly status: SavingsMeasurementStatus | 'NO_EXECUTION';
  readonly windowDays: number;
  readonly baselineStart?: string;
  readonly baselineEnd?: string;
  readonly observationStart?: string;
  readonly observationEnd?: string;
  readonly availableThrough?: string;
  readonly reasons: readonly string[];
}
export interface SavingsMeasurementReadinessResponse {
  readonly success: true;
  readonly readiness: SavingsMeasurementReadiness;
}
export interface SavingsMeasurementResponse {
  readonly success: true;
  readonly measurement: SavingsMeasurement;
}
export interface SavingsMeasurementsResponse {
  readonly success: true;
  readonly measurements: readonly SavingsMeasurement[];
}
export interface CloudProviderCatalogEntry {
  readonly code: string;
  readonly displayName: string;
  readonly provider: 'AWS' | 'OCI' | 'AZURE' | 'GCP' | 'CUSTOM';
  readonly capabilities: readonly string[];
  readonly documentationUrl?: string;
  readonly enabled: boolean;
}
export type CloudCredentialPurpose = 'OPERATIONAL' | 'BILLING_EXPORT_READ' | 'INVENTORY_READ' | 'METRICS_READ' | 'STORAGE_READ';
export type CloudCapabilityStatus = 'AVAILABLE' | 'NOT_CONFIGURED' | 'DENIED' | 'ERROR';
export type CloudOnboardingStatus = 'NO_CREDENTIAL' | 'REQUIRES_VALIDATION' | 'SYNCING' | 'PARTIAL' | 'READY' | 'REQUIRES_ATTENTION';
export interface CloudCredentialSummary {
  readonly id: string;
  readonly purpose: CloudCredentialPurpose;
  readonly status: 'ACTIVE' | 'DISABLED' | 'REVOKED' | 'EXPIRED';
  readonly label: string;
  readonly externalPrincipalId?: string;
  readonly createdAt: string;
  readonly disabledAt?: string;
  readonly revokedAt?: string;
}
export interface CloudCapabilityValidation {
  readonly capability: string;
  readonly status: CloudCapabilityStatus;
  readonly message: string;
  readonly checkedAt?: string;
}
export interface CloudOnboardingDetail {
  readonly connection: CloudConnectionSummary;
  readonly credentials: readonly CloudCredentialSummary[];
  readonly readiness: IngestionReadinessConnectionSummary | null;
  readonly issues: readonly IngestionReadinessIssue[];
}
export interface CloudFocusPreview {
  readonly providerCode: string;
  readonly configuredLocations: number;
  readonly configuredObjects: number;
  readonly discoveredObjects: number;
  readonly approximateBytes: number;
  readonly sizedObjects: number;
  readonly supportedFormats: readonly string[];
  readonly errors: readonly string[];
  readonly earliestObjectAt?: string;
  readonly latestObjectAt?: string;
  readonly objects: readonly {
    readonly name: string;
    readonly location: string;
    readonly source: 'configured' | 'discovered';
    readonly sizeBytes?: number;
    readonly lastModified?: string;
  }[];
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
export type BillingSourceMode = 'AUTO' | 'FOCUS' | 'PROVIDER_API';
export interface IngestionReadinessIssue {
  readonly provider: string;
  readonly connectionId?: string;
  readonly severity: 'INFO' | 'WARNING' | 'BLOCKER';
  readonly capability: 'CONNECTION' | 'CREDENTIALS' | 'INVENTORY' | 'COSTS' | 'METRICS' | 'STORAGE' | 'JOBS';
  readonly message: string;
  readonly affectedData: readonly string[];
  readonly action: string;
  readonly actionCode: string;
}
export interface IngestionReadinessConnectionSummary {
  readonly id: string;
  readonly name: string;
  readonly providerCode: string;
  readonly defaultRegion?: string;
  readonly lastValidatedAt?: string;
  readonly onboardingStatus: CloudOnboardingStatus;
  readonly credentialPurposes: readonly string[];
  readonly capabilities: readonly CloudCapabilityValidation[];
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
export type ResourceLinkReasonCode =
  | 'EMPTY_RESOURCE_ID'
  | 'INVENTORY_RESOURCE_NOT_FOUND'
  | 'CONNECTION_NOT_AVAILABLE'
  | 'AMBIGUOUS_RESOURCE_ID'
  | 'SERVICE_LEVEL_COST'
  | 'INVALID_EXISTING_REFERENCE';
export type ResourceEvidenceStatus =
  | 'EVIDENCE_COMPLETE'
  | 'COST_ONLY'
  | 'TECHNICAL_ONLY'
  | 'INSUFFICIENT_EVIDENCE'
  | 'STALE_DATA';
export type ResourceFreshnessStatus = 'FRESH' | 'STALE' | 'NO_DATA';
export interface ResourceFreshness {
  readonly inventory: { readonly status: ResourceFreshnessStatus; readonly observedAt?: string };
  readonly costs: { readonly status: ResourceFreshnessStatus; readonly observedAt?: string };
  readonly metrics: { readonly status: ResourceFreshnessStatus; readonly observedAt?: string };
}
export interface ResourceLinkageTableCoverage {
  readonly total: number;
  readonly eligible: number;
  readonly linked: number;
  readonly notEligible: number;
  readonly unresolved: number;
  readonly ambiguous: number;
  readonly coveragePercent: number;
  readonly reasons: Partial<Record<ResourceLinkReasonCode, number>>;
}
export interface ResourceLinkageResourceCoverage {
  readonly id: string;
  readonly cloudConnectionId: string;
  readonly externalResourceId: string;
  readonly provider: string;
  readonly serviceName: string;
  readonly resourceType: string;
  readonly status: string;
  readonly costMetrics: number;
  readonly metricSamples: number;
  readonly recommendations: number;
  readonly coverage: 'COST_AND_TECHNICAL' | 'COST_ONLY' | 'TECHNICAL_ONLY' | 'INVENTORY_ONLY';
  readonly evidenceStatus: ResourceEvidenceStatus;
  readonly freshness: ResourceFreshness;
  readonly latestCostAt?: string;
  readonly latestMetricAt?: string;
}
export interface ResourceLinkageConnectionReadiness {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
  readonly inventoryResources: number;
  readonly costs: ResourceLinkageTableCoverage;
  readonly metrics: ResourceLinkageTableCoverage;
  readonly recommendations: ResourceLinkageTableCoverage;
  readonly freshness: ResourceFreshness;
  readonly status: 'READY' | 'PARTIAL' | 'BLOCKED' | 'NO_DATA';
}
export interface ResourceLinkageReadinessResponse {
  readonly success: true;
  readonly readiness: {
    readonly generatedAt: string;
    readonly status: 'READY' | 'PARTIAL' | 'BLOCKED' | 'NO_DATA';
    readonly inventoryResources: number;
    readonly linkedResourcesWithCost: number;
    readonly linkedResourcesWithMetrics: number;
    readonly linkedResourcesWithBoth: number;
    readonly costs: ResourceLinkageTableCoverage;
    readonly metrics: ResourceLinkageTableCoverage;
    readonly recommendations: ResourceLinkageTableCoverage;
    readonly resources: readonly ResourceLinkageResourceCoverage[];
    readonly connections: readonly ResourceLinkageConnectionReadiness[];
    readonly freshness: ResourceFreshness;
    readonly technicalRecommendationBlockers: readonly string[];
    readonly latestReconciliation?: {
      readonly observedAt: string;
      readonly status: string;
      readonly details?: Readonly<Record<string, unknown>>;
    };
  };
}
export type CloudResourceStatus = 'ACTIVE' | 'STOPPED' | 'TERMINATED' | 'UNKNOWN';
export interface CloudResourceItem {
  readonly id: string;
  readonly cloudConnectionId?: string;
  readonly provider: string;
  readonly externalResourceId: string;
  readonly name?: string;
  readonly resourceType: string;
  readonly serviceName: string;
  readonly regionId?: string;
  readonly status: CloudResourceStatus;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly lineage?: {
    readonly status: ResourceEvidenceStatus;
    readonly linkedCostCount: number;
    readonly linkedMetricSampleCount: number;
    readonly linkedRecommendationCount: number;
    readonly latestCostAt?: string;
    readonly latestMetricAt?: string;
    readonly freshness: ResourceFreshness;
  };
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
export interface TechnicalResourceSummary {
  readonly resource: CloudResourceItem;
  readonly metrics: readonly TechnicalMetricSummaryItem[];
  readonly coverage: TechnicalMetricCoverage;
  readonly evidence: {
    readonly strength: 'LOW' | 'MEDIUM' | 'HIGH';
    readonly readiness: 'GENERATABLE' | 'VALIDATION_ONLY' | 'BLOCKED_NO_EVIDENCE';
    readonly blockers: readonly string[];
    readonly ruleMatches: readonly string[];
  };
  readonly cost?: {
    readonly externalResourceId: string;
    readonly totalCost: number;
    readonly currency: string;
    readonly metricCount: number;
  };
}
export interface TechnicalResourceSummaryResponse {
  readonly success: true;
  readonly summary: TechnicalResourceSummary;
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
export interface TechnicalMetricSummaryItem {
  readonly provider: string;
  readonly externalResourceId: string;
  readonly cloudResourceId?: string;
  readonly cloudConnectionId?: string;
  readonly resourceType?: string;
  readonly serviceName?: string;
  readonly metricName: string;
  readonly metricUnit?: string;
  readonly sampleCount: number;
  readonly coverageDays: number;
  readonly min: number;
  readonly max: number;
  readonly avg: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly latest: number;
  readonly firstSampledAt: string;
  readonly latestSampledAt: string;
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
  readonly cloudResourceId?: string;
  readonly cloudConnectionId?: string;
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
  readonly cloudResourceId?: string;
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
export type RecommendationAnalysisStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'SKIPPED'
  | 'FAILED'
  | 'CANCELLED';
export type RecommendationAnalysisStage =
  | 'QUEUED'
  | 'SELECTING_DATA'
  | 'DETERMINISTIC_ANALYSIS'
  | 'EVIDENCE_GATE'
  | 'AI_GENERATION'
  | 'AI_AUDIT'
  | 'PERSISTENCE'
  | 'NOTIFICATION'
  | 'FINISHED';
export interface RecommendationAnalysisCandidate {
  readonly candidateId: string;
  readonly resourceId?: string;
  readonly readiness: string;
  readonly outcome: 'ELIGIBLE' | 'SKIPPED' | 'PUBLISHED' | 'REJECTED';
  readonly reasons: readonly string[];
  readonly recommendationId?: string;
}
export interface RecommendationAnalysisRun {
  readonly id: string;
  readonly trigger: 'MANUAL' | 'SCHEDULED' | 'POST_INGESTION' | 'RETRY';
  readonly scope: 'TENANT' | 'RESOURCE';
  readonly externalResourceId?: string;
  readonly cloudResourceId?: string;
  readonly status: RecommendationAnalysisStatus;
  readonly stage: RecommendationAnalysisStage;
  readonly periodStart?: string;
  readonly periodEnd?: string;
  readonly evidenceHash?: string;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly resourcesEvaluated: number;
  readonly candidatesFound: number;
  readonly candidatesSkipped: number;
  readonly recommendationsGenerated: number;
  readonly recommendationsRejected: number;
  readonly recommendationsPersisted: number;
  readonly model?: string;
  readonly auditorModel?: string;
  readonly promptTokenEstimate: number;
  readonly responseTokenEstimate: number;
  readonly latencyMs?: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly candidateResults?: readonly RecommendationAnalysisCandidate[];
  readonly recommendations: readonly {
    readonly recommendationId: string;
    readonly candidateId?: string;
    readonly disposition: 'CREATED' | 'REUSED';
    readonly title: string;
  }[];
}
export interface RecommendationAnalysisPreview {
  readonly scope: 'TENANT' | 'RESOURCE';
  readonly externalResourceId?: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly evidenceHash: string;
  readonly resourcesEvaluated: number;
  readonly candidatesFound: number;
  readonly candidatesSkipped: number;
  readonly readinessReport: {
    readonly summary: string;
    readonly candidates: readonly { readonly id: string; readonly reasons: readonly string[] }[];
    readonly blocked: readonly { readonly id: string; readonly reasons: readonly string[] }[];
    readonly deferred: readonly { readonly id: string; readonly reasons: readonly string[] }[];
  };
}
