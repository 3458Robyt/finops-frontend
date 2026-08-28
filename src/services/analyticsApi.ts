import { apiRequest } from './apiClient';
import type { CostsResponse, CostHistoryResponse, RecommendationsResponse, AnalyticsGroupBy, AnalyticsOpportunitiesResponse, AnalyticsForecastResponse, AnalyticsForecastScenariosResponse, AnalyticsUnitEconomicsResponse, AnalyticsEfficiencyInsightsResponse, AnalyticsRecomputeResponse } from './apiTypes';

export async function fetchCosts(
  token: string,
  input?: { readonly startDate: string; readonly endDate: string },
): Promise<CostsResponse> {
  const params = input !== undefined
    ? new URLSearchParams({
      startDate: input.startDate,
      endDate: input.endDate,
    })
    : null;
  const query = params !== null ? `?${params.toString()}` : '';

  return apiRequest<CostsResponse>(`/costs${query}`, {
    token,
  });
}

export async function fetchCostHistory(
  token: string,
  input: {
    readonly startDate?: string;
    readonly endDate?: string;
    readonly reportingCurrency?: string;
    readonly granularity?: 'day' | 'month';
    readonly rangeMode?: 'CALENDAR' | 'LATEST_AVAILABLE';
    readonly lookbackDays?: number;
    readonly signal?: AbortSignal;
  } = {},
): Promise<CostHistoryResponse> {
  const params = new URLSearchParams();
  if (input.startDate !== undefined) params.set('startDate', input.startDate);
  if (input.endDate !== undefined) params.set('endDate', input.endDate);
  if (input.reportingCurrency !== undefined) params.set('reportingCurrency', input.reportingCurrency);
  if (input.rangeMode !== undefined) params.set('rangeMode', input.rangeMode);
  if (input.lookbackDays !== undefined) params.set('lookbackDays', String(input.lookbackDays));
  params.set('granularity', input.granularity ?? 'day');
  return apiRequest<CostHistoryResponse>(`/costs/history?${params.toString()}`, { token, signal: input.signal });
}

export async function fetchRecommendations(
  token: string,
  filters: { readonly externalResourceId?: string; readonly cloudResourceId?: string } = {},
): Promise<RecommendationsResponse> {
  const params = new URLSearchParams();
  if (filters.externalResourceId !== undefined) {
    params.set('externalResourceId', filters.externalResourceId);
  }
  if (filters.cloudResourceId !== undefined) {
    params.set('cloudResourceId', filters.cloudResourceId);
  }
  const query = params.size > 0 ? `?${params.toString()}` : '';

  return apiRequest<RecommendationsResponse>(`/recommendations${query}`, {
    token,
  });
}

export async function fetchAnalyticsOpportunities(token: string): Promise<AnalyticsOpportunitiesResponse> {
  return apiRequest<AnalyticsOpportunitiesResponse>('/analytics/opportunities', { token });
}

export async function fetchAnalyticsForecast(token: string): Promise<AnalyticsForecastResponse> {
  return apiRequest<AnalyticsForecastResponse>('/analytics/forecast', { token });
}

export async function fetchAnalyticsForecastScenarios(token: string): Promise<AnalyticsForecastScenariosResponse> {
  return apiRequest<AnalyticsForecastScenariosResponse>('/analytics/forecast/scenarios', { token });
}

export async function fetchAnalyticsUnitEconomics(
  token: string,
  groupBy: AnalyticsGroupBy = 'service',
): Promise<AnalyticsUnitEconomicsResponse> {
  return apiRequest<AnalyticsUnitEconomicsResponse>(
    `/analytics/unit-economics?groupBy=${encodeURIComponent(groupBy)}`,
    { token },
  );
}

export async function fetchAnalyticsEfficiencyInsights(
  token: string,
  groupBy: AnalyticsGroupBy = 'service',
): Promise<AnalyticsEfficiencyInsightsResponse> {
  return apiRequest<AnalyticsEfficiencyInsightsResponse>(
    `/analytics/efficiency-insights?groupBy=${encodeURIComponent(groupBy)}`,
    { token },
  );
}

export async function recomputeAnalytics(token: string): Promise<AnalyticsRecomputeResponse> {
  return apiRequest<AnalyticsRecomputeResponse>('/analytics/recompute', {
    method: 'POST',
    token,
  });
}
