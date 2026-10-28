'use client';

import { BookingCreatePanel } from './booking-create-panel';
import { CoupleAccountCard } from './couple-account-card';
import { bookingStyles } from './booking.styles';
import type { Authorize, ManagementBookingGateway, ProposalView } from './booking-api';
import type { InviteLogEntry, BookingPrefill } from './booking-helpers';

export interface BookingWorkspaceTabBookingProps {
  active: boolean;
  disabled: boolean;
  consultation: { id: string; revision: number } | null;
  proposal: ProposalView | null;
  prefill: BookingPrefill;
  gateway: ManagementBookingGateway;
  authorize: Authorize;
  autoLoadCatalog?: boolean;
  inviteLogs: readonly InviteLogEntry[];
  setInviteLogs: React.Dispatch<React.SetStateAction<readonly InviteLogEntry[]>>;
  sendWorkspaceInvite: () => Promise<void>;
  beforeCreate: () => Promise<{ id: string; revision: number } | null>;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
  switchTab: (tab: 'consultation' | 'booking' | 'manage') => void;
  setBookingId: (id: string) => void;
  setConsultation: (c: { id: string; revision: number } | null) => void;
  setCreatedBookingNotice: (notice: { bookingId: string; consultationId: string; email?: string | undefined } | null) => void;
  setMessage: (msg: string | null) => void;
  loadProposal: (id: string, force?: boolean) => Promise<void>;
  recordMyBooking: (id: string) => void;
  setError: (err: string | null) => void;
}

export function BookingWorkspaceTabBooking({
  active,
  disabled,
  consultation,
  proposal,
  prefill,
  gateway,
  authorize,
  autoLoadCatalog = false,
  inviteLogs,
  setInviteLogs,
  sendWorkspaceInvite,
  beforeCreate,
  run,
  switchTab,
  setBookingId,
  setConsultation,
  setCreatedBookingNotice,
  setMessage,
  loadProposal,
  recordMyBooking,
  setError,
}: Readonly<BookingWorkspaceTabBookingProps>) {
  return (
    <section
      aria-label="Khảo sát sảnh &amp; Tạo booking"
      style={
        active
          ? bookingStyles.stepContainerVisible('1060px')
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
      {proposal ? (
        <article className="booking-card">
          <h2>Hồ sơ tư vấn này đã có tiệc</h2>
          <p>Tiếp tục trong hồ sơ đã lưu để xem và chỉnh sửa theo trạng thái hiện tại.</p>
          <button type="button" onClick={() => switchTab('manage')}>
            Mở tiệc đang xử lý
          </button>
        </article>
      ) : (
        <BookingCreatePanel
          disabled={disabled}
          beforeCreate={beforeCreate}
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
      )}
      {active && consultation && !proposal ? (
        <div style={{ marginTop: '1.5rem' }}>
          <CoupleAccountCard
            consultationId={consultation.id}
            email={prefill.email}
            canInvite
            pending={disabled}
            inviteLogs={inviteLogs}
            onInvite={() => void sendWorkspaceInvite()}
            onClearLogs={() => setInviteLogs([])}
          />
        </div>
      ) : null}
    </section>
  );
}
