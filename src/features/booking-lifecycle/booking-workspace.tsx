'use client';

import { BookingCreatePanel } from './booking-create-panel';
import { BookingLifecycleStepper } from './booking-lifecycle-stepper';
import { BookingLookupBar } from './booking-lookup-bar';
import { BookingUnauthorizedHint } from './booking-unauthorized-hint';
import { bookingStyles } from './booking.styles';
import { ConsultationPanel } from './consultation-panel';
import type { Authorize, ManagementBookingGateway } from './booking-api';
import { ProposalPanel } from './proposal-panel';
import { useBookingWorkspaceState } from './use-booking-workspace-state';
import { CoupleAccountCard } from './couple-account-card';
import { CreatedBookingNoticeBanner } from './created-booking-notice-banner';

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
  const {
    activeTab,
    switchTab,
    consultation,
    setConsultation,
    bookingId,
    setBookingId,
    proposal,
    pending,
    message,
    setMessage,
    error,
    setError,
    recentBookingIds,
    inviteLogs,
    setInviteLogs,
    prefill,
    setPrefill,
    createdBookingNotice,
    setCreatedBookingNotice,
    sendWorkspaceInvite,
    recordMyBooking,
    run,
    loadProposal,
    refresh,
    resetConsultation,
  } = useBookingWorkspaceState({
    authorize,
    gateway,
    currentAccountId,
    currentEmail,
  });

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
          logs={inviteLogs}
          onClearLogs={() => setInviteLogs([])}
          onInvite={sendWorkspaceInvite}
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
          autoLoadCatalog={autoLoadCatalog}
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
          <CreatedBookingNoticeBanner
            notice={createdBookingNotice}
            onDismiss={() => setCreatedBookingNotice(null)}
            onNavigateToAccount={() => {
              setCreatedBookingNotice(null);
              document.getElementById('couple-account-card')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
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
            <CoupleAccountCard
              email={prefill.email}
              canInvite={consultation !== null || Boolean(proposal?.consultationId)}
              pending={pending !== null}
              inviteLogs={inviteLogs}
              onInvite={() => void sendWorkspaceInvite()}
              onClearLogs={() => setInviteLogs([])}
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
