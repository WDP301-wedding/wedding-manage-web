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
let activeTokenSetter: ((token: string | null) => void) | null = null;
let onUnauthorizedHandler: (() => void) | null = null;

export function setAuthTokenProvider(getter: () => string | null): void {
  activeTokenGetter = getter;
}

export function setAuthTokenConsumer(setter: (token: string | null) => void): void {
  activeTokenSetter = setter;
}

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorizedHandler = handler;
}

const STORAGE_KEY = 'wedding_ops_session';
const BROADCAST_CHANNEL_NAME = 'wedding_ops_auth_channel';
const REFRESH_LOCK_NAME = 'wedding_ops_refresh_lock';

interface PersistedSessionRecord {
  accessToken: string;
  accessExpiresAt: string;
  sessionId?: string;
  actor?: unknown;
  presentation?: string;
}

function readPersistedSession(): PersistedSessionRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedSessionRecord;
  } catch {
    return null;
  }
}

function isSessionTokenFresh(persisted: PersistedSessionRecord | null): boolean {
  if (!persisted || typeof persisted.accessToken !== 'string') return false;
  const expiry = new Date(persisted.accessExpiresAt).getTime();
  if (isNaN(expiry)) return false;
  return expiry > Date.now() + 30_000;
}

function updatePersistedSessionToken(newToken: string, newExpiresAt: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.accessToken = newToken;
    parsed.accessExpiresAt = newExpiresAt;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {}
}

function clearPersistedSession(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function broadcastAuthEvent(token: string, expiresAt: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ type: 'TOKEN_REFRESHED', token, expiresAt });
      channel.close();
    }
  } catch {}
}

if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data;
      if (
        data !== null &&
        typeof data === 'object' &&
        'type' in data &&
        data.type === 'TOKEN_REFRESHED' &&
        'token' in data &&
        typeof data.token === 'string'
      ) {
        if (activeTokenSetter) {
          activeTokenSetter(data.token);
        }
      }
    };
  } catch {}
}

let refreshPromise: Promise<string | null> | null = null;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function resolvePendingQueue(error: unknown, token: string | null): void {
  for (const item of pendingQueue) {
    if (error) {
      item.reject(error);
    } else if (token) {
      item.resolve(token);
    }
  }
  pendingQueue = [];
}

async function requestSharedRefresh(instance: AxiosInstance): Promise<string> {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'locks' in navigator) {
    return await navigator.locks.request(REFRESH_LOCK_NAME, async () => {
      const freshPersisted = readPersistedSession();
      if (isSessionTokenFresh(freshPersisted) && freshPersisted) {
        if (activeTokenSetter) {
          activeTokenSetter(freshPersisted.accessToken);
        }
        return freshPersisted.accessToken;
      }
      return await performBackendRefresh(instance);
    });
  }

  const freshPersisted = readPersistedSession();
  if (isSessionTokenFresh(freshPersisted) && freshPersisted) {
    if (activeTokenSetter) {
      activeTokenSetter(freshPersisted.accessToken);
    }
    return freshPersisted.accessToken;
  }
  return await performBackendRefresh(instance);
}

async function performBackendRefresh(instance: AxiosInstance): Promise<string> {
  try {
    const response = await instance.post<{
      data: {
        accessToken: string;
        accessExpiresAt: string;
        sessionId: string;
      };
    }>(
      '/auth/web-session-refreshes',
      {},
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    const newAccessToken = response.data.data.accessToken;
    const newExpiresAt = response.data.data.accessExpiresAt;

    if (activeTokenSetter) {
      activeTokenSetter(newAccessToken);
    }
    updatePersistedSessionToken(newAccessToken, newExpiresAt);
    broadcastAuthEvent(newAccessToken, newExpiresAt);

    return newAccessToken;
  } catch (refreshError: unknown) {
    const axiosError = refreshError as AxiosError<ApiErrorPayload>;
    if (axiosError.response?.status === 401) {
      if (activeTokenSetter) {
        activeTokenSetter(null);
      }
      clearPersistedSession();
      if (onUnauthorizedHandler) {
        onUnauthorizedHandler();
      }
    }
    throw refreshError;
  }
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
          const persisted = readPersistedSession();
          if (persisted && typeof persisted.accessToken === 'string') {
            token = persisted.accessToken;
          }
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
    async (error: AxiosError<ApiErrorPayload>) => {
      const response = error.response;
      const sentRequestId =
        (error.config?.headers?.['x-request-id'] as string) || crypto.randomUUID();

      if (response) {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        const requestUrl = originalRequest?.url ?? '';
        const isAuthRoute =
          requestUrl.includes('/auth/web-sessions') ||
          requestUrl.includes('/auth/web-session-refreshes') ||
          requestUrl.includes('/auth/password-');

        if (response.status === 401 && !isAuthRoute && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;

          if (refreshPromise !== null) {
            return new Promise<string>((resolve, reject) => {
              pendingQueue.push({ resolve, reject });
            }).then((newToken) => {
              originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
              return instance(originalRequest);
            });
          }

          refreshPromise = (async () => {
            try {
              const newToken = await requestSharedRefresh(instance);
              resolvePendingQueue(null, newToken);
              return newToken;
            } catch (refreshErr) {
              resolvePendingQueue(refreshErr, null);
              throw refreshErr;
            } finally {
              refreshPromise = null;
            }
          })();

          try {
            const newToken = await refreshPromise;
            if (newToken) {
              originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
              return await instance(originalRequest);
            }
          } catch (retryError) {
            return Promise.reject(retryError);
          }
        }

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
