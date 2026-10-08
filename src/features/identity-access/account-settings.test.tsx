import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { AccountSettings } from './account-settings';
import { createAccountGateway } from './account-api';
import { createIdentityApi, ManagementIdentitySession } from './session';

vi.mock('./account-api', () => {
  const gateway = {
    profile: vi.fn(),
    updateProfile: vi.fn(),
    requestPasswordChange: vi.fn(),
    changePassword: vi.fn(),
  };
  return { createAccountGateway: () => gateway };
});
const gateway = vi.mocked(createAccountGateway());
const requestId = '11111111-1111-4111-8111-111111111111';
function apiError(code: string, status: number, seconds?: number) {
  return new ApiClientError({
    kind: 'api',
    code,
    status,
    requestId,
    message: code,
    ...(seconds === undefined ? {} : { retryAfterSeconds: seconds }),
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  gateway.profile.mockResolvedValue({
    accountId: requestId,
    displayEmail: 'couple@example.com',
    displayName: 'Lan và Minh',
    revision: 1,
  });
  gateway.requestPasswordChange.mockResolvedValue({
    accepted: true,
    challengeId: requestId,
    expiresInSeconds: 600,
    resendAfterSeconds: 60,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
async function showForm() {
  const session = new ManagementIdentitySession(createIdentityApi());
  vi.spyOn(session, 'authorize').mockImplementation((operation) => operation('test-access-token'));
  const signedOut = vi.fn();
  render(<AccountSettings session={session} onSignedOut={signedOut} />);
  await screen.findByLabelText('Mật khẩu hiện tại');
  for (const [label, value] of [
    ['Mật khẩu hiện tại', 'Initial-password-123'],
    ['Mật khẩu mới', 'Replacement-password-123'],
    ['Xác nhận mật khẩu mới', 'Replacement-password-123'],
  ] as const)
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  return signedOut;
}
describe('account password OTP errors', () => {
  it('verifies the OTP before changing the password and clears the revoked session', async () => {
    const signedOut = await showForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    const code = await screen.findByLabelText('Mã OTP');
    expect(gateway.requestPasswordChange).toHaveBeenCalledWith(
      'test-access-token',
      'Initial-password-123',
    );
    expect(gateway.changePassword).not.toHaveBeenCalled();
    fireEvent.change(code, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận và cập nhật mật khẩu' }));
    await waitFor(() => expect(signedOut).toHaveBeenCalledTimes(1));
    expect(gateway.changePassword).toHaveBeenCalledWith(
      'test-access-token',
      requestId,
      '123456',
      'Replacement-password-123',
    );
  });

  it('preserves the form when password confirmation does not match', async () => {
    await showForm();
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), {
      target: { value: 'different-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Hai mật khẩu mới chưa trùng khớp');
    expect(gateway.requestPasswordChange).not.toHaveBeenCalled();
  });

  it('reports a wrong current password without sending a successful notice', async () => {
    gateway.requestPasswordChange.mockRejectedValueOnce(apiError('CURRENT_PASSWORD_INVALID', 422));
    await showForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mật khẩu hiện tại chưa đúng');
    expect(screen.queryByLabelText('Mã OTP')).not.toBeInTheDocument();
  });

  it('keeps the OTP step after an invalid code or network failure', async () => {
    const signedOut = await showForm();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    fireEvent.change(await screen.findByLabelText('Mã OTP'), { target: { value: '123456' } });
    gateway.changePassword.mockRejectedValueOnce(apiError('OTP_INVALID_OR_EXPIRED', 422));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận và cập nhật mật khẩu' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã OTP chưa đúng hoặc đã hết hạn');
    gateway.changePassword.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận và cập nhật mật khẩu' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('kiểm tra kết nối'));
    expect(signedOut).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Mã OTP')).toHaveValue('123456');
  });
  it('shows the server wait, prevents repeated requests and preserves the entered passwords', async () => {
    gateway.requestPasswordChange.mockRejectedValueOnce(apiError('RATE_LIMITED', 429, 2));
    const signedOut = await showForm();
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Hãy chờ 2 giây');
    expect(screen.queryByLabelText('Mã OTP')).not.toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Thử lại sau 2 giây' });
    expect(retry).toBeDisabled();
    fireEvent.click(retry);
    expect(gateway.requestPasswordChange.mock.calls).toHaveLength(1);
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('Replacement-password-123');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    await screen.findByLabelText('Mã OTP');
    expect(gateway.requestPasswordChange.mock.calls).toHaveLength(2);
    expect(gateway.changePassword.mock.calls).toHaveLength(0);
    expect(signedOut).not.toHaveBeenCalled();
  });
  it('also applies the server wait when resending an existing challenge', async () => {
    await showForm();
    vi.useFakeTimers();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
      await Promise.resolve();
    });
    expect(screen.getByLabelText('Mã OTP')).toBeInTheDocument();
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    vi.useRealTimers();
    gateway.requestPasswordChange.mockRejectedValueOnce(apiError('RATE_LIMITED', 429, 3600));
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lại mã OTP' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Hãy chờ 60 phút');
    expect(screen.getByRole('button', { name: /Gửi lại sau/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Xác nhận và cập nhật mật khẩu' })).toBeEnabled();
    expect(screen.queryByText(/Mã OTP đã được gửi/)).not.toBeInTheDocument();
  });
  it.each(['EMAIL_NOT_CONFIGURED', 'OTP_EMAIL_DELIVERY_FAILED'])(
    'reports %s as an email service failure without pretending a code was sent',
    async (code) => {
      gateway.requestPasswordChange.mockRejectedValueOnce(apiError(code, 503));
      await showForm();
      fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
      await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Dịch vụ email'));
      expect(screen.queryByLabelText('Mã OTP')).not.toBeInTheDocument();
      expect(gateway.changePassword.mock.calls).toHaveLength(0);
    },
  );
});
