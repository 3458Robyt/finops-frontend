// Recommendation analysis run DTOs.
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
