import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { createManagementPrintOrdersGateway } from './print-orders-api';

interface MockRequestInit {
  method: string;
  headers: Headers;
  body?: string | null | undefined;
}

function getMockCall(mock: ReturnType<typeof vi.fn>, callIndex = 0): [string, MockRequestInit] {
  const call = mock.mock.calls[callIndex] as unknown as [string, RequestInit];
  return [
    call[0],
    {
      method: call[1].method ?? 'GET',
      headers: new Headers(call[1].headers),
      body: call[1].body as string | undefined,
    },
  ];
}

describe('Management Print Orders API Gateway', () => {
  it('calls GET /management/print-orders with token and query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { items: [], nextCursor: null } }),
    });

    const gateway = createManagementPrintOrdersGateway({
      baseUrl: 'http://test-api.local',
      fetch: fetchMock,
    });

    const res = await gateway.list('token-abc', {
      bookingId: 'book-123',
      limit: 10,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = getMockCall(fetchMock, 0);
    expect(url).toBe('http://test-api.local/management/print-orders?bookingId=book-123&limit=10');
    expect(init.method).toBe('GET');
    expect(init.headers.get('Authorization')).toBe('Bearer token-abc');
    expect(res).toEqual({ items: [], nextCursor: null });
  });

  it('calls POST /management/print-orders/:orderId/quotations with idempotency key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { orderId: 'ord-1', revision: 2, status: 'QUOTED' } }),
    });

    const gateway = createManagementPrintOrdersGateway({
      baseUrl: 'http://test-api.local',
      fetch: fetchMock,
    });

    const res = await gateway.quote(
      'token-abc',
      'ord-1',
      {
        expectedRevision: 1,
        lines: [{ lineId: 'l1', unitPriceVnd: 50000 }],
        estimatedHandoverAt: '2026-09-01T00:00:00.000Z',
      },
      'idem-key-1',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = getMockCall(fetchMock, 0);
    expect(url).toBe('http://test-api.local/management/print-orders/ord-1/quotations');
    expect(init.method).toBe('POST');
    expect(init.headers.get('Authorization')).toBe('Bearer token-abc');
    expect(init.headers.get('Idempotency-Key')).toBe('idem-key-1');
    expect(JSON.parse(init.body ?? '{}')).toEqual({
      expectedRevision: 1,
      lines: [{ lineId: 'l1', unitPriceVnd: 50000 }],
      estimatedHandoverAt: '2026-09-01T00:00:00.000Z',
    });
    expect(res).toEqual({ orderId: 'ord-1', revision: 2, status: 'QUOTED' });
  });

  it('calls POST /management/print-orders/:orderId/production for IN_PRODUCTION transition', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { orderId: 'ord-1', status: 'IN_PRODUCTION' } }),
    });

    const gateway = createManagementPrintOrdersGateway({
      baseUrl: 'http://test-api.local',
      fetch: fetchMock,
    });

    await gateway.startProduction('token-abc', 'ord-1', { expectedRevision: 2 }, 'key-prod');

    const [url, init] = getMockCall(fetchMock, 0);
    expect(url).toBe('http://test-api.local/management/print-orders/ord-1/production');
    expect(init.method).toBe('POST');
    expect(init.headers.get('Idempotency-Key')).toBe('key-prod');
  });

  it('calls POST /management/print-orders/:orderId/ready for READY_FOR_HANDOVER transition', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { orderId: 'ord-1', status: 'READY_FOR_HANDOVER' } }),
    });

    const gateway = createManagementPrintOrdersGateway({
      baseUrl: 'http://test-api.local',
      fetch: fetchMock,
    });

    await gateway.markReady('token-abc', 'ord-1', { expectedRevision: 3 }, 'key-ready');

    const [url, init] = getMockCall(fetchMock, 0);
    expect(url).toBe('http://test-api.local/management/print-orders/ord-1/ready');
    expect(init.method).toBe('POST');
  });

  it('calls POST /management/print-orders/:orderId/handover with evidence reference', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { orderId: 'ord-1', status: 'HANDED_OVER' } }),
    });

    const gateway = createManagementPrintOrdersGateway({
      baseUrl: 'http://test-api.local',
      fetch: fetchMock,
    });

    await gateway.markHandedOver(
      'token-abc',
      'ord-1',
      { expectedRevision: 4, evidenceReference: 'REF-123' },
      'key-handover',
    );

    const [url, init] = getMockCall(fetchMock, 0);
    expect(url).toBe('http://test-api.local/management/print-orders/ord-1/handover');
    expect(JSON.parse(init.body ?? '{}')).toEqual({
      expectedRevision: 4,
      evidenceReference: 'REF-123',
    });
  });

  it('throws ApiClientError with status 409 and PRINT_ORDER_CONFLICT on stale revision', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          error: {
            code: 'PRINT_ORDER_CONFLICT',
            message: 'Stale revision.',
            requestId: 'req-err',
          },
        }),
    });

    const gateway = createManagementPrintOrdersGateway({
      baseUrl: 'http://test-api.local',
      fetch: fetchMock,
    });

    await expect(
      gateway.startProduction('token-abc', 'ord-1', { expectedRevision: 1 }, 'key-1'),
    ).rejects.toThrow(ApiClientError);
  });
});
