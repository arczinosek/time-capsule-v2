import { http, HttpResponse } from 'msw';
import { apiUrl, server } from '~/test/server';
import {
  ApiError,
  apiRequest,
  NetworkError,
  toErrorMessage,
} from './api-client';

describe('apiRequest', () => {
  it('sends JSON and resolves with the parsed body', async () => {
    let contentType: string | null = null;
    server.use(
      http.post(apiUrl('/things'), async ({ request }) => {
        contentType = request.headers.get('content-type');
        return HttpResponse.json(
          { echoed: await request.json() },
          { status: 201 },
        );
      }),
    );

    await expect(apiRequest('POST', '/things', { a: 1 })).resolves.toEqual({
      echoed: { a: 1 },
    });
    expect(contentType).toBe('application/json');
  });

  it('resolves with undefined for 204 No Content', async () => {
    server.use(
      http.delete(
        apiUrl('/things/1'),
        () => new HttpResponse(null, { status: 204 }),
      ),
    );

    await expect(apiRequest('DELETE', '/things/1')).resolves.toBeUndefined();
  });

  it("throws ApiError with the api's message, status and body", async () => {
    const body = {
      message: 'Milestone 9 not found',
      error: 'Not Found',
      statusCode: 404,
    };
    server.use(
      http.get(apiUrl('/milestones/9'), () =>
        HttpResponse.json(body, { status: 404 }),
      ),
    );

    const error = await apiRequest('GET', '/milestones/9').catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      message: 'Milestone 9 not found',
      apiMessage: 'Milestone 9 not found',
      status: 404,
      body,
    });
  });

  it('keeps a generic message when the body has none', async () => {
    server.use(
      http.get(apiUrl('/things'), () =>
        HttpResponse.text('Bad gateway', { status: 502 }),
      ),
    );

    const error = await apiRequest('GET', '/things').catch((e: unknown) => e);

    expect(error).toMatchObject({
      message: 'GET /things failed with status 502',
      apiMessage: undefined,
      body: 'Bad gateway',
    });
  });

  it('explains network and CORS failures with a NetworkError', async () => {
    server.use(http.get(apiUrl('/milestones'), () => HttpResponse.error()));

    const error = await apiRequest('GET', '/milestones').catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toMatchObject({ url: 'http://api.test/milestones' });
    expect(String(error)).toContain('Cannot reach http://api.test/milestones');
    expect(String(error)).toContain('CORS_ORIGIN');
  });
});

describe('toErrorMessage', () => {
  const apiError = (status: number, body: unknown) =>
    new ApiError('GET', '/things', status, body);

  it.each([
    ['a network failure', new NetworkError('http://api.test/x'), 'error.network'],
    [
      'a 404',
      apiError(404, { message: 'Milestone 9 not found' }),
      'error.notFound',
    ],
    [
      'a 500 with Nest English text',
      apiError(500, { statusCode: 500, message: 'Internal server error' }),
      'error.unexpected',
    ],
    ['a 503 without a body', apiError(503, ''), 'error.unexpected'],
    [
      'a 4xx carrying a key',
      apiError(409, { message: 'validation.failed' }),
      'validation.failed',
    ],
    [
      'a 4xx with plain text',
      apiError(400, { message: 'Validation failed (numeric string is expected)' }),
      'Validation failed (numeric string is expected)',
    ],
    ['a 4xx without a message', apiError(400, 'oops'), 'error.unexpected'],
    ['a plain Error', new Error('boom'), 'boom'],
  ])('maps %s', (_name, error, expectedMessage) => {
    expect(toErrorMessage(error)).toBe(expectedMessage);
  });
});
