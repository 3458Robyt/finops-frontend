import type { AuthSession } from './authTypes';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/$/, '');
const API_REQUEST_TIMEOUT_MS = 30_000;

interface ApiErrorBody {
  readonly error?: string;
  readonly code?: string;
  readonly diagnosticId?: string;
  readonly audit?: unknown;
  readonly details?: Readonly<Record<string, unknown>>;
}

type SessionRefreshListener = (session: AuthSession) => void;
type SessionExpiredListener = () => void;

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<AuthSession | null> | null = null;
let sessionGeneration = 0;
let sessionTransitionDepth = 0;
const sessionRefreshListeners = new Set<SessionRefreshListener>();
const sessionExpiredListeners = new Set<SessionExpiredListener>();
let lastSessionExpiredNotificationAt = 0;

export class ApiRequestError extends Error {
  public readonly code?: string;
  public readonly status: number;
  public readonly diagnosticId?: string;
  public readonly audit?: unknown;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(message: string, input: { readonly status: number; readonly code?: string; readonly diagnosticId?: string; readonly audit?: unknown; readonly details?: Readonly<Record<string, unknown>> }) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = input.status;
    this.code = input.code;
    this.diagnosticId = input.diagnosticId;
    this.audit = input.audit;
    this.details = input.details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { readonly token?: string; readonly skipAuthRefresh?: boolean } = {},
): Promise<T> {
  const { token, headers, skipAuthRefresh, ...requestOptions } = options;
  const effectiveToken = inMemoryAccessToken ?? token;
  const requestGeneration = sessionGeneration;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'application/json');

  if (effectiveToken !== undefined) {
    requestHeaders.set('Authorization', `Bearer ${effectiveToken}`);
  }

  const response = await executeRequest(path, requestOptions, requestHeaders);

  if (response.status === 401 && effectiveToken !== undefined && skipAuthRefresh !== true && !path.startsWith('/auth/')) {
    if (sessionResponseIsStale(effectiveToken, requestGeneration)) {
      return retryWithCurrentSession<T>(path, requestOptions, headers, effectiveToken);
    }
    const refreshedSession = await refreshAccessToken();
    if (refreshedSession !== null) {
      return apiRequest<T>(path, {
        ...requestOptions,
        headers,
        token: refreshedSession.accessToken,
        skipAuthRefresh: true,
      });
    }
    notifySessionExpired();
  }

  if (!response.ok) {
    const body = await readApiError(response);
    throw new ApiRequestError(body.error ?? `API request failed with status ${response.status}`, {
      status: response.status,
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.diagnosticId !== undefined ? { diagnosticId: body.diagnosticId } : {}),
      ...(body.audit !== undefined ? { audit: body.audit } : {}),
      ...(body.details !== undefined ? { details: body.details } : {}),
    });
  }

  return response.json() as Promise<T>;
}

/** Ejecuta una petición autenticada conservando la respuesta binaria/textual. */
export async function apiRequestRaw(
  path: string,
  options: RequestInit & { readonly token?: string; readonly skipAuthRefresh?: boolean } = {},
): Promise<Response> {
  const { token, headers, skipAuthRefresh, ...requestOptions } = options;
  const effectiveToken = inMemoryAccessToken ?? token;
  const requestGeneration = sessionGeneration;
  const requestHeaders = new Headers(headers);
  if (effectiveToken !== undefined) requestHeaders.set('Authorization', `Bearer ${effectiveToken}`);

  const response = await executeRequest(path, requestOptions, requestHeaders);
  if (response.status === 401 && effectiveToken !== undefined && skipAuthRefresh !== true && !path.startsWith('/auth/')) {
    if (sessionResponseIsStale(effectiveToken, requestGeneration)) {
      return retryWithCurrentSessionRaw(path, requestOptions, headers, effectiveToken);
    }
    const refreshedSession = await refreshAccessToken();
    if (refreshedSession !== null) {
      return apiRequestRaw(path, { ...requestOptions, headers, token: refreshedSession.accessToken, skipAuthRefresh: true });
    }
    notifySessionExpired();
  }

  if (!response.ok) {
    const body = await readApiError(response);
    throw new ApiRequestError(body.error ?? `API request failed with status ${response.status}`, {
      status: response.status,
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.diagnosticId !== undefined ? { diagnosticId: body.diagnosticId } : {}),
      ...(body.details !== undefined ? { details: body.details } : {}),
    });
  }

  return response;
}

export function setAccessToken(token: string): void {
  if (inMemoryAccessToken === token) return;
  inMemoryAccessToken = token;
  sessionGeneration += 1;
}

export function clearAccessToken(): void {
  if (inMemoryAccessToken === null) return;
  inMemoryAccessToken = null;
  sessionGeneration += 1;
}

/** Evita que una respuesta 401 de peticiones iniciadas antes de cambiar de tenant cierre la sesión actual. */
export function beginSessionTransition(): void {
  sessionTransitionDepth += 1;
}

/** Finaliza una transición de sesión iniciada por un cambio de tenant. */
export function endSessionTransition(): void {
  sessionTransitionDepth = Math.max(0, sessionTransitionDepth - 1);
}

/** Registra el puente entre el cliente HTTP y el estado React de autenticación. */
export function subscribeToSessionRefresh(listener: SessionRefreshListener): () => void {
  sessionRefreshListeners.add(listener);
  return () => sessionRefreshListeners.delete(listener);
}

/** Notifica a la aplicación cuando el refresh no pudo recuperar una sesión autenticada. */
export function subscribeToSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

/** Recupera la sesión persistida en la cookie HttpOnly al iniciar la aplicación. */
export async function restoreSession(): Promise<AuthSession | null> {
  return refreshAccessToken();
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function createRequestSignal(signal: AbortSignal | null | undefined): {
  readonly signal: AbortSignal;
  readonly didTimeout: () => boolean;
  readonly cleanup: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, API_REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  if (signal?.aborted === true) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      globalThis.clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    },
  };
}

async function executeRequest(
  path: string,
  requestOptions: RequestInit,
  headers: Headers,
): Promise<Response> {
  const requestSignal = createRequestSignal(requestOptions.signal);
  const maxAttempts = isRetryableMethod(requestOptions.method) ? 2 : 1;
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await fetch(`${API_BASE_URL}${path}`, {
          ...requestOptions,
          credentials: 'include',
          signal: requestSignal.signal,
          headers,
        });
      } catch (error: unknown) {
        if (attempt === maxAttempts || requestSignal.didTimeout() || requestSignal.signal.aborted) {
          throw error;
        }
        await new Promise((resolve) => globalThis.setTimeout(resolve, 150 * attempt));
      }
    }
    throw new Error('No se pudo ejecutar la solicitud.');
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError' && !requestSignal.didTimeout()) {
      throw error;
    }

    if (requestSignal.didTimeout()) {
      throw new ApiRequestError('La solicitud tardó demasiado. Intenta nuevamente.', {
        status: 0,
        code: 'TIMEOUT',
      });
    }

    throw new ApiRequestError('No fue posible contactar al backend. Verifica tu conexión e intenta nuevamente.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  } finally {
    requestSignal.cleanup();
  }
}

function isRetryableMethod(method: string | undefined): boolean {
  const normalized = method?.toUpperCase() ?? 'GET';
  return normalized === 'GET' || normalized === 'HEAD' || normalized === 'OPTIONS';
}

function sessionResponseIsStale(effectiveToken: string, requestGeneration: number): boolean {
  return sessionTransitionDepth > 0
    || requestGeneration !== sessionGeneration
    || (inMemoryAccessToken !== null && inMemoryAccessToken !== effectiveToken);
}

function retryWithCurrentSession<T>(
  path: string,
  requestOptions: RequestInit,
  headers: HeadersInit | undefined,
  effectiveToken: string,
): Promise<T> {
  if (!isRetryableMethod(requestOptions.method) || inMemoryAccessToken === null || inMemoryAccessToken === effectiveToken) {
    return Promise.reject(new ApiRequestError('La sesión cambió mientras se cargaba esta información.', {
      status: 401,
      code: 'STALE_SESSION_REQUEST',
    }));
  }
  return apiRequest<T>(path, {
    ...requestOptions,
    headers,
    token: inMemoryAccessToken,
    skipAuthRefresh: true,
  });
}

function retryWithCurrentSessionRaw(
  path: string,
  requestOptions: RequestInit,
  headers: HeadersInit | undefined,
  effectiveToken: string,
): Promise<Response> {
  if (!isRetryableMethod(requestOptions.method) || inMemoryAccessToken === null || inMemoryAccessToken === effectiveToken) {
    return Promise.reject(new ApiRequestError('La sesión cambió mientras se cargaba esta información.', {
      status: 401,
      code: 'STALE_SESSION_REQUEST',
    }));
  }
  return apiRequestRaw(path, {
    ...requestOptions,
    headers,
    token: inMemoryAccessToken,
    skipAuthRefresh: true,
  });
}

async function refreshAccessToken(): Promise<AuthSession | null> {
  if (refreshPromise !== null) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await executeRequest('/auth/refresh', { method: 'POST' }, new Headers({ 'Content-Type': 'application/json' }));
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) {
        throw new ApiRequestError('No fue posible restaurar la sesión.', { status: response.status, code: 'SESSION_REFRESH_FAILED' });
      }
      const body = await response.json() as AuthSession;
      if (typeof body.accessToken !== 'string' || body.accessToken.trim() === '') return null;
      setAccessToken(body.accessToken);
      sessionRefreshListeners.forEach((listener) => listener(body));
      return body;
    } catch (error: unknown) {
      if (error instanceof ApiRequestError && (error.status === 0 || error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT')) {
        throw error;
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function notifySessionExpired(): void {
  const now = Date.now();
  if (now - lastSessionExpiredNotificationAt < 1_000) return;
  lastSessionExpiredNotificationAt = now;
  sessionExpiredListeners.forEach((listener) => listener());
}

async function readApiError(response: Response): Promise<ApiErrorBody> {
  try {
    return await response.json() as ApiErrorBody;
  } catch {
    return {};
  }
}
