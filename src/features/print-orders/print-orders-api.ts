import { ApiClientError } from '../../lib/api/client';
import { readPublicEnv } from '../../lib/env';
import type {
  CancelOrderBody,
  HandoverOrderBody,
  ManagementPrintOrderListQuery,
  PrintOrderListResult,
  PrintOrderView,
  QuotePrintOrderBody,
  TransitionOrderBody,
} from './print-orders-types';

export interface ManagementPrintOrdersGateway {
  list(
    this: void,
    token: string,
    query?: ManagementPrintOrderListQuery,
  ): Promise<PrintOrderListResult>;
  get(this: void, token: string, orderId: string): Promise<PrintOrderView>;
  quote(
    this: void,
    token: string,
    orderId: string,
    body: QuotePrintOrderBody,
    idempotencyKey: string,
  ): Promise<PrintOrderView>;
  startProduction(
    this: void,
    token: string,
    orderId: string,
    body: TransitionOrderBody,
    idempotencyKey: string,
  ): Promise<PrintOrderView>;
  markReady(
    this: void,
    token: string,
    orderId: string,
    body: TransitionOrderBody,
    idempotencyKey: string,
  ): Promise<PrintOrderView>;
  markHandedOver(
    this: void,
    token: string,
    orderId: string,
    body: HandoverOrderBody,
    idempotencyKey: string,
  ): Promise<PrintOrderView>;
  cancel(
    this: void,
    token: string,
    orderId: string,
    body: CancelOrderBody,
    idempotencyKey: string,
  ): Promise<PrintOrderView>;
  proposeReplacement(
    this: void,
    token: string,
    orderId: string,
    body: QuotePrintOrderBody,
    idempotencyKey: string,
  ): Promise<PrintOrderView>;
}

export type CreatePrintOrdersGatewayOptions = Readonly<{
  baseUrl?: string;
  fetch?: typeof fetch;
}>;

async function executeApiRequest<T>(
  url: string,
  options: RequestInit,
  fetchImpl: typeof fetch,
  timeoutMs = 15000,
): Promise<T> {
  const requestId = crypto.randomUUID();
  const headers = new Headers(options.headers);
  if (!headers.has('x-request-id')) {
    headers.set('x-request-id', requestId);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error('TIMEOUT'));
  }, timeoutMs);

  let response: Response;
  try {
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal;
    response = await fetchImpl(url, { ...options, headers, signal });
  } catch (error) {
    clearTimeout(timer);
    const isTimeout =
      (error instanceof Error && error.message === 'TIMEOUT') ||
      (error instanceof DOMException && error.name === 'TimeoutError');
    throw new ApiClientError({
      kind: 'network',
      code: isTimeout ? 'NETWORK_TIMEOUT' : 'NETWORK_ERROR',
      message: isTimeout
        ? 'Yêu cầu vượt quá thời gian phản hồi (15 giây). Vui lòng thử lại.'
        : 'Không thể kết nối đến máy chủ quản lý đơn in.',
      requestId,
      cause: error,
    });
  } finally {
    clearTimeout(timer);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new ApiClientError({
      kind: 'malformed-response',
      code: 'MALFORMED_API_RESPONSE',
      message: 'Máy chủ trả về phản hồi không hợp lệ.',
      requestId,
      status: response.status,
      cause: error,
    });
  }

  if (!response.ok) {
    const errorPayload = json as {
      error?: { code?: string; message?: string; requestId?: string };
    };
    const code =
      errorPayload?.error?.code ?? (response.status === 409 ? 'PRINT_ORDER_CONFLICT' : 'API_ERROR');
    let message = errorPayload?.error?.message;
    if (!message) {
      if (code === 'PRINT_CANCELLATION_NOT_ALLOWED') {
        message =
          'Không thể hủy đơn in: Cặp đôi chưa gửi/xác nhận ý định hủy từ ứng dụng hoặc đơn in đang trong tiến trình sản xuất.';
      } else if (response.status === 409) {
        message =
          'Dữ liệu đơn in đã thay đổi trên máy chủ (stale revision). Vui lòng làm mới để tải phiên bản mới nhất.';
      } else {
        message = `Lỗi thao tác đơn in (HTTP ${response.status}).`;
      }
    }

    throw new ApiClientError({
      kind: 'api',
      code,
      message,
      requestId: errorPayload?.error?.requestId ?? requestId,
      status: response.status,
    });
  }

  if (typeof json !== 'object' || json === null || !('data' in json)) {
    throw new ApiClientError({
      kind: 'malformed-response',
      code: 'MALFORMED_API_RESPONSE',
      message: 'Máy chủ trả về phản hồi không đúng cấu trúc phong bì dữ liệu ({ data }).',
      requestId,
      status: response.status,
    });
  }

  const result = json as { data: T };
  return result.data;
}

function buildApiUrl(baseUrl: string, path: string): URL {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return new URL(`${normalizedBase}/${normalizedPath}`);
}

export function createManagementPrintOrdersGateway(
  options: CreatePrintOrdersGatewayOptions = {},
): ManagementPrintOrdersGateway {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const getBaseUrl = () => options.baseUrl ?? readPublicEnv().NEXT_PUBLIC_API_BASE_URL;

  const authHeaders = (token: string, idempotencyKey?: string) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (idempotencyKey !== undefined) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return headers;
  };

  return {
    async list(token, query) {
      const url = buildApiUrl(getBaseUrl(), '/management/print-orders');
      if (query?.bookingId) url.searchParams.set('bookingId', query.bookingId);
      if (query?.cursor) url.searchParams.set('cursor', query.cursor);
      if (query?.limit) url.searchParams.set('limit', String(query.limit));

      return executeApiRequest<PrintOrderListResult>(
        url.toString(),
        {
          method: 'GET',
          headers: authHeaders(token),
          cache: 'no-store',
        },
        fetchImpl,
      );
    },

    async get(token, orderId) {
      const url = buildApiUrl(
        getBaseUrl(),
        `/management/print-orders/${encodeURIComponent(orderId)}`,
      );
      return executeApiRequest<PrintOrderView>(
        url.toString(),
        {
          method: 'GET',
          headers: authHeaders(token),
          cache: 'no-store',
        },
        fetchImpl,
      );
    },

    async quote(token, orderId, body, idempotencyKey) {
      const url = buildApiUrl(
        getBaseUrl(),
        `/management/print-orders/${encodeURIComponent(orderId)}/quotations`,
      );
      return executeApiRequest<PrintOrderView>(
        url.toString(),
        {
          method: 'POST',
          headers: authHeaders(token, idempotencyKey),
          body: JSON.stringify(body),
        },
        fetchImpl,
      );
    },

    async startProduction(token, orderId, body, idempotencyKey) {
      const url = buildApiUrl(
        getBaseUrl(),
        `/management/print-orders/${encodeURIComponent(orderId)}/production`,
      );
      return executeApiRequest<PrintOrderView>(
        url.toString(),
        {
          method: 'POST',
          headers: authHeaders(token, idempotencyKey),
          body: JSON.stringify(body),
        },
        fetchImpl,
      );
    },

    async markReady(token, orderId, body, idempotencyKey) {
      const url = buildApiUrl(
        getBaseUrl(),
        `/management/print-orders/${encodeURIComponent(orderId)}/ready`,
      );
      return executeApiRequest<PrintOrderView>(
        url.toString(),
        {
          method: 'POST',
          headers: authHeaders(token, idempotencyKey),
          body: JSON.stringify(body),
        },
        fetchImpl,
      );
    },

    async markHandedOver(token, orderId, body, idempotencyKey) {
      const url = buildApiUrl(
        getBaseUrl(),
        `/management/print-orders/${encodeURIComponent(orderId)}/handover`,
      );
      return executeApiRequest<PrintOrderView>(
        url.toString(),
        {
          method: 'POST',
          headers: authHeaders(token, idempotencyKey),
          body: JSON.stringify(body),
        },
        fetchImpl,
      );
    },

    async cancel(token, orderId, body, idempotencyKey) {
      const url = buildApiUrl(
        getBaseUrl(),
        `/management/print-orders/${encodeURIComponent(orderId)}/cancellation`,
      );
      return executeApiRequest<PrintOrderView>(
        url.toString(),
        {
          method: 'POST',
          headers: authHeaders(token, idempotencyKey),
          body: JSON.stringify(body),
        },
        fetchImpl,
      );
    },

    async proposeReplacement(token, orderId, body, idempotencyKey) {
      const url = buildApiUrl(
        getBaseUrl(),
        `/management/print-orders/${encodeURIComponent(orderId)}/replacement-proposals`,
      );
      return executeApiRequest<PrintOrderView>(
        url.toString(),
        {
          method: 'POST',
          headers: authHeaders(token, idempotencyKey),
          body: JSON.stringify(body),
        },
        fetchImpl,
      );
    },
  };
}
