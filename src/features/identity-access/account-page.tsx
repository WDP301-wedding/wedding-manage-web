'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { AccountSettings } from './account-settings';
import { OperationsShell } from './operations-shell';
import {
  createIdentityApi,
  type ManagementIdentitySession,
  sharedManagementSession,
} from './session';
import { useManagementSession } from './use-management-session';

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionExpired = useCallback(() => {
    setSnapshot(session.snapshot());
    setError('Phiên làm việc đã hết hạn. Hãy đăng nhập lại.');
    setMessage(null);
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
        {message ? (
          <p className="auth-message auth-success" role="status">
            {message}
          </p>
        ) : null}
        {error || logoutError ? (
          <p className="auth-message auth-error" role="alert">
            {error || logoutError}
          </p>
        ) : null}
        {snapshot === null ? (
          <p role="status">Đang khôi phục phiên làm việc…</p>
        ) : authenticated ? (
          <AccountSettings
            key={snapshot.actor.sessionId}
            session={session}
            onSessionExpired={sessionExpired}
            onSignedOut={() => {
              setSnapshot(session.snapshot());
              setMessage('Đã đổi mật khẩu thành công. Hãy đăng nhập lại bằng mật khẩu mới.');
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
