import { afterEach, describe, expect, it, vi } from 'vitest';

import { createApiClient, type ApiClientError } from './client';

const requestId = '24dcfaac-4408-4d42-8d66-456ed6ee7ea4';
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();

  if (originalApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
  }
});

describe('createApiClient', () => {
  it.each([
    ['3600', 3600],
    ['invalid', undefined],
  ])('preserves a valid Retry-After header (%s) for the OTP cooldown', async (header, seconds) => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      requestId: () => requestId,
      fetch: () =>
        Promise.resolve(
          Response.json(
            { error: { code: 'RATE_LIMITED', message: 'Wait', requestId } },
            { status: 429, headers: { 'retry-after': header } },
          ),
        ),
    });
    await expect(
      client.POST('/auth/password-change-otp-requests', {
        body: { currentPassword: 'test-password-123' },
      }),
    ).rejects.toMatchObject({ status: 429, retryAfterSeconds: seconds });
  });
  it('returns typed successful data and sends a request ID to the configured base URL', async () => {
    const fetch = vi.fn((request: Request) => {
      expect(request.url).toBe('https://api.example.com/health/live');
      expect(request.headers.get('x-request-id')).toBe(requestId);

      return Promise.resolve(
        Response.json(
          { data: { status: 'live', requestId } },
          { headers: { 'x-request-id': requestId } },
        ),
      );
    });
    const client = createApiClient({
      baseUrl: 'https://api.example.com/',
      fetch,
      requestId: () => requestId,
    });

    const result = await client.GET('/health/live');

    expect(result.data).toEqual({ data: { status: 'live', requestId } });
    expect(result.response.headers.get('x-request-id')).toBe(requestId);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('normalizes a structured API error and preserves its correlation data', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: () =>
        Promise.resolve(
          Response.json(
            {
              error: {
                code: 'SERVICE_UNAVAILABLE',
                details: [
                  {
                    code: 'dependency_unavailable',
                    message: 'PostgreSQL is unavailable.',
                    path: 'database',
                  },
                ],
                message: 'The service is not ready.',
                requestId,
              },
            },
            {
              status: 503,
            },
          ),
        ),
      requestId: () => requestId,
    });

    await expect(client.GET('/health/ready')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'api',
      code: 'SERVICE_UNAVAILABLE',
      message: 'The service is not ready.',
      requestId,
      status: 503,
      details: [
        {
          code: 'dependency_unavailable',
          message: 'PostgreSQL is unavailable.',
          path: 'database',
        },
      ],
    });
  });

  it('rejects a malformed JSON response with a normalized client error', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: () =>
        Promise.resolve(
          new Response('{not-json', {
            status: 200,
            headers: {
              'content-type': 'application/json',
              'x-request-id': requestId,
            },
          }),
        ),
      requestId: () => requestId,
    });

    await expect(client.GET('/health/live')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'malformed-response',
      code: 'MALFORMED_API_RESPONSE',
      requestId,
      status: 200,
    });
  });

  it('rejects an unstructured HTTP error as a malformed response', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: () =>
        Promise.resolve(
          new Response('<h1>Unavailable</h1>', {
            status: 502,
            headers: {
              'content-type': 'text/html',
              'x-request-id': requestId,
            },
          }),
        ),
      requestId: () => requestId,
    });

    await expect(client.GET('/health/ready')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'malformed-response',
      code: 'MALFORMED_API_RESPONSE',
      requestId,
      status: 502,
    });
  });

  it('aborts a slow request at the configured timeout', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(
      (request: Request) =>
        new Promise<Response>((_resolve, reject) => {
          request.signal.addEventListener(
            'abort',
            () => reject(new Error('Request aborted.', { cause: request.signal.reason })),
            { once: true },
          );
        }),
    );
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch,
      requestId: () => requestId,
      timeoutMs: 500,
    });

    const expectation = expect(client.GET('/health/live')).rejects.toEqual(
      expect.objectContaining<Partial<ApiClientError>>({
        name: 'ApiClientError',
        kind: 'timeout',
        code: 'REQUEST_TIMEOUT',
        requestId,
      }),
    );
    await vi.advanceTimersByTimeAsync(500);

    await expectation;
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('normalizes a fetch rejection as a network error', async () => {
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: () => Promise.reject(new Error('socket closed')),
      requestId: () => requestId,
    });

    await expect(client.GET('/health/live')).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'network',
      code: 'NETWORK_ERROR',
      requestId,
    });
  });

  it('distinguishes a caller abort from a timeout', async () => {
    const controller = new AbortController();
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      fetch: (request) =>
        new Promise<Response>((_resolve, reject) => {
          request.signal.addEventListener(
            'abort',
            () => reject(new Error('Request aborted.', { cause: request.signal.reason })),
            { once: true },
          );
        }),
      requestId: () => requestId,
    });

    const expectation = expect(
      client.GET('/health/live', { signal: controller.signal }),
    ).rejects.toMatchObject({
      name: 'ApiClientError',
      kind: 'aborted',
      code: 'REQUEST_ABORTED',
      requestId,
    });
    controller.abort();

    await expectation;
  });

  it.each([0, 1.5])('rejects the invalid timeout value %s', (timeoutMs) => {
    expect(() =>
      createApiClient({
        baseUrl: 'https://api.example.com',
        timeoutMs,
      }),
    ).toThrow('API timeout must be a positive safe integer in milliseconds.');
  });

  it('uses environment, global fetch, and UUID defaults when no options are provided', async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://default-api.example.com';
    const fetch = vi.fn((input: RequestInfo | URL) => {
      if (!(input instanceof Request)) {
        throw new TypeError('Expected a Request instance.');
      }

      const generatedRequestId = input.headers.get('x-request-id');
      expect(input.url).toBe('https://default-api.example.com/health/live');
      expect(generatedRequestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      return Promise.resolve(
        Response.json({ data: { status: 'live', requestId: generatedRequestId } }),
      );
    });
    vi.stubGlobal('fetch', fetch);

    const result = await createApiClient().GET('/health/live');

    expect(result.data?.data.status).toBe('live');
    expect(fetch).toHaveBeenCalledOnce();
  });
});
