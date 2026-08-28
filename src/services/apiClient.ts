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

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<AuthSession | null> | null = null;
const sessionRefreshListeners = new Set<SessionRefreshListener>();

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
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'application/json');

  if (effectiveToken !== undefined) {
    requestHeaders.set('Authorization', `Bearer ${effectiveToken}`);
  }

  const response = await executeRequest(path, requestOptions, requestHeaders);

  if (response.status === 401 && effectiveToken !== undefined && skipAuthRefresh !== true && !path.startsWith('/auth/')) {
    const refreshedSession = await refreshAccessToken();
    if (refreshedSession !== null) {
      return apiRequest<T>(path, {
        ...requestOptions,
        headers,
        token: refreshedSession.accessToken,
        skipAuthRefresh: true,
      });
    }
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
  const requestHeaders = new Headers(headers);
  if (effectiveToken !== undefined) requestHeaders.set('Authorization', `Bearer ${effectiveToken}`);

  const response = await executeRequest(path, requestOptions, requestHeaders);
  if (response.status === 401 && effectiveToken !== undefined && skipAuthRefresh !== true && !path.startsWith('/auth/')) {
    const refreshedSession = await refreshAccessToken();
    if (refreshedSession !== null) {
      return apiRequestRaw(path, { ...requestOptions, headers, token: refreshedSession.accessToken, skipAuthRefresh: true });
    }
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
  inMemoryAccessToken = token;
}

export function clearAccessToken(): void {
  inMemoryAccessToken = null;
}

/** Registra el puente entre el cliente HTTP y el estado React de autenticación. */
export function subscribeToSessionRefresh(listener: SessionRefreshListener): () => void {
  sessionRefreshListeners.add(listener);
  return () => sessionRefreshListeners.delete(listener);
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
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      credentials: 'include',
      signal: requestSignal.signal,
      headers,
    });
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

async function readApiError(response: Response): Promise<ApiErrorBody> {
  try {
    return await response.json() as ApiErrorBody;
  } catch {
    return {};
  }
}
