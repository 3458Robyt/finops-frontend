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
  options: RequestInit & { readonly token?: string } = {},
): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'application/json');

  if (token !== undefined) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  const requestSignal = createRequestSignal(requestOptions.signal);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      signal: requestSignal.signal,
      headers: requestHeaders,
    });
  } finally {
    requestSignal.cleanup();
  }

  if (!response.ok) {
    let body: ApiErrorBody = {};
    try {
      body = await response.json() as ApiErrorBody;
    } catch {
      body = {};
    }
    throw new ApiRequestError(body.error ?? `API request failed with status ${response.status}`, {
      status: response.status,
      ...(body.code !== undefined ? { code: body.code } : {}),
      ...(body.diagnosticId !== undefined ? { diagnosticId: body.diagnosticId } : {}),
      ...(body.audit !== undefined ? { audit: body.audit } : {}),
    });
  }

  return response.json() as Promise<T>;
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
