import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  invitationDeliveryMessage,
  staffInvitationApi,
  StaffInvitationError,
} from './staff-invitation-api';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('public Staff invitation gateway', () => {
  it('sends the token only in JSON without cookies or an authenticated identity', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3102/api/v1');
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            maskedEmail: 'st***f@example.test',
            hasExistingPassword: false,
            expiresAt: '2026-11-12T00:00:00Z',
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetcher);
    await staffInvitationApi.details('test-token');
    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3102/api/v1/auth/staff-invitation-details',
      expect.objectContaining({
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({ invitationToken: 'test-token' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  it('retains the server rate-limit code and never treats rejected requests as success', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3102/api/v1');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { code: 'RATE_LIMITED' } }), { status: 429 }),
        ),
    );
    await expect(staffInvitationApi.accept('token', 'password')).rejects.toEqual(
      new StaffInvitationError('RATE_LIMITED'),
    );
  });
  it('distinguishes provider acceptance from inbox delivery and ambiguous sends', () => {
    expect(invitationDeliveryMessage('ACCEPTED')).toContain('Nhà cung cấp đã tiếp nhận');
    expect(invitationDeliveryMessage('FAILED')).toContain('bị từ chối');
    expect(invitationDeliveryMessage('UNKNOWN')).toContain('Chưa xác nhận');
  });
});
