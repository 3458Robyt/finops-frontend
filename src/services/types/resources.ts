// Technical metric DTOs.
import type { CloudResourceStatus, ResourceEvidenceStatus, ResourceFreshness } from './lineage';
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
