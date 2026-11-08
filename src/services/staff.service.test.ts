import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axiosApiClient } from '../lib/api/axios-client';
import { staffService } from './staff.service';
vi.mock('../lib/api/axios-client', () => ({ axiosApiClient: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(axiosApiClient.post).mockResolvedValue({
    data: { data: { assignmentId: 'assignment' } },
  });
});
describe('personnel commands', () => {
  it('normalizes staff email and sends durable command identity', async () => {
    await staffService.provisionStaffAccount({ email: ' STAFF@Example.com ' }, 'key');
    expect(axiosApiClient.post).toHaveBeenCalledWith(
      '/management/staff-accounts',
      { email: 'staff@example.com' },
      { headers: { 'Idempotency-Key': 'key' } },
    );
  });
  it('preserves the assignment revision and limits the body to the assigned account', async () => {
    await staffService.assignStaff(
      { bookingId: 'event', staffAccountId: 'staff', expectedRevision: 4 },
      'key',
    );
    expect(axiosApiClient.post).toHaveBeenCalledWith(
      '/management/events/event/assignments',
      { staffAccountId: 'staff', expectedRevision: 4 },
      { headers: { 'Idempotency-Key': 'key' } },
    );
  });
  it('records the reason and exact revision when revoking', async () => {
    await staffService.revokeAssignment('event', 'assignment', 4, 'Điều chuyển nhân viên', 'key');
    expect(axiosApiClient.post).toHaveBeenCalledWith(
      '/management/events/event/assignments/assignment/revocation',
      { expectedRevision: 4, reason: 'Điều chuyển nhân viên' },
      { headers: { 'Idempotency-Key': 'key' } },
    );
  });
});
