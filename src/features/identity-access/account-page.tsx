'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AccountSettings } from './account-settings';
import { OperationsShell } from './operations-shell';
import {
  createIdentityApi,
  type ManagementIdentitySession,
  sharedManagementSession,
} from './session';
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
    notify.warning('Phiên làm việc đã hết hạn. Hãy đăng nhập lại.');
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
      <main id="account-content" className="admin-main operations-account-page">
        <header className="dashboard-header">
          <div>
            <p className="section-kicker">Thông tin và bảo mật</p>
            <h1>Quản lý tài khoản</h1>
          </div>
        </header>
        {snapshot === null ? (
          <p role="status">Đang khôi phục phiên làm việc…</p>
        ) : authenticated ? (
          <AccountSettings
            key={snapshot.actor.sessionId}
            session={session}
            onSessionExpired={sessionExpired}
            onSignedOut={() => {
              setSnapshot(session.snapshot());
              notify.success('Đã đổi mật khẩu thành công. Hãy đăng nhập lại bằng mật khẩu mới.');
            }}
          />
        ) : (
          <section className="operations-account-access">
            <h2>{snapshot.status === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền truy cập'}</h2>
            <p>Đăng nhập bằng tài khoản Quản lý hoặc Nhân viên để quản lý hồ sơ và mật khẩu.</p>
            <Link className="catalog-primary-link" href="/">
              Về trang đăng nhập
            </Link>
          </section>
        )}
      </main>
    </OperationsShell>
  );
}
