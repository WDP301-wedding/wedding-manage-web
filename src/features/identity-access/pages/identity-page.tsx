'use client';

import Image from 'next/image';
import { type FormEvent, useEffect, useLayoutEffect, useState } from 'react';

import { PasswordResetOtpForm } from '@/src/features/identity-access/components/auth/password-reset-otp-form';
import { OperationsDashboard } from '@/src/features/dashboard/pages/operations-dashboard';
import { AuthForm, Field, readField } from '@/src/features/identity-access/components/auth/login-form-parts';
import { identityErrorMessage } from '@/src/features/identity-access/utils/identity-errors';
import {
  consumeResetFragment,
  type ManagementIdentitySession,
  sharedManagementSession,
  type ManagementSessionSnapshot,
} from '@/src/features/identity-access/session/session';
import { notify } from '@/src/design-system/notifications/index';
import { BrandMark } from '@/src/design-system/branding/brand-mark';
import { Button } from '@/src/components/ui/button';

const browserResetToken =
  typeof window === 'undefined' || window.location.hash === ''
    ? null
    : consumeResetFragment(window.location.href, (safePath) =>
        window.history.replaceState(null, '', safePath),
      );
const browserSession = sharedManagementSession;

type AuthView = 'booting' | 'login' | 'reset-request';

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
  const [mounted, setMounted] = useState(false);
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot>(() => session.snapshot());
  const [view, setView] = useState<AuthView>(() => {
    if (initialResetToken !== null) return 'reset-request';
    if (session.snapshot().status === 'authenticated') return 'login';
    return 'booting';
  });
  const [pending, setPending] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');

  useEffect(() => {
    setMounted(true);
    setSnapshot(session.snapshot());
  }, [session]);

  // Enterprise cross-tab and proactive sync
  useEffect(() => {
    return session.subscribe((nextSnapshot) => {
      setSnapshot(nextSnapshot);
      if (nextSnapshot.status === 'anonymous') {
        setView('login');
      }
    });
  }, [session]);

  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get('email');
    if (email && email.length <= 320) setInvitedEmail(email);
  }, []);

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
    try {
      await operation();
    } catch (caught) {
      notify.error(caught, { fallbackMessage: identityErrorMessage(caught) });
    } finally {
      setPending(false);
    }
  };

  const logout = () => {
    setPending(true);
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

  // Enterprise Neutral Brand Splash (Zero Flash of Login Page on Boot/Restore)
  // Guarantees 100% hydration consistency between Server (SSR) and Client
  if (!mounted || view === 'booting') {
    return (
      <main
        data-ui-v3=""
        className="flex min-h-screen items-center justify-center bg-background px-6"
      >
        <div className="flex flex-col items-center gap-5 text-center animate-in fade-in duration-300">
          <div className="rounded-xl border border-border/80 bg-card p-6 shadow-hy-1">
            <BrandMark compact={false} tagline="Cổng Điều Hành Vận Hành" />
          </div>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="font-medium">Đang khởi động không gian vận hành…</span>
          </div>
        </div>
      </main>
    );
  }

  if (snapshot.status === 'authenticated' && snapshot.presentation === 'denied') {
    return (
      <main
        data-ui-v3=""
        className="flex min-h-screen items-center justify-center bg-background p-6"
      >
        <section className="flex w-full max-w-[480px] flex-col gap-4 rounded-xl border border-border bg-card p-8 shadow-hy-1">
          <div className="flex size-10 items-center justify-center rounded-md bg-hy-error-bg text-hy-error">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-foreground">Không có quyền vào khu vực vận hành</h1>
          <p className="text-sm text-muted-foreground">
            Phiên đăng nhập hợp lệ nhưng máy chủ không trả về vai trò Quản lý hoặc Nhân viên cho tài
            khoản này.
          </p>
          <Button
            className="mt-2 self-start bg-primary text-primary-foreground hover:bg-hy-wine-pressed"
            type="button"
            onClick={logout}
            disabled={pending}
          >
            Đăng xuất tài khoản
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
      {/* Left Showcase Banner - High-end Editorial Photography & Brand Identity */}
      <section
        className="relative isolate flex min-h-[420px] min-w-0 flex-[1_1_560px] flex-col justify-between gap-12 overflow-hidden bg-[#141012] px-8 py-10 text-white sm:px-16 sm:py-16"
        aria-label="Hỷ Yến Quản trị nhà hàng"
      >
        <Image
          src="/images/hero-sanh-tiec.webp"
          alt="Không gian sảnh tiệc Hỷ Yến"
          fill
          priority
          sizes="(min-width: 1040px) 50vw, 100vw"
          className="-z-20 object-cover object-[78%_center] filter brightness-[0.88]"
        />
        {/* Dark architectural overlay for contrast without gradients */}
        <div className="absolute inset-0 -z-10 bg-[#141012]/[0.72]" aria-hidden="true" />

        <div className="self-start rounded-lg border border-white/10 bg-white/95 px-3 py-2 text-foreground backdrop-blur-sm">
          <BrandMark tagline="Cổng Điều Hành Vận Hành" />
        </div>

        <div className="flex max-w-[540px] flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-hy-success" />
            <span className="text-2xs font-semibold uppercase tracking-wider text-white/80">
              TRUNG TÂM VẬN HÀNH TIỆC CƯỚI &amp; HỘI NGHỊ
            </span>
          </div>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            Điều hành chuẩn mực cho từng khoảnh khắc trọng đại.
          </h1>
          <p className="text-sm leading-relaxed text-white/80 sm:text-base">
            Hệ thống điều phối tiệc cưới chuyên nghiệp dành riêng cho Quản lý và Nhân viên nhà hàng
            Hỷ Yến.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/15 pt-5 text-2xs text-white/70">
            <div>
              <strong className="block font-semibold text-white">Quản lý xuyên suốt</strong>
              <span>Tư vấn, đặt cọc, thực đơn, sơ đồ bàn và quyết toán</span>
            </div>
            <div>
              <strong className="block font-semibold text-white">Đồng bộ tức thời</strong>
              <span>Liên kết dữ liệu giữa sảnh tiệc, bếp và kế toán</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right Form Container - Crisp Minimalist Card */}
      <section className="flex min-w-0 flex-[1_1_480px] items-center justify-center bg-background px-6 py-14 sm:px-12">
        <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-hy-1 sm:p-8">
          {view === 'login' ? (
            <>
              <AuthForm
                title="Đăng nhập vận hành"
                submitLabel="Đăng nhập"
                pending={pending}
                onSubmit={handleLogin}
              >
                <Field
                  label="Email công việc"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nhanvien@hyyen.vn"
                  defaultValue={invitedEmail}
                  key={invitedEmail}
                />
                <Field
                  label="Mật khẩu"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </AuthForm>
            </>
          ) : null}

          {view === 'reset-request' ? (
            <PasswordResetOtpForm
              onCompleted={() => {
                setView('login');
              }}
            />
          ) : null}

          {view === 'login' || view === 'reset-request' ? (
            <div className="flex items-center justify-between border-t border-border pt-4 text-xs">
              <Button
                variant="link"
                className="h-auto p-0 text-xs font-semibold text-primary hover:underline"
                type="button"
                onClick={() => setView(view === 'login' ? 'reset-request' : 'login')}
              >
                {view === 'login' ? 'Quên mật khẩu?' : '← Quay lại màn hình đăng nhập'}
              </Button>
              <span className="text-2xs text-muted-foreground">Hỗ trợ kỹ thuật: 1900 8888</span>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
