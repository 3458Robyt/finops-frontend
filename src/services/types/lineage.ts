// Resource identity and lineage DTOs.
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
export interface ResourceTagGovernance {
  readonly requiredKeys: readonly string[];
  readonly totalResources: number;
  readonly taggedResources: number;
  readonly compliantResources: number;
  readonly nonCompliantResources: number;
  readonly untaggedResources: number;
  readonly coveragePercent: number;
  readonly missingKeys: Partial<Record<string, number>>;
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
    readonly tagGovernance: ResourceTagGovernance;
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
