import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffInvitationPage } from './staff-invitation-page';
import { staffInvitationApi, StaffInvitationError } from './staff-invitation-api';
import type * as InvitationModule from './staff-invitation-api';
vi.mock('./staff-invitation-api', async (original) => ({
  ...(await original<typeof InvitationModule>()),
  staffInvitationApi: { details: vi.fn(), accept: vi.fn() },
}));
const token = `wis_${'a'.repeat(43)}`;
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, '', `/staff-invitation#${token}`);
  vi.mocked(staffInvitationApi.details).mockResolvedValue({
    maskedEmail: 'st***f@example.com',
    hasExistingPassword: false,
    expiresAt: '2026-11-12T00:00:00Z',
  });
  vi.mocked(staffInvitationApi.accept).mockResolvedValue({
    accepted: true,
    email: 'staff@example.com',
    requiresLogin: true,
  });
});
describe('Staff invitation setup', () => {
  it('removes the fragment, verifies confirmation, submits the token and links to prefilled login', async () => {
    render(<StaffInvitationPage />);
    const input = await screen.findByLabelText('Mật khẩu mới');
    expect(window.location.hash).toBe('');
    expect(staffInvitationApi.accept).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'New-password' } });
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), {
      target: { value: 'Different' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thiết lập mật khẩu và nhận lời mời' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Hai mật khẩu chưa trùng khớp');
    expect(staffInvitationApi.accept).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), {
      target: { value: 'New-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Thiết lập mật khẩu và nhận lời mời' }));
    expect(await screen.findByRole('link', { name: 'Đến trang đăng nhập' })).toHaveAttribute(
      'href',
      '/?email=staff%40example.com',
    );
    expect(staffInvitationApi.accept).toHaveBeenCalledExactlyOnceWith(token, 'New-password');
  });
  it('asks an existing user for their current password only', async () => {
    vi.mocked(staffInvitationApi.details).mockResolvedValue({
      maskedEmail: 'st***f@example.com',
      hasExistingPassword: true,
      expiresAt: '2026-11-12T00:00:00Z',
    });
    render(<StaffInvitationPage />);
    fireEvent.change(await screen.findByLabelText('Mật khẩu hiện tại'), {
      target: { value: 'Existing-password' },
    });
    expect(screen.queryByLabelText('Xác nhận mật khẩu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nhận lời mời' }));
    await waitFor(() =>
      expect(staffInvitationApi.accept).toHaveBeenCalledWith(token, 'Existing-password'),
    );
  });
  it('shows invalid/expired links without exposing a setup form', async () => {
    vi.mocked(staffInvitationApi.details).mockRejectedValue(
      new StaffInvitationError('STAFF_INVITATION_INVALID_OR_EXPIRED'),
    );
    render(<StaffInvitationPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Lời mời không hợp lệ');
    expect(screen.queryByLabelText('Mật khẩu mới')).not.toBeInTheDocument();
  });
  it('retries a network failure using the in-memory token after removing the URL fragment', async () => {
    vi.mocked(staffInvitationApi.details).mockRejectedValueOnce(new Error('offline'));
    render(<StaffInvitationPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    await screen.findByLabelText('Mật khẩu mới');
    expect(staffInvitationApi.details).toHaveBeenNthCalledWith(2, token);
  });
  it('does not request an invitation when no token is present', async () => {
    window.history.replaceState(null, '', '/staff-invitation');
    render(<StaffInvitationPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Liên kết thiếu mã lời mời');
    expect(staffInvitationApi.details).not.toHaveBeenCalled();
  });
});
