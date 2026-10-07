'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import { createIdentityApi, ManagementIdentitySession } from '../identity-access/session';
import {
  createManagementBookingGateway,
  type ManagementBookingGateway,
  type ProposalView,
} from './booking-api';

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;

const session = new ManagementIdentitySession(createIdentityApi());
const gateway = createManagementBookingGateway();

export function ManagementBookingPage() {
  const [access, setAccess] = useState<'loading' | 'anonymous' | 'denied' | 'manager'>('loading');

  useEffect(() => {
    let active = true;
    void session.restore().then((snapshot) => {
      if (!active) return;
      setAccess(
        snapshot.status === 'anonymous'
          ? 'anonymous'
          : snapshot.presentation === 'manager'
            ? 'manager'
            : 'denied',
      );
    });
    return () => {
      active = false;
    };
  }, []);

  if (access === 'loading') return <PageState title="Đang xác minh quyền quản lý…" />;
  if (access !== 'manager') {
    return (
      <PageState title={access === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền truy cập'}>
        <p role="alert">
          {access === 'anonymous'
            ? 'Đăng nhập bằng tài khoản Quản lý để xử lý hồ sơ đặt tiệc.'
            : 'Tài khoản hiện tại không có quyền quản lý đặt tiệc.'}
        </p>
        <Link className="booking-primary-link" href="/">
          Về trang đăng nhập
        </Link>
      </PageState>
    );
  }

  return (
    <ManagementBookingWorkspace
      authorize={(operation) => session.authorize(operation)}
      gateway={gateway}
    />
  );
}

export function ManagementBookingWorkspace({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: ManagementBookingGateway }>) {
  const [consultation, setConsultation] = useState<{ id: string; revision: number } | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async <T,>(label: string, operation: () => Promise<T>): Promise<T | null> => {
    setPending(label);
    setMessage(null);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      setError(errorMessage(caught));
      return null;
    } finally {
      setPending(null);
    }
  };

  const loadProposal = useCallback(
    async (id: string) => {
      const result = await run('load', () => authorize((token) => gateway.loadProposal(token, id)));
      if (result !== null) setProposal(result);
    },
    [authorize, gateway],
  );

  const refresh = async (success: string) => {
    setMessage(success);
    if (proposal !== null) await loadProposal(proposal.bookingId);
  };

  return (
    <main className="booking-shell" id="booking-main">
      <header className="booking-header">
        <div>
          <p className="section-kicker">Wedding Estate · Operations</p>
          <h1>Điều phối đặt tiệc</h1>
          <p>Tạo hồ sơ tư vấn, giữ lịch và kiểm soát vòng đời bằng revision từ máy chủ.</p>
        </div>
        <nav aria-label="Điều hướng quản lý">
          <Link href="/catalog">Danh mục</Link>
          <Link aria-current="page" href="/bookings">
            Đặt tiệc
          </Link>
        </nav>
      </header>

      <div className="booking-live" aria-live="polite">
        {pending === null ? null : <span role="status">Đang xử lý yêu cầu…</span>}
        {message === null ? null : <span role="status">{message}</span>}
        {error === null ? null : <span role="alert">{error}</span>}
      </div>

      <section className="booking-grid" aria-label="Khởi tạo đặt tiệc">
        <ConsultationPanel
          disabled={pending !== null}
          consultation={consultation}
          onCreate={async (input) => {
            const result = await run('consultation', () =>
              authorize((token) => gateway.createConsultation(token, input)),
            );
            if (result !== null) {
              setConsultation({ id: result.consultationId, revision: result.revision });
              setMessage('Đã tạo hồ sơ tư vấn.');
            }
          }}
          onInvite={async () => {
            if (consultation === null) return;
            const result = await run('invite', () =>
              authorize((token) =>
                gateway.invite(token, {
                  consultationId: consultation.id,
                  expectedRevision: consultation.revision,
                }),
              ),
            );
            if (result !== null) setMessage('Đã yêu cầu gửi lời mời không gian cộng tác.');
          }}
        />
        <BookingCreatePanel
          disabled={pending !== null}
          consultation={consultation}
          gateway={gateway}
          authorize={authorize}
          run={run}
          onCreated={(result) => {
            setBookingId(result.bookingId);
            setMessage('Đã tạo hồ sơ đặt tiệc. Hãy tải đề xuất để tiếp tục.');
          }}
          setMessage={setMessage}
        />
      </section>

      <section className="booking-workspace" aria-labelledby="proposal-heading">
        <div className="booking-section-heading">
          <div>
            <p className="section-kicker">Hồ sơ đang xử lý</p>
            <h2 id="proposal-heading">Đề xuất &amp; vòng đời</h2>
          </div>
          <form
            className="booking-lookup"
            onSubmit={(event) => {
              event.preventDefault();
              void loadProposal(bookingId.trim());
            }}
          >
            <label>
              Mã booking
              <input
                required
                value={bookingId}
                onChange={(event) => setBookingId(event.target.value)}
                placeholder="UUID từ máy chủ"
              />
            </label>
            <button disabled={pending !== null || bookingId.trim() === ''} type="submit">
              Tải hồ sơ
            </button>
          </form>
        </div>
        {proposal === null ? (
          <div className="booking-empty">
            <strong>Chưa chọn hồ sơ</strong>
            <p>Nhập mã booking hoặc tạo hồ sơ mới để xem đề xuất và thao tác hợp lệ.</p>
          </div>
        ) : (
          <ProposalPanel
            disabled={pending !== null}
            proposal={proposal}
            run={run}
            authorize={authorize}
            gateway={gateway}
            refresh={refresh}
          />
        )}
      </section>
    </main>
  );
}

function ConsultationPanel({
  consultation,
  disabled,
  onCreate,
  onInvite,
}: Readonly<{
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  onCreate: (input: { intendedEmail: string; displayName: string; note?: string }) => Promise<void>;
  onInvite: () => Promise<void>;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = field(data, 'note').trim();
    void onCreate({
      intendedEmail: field(data, 'email'),
      displayName: field(data, 'displayName'),
      ...(note === '' ? {} : { note }),
    });
  };
  return (
    <article className="booking-card">
      <span className="booking-step">01</span>
      <h2>Hồ sơ tư vấn</h2>
      <form onSubmit={submit}>
        <label>Tên cặp đôi<input name="displayName" required minLength={1} maxLength={120} /></label>
        <label>Email liên hệ<input name="email" type="email" required /></label>
        <label>Ghi chú<textarea name="note" maxLength={2000} rows={3} /></label>
        <button disabled={disabled} type="submit">Tạo hồ sơ tư vấn</button>
      </form>
      {consultation === null ? null : (
        <div className="booking-result">
          <small>CONSULTATION · REV {consultation.revision}</small>
          <code>{consultation.id}</code>
          <button disabled={disabled} type="button" onClick={() => void onInvite()}>
            Gửi lời mời cộng tác
          </button>
        </div>
      )}
    </article>
  );
}

function BookingCreatePanel({
  authorize,
  consultation,
  disabled,
  gateway,
  onCreated,
  run,
  setMessage,
}: Readonly<{
  authorize: Authorize;
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  onCreated: (result: { bookingId: string; revision: number }) => void;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
  setMessage: (message: string) => void;
}>) {
  const input = (form: HTMLFormElement) => {
    const data = new FormData(form);
    return {
      consultationId: field(data, 'consultationId'),
      hallId: field(data, 'hallId'),
      eventDate: field(data, 'eventDate'),
      shiftCode: field(data, 'shiftCode') as 'LUNCH' | 'DINNER',
      menuPackageVersionId: field(data, 'menuPackageVersionId'),
      tableCount: Number(data.get('tableCount')),
      planningHeadcount: Number(data.get('planningHeadcount')),
      expectedRevision: Number(data.get('expectedRevision')),
    };
  };
  return (
    <article className="booking-card">
      <span className="booking-step">02</span>
      <h2>Kiểm tra &amp; tạo booking</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run('booking', () =>
            authorize((token) => gateway.createBooking(token, input(event.currentTarget))),
          ).then((result) => result && onCreated(result));
        }}
      >
        <label>Mã consultation<input name="consultationId" required defaultValue={consultation?.id ?? ''} /></label>
        <label>Revision consultation<input name="expectedRevision" type="number" min={0} required defaultValue={consultation?.revision ?? 0} /></label>
        <label>Mã sảnh<input name="hallId" required /></label>
        <div className="booking-fields-inline">
          <label>Ngày tổ chức<input name="eventDate" type="date" required /></label>
          <label>Ca<select name="shiftCode" defaultValue="DINNER"><option value="LUNCH">Trưa</option><option value="DINNER">Tối</option></select></label>
        </div>
        <label>Phiên bản thực đơn<input name="menuPackageVersionId" required /></label>
        <div className="booking-fields-inline">
          <label>Số bàn<input name="tableCount" type="number" min={1} max={500} defaultValue={20} required /></label>
          <label>Số khách dự kiến<input name="planningHeadcount" type="number" min={0} max={10000} defaultValue={200} required /></label>
        </div>
        <div className="booking-actions">
          <button
            className="booking-secondary"
            disabled={disabled}
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form === null || !form.reportValidity()) return;
              const value = input(form);
              void run('availability', () =>
                authorize((token) => gateway.checkAvailability(token, value)),
              ).then((result) => {
                if (result !== null) setMessage(result.available ? 'Khung giờ đang trống.' : `Khung giờ đang được giữ${result.expiresAt === null ? '.' : ` đến ${formatDateTime(result.expiresAt)}.`}`);
              });
            }}
          >Kiểm tra lịch</button>
          <button disabled={disabled} type="submit">Tạo booking</button>
        </div>
      </form>
    </article>
  );
}

function ProposalPanel({ authorize, disabled, gateway, proposal, refresh, run }: Readonly<{
  authorize: Authorize;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  proposal: ProposalView;
  refresh: (message: string) => Promise<void>;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
}>) {
  const command = async (label: string, success: string, operation: (token: string) => Promise<void>) => {
    if ((await run(label, () => authorize(operation))) !== null) await refresh(success);
  };
  return (
    <div className="proposal-layout">
      <article className="proposal-summary">
        <div className="proposal-status"><span>{proposal.phase.replaceAll('_', ' ')}</span><small>REV {proposal.revision}</small></div>
        <h3>{proposal.proposal.hall.name}</h3>
        <p>{proposal.eventDate} · {proposal.proposal.shift.startTime}–{proposal.proposal.shift.endTime}</p>
        <dl>
          <div><dt>Thực đơn</dt><dd>{proposal.proposal.menu.name}</dd></div>
          <div><dt>Số bàn</dt><dd>{proposal.proposal.tableCount}</dd></div>
          <div><dt>Tạm tính</dt><dd>{money(proposal.proposal.baseChargeVnd)}</dd></div>
          <div><dt>Tiền cọc</dt><dd>{money(proposal.proposal.depositAmountVnd)}</dd></div>
        </dl>
        <button disabled={disabled} type="button" onClick={() => void command('hold', 'Đã giữ khung giờ trong 15 phút.', (token) => gateway.acquireHold(token, proposal.bookingId, proposal.revision))}>Giữ lịch 15 phút</button>
      </article>
      <article className="proposal-timeline">
        <h3>Kịch bản tiệc</h3>
        {proposal.timeline === null ? <p>Chưa có mốc chương trình.</p> : (
          <ol>{proposal.timeline.items.map((item) => <li key={item.itemId}><time>{item.startTime}</time><span><strong>{item.title}</strong>{item.description ? <small>{item.description}</small> : null}</span></li>)}</ol>
        )}
        <form onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          void command('timeline', 'Đã lưu revision kịch bản mới.', (token) => gateway.saveTimeline(token, {
            bookingId: proposal.bookingId,
            expectedRevision: proposal.revision,
            predecessorRevisionId: proposal.timeline?.revisionId ?? null,
            startTime: field(data, 'startTime'),
            title: field(data, 'title'),
          }));
        }}>
          <div className="booking-fields-inline"><label>Giờ bắt đầu<input name="startTime" type="time" required /></label><label>Nội dung<input name="title" required maxLength={120} /></label></div>
          <button disabled={disabled || !proposal.capabilities.canEditTimeline} type="submit">Lưu revision kịch bản</button>
        </form>
        {proposal.timeline === null ? null : <button className="booking-secondary" disabled={disabled || !proposal.capabilities.canApproveTimeline} type="button" onClick={() => void command('approval', 'Đã ghi nhận phê duyệt của Quản lý.', (token) => gateway.approveTimeline(token, { bookingId: proposal.bookingId, revisionId: proposal.timeline!.revisionId, expectedRevision: proposal.revision }))}>Phê duyệt revision hiện tại</button>}
      </article>
      <article className="proposal-danger">
        <h3>Kết thúc vòng đời</h3>
        <form onSubmit={(event) => {
          event.preventDefault();
          const reason = field(new FormData(event.currentTarget), 'reason');
          void command('cancel', 'Booking đã được hủy.', (token) => gateway.cancel(token, { bookingId: proposal.bookingId, expectedRevision: proposal.revision, reason }));
        }}>
          <label>Lý do hủy<textarea name="reason" required minLength={1} maxLength={500} rows={3} /></label>
          <button disabled={disabled || ['CANCELLED', 'COMPLETED'].includes(proposal.phase)} type="submit">Hủy booking</button>
        </form>
        <button className="booking-secondary" disabled={disabled || proposal.phase !== 'CONFIRMED'} type="button" onClick={() => void command('complete', 'Booking đã hoàn thành.', (token) => gateway.complete(token, { bookingId: proposal.bookingId, expectedRevision: proposal.revision }))}>Đánh dấu hoàn thành</button>
      </article>
    </div>
  );
}

function PageState({ children, title }: Readonly<{ children?: React.ReactNode; title: string }>) {
  return <main className="booking-state"><p className="section-kicker">Wedding Estate</p><h1>{title}</h1>{children}</main>;
}

function money(value: number): string { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value); }
function formatDateTime(value: string): string { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
function errorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) return 'Không thể hoàn tất yêu cầu. Dữ liệu đang nhập vẫn được giữ lại.';
  const messages: Record<string, string> = {
    STALE_BOOKING_REVISION: 'Hồ sơ đã thay đổi ở nơi khác. Hãy tải lại trước khi tiếp tục.',
    SLOT_NOT_AVAILABLE: 'Khung giờ vừa được giữ bởi hồ sơ khác. Hãy chọn lịch khác.',
    DEPOSIT_INTENT_ACTIVE: 'Đang có giao dịch tiền cọc chưa kết thúc nên chưa thể thay đổi hồ sơ.',
    BOOKING_NOT_FOUND: 'Không tìm thấy hồ sơ hoặc tài khoản không có quyền xem.',
  };
  return messages[error.code] ?? 'Yêu cầu chưa hoàn tất. Hãy kiểm tra dữ liệu và thử lại.';
}
