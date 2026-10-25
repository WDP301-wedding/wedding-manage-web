'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { createPasswordOtpGateway, type OtpChallenge } from './password-otp-api';
const gateway = createPasswordOtpGateway();
export function PasswordResetOtpForm({ onCompleted }: { onCompleted: () => void }) {
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  async function send() {
    if (pending || remaining > 0) return;
    setPending(true);
    setError(null);
    try {
      const next = await gateway.request(email.trim());
      setChallenge(next);
      setRemaining(next.resendAfterSeconds);
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.status === 429
          ? 'Bạn đã yêu cầu nhiều mã. Hãy đợi trước khi thử lại.'
          : 'Chưa gửi được mã xác nhận. Vui lòng thử lại.',
      );
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
      setError('Hai mật khẩu chưa trùng khớp.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await gateway.complete(challenge.challengeId, readString(form, 'code'), password);
      onCompleted();
    } catch (caught) {
      setError(
        caught instanceof ApiClientError && caught.status === 429
          ? 'Bạn đã thử nhiều lần. Hãy đợi trước khi tiếp tục.'
          : 'Mã chưa đúng, đã hết hạn hoặc đã được sử dụng. Hãy kiểm tra mã mới nhất hoặc gửi lại.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="operations-auth-form" onSubmit={(event) => void submit(event)}>
      <span className="section-kicker">Xác nhận qua email</span>
      <h2>Khôi phục mật khẩu</h2>
      <p>
        {challenge
          ? 'Nếu tài khoản đủ điều kiện, mã OTP đã được gửi vào email. Mã có hiệu lực 10 phút.'
          : 'Nhập email của tài khoản để nhận mã OTP xác nhận.'}
      </p>
      <div className="auth-field">
        <label htmlFor="otp-email">Email</label>
        <input
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
          <div className="auth-field">
            <label htmlFor="otp-code">Mã OTP</label>
            <input
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
          <div className="auth-field">
            <label htmlFor="otp-password">Mật khẩu mới</label>
            <input
              id="otp-password"
              name="password"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="otp-confirmation">Xác nhận mật khẩu mới</label>
            <input
              id="otp-confirmation"
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              required
            />
          </div>
          <p>Mật khẩu tối đa 128 ký tự. Sau khi cập nhật, hãy đăng nhập lại trên các thiết bị.</p>
        </>
      )}
      {error && (
        <p role="alert" className="auth-message error">
          {error}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? 'Đang xử lý…' : challenge ? 'Xác nhận và cập nhật mật khẩu' : 'Gửi mã OTP'}
      </button>
      {challenge && (
        <>
          <button
            className="text-action text-button"
            type="button"
            disabled={pending || remaining > 0}
            onClick={() => void send()}
          >
            {remaining > 0 ? `Gửi lại sau ${remaining}s` : 'Gửi lại mã OTP'}
          </button>
          <button
            className="text-action text-button"
            type="button"
            disabled={pending}
            onClick={() => {
              setChallenge(null);
              setRemaining(0);
              setError(null);
            }}
          >
            Dùng email khác
          </button>
        </>
      )}
    </form>
  );
}

function readString(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}
