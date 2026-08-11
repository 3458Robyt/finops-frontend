import { apiRequest } from './apiClient';
import type { ApiRole, AppRole, AuthLoginResponse, AuthSession, AuthSessionDevice, AuthTenant, MfaRecoveryCodesResponse, MfaStatusResponse } from './authTypes';

export function mapApiRoleToAppRole(role: ApiRole): AppRole {
  return role === 'ADMIN' || role === 'MASTER_ADMIN' || role === 'OPERATOR_ADMIN' || role === 'FINOPS_TECHNICIAN'
    ? 'admin'
    : 'client';
}

export async function login(email: string, password: string): Promise<AuthLoginResponse> {
  return apiRequest<AuthLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function completeMfaLogin(challengeToken: string, code: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/mfa/complete', {
    method: 'POST',
    body: JSON.stringify({ challengeToken, code }),
  });
}

export async function completeMfaEnrollment(challengeToken: string, code: string): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/mfa/enrollment/complete', {
    method: 'POST',
    body: JSON.stringify({ challengeToken, code }),
  });
}

export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest('/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function confirmPasswordReset(token: string, password: string): Promise<void> {
  await apiRequest('/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
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

export function fetchMfaStatus(token: string): Promise<MfaStatusResponse> {
  return apiRequest('/auth/mfa/status', { token });
}

export function regenerateMfaRecoveryCodes(token: string, code: string): Promise<MfaRecoveryCodesResponse> {
  return apiRequest('/auth/mfa/recovery-codes/regenerate', {
    method: 'POST',
    token,
    body: JSON.stringify({ code }),
  });
}
