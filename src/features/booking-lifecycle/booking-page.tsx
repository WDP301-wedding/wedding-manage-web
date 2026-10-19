'use client';

import Link from 'next/link';
import { OperationsShell } from '../identity-access/operations-shell';
import { sharedManagementSession } from '../identity-access/session';
import { useManagementSession } from '../identity-access/use-management-session';
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
  const { snapshot, loggingOut, logoutError, logout } = useManagementSession({ session });
  const access =
    snapshot === null
      ? 'loading'
      : snapshot.status === 'anonymous'
        ? 'anonymous'
        : snapshot.presentation === 'manager'
          ? 'manager'
          : 'denied';

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
