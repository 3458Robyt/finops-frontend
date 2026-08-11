import { apiRequest } from './apiClient';
import type { ApiRole, AppRole, AuthSession, AuthSessionDevice, AuthTenant } from './authTypes';

export function mapApiRoleToAppRole(role: ApiRole): AppRole {
  return role === 'ADMIN' || role === 'MASTER_ADMIN' || role === 'OPERATOR_ADMIN' || role === 'FINOPS_TECHNICIAN'
    ? 'admin'
    : 'client';
}

export async function login(email: string, password: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchAccessibleTenants(token: string): Promise<{
  readonly success: true;
  readonly activeTenant: AuthTenant | null;
  readonly availableTenants: readonly AuthTenant[];
}> {
  return apiRequest('/auth/tenants', { token });
}

export async function switchTenant(token: string, tenantId: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/switch-tenant', {
    method: 'POST',
    token,
    body: JSON.stringify({ tenantId }),
  });
}

export async function logout(token: string): Promise<void> {
  await apiRequest<{ readonly success: true }>('/auth/logout', {
    method: 'POST',
    token,
  });
}

export async function logoutAll(token: string): Promise<void> {
  await apiRequest<{ readonly success: true }>('/auth/logout-all', {
    method: 'POST',
    token,
  });
}

export async function fetchAuthSessions(token: string): Promise<{
  readonly success: true;
  readonly sessions: readonly AuthSessionDevice[];
}> {
  return apiRequest('/auth/sessions', { token });
}

export async function revokeAuthSession(token: string, sessionId: string): Promise<void> {
  await apiRequest<{ readonly success: true }>(`/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    token,
  });
}
