import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import HomePage from '../../app/page';
import { ApiClientError } from '../lib/api/client';
import {
  ManagementIdentityExperience,
  ManagementIdentityPage,
} from '../features/identity-access/identity-page';
import {
  consumeResetFragment,
  ManagementIdentitySession,
  type IdentityApi,
} from '../features/identity-access/session';

const actorBase = {
  accountId: '24dcfaac-4408-4d42-8d66-456ed6ee7ea4',
  displayEmail: 'operations@example.com',
  sessionId: '3bd38130-13f4-4c14-8c93-cf0c20781d7e',
};

function createApi(roles: readonly ('MANAGER' | 'STAFF' | 'COUPLE')[]): IdentityApi {
  return {
    completePasswordReset: vi.fn().mockResolvedValue(undefined),
    createSession: vi.fn().mockResolvedValue({
      accessToken: 'wia_access',
      accessExpiresAt: '2026-10-04T10:10:00.000Z',
      sessionId: actorBase.sessionId,
    }),
    getCurrentUser: vi.fn().mockResolvedValue({ ...actorBase, roles }),
    logout: vi.fn().mockResolvedValue(undefined),
    refreshSession: vi.fn().mockResolvedValue({
      accessToken: 'wia_rotated',
      accessExpiresAt: '2026-10-04T10:20:00.000Z',
      sessionId: actorBase.sessionId,
    }),
    requestPasswordReset: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Management identity session', () => {
  it('removes a reset credential from history without writing browser storage', () => {
    const replace = vi.fn();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const token = `wip_${'a'.repeat(43)}`;

    expect(consumeResetFragment(`https://manage.example/reset#resetToken=${token}`, replace)).toBe(
      token,
    );
    expect(replace).toHaveBeenCalledWith('/reset');
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it('restores once and derives Manager presentation only from /auth/me', async () => {
    const api = createApi(['MANAGER']);
    const session = new ManagementIdentitySession(api);

    const [first, second] = await Promise.all([session.restore(), session.restore()]);

    expect(api.refreshSession).toHaveBeenCalledTimes(1);
    expect(api.getCurrentUser).toHaveBeenCalledWith('wia_rotated');
    expect(first).toEqual(second);
    expect(first).toMatchObject({ status: 'authenticated', presentation: 'manager' });
    expect(JSON.stringify(first)).not.toContain('wia_rotated');
  });

  it('does not manufacture management access for an authenticated Couple', async () => {
    const api = createApi(['COUPLE']);
    const session = new ManagementIdentitySession(api);

    const snapshot = await session.login('couple@example.com', 'sample-password-123');

    expect(snapshot).toMatchObject({ status: 'authenticated', presentation: 'denied' });
  });

  it('keeps backend denial authoritative and clears local state on logout', async () => {
    const api = createApi(['STAFF']);
    const session = new ManagementIdentitySession(api);
    await session.login('staff@example.com', 'sample-password-123');

    await expect(
      session.authorize(() =>
        Promise.reject(
          new ApiClientError({
            kind: 'api',
            code: 'FORBIDDEN',
            message: 'Forbidden.',
            requestId: actorBase.accountId,
            status: 403,
          }),
        ),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(session.snapshot()).toMatchObject({ denial: 'forbidden', presentation: 'staff' });

    await expect(
      session.authorize(() =>
        Promise.reject(
          new ApiClientError({
            kind: 'api',
            code: 'NOT_FOUND',
            message: 'Not found.',
            requestId: actorBase.accountId,
            status: 404,
          }),
        ),
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(session.snapshot()).toMatchObject({ denial: 'not-found', presentation: 'staff' });

    await session.logout();
    expect(session.snapshot()).toEqual({ status: 'anonymous', denial: null });
  });

  it('requests and completes password reset without retaining the reset credential', async () => {
    const api = createApi(['MANAGER']);
    const session = new ManagementIdentitySession(api);

    await session.requestPasswordReset('manager@example.com');
    await session.completePasswordReset('wip_reset', 'new-sample-password-123');

    expect(api.requestPasswordReset).toHaveBeenCalledWith('manager@example.com');
    expect(api.completePasswordReset).toHaveBeenCalledWith('wip_reset', 'new-sample-password-123');
    expect(session.snapshot()).toEqual({ status: 'anonymous', denial: null });
  });
});

describe('Management identity experience', () => {
  it('keeps the route component thin and connected to the identity experience', () => {
    expect(HomePage()).toBeTruthy();
  });

  it('removes a reset credential again during hydration', () => {
    window.history.replaceState(null, '', `/#resetToken=wip_${'b'.repeat(43)}`);

    render(<ManagementIdentityPage />);

    expect(window.location.hash).toBe('');
  });

  it('shows role-specific navigation and never exposes Manager controls to Staff', async () => {
    const api = createApi(['STAFF']);
    const session = new ManagementIdentitySession(api);

    render(<ManagementIdentityExperience session={session} initialResetToken={null} />);

    await waitFor(() => expect(api.refreshSession).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('navigation', { name: 'Điều hướng vận hành' })).toBeVisible();
    expect(screen.getByText('Nhân viên vận hành')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Nhân sự' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(api.logout).toHaveBeenCalledWith('wia_rotated'));
    expect(await screen.findByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  });
});
