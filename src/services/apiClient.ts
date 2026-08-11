const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/$/, '');
const API_REQUEST_TIMEOUT_MS = 30_000;

interface ApiErrorBody {
  readonly error?: string;
  readonly code?: string;
  readonly diagnosticId?: string;
  readonly audit?: unknown;
}

interface RefreshResponse {
  readonly accessToken: string;
}

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export class ApiRequestError extends Error {
  public readonly code?: string;
  public readonly status: number;
  public readonly diagnosticId?: string;
  public readonly audit?: unknown;

  constructor(message: string, input: { readonly status: number; readonly code?: string; readonly diagnosticId?: string; readonly audit?: unknown }) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = input.status;
    this.code = input.code;
    this.diagnosticId = input.diagnosticId;
    this.audit = input.audit;
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
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken !== null) {
      return apiRequest<T>(path, {
        ...requestOptions,
        headers,
        token: refreshedToken,
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
    });
  }

  return response.json() as Promise<T>;
}

export function setAccessToken(token: string): void {
  inMemoryAccessToken = token;
}

export function clearAccessToken(): void {
  inMemoryAccessToken = null;
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function createRequestSignal(signal: AbortSignal | null | undefined): {
  readonly signal: AbortSignal;
  readonly cleanup: () => void;
} {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  if (signal?.aborted === true) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  return {
    signal: controller.signal,
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
  } finally {
    requestSignal.cleanup();
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise !== null) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await executeRequest('/auth/refresh', { method: 'POST' }, new Headers({ 'Content-Type': 'application/json' }));
      if (!response.ok) return null;
      const body = await response.json() as RefreshResponse;
      if (typeof body.accessToken !== 'string' || body.accessToken.trim() === '') return null;
      setAccessToken(body.accessToken);
      return body.accessToken;
    } catch {
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
