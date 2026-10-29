'use client';

import { BookingLookupBar } from './booking-lookup-bar';
import { bookingStyles } from './booking.styles';
import { bookingPhaseLabel } from './booking-helpers';
import type { Authorize, ManagementBookingGateway } from './booking-api';
import { useBookingWorkspaceState } from './use-booking-workspace-state';
import { BookingWorkspaceTabConsultation } from './booking-workspace-tab-consultation';
import { BookingWorkspaceTabBooking } from './booking-workspace-tab-booking';
import { BookingWorkspaceTabManage } from './booking-workspace-tab-manage';

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
    contextStatus,
    prepareBooking,
    retryContext,
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

  const isPendingOrLoading = pending !== null || contextStatus !== 'ready';

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
            <p>Mỗi hồ sơ tư vấn gắn với một tiệc. Mở lại hồ sơ để tiếp tục đúng tiến trình.</p>
          </div>
          <BookingLookupBar
            key={currentAccountId ?? 'manager'}
            authorize={authorize}
            activeBookingId={proposal?.bookingId}
            revision={proposal?.revision}
            bookingId={bookingId}
            setBookingId={setBookingId}
            onLoadProposal={loadProposal}
            pending={pending}
            recentBookingIds={recentBookingIds}
          />
        </div>
      </header>

      {consultation ? (
        <p role="status">
          <strong>{prefill.displayName}</strong> · {prefill.email}
          {proposal ? (
            <>
              {' '}
              · Ngày: {proposal.eventDate.split('-').reverse().join('/')} ·{' '}
              {bookingPhaseLabel(proposal.phase)}
            </>
          ) : (
            ' · Chưa tạo tiệc'
          )}
        </p>
      ) : null}
      <div className="booking-live" aria-live="polite">
        {pending === null ? null : <span role="status">Đang xử lý yêu cầu…</span>}
        {message === null ? null : <span role="status">{message}</span>}
        {error === null ? null : <span role="alert">{error}</span>}
        {contextStatus === 'error' ? (
          <button type="button" onClick={retryContext}>
            Tải lại hồ sơ
          </button>
        ) : null}
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
          <span>1. Hồ sơ tư vấn</span>
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
          <span>2. Khảo sát sảnh &amp; Đặt tiệc</span>
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
          <span>3. Tiệc đang xử lý</span>
          {proposal ? <span style={bookingStyles.badgeActive}>Đang mở</span> : null}
        </button>
      </div>

      <BookingWorkspaceTabConsultation
        active={activeTab === 'consultation'}
        authorize={authorize}
        gateway={gateway}
        disabled={isPendingOrLoading}
        consultation={consultation}
        prefill={prefill}
        inviteLogs={inviteLogs}
        setInviteLogs={setInviteLogs}
        sendWorkspaceInvite={sendWorkspaceInvite}
        resetConsultation={resetConsultation}
        setPrefill={setPrefill}
        setMessage={setMessage}
        setConsultation={setConsultation}
        switchTab={switchTab}
        run={run}
      />

      <BookingWorkspaceTabBooking
        active={activeTab === 'booking'}
        disabled={isPendingOrLoading}
        consultation={consultation}
        proposal={proposal}
        prefill={prefill}
        gateway={gateway}
        authorize={authorize}
        autoLoadCatalog={autoLoadCatalog}
        inviteLogs={inviteLogs}
        setInviteLogs={setInviteLogs}
        sendWorkspaceInvite={sendWorkspaceInvite}
        beforeCreate={prepareBooking}
        run={run}
        switchTab={switchTab}
        setBookingId={setBookingId}
        setConsultation={setConsultation}
        setCreatedBookingNotice={setCreatedBookingNotice}
        setMessage={setMessage}
        loadProposal={loadProposal}
        recordMyBooking={recordMyBooking}
        setError={setError}
      />

      <BookingWorkspaceTabManage
        active={activeTab === 'manage'}
        disabled={pending !== null || contextStatus !== 'ready'}
        bookingId={bookingId}
        error={error}
        proposal={proposal}
        consultation={consultation}
        prefill={prefill}
        inviteLogs={inviteLogs}
        createdBookingNotice={createdBookingNotice}
        setCreatedBookingNotice={setCreatedBookingNotice}
        switchTab={switchTab}
        sendWorkspaceInvite={sendWorkspaceInvite}
        setInviteLogs={setInviteLogs}
        run={run}
        authorize={authorize}
        gateway={gateway}
        refresh={refresh}
      />
    </main>
  );
}
