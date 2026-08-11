// Financial, allocation, budget and cost DTOs.
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
