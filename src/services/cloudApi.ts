import { apiRequest } from './apiClient';
import type { CostDataOptions, CloudConnectionSummary, CloudConnectionsResponse, CloudProviderCatalogEntry, CloudCredentialPurpose, CloudCredentialSummary, CloudCapabilityValidation, CloudOnboardingDetail, CloudFocusPreview, IngestionSourceType, IngestionJobHistoryItem } from './apiTypes';

export async function fetchCloudConnections(token: string): Promise<CloudConnectionsResponse> {
  return apiRequest<CloudConnectionsResponse>('/cloud-connections', { token });
}

export async function fetchCloudProviders(token: string): Promise<{ readonly success: true; readonly providers: readonly CloudProviderCatalogEntry[] }> {
  return apiRequest('/cloud-connections/providers', { token });
}

export async function createCloudConnection(token: string, input: {
  readonly providerCode: string;
  readonly rootExternalId: string;
  readonly name: string;
  readonly defaultRegion?: string;
}): Promise<{ readonly success: true; readonly connection: CloudConnectionSummary }> {
  return apiRequest('/cloud-connections', { method: 'POST', token, body: JSON.stringify(input) });
}

export async function updateCloudConnection(token: string, cloudConnectionId: string, input: {
  readonly name: string;
  readonly defaultRegion?: string;
}): Promise<{ readonly success: true; readonly connection: CloudConnectionSummary }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}`, {
    method: 'PATCH', token, body: JSON.stringify(input),
  });
}

export async function setCloudConnectionStatus(token: string, cloudConnectionId: string, status: 'ACTIVE' | 'DISABLED'): Promise<{ readonly success: true; readonly connection: CloudConnectionSummary }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/status`, {
    method: 'PATCH', token, body: JSON.stringify({ status }),
  });
}

export async function fetchCloudOnboarding(token: string, cloudConnectionId: string, signal?: AbortSignal): Promise<{ readonly success: true; readonly onboarding: CloudOnboardingDetail }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/onboarding`, { token, signal });
}

export async function storeCloudCredential(token: string, cloudConnectionId: string, input: {
  readonly purpose: CloudCredentialPurpose;
  readonly label: string;
  readonly payload: Readonly<Record<string, string>>;
}): Promise<{ readonly success: true; readonly credential: CloudCredentialSummary; readonly reused: boolean; readonly nextAction: 'VALIDATE' | 'NONE' }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/credentials`, {
    method: 'POST', token, body: JSON.stringify(input),
  });
}

export async function revokeCloudCredential(token: string, cloudConnectionId: string, credentialId: string): Promise<{ readonly success: true; readonly credential: CloudCredentialSummary }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/credentials/${encodeURIComponent(credentialId)}`, {
    method: 'DELETE', token,
  });
}

export async function validateCloudConnection(token: string, cloudConnectionId: string): Promise<{ readonly success: true; readonly validation: { readonly providerCode: string; readonly authentication?: { readonly status: string; readonly message: string; readonly checkedAt?: string }; readonly capabilities: readonly CloudCapabilityValidation[] } }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/validate`, { method: 'POST', token });
}

export async function validateCloudCredential(token: string, cloudConnectionId: string, credentialId: string): Promise<{ readonly success: true; readonly credential: CloudCredentialSummary; readonly validation: { readonly providerCode: string; readonly authentication?: { readonly status: string; readonly message: string; readonly checkedAt?: string }; readonly capabilities: readonly CloudCapabilityValidation[] } }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/credentials/${encodeURIComponent(credentialId)}/validate`, { method: 'POST', token });
}

export async function activateCloudConnection(token: string, cloudConnectionId: string, input: {
  readonly billingLookbackDays?: number;
  readonly metricLookbackDays?: number;
  readonly metricWindowHours?: number;
}): Promise<{ readonly success: true; readonly activation: { readonly cloudConnectionId: string; readonly createdJobs: readonly IngestionJobHistoryItem[]; readonly skipped: readonly IngestionSourceType[]; readonly unavailable: readonly IngestionSourceType[] } }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/activate`, {
    method: 'POST', token, body: JSON.stringify(input),
  });
}

export async function retryFailedCloudIngestion(token: string, cloudConnectionId: string, sourceType: IngestionSourceType): Promise<{ readonly success: true; readonly jobs: readonly IngestionJobHistoryItem[] }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/ingestion-jobs/retry-failed`, {
    method: 'POST', token, body: JSON.stringify({ sourceType }),
  });
}

export async function cancelPendingCloudIngestion(token: string, cloudConnectionId: string, sourceType: IngestionSourceType): Promise<{ readonly success: true; readonly sourceType: IngestionSourceType; readonly cancelled: number }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/ingestion-jobs/cancel-pending`, {
    method: 'POST', token, body: JSON.stringify({ sourceType }),
  });
}

export async function configureCloudMetricDefinitions(token: string, cloudConnectionId: string, input: {
  readonly definitions: readonly Readonly<Record<string, unknown>>[];
  readonly replace: boolean;
}): Promise<{ readonly success: true; readonly metricDefinitions: { readonly configuredCount: number; readonly updatedKey: string; readonly replaced: boolean } }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/metric-definitions`, {
    method: 'PUT', token, body: JSON.stringify(input),
  });
}

export async function previewCloudFocusSource(token: string, cloudConnectionId: string, limit = 100): Promise<{ readonly success: true; readonly preview: CloudFocusPreview }> {
  return apiRequest(`/cloud-connections/${encodeURIComponent(cloudConnectionId)}/focus-preview`, {
    method: 'POST', token, body: JSON.stringify({ limit }),
  });
}

export async function fetchCostDataOptions(token: string, period?: string): Promise<{ readonly success: true; readonly options: CostDataOptions }> {
  const query = period === undefined ? '' : `?period=${encodeURIComponent(period)}`;
  return apiRequest(`/costs/options${query}`, { token });
}
