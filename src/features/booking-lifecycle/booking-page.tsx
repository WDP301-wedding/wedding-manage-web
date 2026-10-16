'use client';

import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';

import { createApiClient, ApiClientError } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
import { minimumEventDate, useMinimumEventDate } from '../../lib/event-date';
import { TimelineEditor } from './timeline-editor';
import { ContractPanel } from './contract-panel';
import { createVenueCatalogGateway } from '../venue-catalog/catalog-api';
import { sharedManagementSession } from '../identity-access/session';
import type { ManagementSessionSnapshot } from '../identity-access/session';
import { OperationsShell } from '../identity-access/operations-shell';
import {
  createManagementBookingGateway,
  type ManagementBookingGateway,
  type ProposalView,
  type BookingSelections,
} from './booking-api';
import { addMyManagedBookingId, getMyManagedBookingIds } from '../identity-access/dashboard-live';

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;

const session = sharedManagementSession;
const gateway = createManagementBookingGateway();
const catalogGateway = createVenueCatalogGateway();

export function ManagementBookingPage({
  autoLoadCatalog = false,
}: {
  autoLoadCatalog?: boolean;
} = {}) {
  const [access, setAccess] = useState<'loading' | 'anonymous' | 'denied' | 'manager'>('loading');
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void session.restore().then((snapshot) => {
      if (!active) return;
      setSnapshot(snapshot);
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

  const logout = () => {
    setLoggingOut(true);
    setLogoutError(null);
    void session
      .logout()
      .catch(() =>
        setLogoutError('Không thể kết nối máy chủ để đăng xuất. Hãy tải lại trang rồi thử lại.'),
      )
      .finally(() => {
        setSnapshot(session.snapshot());
        setAccess('anonymous');
        setLoggingOut(false);
      });
  };
  let content;
  if (access === 'loading') content = <PageState title="Đang xác minh quyền quản lý…" />;
  else if (access !== 'manager') {
    content = (
      <PageState title={access === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền truy cập'}>
        <p role="alert">
          {access === 'anonymous'
            ? 'Đăng nhập bằng tài khoản Quản lý để xử lý hồ sơ đặt tiệc.'
            : 'Tài khoản hiện tại không có quyền quản lý đặt tiệc.'}
        </p>
        {logoutError ? <p role="alert">{logoutError}</p> : null}
        <Link className="booking-primary-link" href="/">
          Về trang đăng nhập
        </Link>
      </PageState>
    );
  } else
    content = (
      <ManagementBookingWorkspace
        authorize={(operation) => session.authorize(operation)}
        gateway={gateway}
        autoLoadCatalog={autoLoadCatalog}
        currentAccountId={
          snapshot?.status === 'authenticated' ? snapshot.actor.accountId : undefined
        }
        currentEmail={
          snapshot?.status === 'authenticated' ? snapshot.actor.displayEmail : undefined
        }
      />
    );
  return (
    <OperationsShell
      activePage="bookings"
      contentId="booking-main"
      snapshot={snapshot}
      onLogout={logout}
      pending={loggingOut}
    >
      {content}
    </OperationsShell>
  );
}

export type InviteLogEntry = Readonly<{
  id: string;
  time: string;
  type: 'pending' | 'success' | 'error';
  message: string;
  consultationId?: string | undefined;
  invitationId?: string | undefined;
  details?: string | undefined;
}>;

export type BookingPrefill = Readonly<{
  displayName?: string | undefined;
  email?: string | undefined;
  note?: string | undefined;
  eventDate?: string | undefined;
  expectedGuests?: number | undefined;
  tableCount?: number | undefined;
}>;

export function ManagementBookingWorkspace({
  authorize,
  gateway,
  autoLoadCatalog = false,
  currentAccountId,
  currentEmail,
}: Readonly<{
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  autoLoadCatalog?: boolean | undefined;
  currentAccountId?: string | undefined;
  currentEmail?: string | undefined;
}>) {
  const [consultation, setConsultation] = useState<{ id: string; revision: number } | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentBookingIds, setRecentBookingIds] = useState<string[]>([]);
  const [inviteLogs, setInviteLogs] = useState<readonly InviteLogEntry[]>([]);
  const [prefill, setPrefill] = useState<BookingPrefill>({});

  useEffect(() => {
    setRecentBookingIds(getMyManagedBookingIds(currentAccountId));
  }, [currentAccountId]);

  const recordMyBooking = (id: string) => {
    addMyManagedBookingId(id, currentAccountId, currentEmail);
    setRecentBookingIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('consultationId');
    const revision = Number(params.get('consultationRevision'));
    if (
      id !== null &&
      /^[a-f0-9-]{36}$/iu.test(id) &&
      Number.isSafeInteger(revision) &&
      revision > 0
    ) {
      queueMicrotask(() => setConsultation({ id, revision }));
    }
    const bId = params.get('bookingId');
    if (bId !== null && /^[a-f0-9-]{36}$/iu.test(bId)) {
      setBookingId(bId);
      void run('load', () => authorize((token) => gateway.loadProposal(token, bId))).then(
        (result) => {
          if (result !== null) setProposal(result);
        },
      );
    }

    const dName = params.get('displayName') || undefined;
    const em = params.get('email') || undefined;
    const nt = params.get('note') || undefined;
    const pDate = params.get('preferredDate')?.slice(0, 10) || undefined;
    const expGuestsParam = params.get('expectedGuests');
    const expG =
      expGuestsParam && !Number.isNaN(Number(expGuestsParam)) ? Number(expGuestsParam) : undefined;
    const tCount = expG && expG > 0 ? Math.max(1, Math.ceil(expG / 10)) : undefined;

    if (dName || em || nt || pDate || expG) {
      setPrefill({
        displayName: dName,
        email: em,
        note: nt,
        eventDate: pDate,
        expectedGuests: expG,
        tableCount: tCount,
      });
    }

    if (!dName && !em && id) {
      void session
        .authorize((token) =>
          createApiClient().GET('/management/consultation-requests', {
            headers: { Authorization: `Bearer ${token}` },
            params: { query: { limit: 50 } },
          }),
        )
        .then((res) => {
          type RequestItem = components['schemas']['ConsultationRequestList']['data'][number];
          const list = (res.data as components['schemas']['ConsultationRequestList'] | undefined)
            ?.data;
          const match = list?.find((item: RequestItem) => item.consultationId === id);
          if (match) {
            const expGMatch = match.expectedGuests ?? undefined;
            const tCountMatch =
              expGMatch && expGMatch > 0 ? Math.max(1, Math.ceil(expGMatch / 10)) : undefined;
            setPrefill((prev) => ({
              displayName: prev.displayName ?? match.displayName,
              email: prev.email ?? match.email,
              note: prev.note ?? match.message ?? undefined,
              eventDate: prev.eventDate ?? match.preferredDate?.slice(0, 10),
              expectedGuests: prev.expectedGuests ?? expGMatch,
              tableCount: prev.tableCount ?? tCountMatch,
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  const run = async <T,>(label: string, operation: () => Promise<T>): Promise<T | null> => {
    setPending(label);
    setMessage(null);
    setError(null);
    try {
      return await operation();
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403, 404].includes(caught.status ?? 0)) {
        setProposal(null);
      }
      setError(errorMessage(caught, proposal?.proposal.shift));
      return null;
    } finally {
      setPending(null);
    }
  };

  const loadProposal = async (id: string) => {
    const result = await run('load', () => authorize((token) => gateway.loadProposal(token, id)));
    if (result !== null) {
      setProposal(result);
      recordMyBooking(id);
    }
  };

  const refresh = async (success: string) => {
    setMessage(success);
    if (proposal !== null) await loadProposal(proposal.bookingId);
  };

  const resetConsultation = () => {
    setConsultation(null);
    setPrefill({});
    setMessage(
      'Đã xóa mã tư vấn cũ. Hãy nhập thông tin cặp đôi mới ở Bước 01 rồi bấm "Tạo hồ sơ tư vấn".',
    );
  };

  return (
    <main className="booking-shell" id="booking-main">
      <header className="booking-header">
        <div>
          <p className="section-kicker">Wedding Estate · Operations</p>
          <h1>Điều phối đặt tiệc</h1>
          <p>Tạo hồ sơ tư vấn, giữ lịch và kiểm soát vòng đời bằng revision từ máy chủ.</p>
        </div>
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
          prefill={prefill}
          logs={inviteLogs}
          onClearLogs={() => setInviteLogs([])}
          onReset={resetConsultation}
          onCreate={async (input) => {
            const result = await run('consultation', () =>
              authorize((token) => gateway.createConsultation(token, input)),
            );
            if (result !== null) {
              setConsultation({ id: result.consultationId, revision: result.revision });
              setPrefill((prev) => ({
                ...prev,
                displayName: input.displayName,
                email: input.intendedEmail,
                note: input.note,
              }));
              setMessage('Đã tạo hồ sơ tư vấn.');
            }
          }}
          onInvite={async () => {
            if (consultation === null) return;
            const now = new Date().toLocaleTimeString('vi-VN');
            const logId = crypto.randomUUID();
            console.log(`[Workspace Invitation] ${now} Bắt đầu gửi lời mời cộng tác:`, {
              consultationId: consultation.id,
              revision: consultation.revision,
            });
            setInviteLogs((prev) => [
              {
                id: logId,
                time: now,
                type: 'pending',
                message: 'Đang gửi yêu cầu mời cộng tác tới máy chủ...',
                consultationId: consultation.id,
              },
              ...prev,
            ]);

            setPending('invite');
            setMessage(null);
            setError(null);
            try {
              const res = await authorize((token) =>
                gateway.invite(token, {
                  consultationId: consultation.id,
                  expectedRevision: consultation.revision,
                }),
              );
              console.log(`[Workspace Invitation] ${now} Gửi lời mời thành công:`, res);
              setMessage('Đã yêu cầu gửi lời mời không gian cộng tác.');
              const invitationId = (res as { invitationId?: string } | undefined)?.invitationId;
              const isReplayed = (res as { replayed?: boolean } | undefined)?.replayed;
              setInviteLogs((prev) =>
                prev.map((item) =>
                  item.id === logId
                    ? {
                        ...item,
                        type: 'success',
                        message: 'Đã gửi lời mời thành công tới email của cặp đôi.',
                        invitationId: invitationId ?? 'Đã phát hành (ISSUED)',
                        details: isReplayed
                          ? 'Yêu cầu lặp lại (replayed) - lời mời đã được phát hành trước đó.'
                          : undefined,
                      }
                    : item,
                ),
              );
            } catch (caught) {
              const errText = errorMessage(caught, proposal?.proposal.shift);
              console.error(`[Workspace Invitation] ${now} Lỗi gửi lời mời:`, caught);
              setError(errText);
              setInviteLogs((prev) =>
                prev.map((item) =>
                  item.id === logId
                    ? {
                        ...item,
                        type: 'error',
                        message: `Gửi lời mời thất bại: ${errText}`,
                        details:
                          caught instanceof ApiClientError
                            ? `HTTP ${caught.status ?? 'N/A'} (${caught.code}): ${caught.message}`
                            : caught instanceof Error
                              ? caught.message
                              : String(caught),
                      }
                    : item,
                ),
              );
            } finally {
              setPending(null);
            }
          }}
        />
        <BookingCreatePanel
          disabled={pending !== null}
          consultation={consultation}
          prefill={prefill}
          gateway={gateway}
          authorize={authorize}
          run={run}
          autoLoadCatalog={autoLoadCatalog}
          onCreated={(result, consultationId) => {
            setBookingId(result.bookingId);
            setConsultation({ id: consultationId, revision: result.consultationRevision });
            setMessage('Đã tạo hồ sơ đặt tiệc.');
            void loadProposal(result.bookingId);
            recordMyBooking(result.bookingId);
          }}
          setMessage={setMessage}
          onValidationError={setError}
        />
      </section>

      <section className="booking-workspace" aria-labelledby="proposal-heading">
        <div className="booking-section-heading">
          <div>
            <p className="section-kicker">Hồ sơ đang xử lý</p>
            <h2 id="proposal-heading">Đề xuất &amp; vòng đời</h2>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              alignItems: 'flex-end',
            }}
          >
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
                  placeholder="Mã hồ sơ đặt tiệc"
                />
              </label>
              <button disabled={pending !== null || bookingId.trim() === ''} type="submit">
                Tải hồ sơ
              </button>
            </form>
            {recentBookingIds.length > 0 ? (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                <span style={{ color: '#64748b' }}>Tiệc của bạn:</span>
                <select
                  aria-label="Chọn nhanh mã tiệc gần đây"
                  value={recentBookingIds.includes(bookingId) ? bookingId : ''}
                  onChange={(event) => {
                    const selected = event.target.value;
                    if (selected) {
                      setBookingId(selected);
                      void loadProposal(selected);
                    }
                  }}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '0.78rem',
                    color: '#1e293b',
                    maxWidth: '280px',
                    fontFamily: 'monospace',
                  }}
                >
                  <option value="">-- Chọn nhanh mã tiệc ({recentBookingIds.length}) --</option>
                  {recentBookingIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </div>
        {proposal === null ? (
          <div className="booking-empty">
            <strong>Chưa chọn hồ sơ</strong>
            <p>Nhập mã booking hoặc tạo hồ sơ mới để xem đề xuất và thao tác hợp lệ.</p>
            {error && bookingId ? (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  textAlign: 'left',
                  maxWidth: '640px',
                  margin: '1.25rem auto 0',
                }}
              >
                <div
                  style={{
                    color: '#991b1b',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    marginBottom: '4px',
                  }}
                >
                  💡 Gợi ý xử lý khi không có quyền xem hồ sơ đề xuất &amp; kịch bản:
                </div>
                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: '0.82rem',
                    color: '#4b5563',
                    lineHeight: 1.5,
                  }}
                >
                  Tiệc cưới <code>{bookingId.slice(0, 8)}…</code> được tạo bởi Quản lý khác (hoặc là
                  dữ liệu mẫu nhà hàng). Theo quy định của hệ thống, chỉ Quản lý trực tiếp tạo hồ sơ
                  tư vấn ban đầu mới có quyền duyệt &amp; chỉnh sửa kịch bản tiệc này. Bạn vẫn có
                  thể thực hiện các thao tác vận hành khác:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link
                    className="booking-secondary"
                    href={`/billing?bookingId=${bookingId}`}
                    style={{ textDecoration: 'none', padding: '5px 12px', fontSize: '0.8rem' }}
                  >
                    💳 Xem thanh toán &amp; Tiền cọc →
                  </Link>
                  <Link
                    className="booking-secondary"
                    href={`/staff?bookingId=${bookingId}`}
                    style={{ textDecoration: 'none', padding: '5px 12px', fontSize: '0.8rem' }}
                  >
                    👥 Phân công Staff tiệc này →
                  </Link>
                </div>
              </div>
            ) : null}
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
  logs,
  onClearLogs,
  onCreate,
  onInvite,
  onReset,
  prefill,
}: Readonly<{
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  logs?: readonly InviteLogEntry[] | undefined;
  onClearLogs?: (() => void) | undefined;
  onCreate: (input: { intendedEmail: string; displayName: string; note?: string }) => Promise<void>;
  onInvite: () => Promise<void>;
  onReset?: (() => void) | undefined;
  prefill?: BookingPrefill | undefined;
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
      <p style={{ color: '#5d665f', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
        Nhập thông tin cặp đôi và bấm <strong>&quot;Tạo hồ sơ tư vấn&quot;</strong> để cấp mã tự
        động sang Bước 02.
      </p>
      {prefill?.displayName || prefill?.email ? (
        <div
          style={{
            padding: '6px 10px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            fontSize: '0.78rem',
            color: '#15803d',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>✓</span>
          <span>Đã tự động điền thông tin từ yêu cầu tư vấn của khách hàng.</span>
        </div>
      ) : null}
      <form onSubmit={submit}>
        <label>
          Tên cặp đôi
          <input
            key={`displayName-${prefill?.displayName ?? ''}`}
            name="displayName"
            required
            minLength={1}
            maxLength={120}
            defaultValue={prefill?.displayName ?? ''}
          />
        </label>
        <label>
          Email liên hệ
          <input
            key={`email-${prefill?.email ?? ''}`}
            name="email"
            type="email"
            required
            defaultValue={prefill?.email ?? ''}
          />
        </label>
        <label>
          Ghi chú
          <textarea
            key={`note-${prefill?.note ?? ''}`}
            name="note"
            maxLength={2000}
            rows={3}
            defaultValue={prefill?.note ?? ''}
          />
        </label>
        <button disabled={disabled} type="submit">
          Tạo hồ sơ tư vấn
        </button>
      </form>
      {consultation === null ? null : (
        <div className="booking-result">
          <small>CONSULTATION · REV {consultation.revision}</small>
          <code>{consultation.id}</code>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <button disabled={disabled} type="button" onClick={() => void onInvite()}>
              Gửi lời mời cộng tác
            </button>
            {onReset ? (
              <button
                disabled={disabled}
                type="button"
                className="booking-secondary"
                onClick={onReset}
              >
                + Đặt cho cặp đôi mới
              </button>
            ) : null}
          </div>

          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.6rem 0.75rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              fontSize: '0.78rem',
              color: '#1e40af',
              lineHeight: 1.5,
            }}
          >
            <strong>💡 Quy trình tránh lặp form:</strong> Sau khi có mã tư vấn, Quản lý cần hoàn tất{' '}
            <strong>Bước 02: Tạo booking</strong> (chọn sảnh, thực đơn, ngày tiệc bên cạnh). Nếu
            chưa tạo booking, Couple khi đăng nhập sẽ thấy chưa có tiệc và bị chuyển về form yêu cầu
            tư vấn.
          </div>

          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                📋 Nhật ký gửi lời mời (Log)
              </span>
              {logs && logs.length > 0 && onClearLogs ? (
                <button
                  type="button"
                  onClick={onClearLogs}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    textDecoration: 'underline',
                  }}
                >
                  Xóa log
                </button>
              ) : null}
            </div>

            {!logs || logs.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                Chưa có thao tác gửi nào. Bấm &quot;Gửi lời mời cộng tác&quot; để gửi email kích
                hoạt cho Couple.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {logs.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '0.5rem 0.65rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      lineHeight: '1.4',
                      backgroundColor:
                        item.type === 'success'
                          ? '#f0fdf4'
                          : item.type === 'error'
                            ? '#fef2f2'
                            : '#fffbeb',
                      border: `1px solid ${
                        item.type === 'success'
                          ? '#bbf7d0'
                          : item.type === 'error'
                            ? '#fecaca'
                            : '#fde68a'
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color:
                            item.type === 'success'
                              ? '#166534'
                              : item.type === 'error'
                                ? '#991b1b'
                                : '#92400e',
                        }}
                      >
                        {item.type === 'success'
                          ? '✓ Đã gửi thành công'
                          : item.type === 'error'
                            ? '✕ Gửi thất bại'
                            : '⏳ Đang xử lý...'}
                      </span>
                      <small style={{ color: '#64748b', fontSize: '0.75rem' }}>{item.time}</small>
                    </div>
                    <div style={{ marginTop: '3px', color: '#1e293b' }}>{item.message}</div>
                    {item.invitationId ? (
                      <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
                        <span style={{ color: '#64748b' }}>Mã lời mời (invitationId): </span>
                        <code
                          style={{
                            background: 'rgba(0,0,0,0.06)',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            wordBreak: 'break-all',
                          }}
                        >
                          {item.invitationId}
                        </code>
                      </div>
                    ) : null}
                    {item.details ? (
                      <div style={{ marginTop: '3px', fontSize: '0.75rem', color: '#475569' }}>
                        {item.details}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
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
  onValidationError,
  autoLoadCatalog = false,
  prefill,
}: Readonly<{
  authorize: Authorize;
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  onCreated: (
    result: {
      bookingId: string;
      revision: number;
      consultationRevision: number;
    },
    consultationId: string,
  ) => void;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
  setMessage: (message: string) => void;
  onValidationError: (message: string) => void;
  autoLoadCatalog?: boolean;
  prefill?: BookingPrefill | undefined;
}>) {
  const [selections, setSelections] = useState<BookingSelections | null>(null);
  const [loadingSelections, setLoadingSelections] = useState(false);
  const minimumDate = useMinimumEventDate();

  const loadCatalog = useCallback(() => {
    if (loadingSelections) return;
    setLoadingSelections(true);
    void run('catalog', () => authorize((token) => gateway.loadSelections(token)))
      .then((result) => {
        if (result !== null) setSelections(result);
      })
      .finally(() => {
        setLoadingSelections(false);
      });
  }, [authorize, gateway, loadingSelections, run]);

  useEffect(() => {
    if (autoLoadCatalog && selections === null && !loadingSelections) {
      loadCatalog();
    }
  }, [autoLoadCatalog, selections, loadingSelections, loadCatalog]);

  const validate = (form: HTMLFormElement, creating: boolean) => {
    if (disabled) return false;
    if (selections === null) {
      onValidationError(
        'Hãy tải danh mục đặt tiệc để chọn sảnh, ca và thực đơn trước khi tiếp tục.',
      );
      return false;
    }
    if (
      selections.halls.length === 0 ||
      selections.shifts.length === 0 ||
      (creating && selections.menus.length === 0)
    ) {
      onValidationError(
        'Danh mục chưa đủ thông tin đặt tiệc. Cập nhật trong mục Danh mục rồi tải lại.',
      );
      return false;
    }
    const date = field(new FormData(form), 'eventDate');
    if (date !== '' && date < minimumEventDate()) {
      onValidationError(
        'Ngày tổ chức phải từ ngày mốt trở đi (theo giờ Việt Nam). Hãy chọn lại ngày.',
      );
      return false;
    }
    if (creating) return form.reportValidity();
    return ['hallId', 'eventDate', 'shiftCode'].every((name) => {
      const control = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
      return control.reportValidity();
    });
  };
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
      <button
        className="booking-secondary"
        disabled={disabled || loadingSelections}
        type="button"
        onClick={loadCatalog}
      >
        {loadingSelections
          ? 'Đang tải danh mục…'
          : selections === null
            ? 'Tải danh mục đặt tiệc'
            : 'Tải lại danh mục đặt tiệc'}
      </button>
      {loadingSelections ? (
        <p role="status">Đang tải danh mục sảnh, khung giờ và thực đơn đang phục vụ…</p>
      ) : selections === null ? (
        <p>Tải danh mục để chọn sảnh, khung giờ và thực đơn đang phục vụ.</p>
      ) : selections.halls.length === 0 ||
        selections.menus.length === 0 ||
        selections.shifts.length === 0 ? (
        <p role="status">
          Danh mục chưa đủ thông tin đặt tiệc. Cập nhật trong mục Danh mục rồi tải lại.
        </p>
      ) : (
        <p style={{ color: '#166534', fontSize: '0.875rem' }}>
          ✓ Đã tải {selections.halls.length} sảnh tiệc, {selections.menus.length} thực đơn đang phục
          vụ.
        </p>
      )}
      {prefill?.eventDate || prefill?.expectedGuests ? (
        <div
          style={{
            padding: '6px 10px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            fontSize: '0.78rem',
            color: '#15803d',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>✓</span>
          <span>
            Đã điền sẵn ngày tổ chức
            {prefill.eventDate ? ` (${prefill.eventDate})` : ''}
            {prefill.expectedGuests
              ? ` và ${prefill.expectedGuests} khách (~${prefill.tableCount ?? Math.max(1, Math.ceil(prefill.expectedGuests / 10))} bàn)`
              : ''}{' '}
            từ yêu cầu tư vấn.
          </span>
        </div>
      ) : null}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!validate(event.currentTarget, true)) return;
          const value = input(event.currentTarget);
          void run('booking', () => authorize((token) => gateway.createBooking(token, value))).then(
            (result) => result && onCreated(result, value.consultationId),
          );
        }}
      >
        <label>
          Mã hồ sơ tư vấn
          <input
            key={consultation?.id ?? 'new'}
            name="consultationId"
            required
            defaultValue={consultation?.id ?? ''}
            placeholder="Tự động điền sau khi hoàn thành Bước 01"
          />
        </label>
        <small
          style={{
            color: '#5d665f',
            fontSize: '0.75rem',
            marginTop: '-0.5rem',
            marginBottom: '0.75rem',
            display: 'block',
          }}
        >
          {consultation
            ? `✓ Đã kết nối hồ sơ tư vấn (Phiên bản ${consultation.revision})`
            : 'Mã này sẽ tự động điền khi bạn bấm "Tạo hồ sơ tư vấn" ở Bước 01'}
        </small>
        <label>
          Phiên bản hồ sơ tư vấn
          <input
            key={`${consultation?.id}:${consultation?.revision}`}
            name="expectedRevision"
            type="number"
            min={1}
            required
            defaultValue={consultation?.revision ?? 1}
          />
        </label>
        <label>
          Sảnh tiệc
          <select
            name="hallId"
            required
            defaultValue=""
            onFocus={() => {
              if (selections === null) loadCatalog();
            }}
            onClick={() => {
              if (selections === null) loadCatalog();
            }}
          >
            <option value="" disabled>
              {loadingSelections ? 'Đang tải sảnh…' : 'Chọn sảnh'}
            </option>
            {selections?.halls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {hall.name} · tối đa {hall.maxGuests} khách
              </option>
            ))}
          </select>
        </label>
        <div className="booking-fields-inline">
          <label>
            <span id="booking-date-label">Ngày tổ chức</span>
            <input
              key={`eventDate-${prefill?.eventDate ?? ''}`}
              name="eventDate"
              type="date"
              min={minimumDate}
              defaultValue={prefill?.eventDate ?? ''}
              aria-labelledby="booking-date-label"
              aria-describedby="booking-date-help"
              required
            />
            <small id="booking-date-help">Chọn ngày mốt hoặc muộn hơn (theo giờ Việt Nam).</small>
          </label>
          <label>
            Ca
            <select name="shiftCode" defaultValue="DINNER" required>
              <option value="" disabled>
                Chọn ca
              </option>
              {selections === null ? (
                <>
                  <option value="LUNCH">Trưa</option>
                  <option value="DINNER">Tối</option>
                </>
              ) : null}
              {selections?.shifts.map((shift) => (
                <option key={shift.code} value={shift.code}>
                  {shift.code === 'LUNCH' ? 'Trưa' : 'Tối'} · {shift.startTime}–{shift.endTime}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Thực đơn đặt tiệc
          <select
            name="menuPackageVersionId"
            required
            defaultValue=""
            onFocus={() => {
              if (selections === null) loadCatalog();
            }}
            onClick={() => {
              if (selections === null) loadCatalog();
            }}
          >
            <option value="" disabled>
              {loadingSelections ? 'Đang tải thực đơn…' : 'Chọn thực đơn'}
            </option>
            {selections?.menus.map((menu) => (
              <option key={menu.versionId} value={menu.versionId}>
                {menu.name} · bản {menu.versionNumber} · {money(menu.priceVndPerTable)}/bàn
              </option>
            ))}
          </select>
        </label>
        <div className="booking-fields-inline">
          <label>
            Số bàn
            <input
              key={`tableCount-${prefill?.tableCount ?? 20}`}
              name="tableCount"
              type="number"
              min={1}
              max={500}
              defaultValue={prefill?.tableCount ?? 20}
              required
            />
          </label>
          <label>
            Số khách dự kiến
            <input
              key={`planningHeadcount-${prefill?.expectedGuests ?? 200}`}
              name="planningHeadcount"
              type="number"
              min={0}
              max={10000}
              defaultValue={prefill?.expectedGuests ?? 200}
              required
            />
          </label>
        </div>
        <div className="booking-actions">
          <button
            className="booking-secondary"
            disabled={disabled}
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form === null || !validate(form, false)) return;
              const value = input(form);
              void run('availability', () =>
                authorize((token) => gateway.checkAvailability(token, value)),
              ).then((result) => {
                if (result !== null)
                  setMessage(
                    result.available
                      ? 'Khung giờ đang trống.'
                      : `Khung giờ đang được giữ${result.expiresAt === null ? '.' : ` đến ${formatDateTime(result.expiresAt)}.`}`,
                  );
              });
            }}
          >
            Kiểm tra lịch
          </button>
          <button disabled={disabled} type="submit">
            Tạo booking
          </button>
        </div>
      </form>
    </article>
  );
}

function ProposalPanel({
  authorize,
  disabled,
  gateway,
  proposal,
  refresh,
  run,
}: Readonly<{
  authorize: Authorize;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  proposal: ProposalView;
  refresh: (message: string) => Promise<void>;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
}>) {
  const command = async (
    label: string,
    success: string,
    operation: (token: string) => Promise<void>,
  ) => {
    if ((await run(label, () => authorize(operation))) !== null) await refresh(success);
  };
  return (
    <div className="proposal-layout">
      <article className="proposal-summary">
        <div className="proposal-status">
          <span>{proposal.phase.replaceAll('_', ' ')}</span>
          <small>REV {proposal.revision}</small>
        </div>
        <h3>{proposal.proposal.hall.name}</h3>
        <p>
          {proposal.eventDate} · {proposal.proposal.shift.startTime}–
          {proposal.proposal.shift.endTime}
        </p>
        <dl>
          <div>
            <dt>Thực đơn</dt>
            <dd>{proposal.proposal.menu.name}</dd>
          </div>
          <div>
            <dt>Số bàn</dt>
            <dd>{proposal.proposal.tableCount}</dd>
          </div>
          <div>
            <dt>Tạm tính</dt>
            <dd>{money(proposal.proposal.baseChargeVnd)}</dd>
          </div>
          <div>
            <dt>Tiền cọc</dt>
            <dd>{money(proposal.proposal.depositAmountVnd)}</dd>
          </div>
        </dl>
        <button
          disabled={disabled || ['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(proposal.phase)}
          type="button"
          onClick={() =>
            void command('hold', 'Đã giữ khung giờ trong 15 phút.', (token) =>
              gateway.acquireHold(token, proposal.bookingId, proposal.revision),
            )
          }
        >
          Giữ lịch 15 phút
        </button>
      </article>
      <article className="proposal-timeline">
        <h3>Kịch bản tiệc</h3>
        {proposal.timeline === null ? (
          <p>Chưa có mốc chương trình.</p>
        ) : (
          <ol>
            {proposal.timeline.items.map((item) => (
              <li key={item.itemId}>
                <time>{item.startTime}</time>
                <span>
                  <strong>{item.title}</strong>
                  {item.description ? <small>{item.description}</small> : null}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p>
          Giờ bắt đầu mỗi mốc phải từ {proposal.proposal.shift.startTime} đến trước{' '}
          {proposal.proposal.shift.endTime} theo ca tiệc đã chọn.
        </p>
        <TimelineEditor
          key={proposal.bookingId + ':' + (proposal.timeline?.revisionId ?? 'empty')}
          disabled={disabled || !proposal.capabilities.canEditTimeline}
          initialItems={proposal.timeline?.items ?? []}
          templateSource={{
            load: async () => {
              const result = await run('templates', () =>
                authorize((token) => catalogGateway.loadTimelines(token)),
              );
              if (result === null) throw new Error('Timeline template loading failed.');
              return result;
            },
            shift: proposal.proposal.shift,
          }}
          needsReason={proposal.phase === 'CONFIRMED'}
          onSave={(items, reason) =>
            command('timeline', 'Đã lưu revision kịch bản mới.', (token) =>
              proposal.phase === 'CONFIRMED'
                ? gateway.requestChange(token, {
                    bookingId: proposal.bookingId,
                    expectedRevision: proposal.revision,
                    items,
                    reason,
                  })
                : gateway.saveTimeline(token, {
                    bookingId: proposal.bookingId,
                    expectedRevision: proposal.revision,
                    predecessorRevisionId: proposal.timeline?.revisionId ?? null,
                    items,
                  }),
            )
          }
        />
        {proposal.timeline === null ? null : (
          <button
            className="booking-secondary"
            disabled={disabled || !proposal.capabilities.canApproveTimeline}
            type="button"
            onClick={() =>
              void command('approval', 'Đã ghi nhận phê duyệt của Quản lý.', (token) =>
                gateway.approveTimeline(token, {
                  bookingId: proposal.bookingId,
                  revisionId: proposal.timeline!.revisionId,
                  expectedRevision: proposal.revision,
                }),
              )
            }
          >
            Phê duyệt revision hiện tại
          </button>
        )}
      </article>
      <ContractPanel
        bookingId={proposal.bookingId}
        bookingRevision={proposal.revision}
        disabled={disabled}
        onRefresh={() => void refresh('Đã làm mới dữ liệu hợp đồng.')}
      />
      <article className="proposal-danger">
        <h3>Kết thúc vòng đời</h3>
        {(proposal.cancellationRequests ?? []).map((request) => (
          <form
            key={request.requestId}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const submitter = event.nativeEvent.submitter;
              const decision =
                submitter instanceof HTMLButtonElement && submitter.value === 'APPROVE'
                  ? 'APPROVE'
                  : 'REJECT';
              const reason = field(new FormData(form), 'decisionReason');
              void command(
                'cancellation-decision',
                decision === 'APPROVE' ? 'Đã chấp nhận yêu cầu hủy.' : 'Đã từ chối yêu cầu hủy.',
                (token) =>
                  gateway.decideCancellation(token, {
                    bookingId: proposal.bookingId,
                    requestId: request.requestId,
                    expectedRevision: proposal.revision,
                    decision,
                    reason,
                  }),
              );
            }}
          >
            <h4>Yêu cầu hủy từ cặp đôi</h4>
            <p>{request.reason}</p>
            <label>
              Lý do quyết định
              <textarea name="decisionReason" required minLength={1} maxLength={500} rows={2} />
            </label>
            <div className="booking-actions">
              <button type="submit" value="APPROVE" disabled={disabled}>
                Chấp nhận yêu cầu hủy
              </button>
              <button type="submit" value="REJECT" disabled={disabled}>
                Từ chối yêu cầu hủy
              </button>
            </div>
          </form>
        ))}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const reason = field(new FormData(event.currentTarget), 'reason');
            void command('cancel', 'Booking đã được hủy.', (token) =>
              gateway.cancel(token, {
                bookingId: proposal.bookingId,
                expectedRevision: proposal.revision,
                reason,
              }),
            );
          }}
        >
          <label>
            Lý do hủy
            <textarea name="reason" required minLength={1} maxLength={500} rows={3} />
          </label>
          <button
            disabled={disabled || ['CANCELLED', 'COMPLETED'].includes(proposal.phase)}
            type="submit"
          >
            Hủy booking
          </button>
        </form>
        <button
          className="booking-secondary"
          disabled={disabled || proposal.phase !== 'CONFIRMED'}
          type="button"
          onClick={() =>
            void command('complete', 'Booking đã hoàn thành.', (token) =>
              gateway.complete(token, {
                bookingId: proposal.bookingId,
                expectedRevision: proposal.revision,
              }),
            )
          }
        >
          Đánh dấu hoàn thành
        </button>
      </article>
    </div>
  );
}

function PageState({ children, title }: Readonly<{ children?: React.ReactNode; title: string }>) {
  return (
    <main className="booking-state" id="booking-main">
      <p className="section-kicker">Wedding Estate</p>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

function money(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}
function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
function errorMessage(error: unknown, shift?: ProposalView['proposal']['shift']): string {
  if (!(error instanceof ApiClientError))
    return 'Không thể hoàn tất yêu cầu. Dữ liệu đang nhập vẫn được giữ lại.';
  if (
    error.code === 'VALIDATION_ERROR' &&
    error.details?.some((detail) => detail.path === 'eventDate')
  )
    return 'Ngày tổ chức phải là ngày hợp lệ, từ ngày mốt trở đi (theo giờ Việt Nam). Hãy chọn lại ngày.';
  if (error.code === 'TIMELINE_ITEM_TIME_INVALID')
    return shift
      ? `Giờ bắt đầu mốc chương trình phải từ ${shift.startTime} đến trước ${shift.endTime}. Hãy sửa giờ rồi lưu lại. Nội dung đã nhập vẫn được giữ lại.`
      : 'Giờ bắt đầu mốc chương trình phải nằm trong ca tiệc đã chọn. Hãy sửa giờ rồi lưu lại.';
  const messages: Record<string, string> = {
    STALE_BOOKING_REVISION:
      'Hồ sơ đã thay đổi ở nơi khác hoặc mã hồ sơ tư vấn này đã được dùng để tạo tiệc rồi. Hãy bấm "Tạo hồ sơ tư vấn" ở Bước 01 để tạo mã mới cho cặp đôi.',
    SLOT_NOT_AVAILABLE: 'Khung giờ vừa được giữ bởi hồ sơ khác. Hãy chọn lịch khác.',
    DEPOSIT_INTENT_ACTIVE: 'Đang có giao dịch tiền cọc chưa kết thúc nên chưa thể thay đổi hồ sơ.',
    BOOKING_NOT_FOUND: 'Không tìm thấy hồ sơ hoặc tài khoản không có quyền xem.',
    NOT_FOUND: 'Không tìm thấy hồ sơ hoặc tài khoản không có quyền xem.',
    FORBIDDEN: 'Tài khoản không có quyền xem hồ sơ đặt tiệc này.',
    TIMELINE_APPROVAL_REQUIRES_ITEM:
      'Hãy thêm và lưu ít nhất một mốc chương trình trước khi phê duyệt.',
    TIMELINE_ITEM_COUNT_INVALID:
      'Kịch bản chỉ được có tối đa 100 mốc. Hãy xóa bớt mốc rồi lưu lại.',
    TIMELINE_ITEM_TEXT_INVALID:
      'Nội dung mỗi mốc cần từ 1–120 ký tự; ghi chú tối đa 2.000 ký tự. Hãy sửa nội dung rồi lưu lại.',
    TIMELINE_REVISION_SUPERSEDED:
      'Kịch bản đã có phiên bản mới. Hãy tải lại hồ sơ trước khi tiếp tục.',
  };
  return messages[error.code] ?? 'Yêu cầu chưa hoàn tất. Hãy kiểm tra dữ liệu và thử lại.';
}
