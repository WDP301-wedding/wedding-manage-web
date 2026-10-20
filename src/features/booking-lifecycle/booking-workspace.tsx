'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiClientError, createApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
import { addMyManagedBookingId, getMyManagedBookingIds } from '../identity-access/dashboard-live';
import { sharedManagementSession } from '../identity-access/session';
import { type BookingPrefill, errorMessage, type InviteLogEntry } from './booking-helpers';
import { BookingCreatePanel } from './booking-create-panel';
import { BookingLifecycleStepper } from './booking-lifecycle-stepper';
import { BookingLookupBar } from './booking-lookup-bar';
import { BookingUnauthorizedHint } from './booking-unauthorized-hint';
import { bookingStyles } from './booking.styles';
import { ConsultationPanel } from './consultation-panel';
import type { Authorize, ManagementBookingGateway, ProposalView } from './booking-api';
import { ProposalPanel } from './proposal-panel';

const session = sharedManagementSession;

export interface ManagementBookingWorkspaceProps {
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  autoLoadCatalog?: boolean | undefined;
  currentAccountId?: string | undefined;
  currentEmail?: string | undefined;
}

export function ManagementBookingWorkspace({
  authorize,
  gateway,
  autoLoadCatalog = false,
  currentAccountId,
  currentEmail,
}: Readonly<ManagementBookingWorkspaceProps>) {
  const [activeTab, setActiveTab] = useState<'manage' | 'consultation' | 'booking'>('consultation');
  const [visitedTabs, setVisitedTabs] = useState<Set<'manage' | 'consultation' | 'booking'>>(
    () => new Set([activeTab]),
  );

  const switchTab = useCallback((tab: 'manage' | 'consultation' | 'booking') => {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  const [consultation, setConsultation] = useState<{ id: string; revision: number } | null>(null);
  const [bookingId, setBookingId] = useState('');
  const [proposal, setProposal] = useState<ProposalView | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentBookingIds, setRecentBookingIds] = useState<string[]>([]);
  const [inviteLogs, setInviteLogs] = useState<readonly InviteLogEntry[]>([]);
  const [prefill, setPrefill] = useState<BookingPrefill>({});
  const [createdBookingNotice, setCreatedBookingNotice] = useState<{
    bookingId: string;
    consultationId: string;
    email?: string | undefined;
  } | null>(null);

  const sendWorkspaceInvite = async () => {
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
  };

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
      queueMicrotask(() => {
        setConsultation({ id, revision });
        switchTab('booking');
      });
    }
    const bId = params.get('bookingId');
    if (bId !== null && /^[a-f0-9-]{36}$/iu.test(bId)) {
      setBookingId(bId);
      switchTab('manage');
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
      switchTab('consultation');
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

  const loadProposal = async (id: string, shouldSwitchTab = true) => {
    const result = await run('load', () => authorize((token) => gateway.loadProposal(token, id)));
    if (result !== null) {
      setProposal(result);
      recordMyBooking(id);
      if (shouldSwitchTab) {
        switchTab('manage');
      }
    }
  };

  const refresh = async (success: string) => {
    setMessage(success);
    if (proposal !== null) await loadProposal(proposal.bookingId);
  };

  const resetConsultation = () => {
    setConsultation(null);
    setPrefill({});
    switchTab('consultation');
    setMessage(
      'Đã xóa mã tư vấn cũ. Hãy nhập thông tin cặp đôi mới ở Bước 01 rồi bấm "Tạo hồ sơ tư vấn".',
    );
  };

  return (
    <main className="booking-shell" id="booking-main">
      <header className="booking-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <p className="section-kicker">Wedding Estate · Operations</p>
            <h1>Điều phối đặt tiệc</h1>
            <p>Tạo hồ sơ tư vấn, giữ lịch và kiểm soát vòng đời bằng revision từ máy chủ.</p>
          </div>
          <BookingLookupBar
            bookingId={bookingId}
            setBookingId={setBookingId}
            onLoadProposal={loadProposal}
            pending={pending}
            recentBookingIds={recentBookingIds}
          />
        </div>
      </header>

      <div className="booking-live" aria-live="polite">
        {pending === null ? null : <span role="status">Đang xử lý yêu cầu…</span>}
        {message === null ? null : <span role="status">{message}</span>}
        {error === null ? null : <span role="alert">{error}</span>}
      </div>

      {/* 3 Phân hệ tách biệt hoàn toàn theo tiêu chuẩn Hỷ Yến */}
      <div role="tablist" aria-label="Phân hệ điều phối tiệc" style={bookingStyles.tabList}>
        <button
          type="button"
          role="tab"
          id="tab-consultation"
          aria-selected={activeTab === 'consultation'}
          onClick={() => switchTab('consultation')}
          style={bookingStyles.tabButton(activeTab === 'consultation')}
        >
          <span>📝 1. Hồ sơ tư vấn</span>
          {consultation ? <span style={bookingStyles.badgeActive}>Đã có mã</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-booking"
          aria-selected={activeTab === 'booking'}
          onClick={() => switchTab('booking')}
          style={bookingStyles.tabButton(activeTab === 'booking')}
        >
          <span>🏛️ 2. Khảo sát sảnh &amp; Đặt tiệc</span>
          {consultation ? <span style={bookingStyles.badgeDraft}>Đã liên kết tư vấn</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-manage"
          aria-selected={activeTab === 'manage'}
          onClick={() => switchTab('manage')}
          style={bookingStyles.tabButton(activeTab === 'manage')}
        >
          <span>📋 3. Tiệc đang xử lý</span>
          {proposal ? <span style={bookingStyles.badgeActive}>Đang mở</span> : null}
        </button>
      </div>

      {/* Phân hệ 1: Hồ sơ tư vấn (Tập trung, rộng rãi, trang trọng) */}
      <section
        aria-label="Hồ sơ tư vấn cặp đôi"
        style={
          activeTab === 'consultation'
            ? bookingStyles.stepContainerVisible('820px')
            : bookingStyles.stepContainerHidden
        }
      >
        <ConsultationPanel
          disabled={pending !== null}
          consultation={consultation}
          prefill={prefill}
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
              switchTab('booking');
            }
          }}
        />
        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="primary-button"
            onClick={() => switchTab('booking')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              fontSize: '0.92rem',
              fontWeight: 600,
              borderRadius: '6px',
              background: 'var(--hy-wine, #7a1f3d)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>Tiếp tục sang bước Khảo sát sảnh &amp; Đặt tiệc</span>
            <span>→</span>
          </button>
        </div>
      </section>

      {/* Phân hệ 2: Khảo sát sảnh & Đặt tiệc (Tập trung, rộng rãi, trang trọng) */}
      <section
        aria-label="Khảo sát sảnh &amp; Tạo booking"
        style={
          activeTab === 'booking'
            ? bookingStyles.stepContainerVisible('900px')
            : bookingStyles.stepContainerHidden
        }
      >
        {visitedTabs.has('booking') ? (
          <>
            <div
              style={{
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => switchTab('consultation')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--hy-wine, #7a1f3d)',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 0',
                }}
              >
                <span>←</span>
                <span>Quay lại Bước 01: Hồ sơ tư vấn</span>
              </button>
              {consultation ? (
                <span
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--hy-status-success, #2f6b4f)',
                    background: 'var(--hy-status-success-bg, #e7f1ea)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    border: '1px solid var(--hy-status-success-border, #bbf7d0)',
                  }}
                >
                  ✓ Đã kết nối mã tư vấn: {consultation.id.slice(0, 8)}… (Phiên bản{' '}
                  {consultation.revision})
                </span>
              ) : null}
            </div>
            <BookingCreatePanel
              disabled={pending !== null}
              consultation={consultation}
              prefill={prefill}
              gateway={gateway}
              authorize={authorize}
              run={run}
              autoLoadCatalog={autoLoadCatalog && activeTab === 'booking'}
              onCreated={(result, consultationId) => {
                setBookingId(result.bookingId);
                setConsultation({ id: consultationId, revision: result.consultationRevision });
                setCreatedBookingNotice({
                  bookingId: result.bookingId,
                  consultationId,
                  email: prefill.email,
                });
                setMessage('Đã tạo hồ sơ đặt tiệc.');
                void loadProposal(result.bookingId, true);
                recordMyBooking(result.bookingId);
              }}
              setMessage={setMessage}
              onValidationError={setError}
            />
          </>
        ) : null}
      </section>

      {/* Phân hệ 3: Tiệc đang xử lý (Đề xuất & Vòng đời) */}
      <section
        className="booking-workspace"
        aria-labelledby="proposal-heading"
        style={
          activeTab === 'manage'
            ? bookingStyles.stepContainerVisible('1120px')
            : bookingStyles.stepContainerHidden
        }
      >
        <div className="booking-section-heading">
          <div>
            <p className="section-kicker">Hồ sơ đang xử lý</p>
            <h2 id="proposal-heading">Đề xuất &amp; vòng đời</h2>
          </div>
        </div>

        {createdBookingNotice ? (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #22c55e',
              borderRadius: '8px',
              padding: '1.1rem 1.35rem',
              marginBottom: '1.5rem',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.12)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#15803d',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  ✓ Khởi tạo tiệc cưới nháp thành công
                </span>
                <h3
                  style={{
                    margin: '0.25rem 0',
                    color: '#14532d',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                  }}
                >
                  Mã booking: {createdBookingNotice.bookingId}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', lineHeight: 1.5 }}>
                  Bản nháp tiệc đã sẵn sàng! Bây giờ bạn có thể cấp tài khoản cho cặp đôi
                  {createdBookingNotice.email ? (
                    <>
                      {' '}
                      (<strong>{createdBookingNotice.email}</strong>)
                    </>
                  ) : null}{' '}
                  để họ đăng nhập vào xem đề xuất &amp; duyệt kịch bản.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreatedBookingNotice(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  color: '#15803d',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '2px 6px',
                }}
                aria-label="Đóng thông báo"
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginTop: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                disabled={pending !== null || consultation === null}
                onClick={() => void sendWorkspaceInvite()}
                style={{
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <span>✉️</span>
                <span>Gửi lời mời cộng tác (Cấp tài khoản ngay)</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedBookingNotice(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #86efac',
                  color: '#15803d',
                  borderRadius: '6px',
                  padding: '8px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Để sau, xem đề xuất trước
              </button>
            </div>
          </div>
        ) : null}
        {proposal === null ? (
          <div className="booking-empty" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
            <strong
              style={{
                fontSize: '1.15rem',
                color: 'var(--hy-wine, #7a1f3d)',
                display: 'block',
                marginBottom: '0.5rem',
              }}
            >
              Chưa chọn hồ sơ
            </strong>
            <p
              style={{
                color: 'var(--hy-text-muted, #6e5d63)',
                maxWidth: '520px',
                margin: '0 auto 1.5rem',
                lineHeight: 1.6,
              }}
            >
              Nhập mã booking ở thanh tra cứu phía trên hoặc chọn nhanh từ danh mục{' '}
              <strong>&quot;Tiệc của bạn&quot;</strong> để xem đề xuất, kịch bản và hợp đồng.
            </p>
            <div
              style={{
                display: 'inline-flex',
                gap: '10px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                className="primary-button"
                onClick={() => switchTab('consultation')}
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
              >
                📝 1. Tạo hồ sơ tư vấn mới →
              </button>
              <button
                type="button"
                className="primary-button booking-secondary"
                onClick={() => switchTab('booking')}
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
              >
                🏛️ 2. Khảo sát sảnh &amp; Đặt tiệc →
              </button>
            </div>
            {error && bookingId ? <BookingUnauthorizedHint bookingId={bookingId} /> : null}
          </div>
        ) : (
          <>
            <BookingLifecycleStepper
              phase={proposal.phase}
              hasTimeline={proposal.timeline !== null}
              hasContract={true}
            />
            {/* Thẻ quản lý tài khoản cặp đôi & gửi lời mời cộng tác */}
            <article
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--hy-outline, #e2e8f0)',
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: inviteLogs.length > 0 ? '0.75rem' : 0,
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: '0 0 0.25rem',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--hy-wine, #7a1f3d)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>👥</span>
                    <span>Tài khoản Cặp đôi &amp; Không gian cộng tác</span>
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.82rem',
                      color: 'var(--hy-text-muted, #64748b)',
                    }}
                  >
                    Gửi email kích hoạt tài khoản để cặp đôi đăng nhập vào cổng thông tin duyệt kịch
                    bản và xem hợp đồng.
                    {prefill.email ? (
                      <>
                        {' '}
                        · Email: <strong>{prefill.email}</strong>
                      </>
                    ) : null}
                  </p>
                </div>
                {consultation !== null ? (
                  <button
                    type="button"
                    disabled={pending !== null}
                    onClick={() => void sendWorkspaceInvite()}
                    style={{
                      backgroundColor: 'var(--hy-wine, #7a1f3d)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>✉️</span>
                    <span>Gửi lời mời cộng tác</span>
                  </button>
                ) : null}
              </div>

              {inviteLogs.length > 0 ? (
                <div
                  style={{
                    marginTop: '0.75rem',
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
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      📋 Nhật ký gửi lời mời
                    </span>
                    <button
                      type="button"
                      onClick={() => setInviteLogs([])}
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
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {inviteLogs.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.78rem',
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
                          color:
                            item.type === 'success'
                              ? '#166534'
                              : item.type === 'error'
                                ? '#991b1b'
                                : '#92400e',
                        }}
                      >
                        <span>[{item.time}] </span>
                        <span>{item.message}</span>
                        {item.invitationId && item.invitationId !== 'Đã phát hành (ISSUED)' ? (
                          <span style={{ marginLeft: '6px', opacity: 0.8 }}>
                            (ID: {item.invitationId})
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
            <ProposalPanel
              disabled={pending !== null}
              proposal={proposal}
              run={run}
              authorize={authorize}
              gateway={gateway}
              refresh={refresh}
            />
          </>
        )}
      </section>
    </main>
  );
}
