// Cloud connections and onboarding DTOs.
import type { IngestionReadinessConnectionSummary, IngestionReadinessIssue } from './ingestion';
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
  readonly lastValidationAttemptAt?: string;
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
export type CloudCapabilityStatus = 'AVAILABLE' | 'NOT_CONFIGURED' | 'DENIED' | 'BLOCKED' | 'ERROR';
export type CloudAuthenticationStatus = 'VERIFIED' | 'REJECTED' | 'RETRYABLE_ERROR' | 'NOT_CONFIGURED';
export interface CloudAuthenticationValidation {
  readonly status: CloudAuthenticationStatus;
  readonly message: string;
  readonly checkedAt?: string;
}
export type CloudOnboardingStatus = 'NO_CREDENTIAL' | 'REQUIRES_VALIDATION' | 'SYNCING' | 'PARTIAL' | 'READY' | 'REQUIRES_ATTENTION';
export interface CloudCredentialSummary {
  readonly id: string;
  readonly purpose: CloudCredentialPurpose;
  readonly status: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'REVOKED' | 'EXPIRED' | 'INVALID';
  readonly label: string;
  readonly externalPrincipalId?: string;
  readonly keyFingerprint?: string;
  readonly createdAt: string;
  readonly disabledAt?: string;
  readonly revokedAt?: string;
  readonly validationStatus?: 'VERIFIED' | 'REJECTED' | 'RETRYABLE_ERROR' | 'NOT_CONFIGURED';
  readonly validationMessage?: string;
  readonly validationAttemptedAt?: string;
}
export interface CloudCapabilityValidation {
  readonly capability: string;
  readonly status: CloudCapabilityStatus;
  readonly message: string;
  readonly checkedAt?: string;
}
export type CloudCredentialNextAction = 'VALIDATE' | 'NONE';
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
