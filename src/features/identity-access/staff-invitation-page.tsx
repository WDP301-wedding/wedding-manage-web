'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { BrandMark } from '../../design-system/brand-mark';
import {
  staffInvitationApi,
  StaffInvitationError,
  type StaffInvitationDetails,
} from './staff-invitation-api';

export function StaffInvitationPage() {
  const token = useRef<string | null>(null);
  const [details, setDetails] = useState<StaffInvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const load = useCallback(async () => {
    if (!token.current) {
      setError(
        'Liên kết thiếu mã lời mời. Hãy mở lại liên kết trong email hoặc liên hệ quản lý để được gửi lại.',
      );
      return;
    }
    setError(null);
    setPending(true);
    try {
      setDetails(await staffInvitationApi.details(token.current));
    } catch (cause) {
      setError(invitationErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }, []);
  useEffect(() => {
    const raw = window.location.hash.slice(1);
    // Keep the secret only in this mounted page; remove it before any API request.
    if (/^wis_[A-Za-z0-9_-]{43}$/u.test(raw)) token.current = raw;
    setHasToken(token.current !== null);
    window.history.replaceState(null, '', window.location.pathname);
    void load();
  }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !token.current || !details) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    if (!details.hasExistingPassword && password !== data.get('confirmation')) {
      setError('Hai mật khẩu chưa trùng khớp.');
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await staffInvitationApi.accept(token.current, password);
      token.current = null;
      setEmail(result.email);
    } catch (cause) {
      setError(invitationErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section
        aria-label="Nhận lời mời nhân viên"
        className="flex w-full max-w-md flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-hy-1 sm:p-8"
      >
        <BrandMark />
        <h1 className="text-2xl leading-snug font-semibold">
          {email ? 'Tài khoản nhân viên đã sẵn sàng' : 'Lời mời tham gia nhân sự'}
        </h1>
        {email ? (
          <>
            <p role="status" className="text-sm">
              Đã xác nhận lời mời cho <span className="break-all">{email}</span>. Hãy đăng nhập để
              xem các tiệc được phân công.
            </p>
            <Link
              className="text-sm font-semibold text-primary underline"
              href={`/?email=${encodeURIComponent(email)}`}
            >
              Đến trang đăng nhập
            </Link>
          </>
        ) : (
          <>
            {details ? (
              <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
                <p className="text-sm text-muted-foreground">
                  Lời mời dành cho <span className="break-all">{details.maskedEmail}</span>.{' '}
                  {details.hasExistingPassword
                    ? 'Dùng mật khẩu hiện tại để nhận quyền nhân viên.'
                    : 'Thiết lập mật khẩu để bắt đầu làm việc.'}
                </p>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="staff-password">
                    {details.hasExistingPassword ? 'Mật khẩu hiện tại' : 'Mật khẩu mới'}
                  </Label>
                  <Input
                    id="staff-password"
                    name="password"
                    type="password"
                    autoComplete={details.hasExistingPassword ? 'current-password' : 'new-password'}
                    required
                    maxLength={128}
                    disabled={pending}
                  />
                </div>
                {!details.hasExistingPassword && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="staff-confirmation">Xác nhận mật khẩu</Label>
                    <Input
                      id="staff-confirmation"
                      name="confirmation"
                      type="password"
                      autoComplete="new-password"
                      required
                      maxLength={128}
                      disabled={pending}
                    />
                  </div>
                )}
                <Button
                  type="submit"
                  className="h-auto min-h-11 whitespace-normal"
                  disabled={pending}
                >
                  {pending
                    ? 'Đang xác nhận…'
                    : details.hasExistingPassword
                      ? 'Nhận lời mời'
                      : 'Thiết lập mật khẩu và nhận lời mời'}
                </Button>
              </form>
            ) : pending ? (
              <p role="status">Đang kiểm tra lời mời…</p>
            ) : null}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {!details && !pending && hasToken && (
              <Button variant="outline" onClick={() => void load()}>
                Thử lại
              </Button>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function invitationErrorMessage(cause: unknown) {
  if (cause instanceof StaffInvitationError)
    return cause.code === 'RATE_LIMITED'
      ? 'Bạn đã thử nhiều lần. Hãy chờ 15 phút trước khi thử lại.'
      : 'Lời mời không hợp lệ, đã hết hạn, đã dùng hoặc mật khẩu hiện tại chưa đúng. Hãy kiểm tra lại hoặc liên hệ quản lý để được gửi lời mời mới.';
  return 'Chưa kết nối được máy chủ. Bạn có thể thử lại trên trang này.';
}
