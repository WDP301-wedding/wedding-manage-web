import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManagementAccountExperience } from './account-page';
import { createAccountGateway } from './account-api';
import { ManagementIdentitySession, type IdentityApi } from './session';
import { ApiClientError } from '../../lib/api/client';

vi.mock('./account-api', () => ({
  createAccountGateway: () => gatewayMocks,
}));
const gatewayMocks = vi.hoisted(() => ({
  profile: vi.fn(),
  updateProfile: vi.fn(),
  requestPasswordChange: vi.fn(),
  changePassword: vi.fn(),
}));
const gateway = vi.mocked(createAccountGateway());
const actor = { accountId: 'account', displayEmail: 'operator@example.com', sessionId: 'session' };
function createSession(roles: ('MANAGER' | 'STAFF' | 'COUPLE')[]) {
  const api: IdentityApi = {
    createSession: vi.fn(),
    getCurrentUser: vi.fn().mockResolvedValue({ ...actor, roles }),
    refreshSession: vi.fn().mockResolvedValue({
      accessToken: 'preview-access',
      accessExpiresAt: '2026-10-10T00:00:00Z',
      sessionId: actor.sessionId,
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    requestPasswordReset: vi.fn(),
    completePasswordReset: vi.fn(),
  };
  return new ManagementIdentitySession(api);
}
beforeEach(() => {
  vi.resetAllMocks();
  gateway.profile.mockResolvedValue({
    accountId: 'account',
    displayEmail: actor.displayEmail,
    displayName: 'Người điều phối',
    revision: 1,
  });
  gateway.requestPasswordChange.mockResolvedValue({
    accepted: true,
    challengeId: 'challenge',
    resendAfterSeconds: 60,
    expiresInSeconds: 600,
  });
  gateway.changePassword.mockResolvedValue(undefined);
});

describe('Management account access', () => {
  it('allows Staff to manage their password without exposing Manager navigation', async () => {
    render(<ManagementAccountExperience session={createSession(['STAFF'])} />);
    expect(await screen.findByLabelText('Mật khẩu hiện tại')).toBeVisible();
    const sidebar = screen.getByRole('navigation', { name: 'Điều hướng vận hành' });
    expect(within(sidebar).queryByRole('link', { name: 'Danh mục' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quản lý tài khoản/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('denies a Couple account without requesting its profile', async () => {
    render(<ManagementAccountExperience session={createSession(['COUPLE'])} />);
    expect(await screen.findByText('Không có quyền truy cập')).toBeVisible();
    expect(gateway.profile).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Mật khẩu hiện tại')).not.toBeInTheDocument();
  });

  it('removes the local credential and account form after successful password verification', async () => {
    const session = createSession(['MANAGER']);
    render(<ManagementAccountExperience session={session} />);
    await screen.findByLabelText('Mật khẩu hiện tại');
    for (const [label, value] of [
      ['Mật khẩu hiện tại', 'Current-password-123'],
      ['Mật khẩu mới', 'New-password-123'],
      ['Xác nhận mật khẩu mới', 'New-password-123'],
    ] as const) {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    fireEvent.change(await screen.findByLabelText('Mã OTP'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận và cập nhật mật khẩu' }));
    expect(await screen.findByText(/Đã đổi mật khẩu thành công/)).toBeVisible();
    expect(session.snapshot()).toEqual({ status: 'anonymous', denial: null });
    await expect(session.authorize(() => Promise.resolve())).rejects.toThrow(
      'Authentication is required',
    );
    expect(screen.queryByLabelText('Mật khẩu hiện tại')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
  });

  it('returns to the login prompt if loading the profile expires the session', async () => {
    gateway.profile.mockRejectedValue(
      new ApiClientError({
        kind: 'api',
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Expired',
        requestId: 'request',
      }),
    );
    const session = createSession(['MANAGER']);
    render(<ManagementAccountExperience session={session} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Phiên làm việc đã hết hạn');
    await waitFor(() => expect(screen.getByText('Cần đăng nhập')).toBeVisible());
    expect(session.snapshot().status).toBe('anonymous');
  });
});
