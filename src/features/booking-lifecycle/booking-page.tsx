'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { OperationsShell } from '../identity-access/operations-shell';
import {
  sharedManagementSession,
  type ManagementSessionSnapshot,
} from '../identity-access/session';
import { createManagementBookingGateway } from './booking-api';
import { type BookingPrefill, type InviteLogEntry, PageState } from './booking-helpers';
import { ManagementBookingWorkspace } from './booking-workspace';

// Re-export types and workspace component for full backward compatibility
export type { BookingPrefill, InviteLogEntry };
export { ManagementBookingWorkspace };

const session = sharedManagementSession;
const gateway = createManagementBookingGateway();

export function ManagementBookingPage({
  autoLoadCatalog = false,
}: {
  autoLoadCatalog?: boolean;
} = {}) {
  const [access, setAccess] = useState<'loading' | 'anonymous' | 'denied' | 'manager'>('loading');
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void session.restore().then((snap) => {
      if (!active) return;
      setSnapshot(snap);
      setAccess(
        snap.status === 'anonymous'
          ? 'anonymous'
          : snap.presentation === 'manager'
            ? 'manager'
            : 'denied',
      );
    });
    return () => {
      active = false;
    };
  }, []);

  const logout = () => {
    setLoggingOut(true);
    setLogoutError(null);
    void session
      .logout()
      .catch(() =>
        setLogoutError('Không thể kết nối máy chủ để đăng xuất. Hãy tải lại trang rồi thử lại.'),
      )
      .finally(() => {
        setSnapshot(session.snapshot());
        setAccess('anonymous');
        setLoggingOut(false);
      });
  };

  let content;
  if (access === 'loading') content = <PageState title="Đang xác minh quyền quản lý…" />;
  else if (access !== 'manager') {
    content = (
      <PageState title={access === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền truy cập'}>
        <p role="alert">
          {access === 'anonymous'
            ? 'Đăng nhập bằng tài khoản Quản lý để xử lý hồ sơ đặt tiệc.'
            : 'Tài khoản hiện tại không có quyền quản lý đặt tiệc.'}
        </p>
        {logoutError ? <p role="alert">{logoutError}</p> : null}
        <Link className="booking-primary-link" href="/">
          Về trang đăng nhập
        </Link>
      </PageState>
    );
  } else {
    content = (
      <ManagementBookingWorkspace
        authorize={<T,>(operation: (token: string) => Promise<T>) => session.authorize(operation)}
        gateway={gateway}
        autoLoadCatalog={autoLoadCatalog}
        currentAccountId={
          snapshot?.status === 'authenticated' ? snapshot.actor.accountId : undefined
        }
        currentEmail={
          snapshot?.status === 'authenticated' ? snapshot.actor.displayEmail : undefined
        }
      />
    );
  }

  return (
    <OperationsShell
      activePage="bookings"
      contentId="booking-main"
      snapshot={snapshot}
      onLogout={logout}
      pending={loggingOut}
    >
      {content}
    </OperationsShell>
  );
}
