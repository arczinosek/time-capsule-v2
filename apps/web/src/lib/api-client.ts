import { z } from 'zod';
import { env } from '~/env';

// React- and i18n-free: errors carry developer text for logs, and toErrorMessage() turns them
// into an i18n key (or verbatim text) for the UI.

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; // uppercase: fetch doesn't normalize 'patch'

// Nest error bodies carry a `message`: an i18n key for validation, English text otherwise
// (e.g. 'Milestone 3 not found').
const messageBodySchema = z.object({ message: z.string() });

/**
 * A non-2xx answer from the api. `apiMessage` is the api's own message when it sent one,
 * `message` the same or a generic fallback (for logs), `body` the parsed JSON (or raw text) for
 * callers that need details (see form-errors.ts).
 */
export class ApiError extends Error {
  readonly method: HttpMethod;
  readonly path: string;
  readonly status: number;
  readonly body: unknown;
  readonly apiMessage: string | undefined;

  constructor(method: HttpMethod, path: string, status: number, body: unknown) {
    const parsed = messageBodySchema.safeParse(body);
    const apiMessage = parsed.success ? parsed.data.message : undefined;
    super(apiMessage ?? `${method} ${path} failed with status ${status}`);
    this.name = 'ApiError';
    this.method = method;
    this.path = path;
    this.status = status;
    this.body = body;
    this.apiMessage = apiMessage;
  }
}

/** fetch failed: the api is down, the URL is wrong or CORS blocked the request. */
export class NetworkError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(
      `Cannot reach ${url}. Is the api running, and does its CORS_ORIGIN match ${location.origin}?`,
    );
    this.name = 'NetworkError';
    this.url = url;
  }
}

/**
 * What to show for a failed request: an i18n key, or the api's own text for a 4xx that isn't
 * a key. Render it through useTranslateMessage().
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) return 'error.network';
  if (error instanceof ApiError) {
    if (error.status === 404) return 'error.notFound';
    // Nest's 500 body says 'Internal server error' in English: never show it.
    if (error.status >= 500) return 'error.unexpected';
    return error.apiMessage ?? 'error.unexpected';
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * The only place that talks to the api. Resolves with the parsed JSON body (undefined for
 * 204 No Content); callers parse it with a schema from @time-capsule/shared. Throws ApiError
 * for non-2xx answers and NetworkError when the api can't be reached.
 */
export async function apiRequest(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = `${env.VITE_API_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      // Without it express.json() skips the body and validation answers 400.
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch doesn't say whether the api is down, the URL is wrong or CORS blocked it.
    throw new NetworkError(url);
  }

  if (response.status === 204) return undefined;
  const isJson =
    response.headers.get('content-type')?.includes('application/json') ?? false;
  const data: unknown = isJson ? await response.json() : await response.text();
  if (!response.ok) throw new ApiError(method, path, response.status, data);
  return data;
}
