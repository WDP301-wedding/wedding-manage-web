'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { buttonVariants } from '../../components/ui/button';
import { notify } from '../../design-system/notifications';
import { DashboardLiveView } from './dashboard-live';
import { OperationsShell } from './operations-shell';
import type { ManagementSessionSnapshot } from './session';

export function OperationsDashboard({
  onLogout,
  pending,
  snapshot,
}: Readonly<{
  onLogout: () => void;
  pending: boolean;
  snapshot: Extract<ManagementSessionSnapshot, { status: 'authenticated' }>;
}>) {
  const manager = snapshot.presentation === 'manager';

  useEffect(() => {
    if (snapshot.denial !== null) {
      notify.error('Máy chủ đã từ chối thao tác. Dữ liệu trình bày không thay đổi quyền thực tế.');
    }
  }, [snapshot.denial]);

  return (
    <OperationsShell
      activePage="overview"
      contentId="dashboard-content"
      snapshot={snapshot}
      onLogout={onLogout}
      pending={pending}
    >
      <main
        data-ui-v3
        id="dashboard-content"
        className="flex min-h-screen flex-col gap-8 bg-background p-[clamp(1rem,3vw,3.25rem)]"
      >
        <header id="overview" className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Tổng quan hôm nay</h1>
          {manager ? (
            <Link className={buttonVariants()} href="/bookings">
              <Plus aria-hidden className="size-4" />
              Tạo sự kiện
            </Link>
          ) : null}
        </header>
        <DashboardLiveView
          isManager={manager}
          currentAccountId={snapshot.actor.accountId}
          currentEmail={snapshot.actor.displayEmail}
        />
      </main>
    </OperationsShell>
  );
}
