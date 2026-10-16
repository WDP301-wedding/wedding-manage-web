'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useLayoutEffect, useState } from 'react';

import { PasswordResetOtpForm } from './password-reset-otp-form';
import { OperationsShell } from './operations-shell';
import { DashboardLiveView } from './dashboard-live';
import { ApiClientError } from '../../lib/api/client';
import {
  consumeResetFragment,
  createIdentityApi,
  type ManagementIdentitySession,
  sharedManagementSession,
  type ManagementSessionSnapshot,
} from './session';

const browserResetToken =
  typeof window === 'undefined'
    ? null
    : consumeResetFragment(window.location.href, (safePath) =>
        window.history.replaceState(null, '', safePath),
      );
const browserSession = sharedManagementSession;

type AuthView = 'login' | 'reset-request' | 'restoring';

type ManagementIdentityExperienceProps = Readonly<{
  session: ManagementIdentitySession;
  initialResetToken: string | null;
}>;

export function ManagementIdentityPage() {
  useLayoutEffect(removeCredentialFragmentAfterHydration, []);
  return (
    <ManagementIdentityExperience session={browserSession} initialResetToken={browserResetToken} />
  );
}

function removeCredentialFragmentAfterHydration() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (!fragment.has('resetToken')) return;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

export function ManagementIdentityExperience({
  session,
  initialResetToken,
}: ManagementIdentityExperienceProps) {
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot>(() => session.snapshot());
  const [view, setView] = useState<AuthView>('restoring');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (initialResetToken !== null) {
      queueMicrotask(() => {
        if (active) setView('reset-request');
      });
      return () => {
        active = false;
      };
    }
    void session.restore().then((nextSnapshot) => {
      if (!active) return;
      setSnapshot(nextSnapshot);
      setView('login');
    });
    return () => {
      active = false;
    };
  }, [initialResetToken, session]);

  const run = async (operation: () => Promise<void>) => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await operation();
    } catch (caught) {
      setError(identityErrorMessage(caught));
    } finally {
      setPending(false);
    }
  };

  const logout = () => {
    setPending(true);
    setError(null);
    setMessage(null);
    void session
      .logout()
      .catch(() => setError('Không thể kết nối máy chủ. Trạng thái cục bộ đã được xóa.'))
      .finally(() => {
        setSnapshot(session.snapshot());
        setView('login');
        setPending(false);
      });
  };

  if (snapshot.status === 'authenticated' && snapshot.presentation === 'denied') {
    return (
      <main className="permission-page">
        <section className="permission-panel" role="alert">
          <span className="preview-label">Wedding Estate · Operations</span>
          <h1>Không có quyền vào khu vực vận hành</h1>
          <p>Phiên đăng nhập hợp lệ nhưng máy chủ không trả về vai trò Quản lý hoặc Nhân viên.</p>
          <button type="button" className="primary-button" onClick={logout} disabled={pending}>
            Đăng xuất
          </button>
        </section>
      </main>
    );
  }

  if (snapshot.status === 'authenticated') {
    return <OperationsDashboard snapshot={snapshot} pending={pending} onLogout={logout} />;
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      const nextSnapshot = await session.login(
        readField(form, 'email'),
        readField(form, 'password'),
      );
      setSnapshot(nextSnapshot);
    });
  };

  return (
    <main className="operations-auth-page">
      <section className="operations-auth-brand" aria-label="Wedding Estate Operations">
        <span className="admin-brand-mark" aria-hidden="true">
          W
        </span>
        <p className="script-label">Wedding Estate · Operations</p>
        <h1>Điều hành ngày trọng đại</h1>
        <p>Không gian đăng nhập riêng dành cho quản lý và nhân viên nhà hàng.</p>
      </section>
      <section className="operations-auth-panel">
        {view === 'restoring' ? (
          <div role="status" aria-busy="true">
            <span className="section-kicker">Phiên làm việc</span>
            <h2>Đang khôi phục phiên an toàn</h2>
          </div>
        ) : null}
        {view === 'login' ? (
          <AuthForm
            title="Đăng nhập vận hành"
            submitLabel="Đăng nhập"
            pending={pending}
            onSubmit={handleLogin}
          >
            <Field label="Email công việc" name="email" type="email" autoComplete="email" />
            <Field
              label="Mật khẩu"
              name="password"
              type="password"
              autoComplete="current-password"
            />
          </AuthForm>
        ) : null}
        {view === 'reset-request' ? (
          <PasswordResetOtpForm
            onCompleted={() => {
              setView('login');
              setMessage('Mật khẩu đã được cập nhật. Hãy đăng nhập lại.');
            }}
          />
        ) : null}

        {error === null ? null : (
          <p className="auth-message auth-error" role="alert">
            {error}
          </p>
        )}
        {message === null ? null : (
          <p className="auth-message auth-success" role="status">
            {message}
          </p>
        )}
        {view === 'login' ? (
          <button className="text-button" type="button" onClick={() => setView('reset-request')}>
            Quên mật khẩu?
          </button>
        ) : null}
        {view === 'reset-request' ? (
          <button className="text-button" type="button" onClick={() => setView('login')}>
            Quay lại đăng nhập
          </button>
        ) : null}
      </section>
    </main>
  );
}

function OperationsDashboard({
  onLogout,
  pending,
  snapshot,
}: Readonly<{
  onLogout: () => void;
  pending: boolean;
  snapshot: Extract<ManagementSessionSnapshot, { status: 'authenticated' }>;
}>) {
  const manager = snapshot.presentation === 'manager';
  return (
    <OperationsShell
      activePage="overview"
      contentId="dashboard-content"
      snapshot={snapshot}
      onLogout={onLogout}
      pending={pending}
    >
      <main id="dashboard-content" className="admin-main">
        <header className="dashboard-header" id="overview">
          <div>
            <span className="preview-label">Wedding Estate · Operations</span>
            <p>Hệ thống vận hành tiệc cưới</p>
            <h1>Tổng quan hôm nay</h1>
          </div>
          {manager ? (
            <Link className="create-event-action" href="/bookings">
              <span aria-hidden="true">+</span> Tạo sự kiện
            </Link>
          ) : null}
        </header>
        {snapshot.denial === null ? null : (
          <p className="backend-denial" role="alert">
            Máy chủ đã từ chối thao tác. Dữ liệu trình bày không thay đổi quyền thực tế.
          </p>
        )}
        <DashboardLiveView
          isManager={manager}
          currentAccountId={snapshot.actor.accountId}
          currentEmail={snapshot.actor.displayEmail}
        />
      </main>
    </OperationsShell>
  );
}

function AuthForm({
  children,
  onSubmit,
  pending,
  submitLabel,
  title,
}: Readonly<{
  children: React.ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  submitLabel: string;
  title: string;
}>) {
  return (
    <form className="operations-auth-form" onSubmit={onSubmit}>
      <span className="section-kicker">Phiên làm việc</span>
      <h2>{title}</h2>
      <div className="auth-fields">{children}</div>
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? 'Đang xử lý…' : submitLabel}
      </button>
      <small>Access token chỉ tồn tại trong bộ nhớ của trang này.</small>
    </form>
  );
}

function Field({
  label,
  name,
  ...input
}: Readonly<React.InputHTMLAttributes<HTMLInputElement>> & {
  label: string;
  name: string;
}) {
  const id = `operations-${name}`;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input {...input} id={id} name={name} required />
    </div>
  );
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function identityErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Thông tin đăng nhập không hợp lệ hoặc phiên đã hết hạn.';
    if (error.status === 403 || error.status === 404) {
      return 'Máy chủ không cho phép thao tác này.';
    }
    if (error.status === 429) return 'Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.';
  }
  return 'Không thể kết nối máy chủ. Vui lòng thử lại.';
}
