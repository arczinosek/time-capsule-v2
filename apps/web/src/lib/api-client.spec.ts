import { http, HttpResponse } from 'msw';
import { apiUrl, server } from '~/test/server';
import { ApiError, apiRequest } from './api-client';

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
      status: 404,
      body,
    });
  });

  it('explains network and CORS failures', async () => {
    server.use(http.get(apiUrl('/milestones'), () => HttpResponse.error()));

    const error = await apiRequest('GET', '/milestones').catch(
      (e: unknown) => e,
    );

    expect(String(error)).toContain('Cannot reach http://api.test/milestones');
    expect(String(error)).toContain('CORS_ORIGIN');
  });
});
