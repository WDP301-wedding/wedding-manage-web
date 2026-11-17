'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { OperationsShell } from '@/src/components/layout/operations-shell';
import { sharedManagementSession } from '@/src/features/identity-access/session/session';
import { useManagementSession } from '@/src/features/identity-access/session/use-management-session';
import { createManagementBookingGateway } from '@/src/features/booking-lifecycle/api/booking-api';
import { type BookingPrefill, type InviteLogEntry, PageState } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import { ManagementBookingWorkspace } from '@/src/features/booking-lifecycle/workspace/booking-workspace';
import { notify } from '@/src/design-system/notifications/index';
import { buttonVariants } from '@/src/components/ui/button';

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

  useEffect(() => {
    if (logoutError) {
      notify.error(logoutError);
    }
  }, [logoutError]);

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
        <p className="text-muted-foreground">
          {access === 'anonymous'
            ? 'Đăng nhập bằng tài khoản Quản lý để xử lý hồ sơ đặt tiệc.'
            : 'Tài khoản hiện tại không có quyền quản lý đặt tiệc.'}
        </p>
        <Link className={buttonVariants()} href="/">
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
