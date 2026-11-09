'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { buttonVariants } from '../../components/ui/button';
import { notify } from '../../design-system/notifications';
import { CompletedEventsDashboard } from './completed-events-dashboard';
import { OperationsShell } from './operations-shell';
import { useManagementSession } from './use-management-session';

export function ManagementReportsPage() {
  const { snapshot, loggingOut, logoutError, logout } = useManagementSession();
  const manager = snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';

  useEffect(() => {
    if (logoutError) notify.error(logoutError);
  }, [logoutError]);

  return (
    <OperationsShell
      activePage="reports"
      contentId="reports-content"
      snapshot={snapshot}
      onLogout={logout}
      pending={loggingOut}
    >
      <main
        data-ui-v3
        id="reports-content"
        className="flex min-h-screen flex-col gap-8 bg-background p-[clamp(1rem,3vw,3.25rem)]"
      >
        <header>
          <h1 className="text-2xl font-bold">Báo cáo</h1>
        </header>
        {snapshot === null ? (
          <p role="status" className="text-muted-foreground">
            Đang kiểm tra phiên đăng nhập.
          </p>
        ) : manager ? (
          <CompletedEventsDashboard key={snapshot.actor.accountId} />
        ) : (
          <section className="flex flex-col items-start gap-3">
            <h2 className="text-lg font-semibold">
              {snapshot.status === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền xem báo cáo'}
            </h2>
            <p className="text-muted-foreground">Khu vực này dành cho tài khoản Quản lý.</p>
            <Link className={buttonVariants()} href="/">
              Về trang đăng nhập
            </Link>
          </section>
        )}
      </main>
    </OperationsShell>
  );
}
