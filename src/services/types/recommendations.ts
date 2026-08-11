// Recommendation lifecycle, execution and savings DTOs.
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
