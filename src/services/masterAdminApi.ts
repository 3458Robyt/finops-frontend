import { apiRequest } from './apiClient';
import type { MasterAdminTenantStatus, MasterAdminAssignmentRole, MasterAdminTenantsResponse, MasterAdminTenantResponse, MasterAdminUsersResponse, MasterAdminUserResponse, MasterAdminAssignmentsResponse, MasterAdminAssignmentResponse } from './apiTypes';

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
    readonly role: 'OPERATOR_ADMIN' | 'FINOPS_TECHNICIAN';
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
