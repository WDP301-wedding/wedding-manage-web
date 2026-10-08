import createClient, { type Client } from 'openapi-fetch';
import { z } from 'zod';

import { readPublicEnv } from '../env';
import type { components, paths } from './generated/schema';

const defaultTimeoutMs = 10_000;
const jsonMediaTypePattern = /^application\/(?:[\w.+-]+\+)?json$/i;

const apiErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
    details: z
      .array(
        z.strictObject({
          code: z.string(),
          message: z.string(),
          path: z.string(),
        }),
      )
      .optional(),
    message: z.string().min(1),
    requestId: z.uuid(),
  }),
});

type ApiErrorDetails = components['schemas']['ErrorDetail'];
type ApiFetch = (request: Request) => Promise<Response>;

export type ApiClientErrorKind = 'api' | 'malformed-response' | 'network' | 'aborted' | 'timeout';

type ApiClientErrorOptions = Readonly<{
  kind: ApiClientErrorKind;
  code: string;
  message: string;
  requestId: string;
  status?: number;
  retryAfterSeconds?: number;
  details?: readonly ApiErrorDetails[];
  cause?: unknown;
}>;

export class ApiClientError extends Error {
  readonly kind: ApiClientErrorKind;
  readonly code: string;
  readonly requestId: string;
  readonly status: number | undefined;
  readonly retryAfterSeconds: number | undefined;
  readonly details: readonly ApiErrorDetails[] | undefined;

  constructor(options: ApiClientErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiClientError';
    this.kind = options.kind;
    this.code = options.code;
    this.requestId = options.requestId;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.details = options.details;
  }
}

export type ApiClient = Client<paths>;

export type CreateApiClientOptions = Readonly<{
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: ApiFetch;
  requestId?: () => string;
}>;

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]?.trim();
  return contentType !== undefined && jsonMediaTypePattern.test(contentType);
}

function malformedResponse(response: Response, requestId: string, cause?: unknown): ApiClientError {
  return new ApiClientError({
    kind: 'malformed-response',
    code: 'MALFORMED_API_RESPONSE',
    message: 'The API returned a malformed response.',
    requestId,
    status: response.status,
    cause,
  });
}

async function validateResponse(response: Response, sentRequestId: string): Promise<void> {
  const responseRequestId = response.headers.get('x-request-id') ?? sentRequestId;

  if (response.status === 204 || response.status === 205) {
    return;
  }

  if (!isJsonResponse(response)) {
    throw malformedResponse(response, responseRequestId);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(await response.clone().text());
  } catch (error) {
    throw malformedResponse(response, responseRequestId, error);
  }

  if (response.ok) {
    return;
  }

  const parsed = apiErrorResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw malformedResponse(response, responseRequestId, parsed.error);
  }

  const waitSeconds = retryAfterSeconds(response.headers.get('retry-after'));
  throw new ApiClientError({
    kind: 'api',
    code: parsed.data.error.code,
    message: parsed.data.error.message,
    requestId: parsed.data.error.requestId,
    status: response.status,
    ...(parsed.data.error.details === undefined ? {} : { details: parsed.data.error.details }),
    ...(waitSeconds === undefined ? {} : { retryAfterSeconds: waitSeconds }),
  });
}

function retryAfterSeconds(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined;
  if (/^\d+$/u.test(value.trim())) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) ? seconds : undefined;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - Date.now()) / 1000)) : undefined;
}

function createFetchWithPolicy(
  fetchImplementation: ApiFetch,
  timeoutMs: number,
  createRequestId: () => string,
): ApiFetch {
  return async (request) => {
    const headers = new Headers(request.headers);
    const sentRequestId = headers.get('x-request-id') ?? createRequestId();
    headers.set('x-request-id', sentRequestId);

    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = () => controller.abort(request.signal.reason);

    if (request.signal.aborted) {
      abortFromCaller();
    } else {
      request.signal.addEventListener('abort', abortFromCaller, { once: true });
    }

    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImplementation(
        new Request(request, { headers, signal: controller.signal }),
      );
      await validateResponse(response, sentRequestId);
      return response;
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      if (timedOut) {
        throw new ApiClientError({
          kind: 'timeout',
          code: 'REQUEST_TIMEOUT',
          message: `The API request timed out after ${timeoutMs} ms.`,
          requestId: sentRequestId,
          cause: error,
        });
      }

      if (request.signal.aborted) {
        throw new ApiClientError({
          kind: 'aborted',
          code: 'REQUEST_ABORTED',
          message: 'The API request was aborted.',
          requestId: sentRequestId,
          cause: error,
        });
      }

      throw new ApiClientError({
        kind: 'network',
        code: 'NETWORK_ERROR',
        message: 'The API request failed before a response was received.',
        requestId: sentRequestId,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      request.signal.removeEventListener('abort', abortFromCaller);
    }
  };
}

export function createApiClient(options: CreateApiClientOptions = {}): ApiClient {
  const timeoutMs = options.timeoutMs ?? defaultTimeoutMs;

  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('API timeout must be a positive safe integer in milliseconds.');
  }

  return createClient<paths>({
    baseUrl: options.baseUrl ?? readPublicEnv().NEXT_PUBLIC_API_BASE_URL,
    fetch: createFetchWithPolicy(
      options.fetch ?? ((request) => globalThis.fetch(request)),
      timeoutMs,
      options.requestId ?? (() => crypto.randomUUID()),
    ),
  });
}
