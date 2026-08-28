import { apiRequest, apiRequestRaw } from './apiClient';
import type { ValueRealizationFilters, ValueRealizationSummary, ValueRealizationItem, ValueRealizationTrendPoint, ValueRealizationDestinationSummary } from './apiTypes';

export async function fetchValueRealizationSummary(
  token: string,
  filters: ValueRealizationFilters = {},
  options: { readonly signal?: AbortSignal } = {},
): Promise<{ readonly success: true; readonly summary: ValueRealizationSummary }> {
  return apiRequest(`/value-realization/summary${buildValueRealizationQuery(filters)}`, {
    token,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });
}

export async function fetchValueRealizationItems(
  token: string,
  filters: ValueRealizationFilters = {},
  options: { readonly signal?: AbortSignal } = {},
): Promise<{ readonly success: true; readonly page: { readonly items: readonly ValueRealizationItem[]; readonly hasMore: boolean; readonly nextCursor?: string } }> {
  return apiRequest(`/value-realization/items${buildValueRealizationQuery(filters)}`, {
    token,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });
}

export async function fetchValueRealizationTrend(
  token: string,
  filters: ValueRealizationFilters = {},
  options: { readonly signal?: AbortSignal } = {},
): Promise<{ readonly success: true; readonly points: readonly ValueRealizationTrendPoint[] }> {
  return apiRequest(`/value-realization/trend${buildValueRealizationQuery(filters)}`, {
    token,
    ...(options.signal !== undefined ? { signal: options.signal } : {}),
  });
}

export async function fetchValueRealizationDestinations(token: string, period: string, currency?: string): Promise<{ readonly success: true; readonly destinations: readonly ValueRealizationDestinationSummary[] }> {
  const query = new URLSearchParams({ period });
  if (currency !== undefined) query.set('currency', currency);
  return apiRequest(`/value-realization/destinations?${query.toString()}`, { token });
}

export async function reconcileValueRealization(token: string, limit = 50): Promise<{ readonly success: true; readonly result: Readonly<Record<string, number | string>> }> {
  return apiRequest('/value-realization/reconcile', { method: 'POST', token, body: JSON.stringify({ limit }) });
}

export function valueRealizationExportUrl(filters: ValueRealizationFilters = {}): string {
  return `/value-realization/export.csv${buildValueRealizationQuery(filters)}`;
}

export async function downloadValueRealizationCsv(token: string, filters: ValueRealizationFilters = {}): Promise<Blob> {
  const response = await apiRequestRaw(valueRealizationExportUrl(filters), { token });
  return response.blob();
}

function buildValueRealizationQuery(filters: ValueRealizationFilters): string {
  const query = new URLSearchParams();
  for (const key of ['status', 'currency', 'provider', 'cloudAccountId', 'serviceName', 'severity', 'search', 'cursor'] as const) {
    const value = filters[key];
    if (value !== undefined && value !== '') query.set(key, value);
  }
  if (filters.onlyIncreases === true) query.set('onlyIncreases', 'true');
  if (filters.onlyPending === true) query.set('onlyPending', 'true');
  if (filters.pageSize !== undefined) query.set('pageSize', String(filters.pageSize));
  const serialized = query.toString();
  return serialized === '' ? '' : `?${serialized}`;
}
