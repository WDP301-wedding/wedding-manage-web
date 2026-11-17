'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiClientError } from '@/src/lib/api/client';
import { createPasswordOtpGateway, type OtpChallenge } from '@/src/features/identity-access/api/password-otp-api';
import { notify } from '@/src/design-system/notifications/index';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';

const gateway = createPasswordOtpGateway();
export function PasswordResetOtpForm({ onCompleted }: { onCompleted: () => void }) {
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  async function send() {
    if (pending || remaining > 0) return;
    setPending(true);
    try {
      const next = await gateway.request(email.trim());
      setChallenge(next);
      setRemaining(next.resendAfterSeconds);
      notify.info(
        'Nếu tài khoản đủ điều kiện, mã OTP đã được gửi vào email. Mã có hiệu lực 10 phút.',
      );
    } catch (caught) {
      const msg =
        caught instanceof ApiClientError && caught.status === 429
          ? 'Bạn đã yêu cầu nhiều mã. Hãy đợi trước khi thử lại.'
          : 'Chưa gửi được mã xác nhận. Vui lòng thử lại.';
      notify.error(caught, { fallbackMessage: msg });
    } finally {
      setPending(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!challenge) {
      await send();
      return;
    }
    const form = new FormData(event.currentTarget);
    const password = readString(form, 'password');
    if (password !== form.get('passwordConfirmation')) {
      notify.warning('Hai mật khẩu chưa trùng khớp.');
      return;
    }
    setPending(true);
    try {
      await gateway.complete(challenge.challengeId, readString(form, 'code'), password);
      notify.success('Cập nhật mật khẩu thành công!');
      onCompleted();
    } catch (caught) {
      if (
        caught instanceof ApiClientError &&
        caught.status === 422 &&
        caught.details &&
        caught.details.length > 0
      ) {
        const pw = caught.details.find((d) => d.path === 'newPassword' || d.path === 'password');
        if (pw) {
          const msg = pw.message || 'Mật khẩu mới chưa hợp lệ (phải từ 1 đến 128 ký tự).';
          notify.error(caught, { fallbackMessage: msg });
          return;
        }
      }
      const msg =
        caught instanceof ApiClientError && caught.status === 429
          ? 'Bạn đã thử nhiều lần. Hãy đợi trước khi tiếp tục.'
          : 'Mã chưa đúng, đã hết hạn hoặc đã được sử dụng. Hãy kiểm tra mã mới nhất hoặc gửi lại.';
      notify.error(caught, { fallbackMessage: msg });
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
      <div className="flex flex-col gap-1">
        <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wider">
          BẢO MẬT TÀI KHOẢN
        </span>
        <h2 className="text-xl font-bold text-foreground">Khôi phục mật khẩu</h2>
      </div>
      <div className="rounded-md border border-[#bfdbfe] bg-hy-info-bg px-3.5 py-2.5 text-xs text-hy-info">
        {challenge
          ? 'Mã xác thực OTP đã được gửi vào hòm thư. Mã có hiệu lực trong 10 phút.'
          : 'Nhập địa chỉ email công vụ đã được cấp để nhận mã OTP.'}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="otp-email" className="text-xs font-semibold text-foreground">
          Email công việc
        </Label>
        <Input
          id="otp-email"
          type="email"
          autoComplete="email"
          placeholder="nhanvien@hyyen.vn"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          readOnly={challenge !== null}
          className="h-11 rounded-md border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
          required
          maxLength={320}
        />
      </div>
      {challenge && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp-code" className="text-xs font-semibold text-foreground">
              Mã xác thực OTP (6 chữ số)
            </Label>
            <Input
              className="h-11 rounded-md border-border bg-card px-3 text-center text-lg font-bold tracking-widest tabular-nums focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              id="otp-code"
              name="code"
              type="text"
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              minLength={6}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp-password" className="text-xs font-semibold text-foreground">
              Mật khẩu mới
            </Label>
            <Input
              id="otp-password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-11 rounded-md border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              maxLength={128}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="otp-confirmation" className="text-xs font-semibold text-foreground">
              Xác nhận mật khẩu mới
            </Label>
            <Input
              id="otp-confirmation"
              name="passwordConfirmation"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className="h-11 rounded-md border-border bg-card px-3 text-sm focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
              maxLength={128}
              required
            />
          </div>
          <p className="text-2xs text-muted-foreground">
            Mật khẩu mới từ 1 đến 128 ký tự. Sau khi đổi mật khẩu, phiên trên các thiết bị khác sẽ được làm mới.
          </p>
        </>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground hover:bg-hy-wine-pressed"
      >
        {pending ? 'Đang xử lý…' : challenge ? 'Xác nhận và cập nhật mật khẩu' : 'Gửi mã xác thực OTP'}
      </Button>
      {challenge && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            type="button"
            className="h-10 flex-1 rounded-md border-border text-xs"
            disabled={pending || remaining > 0}
            onClick={() => void send()}
          >
            {remaining > 0 ? `Gửi lại (${remaining}s)` : 'Gửi lại mã'}
          </Button>
          <Button
            variant="ghost"
            type="button"
            className="h-10 rounded-md text-xs text-muted-foreground hover:text-foreground"
            disabled={pending}
            onClick={() => {
              setChallenge(null);
              setRemaining(0);
            }}
          >
            Đổi email khác
          </Button>
        </div>
      )}
    </form>
  );
}

function readString(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}
