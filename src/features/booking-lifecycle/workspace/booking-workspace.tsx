'use client';

import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { BookingLifecycleStepper } from './booking-lifecycle-stepper';
import { BookingLookupBar } from './booking-lookup-bar';
import { bookingPhaseLabel, bookingPhaseTone, formatDate } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import type { Authorize, ManagementBookingGateway } from '@/src/features/booking-lifecycle/api/booking-api';
import { useBookingWorkspaceState } from '@/src/features/booking-lifecycle/hooks/use-booking-workspace-state';
import { useContractPanel } from '@/src/features/booking-lifecycle/hooks/use-contract-panel';
import { BookingWorkspaceTabConsultation } from './booking-workspace-tab-consultation';
import { BookingWorkspaceTabBooking } from './booking-workspace-tab-booking';
import { BookingWorkspaceTabManage } from './booking-workspace-tab-manage';

const tabClass =
  'inline-flex h-12 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 font-semibold whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:border-primary aria-selected:text-primary';

// Thanh bước hẹp (< 52rem) thì ẩn chip trạng thái để 3 bước không bị cắt; thẻ hồ sơ phía trên vẫn hiện trạng thái.
const tabBadgeClass = '@max-[52rem]:hidden';

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
  const contractState = useContractPanel({
    bookingId: proposal?.bookingId ?? '',
    bookingRevision: proposal?.revision ?? 0,
    onRefresh: () => {
      void refresh();
    },
  });
  const agreementsApproved = Boolean(
    proposal?.timeline?.managerApprovedAt &&
    proposal.timeline.coupleApprovedAt &&
    contractState.data?.bookingId === proposal.bookingId &&
    contractState.data.bookingRevision === proposal.revision &&
    contractState.currentRevision?.state === 'APPROVED' &&
    contractState.currentRevision.document.timelineRevisionId === proposal.timeline.revisionId,
  );
  const lifecycleProgress =
    proposal || consultation || contextStatus === 'ready' ? (
      <BookingLifecycleStepper
        phase={proposal?.phase}
        hasConsultation={consultation !== null}
        agreementsApproved={agreementsApproved}
      />
    ) : null;

  return (
    <main
      data-ui-v3
      id="booking-main"
      className="min-h-screen bg-background px-4 py-5 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex max-w-xl min-w-0 flex-[1_1_360px] flex-col gap-1">
            <h1 className="text-2xl font-bold">Điều phối đặt tiệc</h1>
            <p className="text-muted-foreground">
              Mỗi hồ sơ tư vấn gắn với một tiệc. Mở lại hồ sơ để tiếp tục đúng tiến trình.
            </p>
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
        </header>

        {consultation ? (
          <p
            role="status"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-card px-4 py-3"
          >
            <strong className="font-semibold">{prefill.displayName}</strong>
            <span className="text-muted-foreground [overflow-wrap:anywhere]">{prefill.email}</span>
            {proposal ? (
              <>
                <span className="tabular-nums">Ngày: {formatDate(proposal.eventDate)}</span>
                <Badge variant={bookingPhaseTone(proposal.phase, proposal.eventDate)}>
                  {bookingPhaseLabel(proposal.phase, proposal.eventDate)}
                </Badge>
              </>
            ) : (
              <Badge>Chưa tạo tiệc</Badge>
            )}
          </p>
        ) : null}
        {/* Vùng thông báo ẩn cho trợ năng (screen reader); toàn bộ thông báo giao diện hiển thị qua Toast */}
        <div className="empty:sr-only" aria-live="polite">
          {pending === null ? null : (
            <span role="status" className="sr-only">
              Đang xử lý yêu cầu…
            </span>
          )}
          {message ? <span className="sr-only">{message}</span> : null}
          {error ? (
            <span role="alert" className="sr-only">
              {error}
            </span>
          ) : null}
          {contextStatus === 'error' ? (
            <Button variant="outline" size="sm" className="self-start" onClick={retryContext}>
              Tải lại hồ sơ
            </Button>
          ) : null}
        </div>

        {lifecycleProgress}

        <div
          role="tablist"
          aria-label="Phân hệ điều phối tiệc"
          className="@container flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--hy-outline)]"
        >
          <button
            type="button"
            role="tab"
            id="tab-consultation"
            aria-selected={activeTab === 'consultation'}
            onClick={() => switchTab('consultation')}
            className={tabClass}
          >
            <span>1. Hồ sơ tư vấn</span>
            {consultation ? (
              <Badge variant="success" className={tabBadgeClass}>
                Đã có mã
              </Badge>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            id="tab-booking"
            aria-selected={activeTab === 'booking'}
            onClick={() => switchTab('booking')}
            className={tabClass}
          >
            <span>2. Khảo sát sảnh &amp; Đặt tiệc</span>
            {consultation ? <Badge className={tabBadgeClass}>Đã liên kết</Badge> : null}
          </button>
          <button
            type="button"
            role="tab"
            id="tab-manage"
            aria-selected={activeTab === 'manage'}
            onClick={() => switchTab('manage')}
            className={tabClass}
          >
            <span>3. Tiệc đang xử lý</span>
            {proposal ? (
              <Badge variant="success" className={tabBadgeClass}>
                Đang mở
              </Badge>
            ) : null}
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
        contractState={contractState}
        lifecycleProgress={lifecycleProgress}
        consultation={consultation}
        prefill={prefill}
        inviteLogs={inviteLogs}
        switchTab={switchTab}
        sendWorkspaceInvite={sendWorkspaceInvite}
        setInviteLogs={setInviteLogs}
        run={run}
        authorize={authorize}
        gateway={gateway}
        refresh={refresh}
      />
      </div>
    </main>
  );
}
