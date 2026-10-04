'use client';

import { type FormEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import {
  consumeResetFragment,
  createIdentityApi,
  ManagementIdentitySession,
  type ManagementSessionSnapshot,
} from './session';

const browserResetToken =
  typeof window === 'undefined'
    ? null
    : consumeResetFragment(window.location.href, (safePath) =>
        window.history.replaceState(null, '', safePath),
      );
const browserSession = new ManagementIdentitySession(createIdentityApi());

type AuthView = 'login' | 'reset-complete' | 'reset-request' | 'restoring';

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
  const [resetConsumed, setResetConsumed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resetSubmitted = useRef(false);

  useEffect(() => {
    let active = true;
    if (initialResetToken !== null) {
      queueMicrotask(() => {
        if (active) setView('reset-complete');
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

  const handleResetRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(async () => {
      await session.requestPasswordReset(readField(form, 'email'));
      setMessage('Nếu tài khoản đủ điều kiện, hướng dẫn đặt lại mật khẩu đã được gửi.');
    });
  };

  const handleResetCompletion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resetSubmitted.current || initialResetToken === null) return;
    const form = new FormData(event.currentTarget);
    const password = readField(form, 'password');
    if (password !== readField(form, 'passwordConfirmation')) {
      setError('Hai mật khẩu chưa trùng khớp.');
      return;
    }
    resetSubmitted.current = true;
    setResetConsumed(true);
    void run(async () => {
      await session.completePasswordReset(initialResetToken, password);
      setView('login');
      setMessage('Mật khẩu đã được cập nhật. Hãy đăng nhập lại.');
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
          <AuthForm
            title="Khôi phục mật khẩu"
            submitLabel="Gửi hướng dẫn"
            pending={pending}
            onSubmit={handleResetRequest}
          >
            <Field label="Email công việc" name="email" type="email" autoComplete="email" />
          </AuthForm>
        ) : null}
        {view === 'reset-complete' ? (
          <AuthForm
            title="Đặt mật khẩu mới"
            submitLabel="Cập nhật mật khẩu"
            pending={pending || resetConsumed}
            onSubmit={handleResetCompletion}
          >
            <Field
              label="Mật khẩu mới"
              name="password"
              type="password"
              minLength={12}
              autoComplete="new-password"
            />
            <Field
              label="Xác nhận mật khẩu"
              name="passwordConfirmation"
              type="password"
              minLength={12}
              autoComplete="new-password"
            />
          </AuthForm>
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
    <div className="admin-shell">
      <a className="skip-link" href="#dashboard-content">
        Đi đến nội dung chính
      </a>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">
            W
          </span>
          <span>
            WEDDING<small>OPERATIONS</small>
          </span>
        </div>
        <nav className="admin-navigation" aria-label="Điều hướng vận hành">
          <a className="nav-item nav-item-active" href="#overview" aria-current="page">
            Tổng quan
          </a>
          <a className="nav-item" href="#upcoming-events">
            Lịch tiệc <span className="nav-count">08</span>
          </a>
          <a className="nav-item" href="#customers">
            Khách hàng
          </a>
          <a className="nav-item" href="#menu">
            Thực đơn
          </a>
          {manager ? (
            <a className="nav-item" href="#staff">
              Nhân sự
            </a>
          ) : null}
        </nav>
        <div className="sidebar-footer">
          <div className="support-block">
            <span className="support-dot" aria-hidden="true" />
            <div>
              <strong>Điều hành ổn định</strong>
              <span>Tất cả dịch vụ đang hoạt động</span>
            </div>
          </div>
          <div className="profile-block">
            <span className="profile-avatar" aria-hidden="true">
              {manager ? 'QL' : 'NV'}
            </span>
            <span>
              <strong>{snapshot.actor.displayEmail}</strong>
              <small>{manager ? 'Quản lý nhà hàng' : 'Nhân viên vận hành'}</small>
            </span>
            <button type="button" onClick={onLogout} disabled={pending}>
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>
      <main id="dashboard-content" className="admin-main">
        <header className="dashboard-header" id="overview">
          <div>
            <span className="preview-label">Wedding Estate · Operations</span>
            <p>Chủ nhật, 04 tháng 10</p>
            <h1>Tổng quan hôm nay</h1>
          </div>
          {manager ? (
            <a className="create-event-action" href="#upcoming-events">
              <span aria-hidden="true">+</span> Tạo sự kiện
            </a>
          ) : null}
        </header>
        {snapshot.denial === null ? null : (
          <p className="backend-denial" role="alert">
            Máy chủ đã từ chối thao tác. Dữ liệu trình bày không thay đổi quyền thực tế.
          </p>
        )}
        <section className="estate-showcase" aria-label="Không gian vận hành nổi bật">
          <div className="estate-showcase-copy">
            <span>Không gian hôm nay</span>
            <strong>Sảnh Ánh Dương</strong>
            <p>Tiệc tối · 320 khách · Đón khách lúc 17:30</p>
          </div>
          <div
            className="estate-showcase-photo"
            role="img"
            aria-label="Bàn tiệc cưới với hoa trắng"
          />
        </section>
        <section className="metrics-strip" aria-label="Chỉ số vận hành hôm nay">
          <Metric label="Tiệc hôm nay" value="03" detail="1 tiệc đang diễn ra" />
          <Metric label="Khách dự kiến" value="860" detail="Theo lịch đã xác nhận" />
          <Metric label="Công việc hoàn tất" value="84%" detail="42 trên 50 đầu việc" />
          <Metric label="Cần xử lý" value="04" detail="2 việc ưu tiên cao" attention />
        </section>
        <section className="schedule-panel dashboard-schedule" id="upcoming-events">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Lịch sắp tới</p>
              <h2>Tiệc cưới sắp diễn ra</h2>
            </div>
          </div>
          <div className="table-scroll">
            <table aria-label="Tiệc cưới sắp diễn ra">
              <thead>
                <tr>
                  <th scope="col">Ngày tổ chức</th>
                  <th scope="col">Cặp đôi</th>
                  <th scope="col">Không gian</th>
                  <th scope="col">Khách</th>
                  <th scope="col">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>12 tháng 10, 2026</strong>
                    <span>17:30</span>
                  </td>
                  <td>
                    <strong>Minh Anh &amp; Hoàng Nam</strong>
                    <span>EVT-1028</span>
                  </td>
                  <td>Sảnh Ánh Dương</td>
                  <td>320</td>
                  <td>
                    <span className="status status-ready">Sẵn sàng</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>18 tháng 10, 2026</strong>
                    <span>11:00</span>
                  </td>
                  <td>
                    <strong>Khánh Linh &amp; Đức Minh</strong>
                    <span>EVT-1031</span>
                  </td>
                  <td>Vườn Nguyệt Quế</td>
                  <td>180</td>
                  <td>
                    <span className="status status-review">Cần duyệt</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({
  attention = false,
  detail,
  label,
  value,
}: Readonly<{ attention?: boolean; detail: string; label: string; value: string }>) {
  return (
    <article>
      <span className="metric-label">{label}</span>
      <strong className={attention ? 'attention-value' : undefined}>{value}</strong>
      <small>{detail}</small>
    </article>
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
