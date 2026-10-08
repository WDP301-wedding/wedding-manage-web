import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPasswordOtpGateway } from './password-otp-api';
import { PasswordResetOtpForm } from './password-reset-otp-form';
vi.mock('./password-otp-api', () => {
  const gateway = { request: vi.fn(), complete: vi.fn() };
  return { createPasswordOtpGateway: () => gateway };
});
const gateway = vi.mocked(createPasswordOtpGateway());
beforeEach(() => {
  vi.clearAllMocks();
  gateway.request.mockResolvedValue({
    accepted: true,
    challengeId: '11111111-1111-4111-8111-111111111111',
    expiresInSeconds: 600,
    resendAfterSeconds: 60,
  });
  gateway.complete.mockResolvedValue(undefined);
});
describe('email OTP password recovery', () => {
  it('requires confirmation and sends the entered code before returning to login', async () => {
    const done = vi.fn();
    render(<PasswordResetOtpForm onCompleted={done} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'couple@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    await screen.findByLabelText('Mã OTP');
    expect(screen.getByRole('button', { name: /Gửi lại sau/ })).toBeDisabled();
    expect(done).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Mã OTP'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu mới'), {
      target: { value: 'replacement-password-123' },
    });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), {
      target: { value: 'different-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận và cập nhật mật khẩu' }));
    expect(gateway.complete).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), {
      target: { value: 'replacement-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận và cập nhật mật khẩu' }));
    await waitFor(() => expect(done).toHaveBeenCalledTimes(1));
    expect(gateway.complete).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      '123456',
      'replacement-password-123',
    );
  });
  it('preserves the form after a wrong code and never automatically retries the mutation', async () => {
    gateway.complete.mockRejectedValue(new Error('invalid code'));
    render(<PasswordResetOtpForm onCompleted={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'couple@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi mã OTP' }));
    await screen.findByLabelText('Mã OTP');
    for (const [name, value] of [
      ['Mã OTP', '000000'],
      ['Mật khẩu mới', 'replacement-password-123'],
      ['Xác nhận mật khẩu mới', 'replacement-password-123'],
    ] as const)
      fireEvent.change(screen.getByLabelText(name), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận và cập nhật mật khẩu' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mã chưa đúng');
    expect(screen.getByLabelText('Mật khẩu mới')).toHaveValue('replacement-password-123');
    expect(gateway.complete).toHaveBeenCalledTimes(1);
  });
});
