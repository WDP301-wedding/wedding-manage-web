import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../lib/api/client';
import { createManagementBillingGateway } from './billing-api';

function harness(data: unknown = { bookingId: 'booking', billingRevision: 4, history: [] }) {
  const requests: Request[] = [];
  const client = createApiClient({
    baseUrl: 'http://localhost:4000/api/v1',
    fetch: (request) => {
      requests.push(request.clone());
      return Promise.resolve(Response.json({ data }));
    },
  });
  return { gateway: createManagementBillingGateway(client), requests };
}
describe('generated management billing adapter', () => {
  it('submits explicit refund approval with nested basis and stable idempotency key', async () => {
    const { gateway, requests } = harness({ refundApprovalId: 'approval' });
    const body = {
      bookingId: 'booking',
      expectedBillingRevision: 4,
      approvedRefundableVnd: 100000,
      basis: { kind: 'CREDIT' as const, sourceEntryId: 'credit' },
      reason: 'Theo quyết định',
      evidenceReference: 'approval-1',
    };
    expect(await gateway.approveRefund('token', body, 'approval-key')).toEqual({
      refundApprovalId: 'approval',
    });
    expect(requests[0]!.url).toContain('/management/billing/refund-approvals');
    expect(await requests[0]!.json()).toEqual(body);
    expect(requests[0]!.headers.get('Idempotency-Key')).toBe('approval-key');
    expect(requests[0]!.headers.get('Authorization')).toBe('Bearer token');
  });
  it('reads fixed-revision pages and attempt status with current bearer and no-store', async () => {
    const { gateway, requests } = harness();
    await gateway.load('token', 'booking');
    await gateway.load('rotated', 'booking', { cursor: 'next', throughBillingRevision: 4 });
    await gateway.loadAttempt('rotated', 'booking', 'attempt');
    expect(new URL(requests[1]!.url).searchParams.get('throughBillingRevision')).toBe('4');
    expect(new URL(requests[1]!.url).searchParams.get('cursor')).toBe('next');
    expect(requests[1]!.headers.get('Authorization')).toBe('Bearer rotated');
    expect(requests[0]!.cache).toBe('no-store');
    expect(requests[2]!.url).toContain('/payments/attempt');
  });
  it('sends only the public manual/refund DTO and explicit stable key', async () => {
    const { gateway, requests } = harness();
    const manual = {
      bookingId: 'booking',
      purpose: 'BALANCE' as const,
      amountVnd: 1_500_000,
      settledAt: '2026-10-09T10:00:00Z',
      reason: 'Đã kiểm tra',
      evidenceReference: 'receipt-1',
    };
    const refund = {
      sourcePaymentId: 'payment',
      amountVnd: 100_000,
      expectedBillingRevision: 4,
      reason: 'Quyết định đã duyệt',
      evidenceReference: 'refund-1',
    };
    await gateway.recordManual('token', manual, 'same-key');
    await gateway.refund('token', refund, 'refund-key');
    expect(await requests[0]!.json()).toEqual(manual);
    expect(await requests[1]!.json()).toEqual(refund);
    expect(requests[0]!.headers.get('Idempotency-Key')).toBe('same-key');
    expect(requests[1]!.headers.get('Idempotency-Key')).toBe('refund-key');
  });
  it('does not treat a body without data as success', async () => {
    const client = createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: () => Promise.resolve(Response.json({})),
    });
    const gateway = createManagementBillingGateway(client);
    await expect(gateway.load('token', 'booking')).rejects.toThrow('dữ liệu');
    await expect(gateway.loadAttempt('token', 'booking', 'attempt')).rejects.toThrow('dữ liệu');
    await expect(
      gateway.recordManual(
        'token',
        {
          bookingId: 'booking',
          purpose: 'DEPOSIT',
          amountVnd: 10,
          settledAt: '2026-10-09T10:00:00Z',
          evidenceReference: 'receipt',
          reason: 'Reason',
        },
        'key',
      ),
    ).rejects.toThrow('dữ liệu');
    await expect(
      gateway.refund(
        'token',
        {
          sourcePaymentId: 'payment',
          amountVnd: 10,
          expectedBillingRevision: 1,
          reason: 'Reason',
          evidenceReference: 'receipt',
        },
        'key',
      ),
    ).rejects.toThrow('dữ liệu');
    await expect(
      gateway.approveRefund(
        'token',
        {
          bookingId: 'booking',
          expectedBillingRevision: 1,
          approvedRefundableVnd: 10,
          basis: { kind: 'CANCELLATION' },
          reason: 'Reason',
          evidenceReference: 'receipt',
        },
        'key',
      ),
    ).rejects.toThrow('dữ liệu');
  });
});
