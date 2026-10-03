import { z } from 'zod';
import { env } from '~/env';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'; // uppercase: fetch doesn't normalize 'patch'

// Nest error bodies carry a human-readable `message` (e.g. 'Milestone 3 not found').
const messageBodySchema = z.object({ message: z.string() });

/**
 * A non-2xx answer from the api. `message` is the api's own message when it sent one,
 * `body` the parsed JSON (or raw text), for callers that need details (see form-errors.ts).
 */
export class ApiError extends Error {
  readonly method: HttpMethod;
  readonly path: string;
  readonly status: number;
  readonly body: unknown;

  constructor(method: HttpMethod, path: string, status: number, body: unknown) {
    const parsed = messageBodySchema.safeParse(body);
    super(
      parsed.success
        ? parsed.data.message
        : `${method} ${path} failed with status ${status}`,
    );
    this.name = 'ApiError';
    this.method = method;
    this.path = path;
    this.status = status;
    this.body = body;
  }
}

/**
 * The only place that talks to the api. Resolves with the parsed JSON body (undefined for
 * 204 No Content); callers parse it with a schema from @time-capsule/shared. Throws ApiError
 * for non-2xx answers and a plain Error when the api can't be reached.
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
    throw new Error(
      `Cannot reach ${url}. Is the api running, and does its CORS_ORIGIN match ${location.origin}?`,
    );
  }

  if (response.status === 204) return undefined;
  const isJson =
    response.headers.get('content-type')?.includes('application/json') ?? false;
  const data: unknown = isJson ? await response.json() : await response.text();
  if (!response.ok) throw new ApiError(method, path, response.status, data);
  return data;
}
