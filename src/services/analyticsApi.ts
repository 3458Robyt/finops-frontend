import { apiRequest } from './apiClient';
import type { CostsResponse, RecommendationsResponse, AnalyticsGroupBy, AnalyticsOpportunitiesResponse, AnalyticsForecastResponse, AnalyticsUnitEconomicsResponse, AnalyticsEfficiencyInsightsResponse, AnalyticsRecomputeResponse } from './apiTypes';

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
