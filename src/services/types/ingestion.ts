// Ingestion and readiness DTOs.
import type { CloudAuthenticationValidation, CloudCapabilityValidation, CloudOnboardingStatus } from './cloud';
export type IngestionSourceType =
  | 'BILLING_EXPORT'
  | 'INVENTORY'
  | 'TECHNICAL_METRIC'
  | 'AGENT_METRIC';
export type IngestionJobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'SKIPPED';
export type MetricProjectionStatus = 'NOT_REQUIRED' | 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
export type IngestionMetricCoverageStatus = 'UNKNOWN' | 'COVERED' | 'PARTIAL' | 'NO_DATA' | 'FAILED';
export type DataQualityStatus = 'PASSED' | 'WARNING' | 'FAILED';
export interface IngestionJobHistoryItem {
  readonly id: string;
  readonly cloudConnectionId: string;
  readonly sourceType: IngestionSourceType;
  readonly status: IngestionJobStatus;
  readonly projectionStatus?: MetricProjectionStatus;
  readonly projectionAttempts?: number;
  readonly projectionMaxAttempts?: number;
  readonly projectionAvailableAt?: string;
  readonly projectionStartedAt?: string;
  readonly projectionCompletedAt?: string;
  readonly projectionErrorMessage?: string;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly targetStart: string;
  readonly targetEnd: string;
  readonly errorMessage?: string;
  readonly progress?: Readonly<Record<string, unknown>>;
  readonly resultSummary?: Readonly<Record<string, unknown>>;
  readonly priority: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly availableAt: string;
  readonly cancelRequestedAt?: string;
  readonly archivedAt?: string;
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
export interface IngestionJobResponse { readonly success: true; readonly job: IngestionJobHistoryItem; }
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
  readonly lastValidationAttemptAt?: string;
  readonly onboardingStatus: CloudOnboardingStatus;
  readonly credentialPurposes: readonly string[];
  readonly authentication?: CloudAuthenticationValidation;
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
    readonly operational?: IngestionOperationalReadiness;
  };
}

export interface IngestionMetricCoverageWindowItem {
  readonly id: string;
  readonly cloudConnectionId: string;
  readonly cloudMetricDefinitionId?: string;
  readonly ingestionJobId?: string;
  readonly streamKey: string;
  readonly providerNamespace: string;
  readonly regionId: string;
  readonly externalResourceId: string;
  readonly metricName: string;
  readonly statistic: string;
  readonly granularitySeconds: number;
  readonly windowStart: string;
  readonly windowEnd: string;
  readonly status: IngestionMetricCoverageStatus;
  readonly expectedSamples: number;
  readonly observedSamples: number;
  readonly missingSamples: number;
  readonly configurationHash: string;
  readonly evidence?: Readonly<Record<string, unknown>>;
  readonly checkedAt?: string;
}

export interface IngestionMetricCoverageResponse {
  readonly success: true;
  readonly coverage: {
    readonly generatedAt: string;
    readonly connectionId: string;
    readonly filters: {
      readonly startDate?: string;
      readonly endDate?: string;
      readonly status?: IngestionMetricCoverageStatus;
    };
    readonly summary: {
      readonly totalWindows: number;
      readonly coveredWindows: number;
      readonly partialWindows: number;
      readonly noDataWindows: number;
      readonly failedWindows: number;
      readonly unknownWindows: number;
      readonly expectedSamples: number;
      readonly observedSamples: number;
      readonly missingSamples: number;
      readonly returnedWindows: number;
    };
    readonly windows: readonly IngestionMetricCoverageWindowItem[];
  };
}

export type IngestionOperationalJobState = 'IDLE' | 'WAITING_FOR_WORKER' | 'QUEUED' | 'RUNNING' | 'CANCEL_REQUESTED' | 'STALE';
export interface IngestionOperationalReadiness {
  readonly state: IngestionOperationalJobState;
  readonly queue: Readonly<Record<'pending' | 'running' | 'cancelRequested' | 'staleRunning', number>>;
  readonly oldestPendingAt?: string;
  readonly worker: { readonly available: boolean; readonly processId?: string; readonly processRole?: string; readonly lastHeartbeatAt?: string };
}
