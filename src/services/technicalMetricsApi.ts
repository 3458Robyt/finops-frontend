import { apiRequest } from './apiClient';
import type { TechnicalResourcesResponse, TechnicalResourceSummaryResponse, TechnicalSamplesResponse, TechnicalMetricBucket, TechnicalOverviewResponse, TechnicalSeriesResponse, TechnicalCoverageResponse, MetricStatistic } from './apiTypes';

export async function fetchTechnicalResources(
  token: string,
  options: {
    readonly limit?: number;
    readonly costFilter?: 'ALL' | 'WITH_COST';
    readonly status?: string;
    readonly provider?: string;
    readonly query?: string;
  } = {},
): Promise<TechnicalResourcesResponse> {
  const queryParams = new URLSearchParams();
  if (options.limit !== undefined) queryParams.set('limit', String(options.limit));
  if (options.costFilter !== undefined) queryParams.set('costFilter', options.costFilter);
  if (options.status !== undefined && options.status !== 'ALL') queryParams.set('status', options.status);
  if (options.provider !== undefined && options.provider !== 'ALL') queryParams.set('provider', options.provider);
  if (options.query !== undefined && options.query.trim() !== '') queryParams.set('query', options.query.trim());
  const serialized = queryParams.toString();
  const query = serialized.length > 0 ? `?${serialized}` : '';
  return apiRequest<TechnicalResourcesResponse>(`/technical-metrics/resources${query}`, { token });
}

export async function fetchTechnicalResourceSummary(
  token: string,
  externalResourceId: string,
  cloudResourceId?: string,
): Promise<TechnicalResourceSummaryResponse> {
  const query = cloudResourceId === undefined ? '' : `?cloudResourceId=${encodeURIComponent(cloudResourceId)}`;
  return apiRequest<TechnicalResourceSummaryResponse>(
    `/technical-metrics/resources/${encodeURIComponent(externalResourceId)}/summary${query}`,
    { token },
  );
}

export async function fetchTechnicalMetricSamples(
  token: string,
  limit?: number,
  options: { readonly signal?: AbortSignal } = {},
): Promise<TechnicalSamplesResponse> {
  const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiRequest<TechnicalSamplesResponse>(`/technical-metrics/samples${query}`, { token, ...(options.signal !== undefined ? { signal: options.signal } : {}) });
}

export async function fetchTechnicalMetricsOverview(
  token: string,
  params: {
    readonly startDate?: string;
    readonly endDate?: string;
    readonly externalResourceId?: string;
    readonly cloudResourceId?: string;
    readonly metricNames?: readonly string[];
    readonly statistic?: MetricStatistic;
  } = {},
  options: { readonly signal?: AbortSignal } = {},
): Promise<TechnicalOverviewResponse> {
  const query = buildTechnicalMetricsQuery(params);
  return apiRequest<TechnicalOverviewResponse>(`/technical-metrics/overview${query}`, { token, ...(options.signal !== undefined ? { signal: options.signal } : {}) });
}

export async function fetchTechnicalMetricSeries(
  token: string,
  params: {
    readonly startDate?: string;
    readonly endDate?: string;
    readonly externalResourceId?: string;
    readonly cloudResourceId?: string;
    readonly metricNames?: readonly string[];
    readonly bucket?: TechnicalMetricBucket;
    readonly cursor?: string;
    readonly pageSize?: number;
    readonly statistic?: MetricStatistic;
  } = {},
  options: { readonly signal?: AbortSignal } = {},
): Promise<TechnicalSeriesResponse> {
  const query = buildTechnicalMetricsQuery(params);
  return apiRequest<TechnicalSeriesResponse>(`/technical-metrics/series${query}`, {
    token,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });
}

export async function fetchTechnicalMetricsCoverage(
  token: string,
  params: {
    readonly startDate?: string;
    readonly endDate?: string;
    readonly externalResourceId?: string;
    readonly cloudResourceId?: string;
    readonly statistic?: MetricStatistic;
  } = {},
  options: { readonly signal?: AbortSignal } = {},
): Promise<TechnicalCoverageResponse> {
  const query = buildTechnicalMetricsQuery(params);
  return apiRequest<TechnicalCoverageResponse>(`/technical-metrics/coverage${query}`, { token, ...(options.signal !== undefined ? { signal: options.signal } : {}) });
}

function buildTechnicalMetricsQuery(params: {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly externalResourceId?: string;
  readonly cloudResourceId?: string;
  readonly metricNames?: readonly string[];
  readonly bucket?: TechnicalMetricBucket;
  readonly cursor?: string;
  readonly pageSize?: number;
  readonly statistic?: MetricStatistic;
}): string {
  const query = new URLSearchParams();

  if (params.startDate !== undefined) {
    query.set('startDate', params.startDate);
  }
  if (params.endDate !== undefined) {
    query.set('endDate', params.endDate);
  }
  if (params.externalResourceId !== undefined) {
    query.set('externalResourceId', params.externalResourceId);
  }
  if (params.cloudResourceId !== undefined) {
    query.set('cloudResourceId', params.cloudResourceId);
  }
  if (params.metricNames !== undefined && params.metricNames.length > 0) {
    query.set('metricNames', params.metricNames.join(','));
  }
  if (params.bucket !== undefined) {
    query.set('bucket', params.bucket);
  }
  if (params.cursor !== undefined) {
    query.set('cursor', params.cursor);
  }
  if (params.pageSize !== undefined) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.statistic !== undefined) {
    query.set('statistic', params.statistic);
  }

  const serialized = query.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
}
