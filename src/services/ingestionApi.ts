import { apiRequest } from './apiClient';
import type { IngestionHistoryResponse, IngestionJobResponse, DataQualityResponse, QueueIngestionJobInput, QueueIngestionJobResponse, QueueTechnicalBackfillInput, QueueTechnicalBackfillResponse, ConfigureFocusSourceInput, ConfigureFocusSourceResponse, BillingSourceMode, IngestionReadinessResponse, ResourceLinkageReadinessResponse, IngestionMetricCoverageResponse, IngestionMetricCoverageStatus } from './apiTypes';

export async function configureBillingSource(
  token: string,
  cloudConnectionId: string,
  mode: BillingSourceMode,
): Promise<{ readonly success: true; readonly billingSource: { readonly cloudConnectionId: string; readonly providerCode: string; readonly mode: BillingSourceMode } }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/billing-source`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ mode }),
  });
}

export async function fetchIngestionHistory(
  token: string,
  limit?: number,
  includeArchived = false,
): Promise<IngestionHistoryResponse> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (includeArchived) params.set('includeArchived', 'true');
  const query = params.toString() === '' ? '' : `?${params.toString()}`;
  return apiRequest<IngestionHistoryResponse>(`/ingestion/history${query}`, { token });
}

export async function fetchIngestionJob(token: string, jobId: string): Promise<IngestionJobResponse> {
  return apiRequest<IngestionJobResponse>(`/ingestion/jobs/${encodeURIComponent(jobId)}`, { token });
}

export async function cancelIngestionJob(token: string, jobId: string): Promise<IngestionJobResponse> {
  return apiRequest<IngestionJobResponse>(`/ingestion/jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', token, body: JSON.stringify({}) });
}

export async function archiveIngestionJob(token: string, jobId: string): Promise<IngestionJobResponse> {
  return apiRequest<IngestionJobResponse>(`/ingestion/jobs/${encodeURIComponent(jobId)}/archive`, { method: 'POST', token, body: JSON.stringify({}) });
}

export async function fetchDataQualityChecks(
  token: string,
  limit?: number,
): Promise<DataQualityResponse> {
  const query = limit !== undefined ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return apiRequest<DataQualityResponse>(`/ingestion/data-quality${query}`, { token });
}

export async function fetchIngestionReadiness(token: string): Promise<IngestionReadinessResponse> {
  return apiRequest<IngestionReadinessResponse>('/ingestion/readiness', { token });
}

export async function fetchMetricCoverage(
  token: string,
  connectionId: string,
  filters: { readonly startDate?: string; readonly endDate?: string; readonly status?: IngestionMetricCoverageStatus; readonly limit?: number } = {},
): Promise<IngestionMetricCoverageResponse> {
  const params = new URLSearchParams({ connectionId });
  if (filters.startDate !== undefined) params.set('startDate', filters.startDate);
  if (filters.endDate !== undefined) params.set('endDate', filters.endDate);
  if (filters.status !== undefined) params.set('status', filters.status);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  return apiRequest<IngestionMetricCoverageResponse>(`/ingestion/coverage?${params.toString()}`, { token });
}

export async function fetchResourceLinkageReadiness(token: string): Promise<ResourceLinkageReadinessResponse> {
  return apiRequest<ResourceLinkageReadinessResponse>('/ingestion/resource-linkage?limit=50', { token });
}

export async function queueIngestionJob(
  token: string,
  input: QueueIngestionJobInput,
): Promise<QueueIngestionJobResponse> {
  return apiRequest<QueueIngestionJobResponse>('/ingestion/jobs', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function queueTechnicalMetricBackfill(
  token: string,
  input: QueueTechnicalBackfillInput,
): Promise<QueueTechnicalBackfillResponse> {
  return apiRequest<QueueTechnicalBackfillResponse>('/ingestion/backfill', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function configureFocusSource(
  token: string,
  input: ConfigureFocusSourceInput,
): Promise<ConfigureFocusSourceResponse> {
  return apiRequest<ConfigureFocusSourceResponse>('/ingestion/focus-sources', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}
