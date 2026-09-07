import { apiRequest } from './apiClient';
import type { ClientInvitationRole, MasterAdminTenantStatus, MasterAdminAssignmentRole, MasterAdminTenantsResponse, MasterAdminTenantResponse, MasterAdminUsersResponse, MasterAdminUserResponse, MasterAdminAssignmentsResponse, MasterAdminAssignmentResponse, MasterAdminClientInvitationResponse, MasterAdminClientInvitationsResponse, MasterAdminDeletedPendingJobsResponse, MasterAdminIngestionJobResponse, MasterAdminIngestionJobsResponse } from './apiTypes';

export async function fetchMasterAdminTenants(token: string): Promise<MasterAdminTenantsResponse> {
  return apiRequest<MasterAdminTenantsResponse>('/master-admin/tenants', { token });
}

export async function createMasterAdminTenant(
  token: string,
  input: { readonly name: string; readonly slug?: string },
): Promise<MasterAdminTenantResponse> {
  return apiRequest<MasterAdminTenantResponse>('/master-admin/tenants', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function updateMasterAdminTenant(
  token: string,
  tenantId: string,
  input: { readonly name?: string; readonly status?: MasterAdminTenantStatus },
): Promise<MasterAdminTenantResponse> {
  return apiRequest<MasterAdminTenantResponse>(`/master-admin/tenants/${encodeURIComponent(tenantId)}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(input),
  });
}

export async function fetchMasterAdminUsers(token: string): Promise<MasterAdminUsersResponse> {
  return apiRequest<MasterAdminUsersResponse>('/master-admin/users', { token });
}

export async function createMasterAdminUser(
  token: string,
  input: {
    readonly name: string;
    readonly email: string;
    readonly role: 'OPERATOR_ADMIN' | 'LEAD_TECHNICIAN' | 'FINOPS_TECHNICIAN';
    readonly temporaryPassword: string;
  },
): Promise<MasterAdminUserResponse> {
  return apiRequest<MasterAdminUserResponse>('/master-admin/users', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export async function fetchMasterAdminAssignments(token: string): Promise<MasterAdminAssignmentsResponse> {
  return apiRequest<MasterAdminAssignmentsResponse>('/master-admin/assignments', { token });
}

export async function assignMasterAdminTenant(
  token: string,
  tenantId: string,
  userId: string,
  input: { readonly accessRole: MasterAdminAssignmentRole },
): Promise<MasterAdminAssignmentResponse> {
  return apiRequest<MasterAdminAssignmentResponse>(
    `/master-admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
    {
      method: 'PUT',
      token,
      body: JSON.stringify(input),
    },
  );
}

export async function revokeMasterAdminTenant(
  token: string,
  tenantId: string,
  userId: string,
): Promise<MasterAdminAssignmentResponse> {
  return apiRequest<MasterAdminAssignmentResponse>(
    `/master-admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      token,
    },
  );
}

export async function fetchClientInvitations(token: string, tenantId: string): Promise<MasterAdminClientInvitationsResponse> {
  return apiRequest<MasterAdminClientInvitationsResponse>(
    `/master-admin/tenants/${encodeURIComponent(tenantId)}/client-invitations`,
    { token },
  );
}

export async function createClientInvitation(
  token: string,
  tenantId: string,
  input: { readonly email: string; readonly name?: string; readonly role: ClientInvitationRole },
): Promise<MasterAdminClientInvitationResponse> {
  return apiRequest<MasterAdminClientInvitationResponse>(
    `/master-admin/tenants/${encodeURIComponent(tenantId)}/client-invitations`,
    { method: 'POST', token, body: JSON.stringify(input) },
  );
}

export async function fetchMasterAdminIngestionJobs(
  token: string,
  input: { readonly tenantId?: string; readonly status?: string; readonly sourceType?: string; readonly includeArchived?: boolean; readonly limit?: number } = {},
): Promise<MasterAdminIngestionJobsResponse> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const suffix = params.toString() === '' ? '' : `?${params.toString()}`;
  return apiRequest<MasterAdminIngestionJobsResponse>(`/master-admin/ingestion-jobs${suffix}`, { token });
}

export async function deleteMasterAdminPendingJobs(token: string): Promise<MasterAdminDeletedPendingJobsResponse> {
  return apiRequest<MasterAdminDeletedPendingJobsResponse>('/master-admin/ingestion-jobs/pending', { method: 'DELETE', token });
}

export async function cancelMasterAdminIngestionJob(token: string, jobId: string): Promise<MasterAdminIngestionJobResponse> {
  return apiRequest<MasterAdminIngestionJobResponse>(`/master-admin/ingestion-jobs/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', token });
}

export async function archiveMasterAdminIngestionJob(token: string, jobId: string): Promise<MasterAdminIngestionJobResponse> {
  return apiRequest<MasterAdminIngestionJobResponse>(`/master-admin/ingestion-jobs/${encodeURIComponent(jobId)}/archive`, { method: 'POST', token });
}
