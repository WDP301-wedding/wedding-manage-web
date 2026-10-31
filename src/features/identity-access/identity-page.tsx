'use client';

import Image from 'next/image';
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
import { notify } from '../../design-system/notifications';
import { BrandMark } from '../../design-system/brand-mark';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

const BRAND_KICKER = 'Hỷ Yến · Quản trị nhà hàng';

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
      const msg = identityErrorMessage(caught);
      setError(msg);
      notify.error(caught, { fallbackMessage: msg });
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
      .catch((caught) =>
        notify.error(caught, {
          fallbackMessage: 'Không thể kết nối máy chủ. Trạng thái cục bộ đã được xóa.',
        }),
      )
      .finally(() => {
        setSnapshot(session.snapshot());
        setView('login');
        setPending(false);
      });
  };

  if (snapshot.status === 'authenticated' && snapshot.presentation === 'denied') {
    return (
      <main
        data-ui-v3=""
        className="flex min-h-screen items-center justify-center bg-background p-6"
      >
        <section className="flex w-full max-w-[480px] flex-col gap-4 rounded-xl border border-border bg-card p-8 shadow-hy-1">
          <span className="text-xs font-semibold text-primary">{BRAND_KICKER}</span>
          <h1 className="text-xl font-semibold">Không có quyền vào khu vực vận hành</h1>
          <p className="text-muted-foreground">
            Phiên đăng nhập hợp lệ nhưng máy chủ không trả về vai trò Quản lý hoặc Nhân viên.
          </p>
          <Button className="self-start" type="button" onClick={logout} disabled={pending}>
            Đăng xuất
          </Button>
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
    <main data-ui-v3="" className="flex min-h-screen flex-wrap bg-background">
      <section
        className="relative isolate flex min-h-[360px] min-w-0 flex-[1_1_560px] flex-col justify-between gap-12 overflow-hidden bg-hy-ink px-6 py-10 text-white sm:px-16 sm:py-14"
        aria-label="Hỷ Yến Quản trị nhà hàng"
      >
        <Image
          src="/images/hero-sanh-tiec.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1040px) 50vw, 100vw"
          className="-z-20 object-cover object-[78%_center]"
        />
        {/* Below ~0.62 white body text drops under 4.5:1 over the brightest flowers. */}
        <div className="absolute inset-0 -z-10 bg-hy-ink/[0.66]" aria-hidden="true" />
        <div className="self-start rounded-xl bg-background py-2 pr-4 pl-2">
          <BrandMark />
        </div>
        <div className="flex max-w-[520px] flex-col gap-4">
          <p className="text-xs font-semibold">{BRAND_KICKER}</p>
          <h1 className="text-3xl font-bold">Điều hành ngày trọng đại</h1>
          <p className="text-base">
            Không gian đăng nhập riêng dành cho quản lý và nhân viên nhà hàng.
          </p>
        </div>
      </section>
      <section className="flex min-w-0 flex-[1_1_480px] items-center justify-center px-4 py-14 sm:px-8">
        <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-hy-1 sm:p-8">
          {view === 'restoring' ? (
            <div className="flex flex-col gap-1" role="status" aria-busy="true">
              <span className="text-xs text-muted-foreground">Phiên làm việc</span>
              <h2 className="text-xl font-semibold">Đang khôi phục phiên an toàn</h2>
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
                notify.success('Mật khẩu đã được cập nhật. Hãy đăng nhập lại.');
              }}
            />
          ) : null}

          {view === 'login' || view === 'reset-request' ? (
            <div className="border-t border-border pt-4">
              {view === 'login' ? (
                <Button
                  variant="link"
                  className="h-auto px-0"
                  type="button"
                  onClick={() => setView('reset-request')}
                >
                  Quên mật khẩu?
                </Button>
              ) : (
                <Button
                  variant="link"
                  className="h-auto px-0"
                  type="button"
                  onClick={() => setView('login')}
                >
                  Quay lại đăng nhập
                </Button>
              )}
            </div>
          ) : null}
        </div>
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
      <main id="dashboard-content" className="admin-main">
        <header className="dashboard-header" id="overview">
          <div>
            <span className="preview-label">{BRAND_KICKER}</span>
            <p>Hệ thống vận hành tiệc cưới</p>
            <h1>Tổng quan hôm nay</h1>
          </div>
          {manager ? (
            <Link className="create-event-action" href="/bookings">
              <span aria-hidden="true">+</span> Tạo sự kiện
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
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Phiên làm việc</span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang xử lý…' : submitLabel}
        </Button>
        <small className="text-xs text-muted-foreground">
          Access token chỉ tồn tại trong bộ nhớ của trang này.
        </small>
      </div>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function Field({
  label,
  name,
  className,
  ...input
}: Readonly<React.InputHTMLAttributes<HTMLInputElement>> & {
  label: string;
  name: string;
}) {
  const [visible, setVisible] = useState(false);
  const password = input.type === 'password';
  const id = `operations-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          {...input}
          type={password && visible ? 'text' : input.type}
          id={id}
          name={name}
          className={`${className ?? ''} ${password ? 'pr-12' : ''}`.trim() || undefined}
          required
        />
        {password ? (
          <button
            className="absolute top-0.5 right-0.5 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            type="button"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            title={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-controls={id}
            aria-pressed={visible}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function readField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function identityErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.kind === 'network' || error.kind === 'timeout') {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
    }
    if (error.status === 400 || error.code === 'VALIDATION_ERROR' || error.status === 422) {
      if (error.details && error.details.length > 0) {
        return (
          error.details
            .map((d) => d.message)
            .filter(Boolean)
            .join(' ') || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.'
        );
      }
      return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
    }
    if (error.status === 401 || error.code === 'AUTHENTICATION_REQUIRED') {
      return 'Thông tin đăng nhập không hợp lệ hoặc phiên đã hết hạn.';
    }
    if (error.status === 403 || error.status === 404) {
      return 'Máy chủ không cho phép thao tác này.';
    }
    if (error.status === 409) {
      return 'Dữ liệu có xung đột. Vui lòng làm mới trang.';
    }
    if (error.status === 429) {
      return 'Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.';
    }
    if (error.status && error.status >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }
    if (error.message && error.message !== 'The request is invalid.') {
      return error.message;
    }
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}
