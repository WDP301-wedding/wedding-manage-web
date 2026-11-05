'use client';

import Link from 'next/link';
import { useCallback, useEffect } from 'react';
import { AccountSettings } from './account-settings';
import { OperationsShell } from './operations-shell';
import { buttonVariants } from '../../components/ui/button';
import { type ManagementIdentitySession, sharedManagementSession } from './session';
import { useManagementSession } from './use-management-session';
import { notify } from '../../design-system/notifications';

const browserSession = sharedManagementSession;

export function ManagementAccountPage() {
  return <ManagementAccountExperience session={browserSession} />;
}

export function ManagementAccountExperience({ session }: { session: ManagementIdentitySession }) {
  const {
    snapshot,
    setSnapshot,
    loggingOut: pending,
    logoutError,
    logout,
  } = useManagementSession({ session });

  useEffect(() => {
    if (logoutError) {
      notify.error(logoutError);
    }
  }, [logoutError]);

  const sessionExpired = useCallback(() => {
    setSnapshot(session.snapshot());
  }, [session, setSnapshot]);

  const authenticated = snapshot?.status === 'authenticated' && snapshot.presentation !== 'denied';
  return (
    <OperationsShell
      activePage="account"
      contentId="account-content"
      snapshot={snapshot}
      onLogout={logout}
      pending={pending}
    >
      <main
        id="account-content"
        data-ui-v3=""
        className="flex flex-col gap-6 px-4 pt-8 pb-14 sm:px-10"
      >
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Quản lý tài khoản</h1>
        </header>
        {snapshot === null ? (
          <p className="text-muted-foreground" role="status">
            Đang khôi phục phiên làm việc…
          </p>
        ) : authenticated ? (
          <AccountSettings
            key={snapshot.actor.sessionId}
            session={session}
            onSessionExpired={sessionExpired}
            onSignedOut={() => {
              setSnapshot(session.snapshot());
            }}
          />
        ) : (
          <section className="flex max-w-[560px] flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 shadow-hy-1">
            <h2 className="text-lg font-semibold">
              {snapshot.status === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền truy cập'}
            </h2>
            <p className="text-muted-foreground">
              Đăng nhập bằng tài khoản Quản lý hoặc Nhân viên để quản lý hồ sơ và mật khẩu.
            </p>
            <Link className={buttonVariants()} href="/">
              Về trang đăng nhập
            </Link>
          </section>
        )}
      </main>
    </OperationsShell>
  );
}
