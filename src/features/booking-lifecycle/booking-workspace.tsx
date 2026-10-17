'use client';

import { useEffect, useState } from 'react';
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
  const [activeTab, setActiveTab] = useState<'manage' | 'create'>('create');
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
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
      queueMicrotask(() => {
        setConsultation({ id, revision });
        setActiveTab('create');
        setWizardStep(2);
      });
    }
    const bId = params.get('bookingId');
    if (bId !== null && /^[a-f0-9-]{36}$/iu.test(bId)) {
      setBookingId(bId);
      setActiveTab('manage');
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
      setActiveTab('create');
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

  const loadProposal = async (id: string, switchTab = true) => {
    const result = await run('load', () => authorize((token) => gateway.loadProposal(token, id)));
    if (result !== null) {
      setProposal(result);
      recordMyBooking(id);
      if (switchTab) {
        setActiveTab('manage');
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
    setWizardStep(1);
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

      {/* Chế độ làm việc: Phân tách Tiệc đang xử lý & Tạo tiệc mới */}
      <div role="tablist" aria-label="Chế độ làm việc" style={bookingStyles.tabList}>
        <button
          type="button"
          role="tab"
          id="tab-manage"
          aria-selected={activeTab === 'manage'}
          onClick={() => setActiveTab('manage')}
          style={bookingStyles.tabButton(activeTab === 'manage')}
        >
          <span>📋 Tiệc đang xử lý</span>
          {proposal ? <span style={bookingStyles.badgeActive}>Đang mở</span> : null}
        </button>
        <button
          type="button"
          role="tab"
          id="tab-create"
          aria-selected={activeTab === 'create'}
          onClick={() => setActiveTab('create')}
          style={bookingStyles.tabButton(activeTab === 'create')}
        >
          <span>➕ Tạo đặt tiệc mới</span>
          {consultation ? <span style={bookingStyles.badgeDraft}>Đã có mã tư vấn</span> : null}
        </button>
      </div>

      {/* Tab 2: Khởi tạo đặt tiệc (Wizard 2 bước tuần tự) */}
      <section
        aria-label="Khởi tạo đặt tiệc"
        style={{ display: activeTab === 'create' ? 'block' : 'none' }}
      >
        {/* Thanh chuyển bước Wizard */}
        <div
          style={bookingStyles.wizardStepper}
          role="tablist"
          aria-label="Các bước thiết lập tiệc"
        >
          <button
            type="button"
            role="tab"
            id="wizard-step-1"
            aria-selected={wizardStep === 1}
            onClick={() => setWizardStep(1)}
            style={bookingStyles.wizardStepButton(wizardStep === 1, consultation !== null)}
          >
            <span style={bookingStyles.wizardStepBadge(wizardStep === 1, consultation !== null)}>
              {consultation ? '✓' : '1'}
            </span>
            <span>Bước 01: Hồ sơ tư vấn</span>
          </button>

          <span style={{ color: 'var(--hy-outline, #eadfd6)', fontWeight: 600 }}>───▶</span>

          <button
            type="button"
            role="tab"
            id="wizard-step-2"
            aria-selected={wizardStep === 2}
            onClick={() => setWizardStep(2)}
            style={bookingStyles.wizardStepButton(wizardStep === 2, false)}
          >
            <span style={bookingStyles.wizardStepBadge(wizardStep === 2, false)}>2</span>
            <span>Bước 02: Khảo sát sảnh &amp; Đặt tiệc</span>
          </button>
        </div>

        {/* BƯỚC 01: HỒ SƠ TƯ VẤN (Rộng rãi, tập trung) */}
        <div
          style={
            wizardStep === 1
              ? bookingStyles.stepContainerVisible('780px')
              : bookingStyles.stepContainerHidden
          }
        >
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
                setWizardStep(2);
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
          <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => setWizardStep(2)}
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
        </div>

        {/* BƯỚC 02: KHẢO SÁT SẢNH & TẠO BOOKING (Rộng rãi, tập trung) */}
        <div
          style={
            wizardStep === 2
              ? bookingStyles.stepContainerVisible('840px')
              : bookingStyles.stepContainerHidden
          }
        >
          <div style={{ marginBottom: '1rem' }}>
            <button
              type="button"
              onClick={() => setWizardStep(1)}
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
          </div>
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
              void loadProposal(result.bookingId, false);
              recordMyBooking(result.bookingId);
            }}
            setMessage={setMessage}
            onValidationError={setError}
          />
        </div>
      </section>

      {/* Tab 1: Đề xuất & Vòng đời tiệc cưới */}
      <section
        className="booking-workspace"
        aria-labelledby="proposal-heading"
        style={{ display: activeTab === 'manage' ? 'block' : 'none' }}
      >
        <div className="booking-section-heading">
          <div>
            <p className="section-kicker">Hồ sơ đang xử lý</p>
            <h2 id="proposal-heading">Đề xuất &amp; vòng đời</h2>
          </div>
        </div>
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
            <button
              type="button"
              className="primary-button"
              onClick={() => setActiveTab('create')}
              style={{ padding: '8px 18px', fontSize: '0.9rem' }}
            >
              ➕ Tạo đặt tiệc mới ngay →
            </button>
            {error && bookingId ? <BookingUnauthorizedHint bookingId={bookingId} /> : null}
          </div>
        ) : (
          <>
            <BookingLifecycleStepper
              phase={proposal.phase}
              hasTimeline={proposal.timeline !== null}
              hasContract={true}
            />
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
