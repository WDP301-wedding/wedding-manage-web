'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { OtpChallenge } from './password-otp-api';
import { ApiClientError } from '../../lib/api/client';
import { createAccountGateway, type Profile } from './account-api';
import type { ManagementIdentitySession } from './session';
import { notify } from '../../design-system/notifications';

const gateway = createAccountGateway();
function waitLabel(seconds: number) {
  return seconds >= 60 ? `${Math.ceil(seconds / 60)} phút` : `${seconds} giây`;
}
export function AccountSettings({
  session,
  onSignedOut,
  onSessionExpired,
}: {
  session: ManagementIdentitySession;
  onSignedOut: () => void;
  onSessionExpired?: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [remaining, setRemaining] = useState(0);
  const passwordForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  async function sendCode(current: string) {
    const value = await session.authorize((token) => gateway.requestPasswordChange(token, current));
    setChallenge(value);
    setRemaining(value.resendAfterSeconds);
    setNotice('Mã OTP đã được gửi vào email của bạn. Mã có hiệu lực 10 phút.');
  }
  function requestFailed(caught: unknown) {
    let msg = 'Chưa gửi được mã xác nhận. Hãy kiểm tra kết nối rồi thử lại.';
    if (caught instanceof ApiClientError) {
      if (caught.status === 401) {
        onSessionExpired?.();
        msg = 'Phiên làm việc đã hết hạn. Hãy đăng nhập lại.';
      } else if (caught.status === 429) {
        const seconds = caught.retryAfterSeconds ?? 60;
        setRemaining(seconds);
        msg = `Bạn đã yêu cầu mã quá nhiều lần. Hãy chờ ${waitLabel(seconds)} trước khi thử lại.`;
      } else if (caught.code === 'CURRENT_PASSWORD_INVALID') {
        msg = 'Mật khẩu hiện tại chưa đúng.';
      } else if (
        caught.code === 'EMAIL_NOT_CONFIGURED' ||
        caught.code === 'OTP_EMAIL_DELIVERY_FAILED'
      ) {
        msg = 'Dịch vụ email đang gặp sự cố nên chưa gửi được mã OTP. Hãy thử lại sau.';
      }
    }
    setError(msg);
    notify.error(caught, { fallbackMessage: msg });
  }
  async function resend() {
    if (pending || remaining > 0 || !passwordForm.current) return;
    const current = new FormData(passwordForm.current).get('currentPassword');
    if (typeof current !== 'string') return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await sendCode(current);
    } catch (caught) {
      requestFailed(caught);
    } finally {
      setPending(false);
    }
  }
  useEffect(() => {
    let active = true;
    void session
      .authorize((token) => gateway.profile(token))
      .then((value) => {
        if (active) {
          setProfile(value);
          setName(value.displayName ?? '');
          setError(null);
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          if (caught instanceof ApiClientError && caught.status === 401) onSessionExpired?.();
          setError('Chưa tải được hồ sơ. Hãy thử lại.');
        }
      });
    return () => {
      active = false;
    };
  }, [session, reload, onSessionExpired]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || profile === null) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const next = await session.authorize((token) =>
        gateway.updateProfile(token, name.trim(), profile.revision),
      );
      setProfile(next);
      notify.success('Đã lưu tên hiển thị.');
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) onSessionExpired?.();
      const msg =
        caught instanceof ApiClientError && caught.status === 409
          ? 'Hồ sơ đã thay đổi ở nơi khác. Tải lại trước khi tiếp tục.'
          : 'Chưa lưu được hồ sơ. Nội dung của bạn vẫn được giữ lại.';
      setError(msg);
      notify.error(caught, { fallbackMessage: msg });
    } finally {
      setPending(false);
    }
  }
  async function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || (!challenge && remaining > 0)) return;
    const form = new FormData(event.currentTarget),
      current = form.get('currentPassword'),
      next = form.get('newPassword');
    if (typeof current !== 'string' || typeof next !== 'string') return;
    if (next !== form.get('confirmation')) {
      notify.warning('Hai mật khẩu mới chưa trùng khớp.');
      return;
    }
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      if (!challenge) {
        await sendCode(current);
        notify.info('Mã OTP đã được gửi vào email của bạn. Mã có hiệu lực 10 phút.');
        return;
      }
      await session.authorize((token) =>
        gateway.changePassword(
          token,
          challenge.challengeId,
          typeof form.get('code') === 'string' ? (form.get('code') as string) : '',
          next,
        ),
      );
      session.discardRevokedSession();
      notify.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
      onSignedOut();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.status === 401) {
        onSessionExpired?.();
        const msg = 'Phiên làm việc đã hết hạn. Hãy đăng nhập lại.';
        setError(msg);
        notify.error(caught, { fallbackMessage: msg });
      } else if (
        challenge &&
        caught instanceof ApiClientError &&
        caught.code === 'OTP_INVALID_OR_EXPIRED'
      ) {
        const msg = 'Mã OTP chưa đúng hoặc đã hết hạn. Kiểm tra mã mới nhất hoặc gửi lại.';
        setError(msg);
        notify.error(caught, { fallbackMessage: msg });
      } else if (challenge && caught instanceof ApiClientError && caught.status === 429) {
        const msg = 'Bạn đã thử mã quá nhiều lần. Hãy chờ trước khi thử lại.';
        setError(msg);
        notify.error(caught, { fallbackMessage: msg });
      } else if (
        challenge &&
        caught instanceof ApiClientError &&
        caught.status === 422 &&
        caught.details &&
        caught.details.length > 0
      ) {
        const pw = caught.details.find((d) => d.path === 'newPassword' || d.path === 'password');
        const msg = pw?.message || 'Mật khẩu mới chưa hợp lệ (phải từ 1 đến 128 ký tự).';
        setError(msg);
        notify.error(caught, { fallbackMessage: msg });
      } else if (challenge) {
        const msg = 'Chưa cập nhật được mật khẩu. Hãy kiểm tra kết nối rồi thử lại.';
        setError(msg);
        notify.error(caught, { fallbackMessage: msg });
      } else {
        requestFailed(caught);
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="operations-account-settings" aria-label="Cài đặt tài khoản">
      <div className="operations-account-heading">
        <div>
          <span className="section-kicker">Thông tin của bạn</span>
          <h2>Hồ sơ và bảo mật</h2>
        </div>
        <button type="button" disabled={pending} onClick={() => setReload((value) => value + 1)}>
          Tải lại hồ sơ
        </button>
      </div>
      {!profile && !error ? <p role="status">Đang tải hồ sơ…</p> : null}
      {profile ? (
        <div className="operations-account-grid">
          <form onSubmit={(event) => void save(event)}>
            <h3>Hồ sơ</h3>
            <label>
              Email
              <input value={profile.displayEmail} readOnly autoComplete="email" />
            </label>
            <label>
              Tên hiển thị
              <input
                name="displayName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
                autoComplete="name"
              />
            </label>
            <button className="primary-button" disabled={pending} type="submit">
              Lưu thay đổi
            </button>
          </form>
          <form ref={passwordForm} onSubmit={(event) => void change(event)}>
            <h3>Đổi mật khẩu</h3>
            <label>
              Mật khẩu hiện tại
              <input
                name="currentPassword"
                required
                type="password"
                autoComplete="current-password"
                maxLength={512}
                readOnly={challenge !== null}
              />
            </label>
            <label>
              Mật khẩu mới
              <input
                name="newPassword"
                required
                type="password"
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            <label>
              Xác nhận mật khẩu mới
              <input
                name="confirmation"
                required
                type="password"
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            {challenge && (
              <label>
                Mã OTP
                <input
                  key={challenge.challengeId}
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  required
                />
              </label>
            )}
            <p className="operations-account-help">
              Mật khẩu tối đa 128 ký tự. Sau khi đổi, bạn cần đăng nhập lại trên các thiết bị.
            </p>
            <button
              className="primary-button"
              disabled={pending || (!challenge && remaining > 0)}
              type="submit"
            >
              {challenge
                ? 'Xác nhận và cập nhật mật khẩu'
                : remaining > 0
                  ? `Thử lại sau ${waitLabel(remaining)}`
                  : 'Gửi mã OTP'}
            </button>
            {challenge && (
              <button
                type="button"
                disabled={pending || remaining > 0}
                onClick={() => void resend()}
              >
                {remaining > 0 ? `Gửi lại sau ${remaining}s` : 'Gửi lại mã OTP'}
              </button>
            )}
          </form>
        </div>
      ) : null}
    </section>
  );
}
