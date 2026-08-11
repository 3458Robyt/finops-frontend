// Ingestion and readiness DTOs.
import type { CloudCapabilityValidation, CloudOnboardingStatus } from './cloud';
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
