import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManagementIdentitySession } from '../identity-access/session';
import { ConsultationRequestsPage } from './intake-page';

afterEach(() => vi.restoreAllMocks());

function restoreManager() {
  vi.spyOn(ManagementIdentitySession.prototype, 'restore').mockResolvedValue({
    status: 'authenticated',
    presentation: 'manager',
    denial: null,
    actor: {
      accountId: 'manager',
      displayEmail: 'manager@example.com',
      roles: ['MANAGER'],
      sessionId: 'session',
    },
  });
}

describe('Consultation navigation', () => {
  it('keeps the sidebar available while loading, after a server failure and after retry', async () => {
    restoreManager();
    const authorize = vi
      .spyOn(ManagementIdentitySession.prototype, 'authorize')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ data: { data: [], nextCursor: null } });
    render(<ConsultationRequestsPage />);
    const sidebar = screen.getByRole('navigation', { name: 'Điều hướng vận hành' });
    expect(sidebar).toBeVisible();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được yêu cầu tư vấn');
    expect(within(sidebar).getByRole('link', { name: 'Yêu cầu tư vấn' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(sidebar).getByRole('link', { name: 'Đặt tiệc' })).toHaveAttribute(
      'href',
      '/bookings',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(await screen.findByText('Chưa có yêu cầu tư vấn')).toBeVisible();
    expect(authorize).toHaveBeenCalledTimes(2);
    expect(sidebar).toBeVisible();
  });

  it('logs out from the consultation sidebar and hides management content', async () => {
    restoreManager();
    vi.spyOn(ManagementIdentitySession.prototype, 'authorize').mockResolvedValue({
      data: { data: [], nextCursor: null },
    });
    const logout = vi.spyOn(ManagementIdentitySession.prototype, 'logout').mockResolvedValue();
    render(<ConsultationRequestsPage />);
    expect(await screen.findByText('Chưa có yêu cầu tư vấn')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Cần tài khoản Quản lý')).toBeVisible();
    expect(screen.queryByText('Chưa có yêu cầu tư vấn')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng xuất' })).not.toBeInTheDocument();
  });
});
