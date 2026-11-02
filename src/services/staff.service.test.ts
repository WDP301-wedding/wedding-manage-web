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

  it('undoes the latest check-in that has not been undone yet', async () => {
    vi.mocked(axiosApiClient.get).mockResolvedValue({
      data: {
        data: {
          items: [
            { checkInRecordId: 'r1', action: 'CHECK_IN', originalCheckInRecordId: null },
            { checkInRecordId: 'u1', action: 'UNDO', originalCheckInRecordId: 'r1' },
            { checkInRecordId: 'r2', action: 'CHECK_IN', originalCheckInRecordId: null },
          ],
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
    expect(axiosApiClient.post).toHaveBeenCalledWith(
      '/staff/events/booking/guests/guest/check-in-undos',
      { checkInRecordId: 'r2', expectedLedgerRevision: 4, reason: 'Lý do hoàn tác đủ dài' },
      { headers: { 'Idempotency-Key': 'key-2' } },
    );
  });
});
