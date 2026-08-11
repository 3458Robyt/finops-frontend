import { apiRequest } from './apiClient';
import type { TechnicalResourcesResponse, TechnicalResourceSummaryResponse, TechnicalSamplesResponse, TechnicalMetricBucket, TechnicalOverviewResponse, TechnicalSeriesResponse, TechnicalCoverageResponse } from './apiTypes';

export async function fetchTechnicalResources(
  token: string,
  limit?: number,
): Promise<TechnicalResourcesResponse> {
  const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
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
): Promise<TechnicalSamplesResponse> {
  const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiRequest<TechnicalSamplesResponse>(`/technical-metrics/samples${query}`, { token });
}

export async function fetchTechnicalMetricsOverview(
  token: string,
  params: {
    readonly startDate?: string;
    readonly endDate?: string;
    readonly externalResourceId?: string;
    readonly cloudResourceId?: string;
    readonly metricNames?: readonly string[];
  } = {},
): Promise<TechnicalOverviewResponse> {
  const query = buildTechnicalMetricsQuery(params);
  return apiRequest<TechnicalOverviewResponse>(`/technical-metrics/overview${query}`, { token });
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
  } = {},
): Promise<TechnicalCoverageResponse> {
  const query = buildTechnicalMetricsQuery(params);
  return apiRequest<TechnicalCoverageResponse>(`/technical-metrics/coverage${query}`, { token });
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

  const serialized = query.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
}
