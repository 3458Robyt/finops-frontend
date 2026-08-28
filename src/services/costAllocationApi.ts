import { apiRequest, apiRequestRaw } from './apiClient';
import type { CostAllocationRule, CostAllocationRuleInput, AllocationSummary, AllocationPreview, CostAllocationClosure } from './apiTypes';

export async function fetchCostAllocationRules(token: string): Promise<{ readonly success: true; readonly rules: readonly CostAllocationRule[] }> { return apiRequest('/cost-allocation/rules', { token }); }

export async function fetchCostAllocationSummary(token: string, period: string, filters: { readonly cloudAccountId?: string; readonly serviceName?: string; readonly allocationKey?: string } = {}): Promise<{ readonly success: true; readonly summary: readonly AllocationSummary[] }> { const query = new URLSearchParams({ period }); if (filters.cloudAccountId !== undefined) query.set('cloudAccountId', filters.cloudAccountId); if (filters.serviceName !== undefined) query.set('serviceName', filters.serviceName); if (filters.allocationKey !== undefined) query.set('allocationKey', filters.allocationKey); return apiRequest(`/cost-allocation/summary?${query}`, { token }); }

export async function fetchCostAllocationComparison(token: string, period: string, filters: { readonly cloudAccountId?: string; readonly serviceName?: string; readonly allocationKey?: string } = {}): Promise<{ readonly success: true; readonly comparison: { readonly summary: readonly AllocationSummary[]; readonly previousSummary: readonly AllocationSummary[] } }> { const query = new URLSearchParams({ period }); if (filters.cloudAccountId !== undefined) query.set('cloudAccountId', filters.cloudAccountId); if (filters.serviceName !== undefined) query.set('serviceName', filters.serviceName); if (filters.allocationKey !== undefined) query.set('allocationKey', filters.allocationKey); return apiRequest(`/cost-allocation/comparison?${query}`, { token }); }

export async function fetchUnallocatedCosts(token: string, period: string, filters: { readonly currency?: string; readonly cloudAccountId?: string; readonly serviceName?: string } = {}): Promise<{ readonly success: true; readonly items: readonly { readonly cost: number; readonly currency: string; readonly serviceName: string; readonly cloudAccountId: string; readonly resourceId?: string; readonly cloudResourceId?: string; readonly suggestedCriteria: readonly string[] }[] }> { const query = new URLSearchParams({ period }); if (filters.currency !== undefined) query.set('currency', filters.currency); if (filters.cloudAccountId !== undefined) query.set('cloudAccountId', filters.cloudAccountId); if (filters.serviceName !== undefined) query.set('serviceName', filters.serviceName); return apiRequest(`/cost-allocation/unallocated?${query}`, { token }); }

export async function createCostAllocationRule(token: string, input: CostAllocationRuleInput): Promise<{ readonly success: true; readonly rule: CostAllocationRule }> { return apiRequest('/cost-allocation/rules', { method: 'POST', token, body: JSON.stringify(input) }); }

export async function updateCostAllocationRule(token: string, ruleId: string, input: Partial<CostAllocationRuleInput>): Promise<{ readonly success: true; readonly rule: CostAllocationRule }> { return apiRequest(`/cost-allocation/rules/${encodeURIComponent(ruleId)}`, { method: 'PATCH', token, body: JSON.stringify(input) }); }

export async function previewCostAllocationRule(token: string, rule: CostAllocationRuleInput, period: string, ruleId?: string): Promise<{ readonly success: true; readonly preview: AllocationPreview }> { return apiRequest('/cost-allocation/preview', { method: 'POST', token, body: JSON.stringify({ rule, period, ...(ruleId === undefined ? {} : { ruleId }) }) }); }

export async function activateCostAllocationRule(token: string, ruleId: string): Promise<{ readonly success: true; readonly rule: CostAllocationRule }> { return apiRequest(`/cost-allocation/rules/${encodeURIComponent(ruleId)}/activate`, { method: 'POST', token }); }

export async function archiveCostAllocationRule(token: string, ruleId: string): Promise<{ readonly success: true; readonly rule: CostAllocationRule }> { return apiRequest(`/cost-allocation/rules/${encodeURIComponent(ruleId)}/archive`, { method: 'POST', token }); }

export async function fetchResourceAllocation(token: string, resourceId: string, cloudResourceId?: string): Promise<{ readonly success: true; readonly summary: readonly AllocationSummary[] }> { const query = cloudResourceId === undefined ? '' : `?cloudResourceId=${encodeURIComponent(cloudResourceId)}`; return apiRequest(`/cost-allocation/resource/${encodeURIComponent(resourceId)}${query}`, { token }); }

export async function closeCostAllocationPeriod(token: string, period: string, replacementReason?: string): Promise<{ readonly success: true; readonly closures: readonly CostAllocationClosure[] }> { return apiRequest('/cost-allocation/periods/close', { method: 'POST', token, body: JSON.stringify({ period, confirmUnallocated: true, ...(replacementReason === undefined ? {} : { replacementReason }) }) }); }

export async function fetchCostAllocationClosures(token: string, period?: string): Promise<{ readonly success: true; readonly closures: readonly CostAllocationClosure[] }> { const query = period === undefined ? '' : `?period=${encodeURIComponent(period)}`; return apiRequest(`/cost-allocation/periods${query}`, { token }); }

export async function fetchCostAllocationClosure(token: string, closureId: string): Promise<{ readonly success: true; readonly closure: CostAllocationClosure }> { return apiRequest(`/cost-allocation/periods/${encodeURIComponent(closureId)}`, { token }); }

export async function compareCostAllocationClosures(token: string, closureId: string): Promise<{ readonly success: true; readonly current: CostAllocationClosure; readonly previous?: CostAllocationClosure }> { return apiRequest(`/cost-allocation/periods/${encodeURIComponent(closureId)}/compare`, { token }); }

export async function downloadCostAllocationCsv(token: string, period: string): Promise<string> { const response = await apiRequestRaw(`/cost-allocation/export.csv?period=${encodeURIComponent(period)}`, { token }); return response.text(); }
