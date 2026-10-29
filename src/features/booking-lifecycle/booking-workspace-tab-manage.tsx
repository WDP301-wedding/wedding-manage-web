'use client';

import { useContractPanel } from './use-contract-panel';
import { BookingLifecycleStepper } from './booking-lifecycle-stepper';
import { BookingUnauthorizedHint } from './booking-unauthorized-hint';
import { CoupleAccountCard } from './couple-account-card';
import { CreatedBookingNoticeBanner } from './created-booking-notice-banner';
import { ProposalPanel } from './proposal-panel';
import { bookingStyles } from './booking.styles';
import type { Authorize, ManagementBookingGateway, ProposalView } from './booking-api';
import type { InviteLogEntry, BookingPrefill } from './booking-helpers';

export interface BookingWorkspaceTabManageProps {
  active: boolean;
  disabled: boolean;
  bookingId: string;
  error: string | null;
  proposal: ProposalView | null;
  consultation: { id: string; revision: number } | null;
  prefill: BookingPrefill;
  inviteLogs: readonly InviteLogEntry[];
  createdBookingNotice: {
    bookingId: string;
    consultationId: string;
    email?: string | undefined;
  } | null;
  setCreatedBookingNotice: (
    notice: { bookingId: string; consultationId: string; email?: string | undefined } | null,
  ) => void;
  switchTab: (tab: 'consultation' | 'booking' | 'manage') => void;
  sendWorkspaceInvite: () => Promise<void>;
  setInviteLogs: React.Dispatch<React.SetStateAction<readonly InviteLogEntry[]>>;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  refresh: (msg: string) => Promise<void>;
}

export function BookingWorkspaceTabManage({
  active,
  disabled,
  bookingId,
  error,
  proposal,
  consultation,
  prefill,
  inviteLogs,
  createdBookingNotice,
  setCreatedBookingNotice,
  switchTab,
  sendWorkspaceInvite,
  setInviteLogs,
  run,
  authorize,
  gateway,
  refresh,
}: Readonly<BookingWorkspaceTabManageProps>) {
  const contractState = useContractPanel({
    bookingId: proposal?.bookingId ?? '',
    bookingRevision: proposal?.revision ?? 0,
    onRefresh: () => {
      void refresh('Đã làm mới hợp đồng.');
    },
  });
  const timelineApproved = Boolean(
    proposal?.timeline?.managerApprovedAt && proposal.timeline.coupleApprovedAt,
  );
  const contracts =
    contractState.data?.bookingId === proposal?.bookingId ? contractState.data : null;
  const agreementsApproved =
    timelineApproved &&
    Boolean(
      contracts &&
      contracts.bookingRevision === proposal?.revision &&
      contractState.currentRevision?.state === 'APPROVED' &&
      contractState.currentRevision.document.timelineRevisionId === proposal?.timeline?.revisionId,
    );

  return (
    <section
      className="booking-workspace"
      aria-labelledby="proposal-heading"
      style={
        active ? bookingStyles.stepContainerVisible('1120px') : bookingStyles.stepContainerHidden
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
              1. Tạo hồ sơ tư vấn mới →
            </button>
            <button
              type="button"
              className="primary-button booking-secondary"
              onClick={() => switchTab('booking')}
              style={{ padding: '8px 18px', fontSize: '0.9rem' }}
            >
              2. Khảo sát sảnh &amp; Đặt tiệc →
            </button>
          </div>
          {error && bookingId ? <BookingUnauthorizedHint bookingId={bookingId} /> : null}
        </div>
      ) : (
        <>
          <BookingLifecycleStepper phase={proposal.phase} agreementsApproved={agreementsApproved} />
          <CoupleAccountCard
            consultationId={active ? proposal.consultationId : undefined}
            email={prefill.email}
            canInvite={consultation !== null || Boolean(proposal?.consultationId)}
            pending={disabled}
            inviteLogs={inviteLogs}
            onInvite={() => void sendWorkspaceInvite()}
            onClearLogs={() => setInviteLogs([])}
          />
          <ProposalPanel
            contractState={contractState}
            disabled={disabled}
            proposal={proposal}
            run={run}
            authorize={authorize}
            gateway={gateway}
            refresh={refresh}
          />
        </>
      )}
    </section>
  );
}
