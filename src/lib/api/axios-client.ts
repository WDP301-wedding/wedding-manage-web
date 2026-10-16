import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

import { readPublicEnv } from '../env';

export interface ApiErrorDetail {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface ApiErrorPayload {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly requestId: string;
    readonly details?: readonly ApiErrorDetail[];
  };
}

export class ApiServiceError extends Error {
  readonly code: string;
  readonly requestId: string;
  readonly status: number | undefined;
  readonly details: readonly ApiErrorDetail[] | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(options: {
    code: string;
    message: string;
    requestId: string;
    status?: number | undefined;
    details?: readonly ApiErrorDetail[] | undefined;
    retryAfterSeconds?: number | undefined;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiServiceError';
    this.code = options.code;
    this.requestId = options.requestId;
    this.status = options.status;
    this.details = options.details;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

let activeTokenGetter: (() => string | null) | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function setAuthTokenProvider(getter: () => string | null): void {
  activeTokenGetter = getter;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorizedHandler = handler;
}

function resolveBaseUrl(): string {
  try {
    return readPublicEnv().NEXT_PUBLIC_API_BASE_URL;
  } catch {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';
  }
}

export function createAxiosApiClient(customConfig: AxiosRequestConfig = {}): AxiosInstance {
  const instance = axios.create({
    baseURL: resolveBaseUrl(),
    timeout: 15_000,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    ...customConfig,
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (!config.headers.has('x-request-id')) {
        config.headers.set('x-request-id', crypto.randomUUID());
      }

      if (!config.headers.has('Authorization')) {
        let token = activeTokenGetter ? activeTokenGetter() : null;
        if (!token && typeof window !== 'undefined') {
          try {
            const raw = window.localStorage.getItem('wedding_ops_session');
            if (raw) {
              const persisted = JSON.parse(raw);
              if (persisted && typeof persisted.accessToken === 'string') {
                token = persisted.accessToken;
              }
            }
          } catch {}
        }
        if (token) {
          config.headers.set('Authorization', `Bearer ${token}`);
        }
      }

      return config;
    },
    (error: unknown) =>
      Promise.reject(
        error instanceof Error
          ? error
          : new Error(typeof error === 'string' ? error : 'Request error'),
      ),
  );

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError<ApiErrorPayload>) => {
      const response = error.response;
      const sentRequestId =
        (error.config?.headers?.['x-request-id'] as string) || crypto.randomUUID();

      if (response) {
        if (response.status === 401 && onUnauthorizedHandler) {
          onUnauthorizedHandler();
        }

        const data = response.data;
        if (data && data.error && typeof data.error.code === 'string') {
          const retryAfterHeader = response.headers['retry-after'];
          const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;

          return Promise.reject(
            new ApiServiceError({
              code: data.error.code,
              message: data.error.message || 'Lỗi từ máy chủ.',
              requestId: data.error.requestId || sentRequestId,
              status: response.status,
              ...(data.error.details ? { details: data.error.details } : {}),
              ...(Number.isSafeInteger(retryAfter) ? { retryAfterSeconds: retryAfter } : {}),
              cause: error,
            }),
          );
        }

        return Promise.reject(
          new ApiServiceError({
            code: `HTTP_${response.status}`,
            message: error.message || `Yêu cầu thất bại với mã trạng thái ${response.status}.`,
            requestId: sentRequestId,
            status: response.status,
            cause: error,
          }),
        );
      }

      if (error.code === 'ECONNABORTED') {
        return Promise.reject(
          new ApiServiceError({
            code: 'REQUEST_TIMEOUT',
            message: 'Yêu cầu tới máy chủ vượt quá thời gian chờ (15 giây).',
            requestId: sentRequestId,
            cause: error,
          }),
        );
      }

      return Promise.reject(
        new ApiServiceError({
          code: 'NETWORK_ERROR',
          message: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng hoặc dịch vụ backend.',
          requestId: sentRequestId,
          cause: error,
        }),
      );
    },
  );

  return instance;
}

export const axiosApiClient = createAxiosApiClient();
