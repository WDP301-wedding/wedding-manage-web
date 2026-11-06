import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axiosApiClient } from '../lib/api/axios-client';
import { staffService } from './staff.service';

vi.mock('../lib/api/axios-client', () => ({
  axiosApiClient: { get: vi.fn(), post: vi.fn() },
}));

describe('staffService check-in commands', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends an empty body with an idempotency key when checking in', async () => {
    await staffService.checkInGuest('booking', 'guest', undefined, 'key-1');
    expect(axiosApiClient.post).toHaveBeenCalledWith(
      '/staff/events/booking/guests/guest/check-ins',
      {},
      { headers: { 'Idempotency-Key': 'key-1' } },
    );
  });

  it('sends the manager override reason with the check-in', async () => {
    await staffService.checkInGuest('booking', 'guest', 'Khách đến sớm, quản lý đón', 'key-3');
    expect(axiosApiClient.post).toHaveBeenCalledWith(
      '/staff/events/booking/guests/guest/check-ins',
      { overrideReason: 'Khách đến sớm, quản lý đón' },
      { headers: { 'Idempotency-Key': 'key-3' } },
    );
  });

  it('undoes the check-in at the displayed ledger revision using a bounded history request', async () => {
    vi.mocked(axiosApiClient.get).mockResolvedValue({
      data: {
        data: {
          items: [{ checkInRecordId: 'r2', action: 'CHECK_IN', ledgerRevision: 4 }],
        },
      },
    });
    await staffService.undoCheckIn(
      'booking',
      'guest',
      4,
      'Lý do hoàn tác đủ dài',
      undefined,
      'key-2',
    );
    expect(axiosApiClient.get).toHaveBeenCalledWith(
      '/staff/events/booking/guests/guest/check-ins',
      { params: { afterRevision: 3, limit: 1 } },
    );
    expect(axiosApiClient.post).toHaveBeenCalledWith(
      '/staff/events/booking/guests/guest/check-in-undos',
      { checkInRecordId: 'r2', expectedLedgerRevision: 4, reason: 'Lý do hoàn tác đủ dài' },
      { headers: { 'Idempotency-Key': 'key-2' } },
    );
  });

  it.each([
    { scenario: 'empty history', items: [] },
    {
      scenario: 'already undone',
      items: [{ checkInRecordId: 'u1', action: 'UNDO', ledgerRevision: 4 }],
    },
    {
      scenario: 'changed revision',
      items: [{ checkInRecordId: 'r3', action: 'CHECK_IN', ledgerRevision: 5 }],
    },
  ])(
    'requires a refreshed guest when the requested ledger head is unavailable: $scenario',
    async ({ items }) => {
      vi.mocked(axiosApiClient.get).mockResolvedValue({ data: { data: { items } } });

      await expect(
        staffService.undoCheckIn(
          'booking',
          'guest',
          4,
          'Lý do hoàn tác đủ dài',
          undefined,
          'key-4',
        ),
      ).rejects.toThrow('Trạng thái khách đã thay đổi. Tra cứu lại trước khi hoàn tác.');
      expect(axiosApiClient.post).not.toHaveBeenCalled();
    },
  );

  it('uses the selected immutable record ID without scanning history', async () => {
    await staffService.undoCheckIn(
      'booking',
      'guest',
      4,
      'Lý do hoàn tác đủ dài',
      'Quản lý xác nhận hoàn tác',
      'key-5',
      'r2',
    );

    expect(axiosApiClient.get).not.toHaveBeenCalled();
    expect(axiosApiClient.post).toHaveBeenCalledWith(
      '/staff/events/booking/guests/guest/check-in-undos',
      {
        checkInRecordId: 'r2',
        expectedLedgerRevision: 4,
        reason: 'Lý do hoàn tác đủ dài',
        overrideReason: 'Quản lý xác nhận hoàn tác',
      },
      { headers: { 'Idempotency-Key': 'key-5' } },
    );
  });
});
