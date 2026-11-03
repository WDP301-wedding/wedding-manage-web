'use client';

import { LoaderCircle } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { BookingLookupBar } from './booking-lookup-bar';
import { bookingPhaseLabel, bookingPhaseTone, formatDate } from './booking-helpers';
import type { Authorize, ManagementBookingGateway } from './booking-api';
import { useBookingWorkspaceState } from './use-booking-workspace-state';
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
                <Badge variant={bookingPhaseTone(proposal.phase)}>
                  {bookingPhaseLabel(proposal.phase)}
                </Badge>
              </>
            ) : (
              <Badge>Chưa tạo tiệc</Badge>
            )}
          </p>
        ) : null}
        {/* empty:sr-only giữ vùng thông báo trong cây trợ năng nhưng không chiếm chỗ khi trống. */}
        <div className="flex flex-col gap-2 empty:sr-only" aria-live="polite">
          {pending === null ? null : (
            <span
              role="status"
              className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-3 text-muted-foreground"
            >
              <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
              Đang xử lý yêu cầu…
            </span>
          )}
          {message === null ? null : (
            <span role="status" className="rounded-lg bg-hy-info-bg px-4 py-3 text-hy-info">
              {message}
            </span>
          )}
          {error === null ? null : (
            <span role="alert" className="rounded-lg bg-hy-error-bg px-4 py-3 text-hy-error">
              {error}
            </span>
          )}
          {contextStatus === 'error' ? (
            <Button variant="outline" size="sm" className="self-start" onClick={retryContext}>
              Tải lại hồ sơ
            </Button>
          ) : null}
        </div>

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
