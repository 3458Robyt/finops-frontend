import { expect, request as playwrightRequest, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface FixtureManifest {
  readonly password: string;
  readonly admin: { readonly email: string };
  readonly tenants: readonly { readonly id: string }[];
}

test('protege el ciclo de vida de sesión y la rotación de credenciales', async () => {
  const manifest = await readManifest();
  const api = await playwrightRequest.newContext({
    baseURL: process.env['E2E_BACKEND_URL'] ?? 'http://127.0.0.1:3100',
    extraHTTPHeaders: { Origin: process.env['E2E_ORIGIN'] ?? 'http://127.0.0.1:5173' },
  });

  try {
    const login = await api.post('/api/v1/auth/login', {
      data: { email: manifest.admin.email, password: manifest.password },
    });
    expect(login.ok()).toBeTruthy();
    const loginBody = await login.json() as LoginResponse;
    expect(loginBody.accessToken).toBeTruthy();
    const initialRefreshCookie = readRefreshCookie(login.headers()['set-cookie']);

    const availableTenants = loginBody.availableTenants;
    const secondTenant = availableTenants.find((tenant) => tenant.id !== loginBody.activeTenant.id);
    expect(secondTenant).toBeDefined();

    const switched = await api.post('/api/v1/auth/switch-tenant', {
      data: { tenantId: secondTenant!.id },
      headers: { Authorization: `Bearer ${loginBody.accessToken}` },
    });
    expect(switched.ok()).toBeTruthy();
    const switchedBody = await switched.json() as LoginResponse;
    expect(switchedBody.activeTenant.id).toBe(secondTenant!.id);
    const switchedRefreshCookie = readRefreshCookie(switched.headers()['set-cookie']);

    const oldAccessResponse = await api.get('/api/v1/auth/tenants', {
      headers: { Authorization: `Bearer ${loginBody.accessToken}` },
    });
    expect(oldAccessResponse.status()).toBe(401);

    const switchedTenants = await api.get('/api/v1/auth/tenants', {
      headers: { Authorization: `Bearer ${switchedBody.accessToken}` },
    });
    expect(switchedTenants.ok()).toBeTruthy();

    const refresh = await api.post('/api/v1/auth/refresh', {
      headers: { Cookie: switchedRefreshCookie },
    });
    expect(refresh.ok()).toBeTruthy();
    const refreshBody = await refresh.json() as LoginResponse;
    expect(refreshBody.accessToken).toBeTruthy();

    const staleRefreshApi = await playwrightRequest.newContext({
      baseURL: process.env['E2E_BACKEND_URL'] ?? 'http://127.0.0.1:3100',
      extraHTTPHeaders: { Origin: process.env['E2E_ORIGIN'] ?? 'http://127.0.0.1:5173' },
    });
    try {
      const reusedRefresh = await staleRefreshApi.post('/api/v1/auth/refresh', {
        headers: { Cookie: switchedRefreshCookie },
      });
      expect(reusedRefresh.status()).toBe(401);
    } finally {
      await staleRefreshApi.dispose();
    }

    const sessionA = await loginUser(api, manifest);
    const sessionB = await loginUser(api, manifest);
    const sessions = await api.get('/api/v1/auth/sessions', {
      headers: { Authorization: `Bearer ${sessionA.accessToken}` },
    });
    expect(sessions.ok()).toBeTruthy();
    const sessionBody = await sessions.json() as { readonly sessions: readonly SessionSummary[] };
    const otherSession = sessionBody.sessions.find((session) => !session.isCurrent);
    expect(otherSession).toBeDefined();

    const revoked = await api.delete(`/api/v1/auth/sessions/${encodeURIComponent(otherSession!.id)}`, {
      headers: { Authorization: `Bearer ${sessionA.accessToken}` },
    });
    expect(revoked.ok()).toBeTruthy();
    const revokedSessionResponse = await api.get('/api/v1/auth/tenants', {
      headers: { Authorization: `Bearer ${sessionB.accessToken}` },
    });
    expect(revokedSessionResponse.status()).toBe(401);

    const logout = await api.post('/api/v1/auth/logout', {
      headers: { Authorization: `Bearer ${sessionA.accessToken}` },
    });
    expect(logout.ok()).toBeTruthy();
    const loggedOutResponse = await api.get('/api/v1/auth/tenants', {
      headers: { Authorization: `Bearer ${sessionA.accessToken}` },
    });
    expect(loggedOutResponse.status()).toBe(401);

    const logoutAllSession = await loginUser(api, manifest);
    const secondLogoutAllSession = await loginUser(api, manifest);
    const logoutAll = await api.post('/api/v1/auth/logout-all', {
      headers: { Authorization: `Bearer ${logoutAllSession.accessToken}` },
    });
    expect(logoutAll.ok()).toBeTruthy();
    const otherLoggedOutResponse = await api.get('/api/v1/auth/tenants', {
      headers: { Authorization: `Bearer ${secondLogoutAllSession.accessToken}` },
    });
    expect(otherLoggedOutResponse.status()).toBe(401);

    expect(initialRefreshCookie).toContain('finops_refresh=');
  } finally {
    await api.dispose();
  }
});

interface LoginResponse {
  readonly accessToken: string;
  readonly activeTenant: { readonly id: string };
  readonly availableTenants: readonly { readonly id: string }[];
}

interface SessionSummary {
  readonly id: string;
  readonly isCurrent: boolean;
}

async function loginUser(api: import('@playwright/test').APIRequestContext, manifest: FixtureManifest): Promise<LoginResponse> {
  const response = await api.post('/api/v1/auth/login', {
    data: { email: manifest.admin.email, password: manifest.password },
  });
  expect(response.ok()).toBeTruthy();
  return await response.json() as LoginResponse;
}

function readRefreshCookie(setCookie: string | undefined): string {
  const cookie = setCookie?.split(';', 1)[0];
  if (cookie === undefined || !cookie.startsWith('finops_refresh=')) {
    throw new Error('La respuesta de autenticación no incluyó la cookie de refresh esperada.');
  }
  return cookie;
}

async function readManifest(): Promise<FixtureManifest> {
  const fixtureFile = resolve(process.env['E2E_FIXTURE_FILE'] ?? '../finops-backend/.test-artifacts/e2e-fixtures.json');
  return JSON.parse(await readFile(fixtureFile, 'utf8')) as FixtureManifest;
}
