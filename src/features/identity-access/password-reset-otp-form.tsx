'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { createPasswordOtpGateway, type OtpChallenge } from './password-otp-api';
import { notify } from '../../design-system/notifications';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

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
        <span className="text-xs text-muted-foreground">Xác nhận qua email</span>
        <h2 className="text-xl font-semibold">Khôi phục mật khẩu</h2>
      </div>
      <p className="rounded-lg bg-hy-info-bg px-4 py-3 text-xs text-foreground">
        {challenge
          ? 'Nếu tài khoản đủ điều kiện, mã OTP đã được gửi vào email. Mã có hiệu lực 10 phút.'
          : 'Nhập email của tài khoản để nhận mã OTP xác nhận.'}
      </p>
      <div className="flex flex-col gap-1">
        <Label htmlFor="otp-email">Email</Label>
        <Input
          id="otp-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          readOnly={challenge !== null}
          required
          maxLength={320}
        />
      </div>
      {challenge && (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor="otp-code">Mã OTP</Label>
            <Input
              className="font-semibold tabular-nums"
              id="otp-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              minLength={6}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="otp-password">Mật khẩu mới</Label>
            <Input
              id="otp-password"
              name="password"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="otp-confirmation">Xác nhận mật khẩu mới</Label>
            <Input
              id="otp-confirmation"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Mật khẩu tối đa 128 ký tự. Sau khi cập nhật, hãy đăng nhập lại trên các thiết bị.
          </p>
        </>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Đang xử lý…' : challenge ? 'Xác nhận và cập nhật mật khẩu' : 'Gửi mã OTP'}
      </Button>
      {challenge && (
        <>
          <Button
            variant="outline"
            type="button"
            disabled={pending || remaining > 0}
            onClick={() => void send()}
          >
            {remaining > 0 ? `Gửi lại sau ${remaining}s` : 'Gửi lại mã OTP'}
          </Button>
          <Button
            variant="ghost"
            type="button"
            disabled={pending}
            onClick={() => {
              setChallenge(null);
              setRemaining(0);
            }}
          >
            Dùng email khác
          </Button>
        </>
      )}
    </form>
  );
}

function readString(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}
