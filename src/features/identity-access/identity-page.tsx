'use client';

import Image from 'next/image';
import { type FormEvent, useEffect, useLayoutEffect, useState } from 'react';

import { PasswordResetOtpForm } from './password-reset-otp-form';
import { OperationsDashboard } from './operations-dashboard';
import { AuthForm, Field, readField } from './login-form-parts';
import { identityErrorMessage } from './identity-errors';
import {
  consumeResetFragment,
  type ManagementIdentitySession,
  sharedManagementSession,
  type ManagementSessionSnapshot,
} from './session';
import { notify } from '../../design-system/notifications';
import { BrandMark } from '../../design-system/brand-mark';
import { Button } from '../../components/ui/button';

const browserResetToken =
  typeof window === 'undefined' || window.location.hash === ''
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
  const [invitedEmail, setInvitedEmail] = useState('');
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

  if (snapshot.status === 'authenticated' && snapshot.presentation === 'denied') {
    return (
      <main
        data-ui-v3=""
        className="flex min-h-screen items-center justify-center bg-background p-6"
      >
        <section className="flex w-full max-w-[480px] flex-col gap-4 rounded-xl border border-border bg-card p-8 shadow-hy-1">
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
          <h1 className="text-3xl font-bold">Điều hành ngày trọng đại</h1>
          <p className="text-base">
            Không gian đăng nhập riêng dành cho quản lý và nhân viên nhà hàng.
          </p>
        </div>
      </section>
      <section className="flex min-w-0 flex-[1_1_480px] items-center justify-center px-4 py-14 sm:px-8">
        <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-xl border border-border bg-card p-6 shadow-hy-1 sm:p-8">
          {view === 'restoring' ? (
            <h2 className="text-xl font-semibold" role="status" aria-busy="true">
              Đang khôi phục phiên an toàn
            </h2>
          ) : null}
          {view === 'login' ? (
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
                defaultValue={invitedEmail}
                key={invitedEmail}
              />
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
              }}
            />
          ) : null}

          {view === 'login' || view === 'reset-request' ? (
            <div className="border-t border-border pt-4">
              <Button
                variant="link"
                className="h-auto px-0"
                type="button"
                onClick={() => setView(view === 'login' ? 'reset-request' : 'login')}
              >
                {view === 'login' ? 'Quên mật khẩu?' : 'Quay lại đăng nhập'}
              </Button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
