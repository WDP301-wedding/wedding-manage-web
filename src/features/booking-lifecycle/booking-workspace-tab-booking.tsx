'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { notify } from '../../design-system/notifications';
import { ActivationStatus } from './activation-status';
import { BookingCreatePanel } from './booking-create-panel';
import { CoupleAccountCard } from './couple-account-card';
import { stepHiddenClass } from './booking-classes';
import { cn } from 'cn';
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
  setMessage,
  loadProposal,
  recordMyBooking,
  setError,
}: Readonly<BookingWorkspaceTabBookingProps>) {
  return (
    <section
      data-ui-v3
      aria-label="Khảo sát sảnh &amp; Tạo booking"
      className={cn('flex flex-col gap-5', !active && stepHiddenClass)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => switchTab('consultation')}
        >
          <ArrowLeft aria-hidden />
          Quay lại Bước 01: Hồ sơ tư vấn
        </Button>
        {consultation && !proposal ? (
          <ActivationStatus
            key={consultation.id}
            consultationId={consultation.id}
            disabled={disabled}
            reloadSignal={inviteLogs.length}
            compact
          />
        ) : null}
      </div>
      {proposal ? (
        <article className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-6 shadow-hy-1">
          <h2 className="text-lg font-semibold">Hồ sơ tư vấn này đã có tiệc</h2>
          <p className="text-muted-foreground">
            Tiếp tục trong hồ sơ đã lưu để xem và chỉnh sửa theo trạng thái hiện tại.
          </p>
          <Button type="button" onClick={() => switchTab('manage')}>
            Mở tiệc đang xử lý
          </Button>
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
            notify.success(
              prefill.email
                ? `Hồ sơ tiệc mới đã sẵn sàng cho cặp đôi (${prefill.email}).`
                : 'Hồ sơ tiệc mới đã sẵn sàng để xem đề xuất & duyệt kịch bản.',
              {
                title: 'Khởi tạo tiệc cưới thành công',
              },
            );
            setMessage('Đã tạo hồ sơ đặt tiệc.');
            void loadProposal(result.bookingId, true);
            recordMyBooking(result.bookingId);
          }}
          setMessage={setMessage}
          onValidationError={setError}
        />
      )}
      {active && consultation && !proposal ? (
        <CoupleAccountCard
          consultationId={consultation.id}
          email={prefill.email}
          canInvite
          pending={disabled}
          inviteLogs={inviteLogs}
          onInvite={() => void sendWorkspaceInvite()}
          onClearLogs={() => setInviteLogs([])}
          hideIfActivated
        />
      ) : null}
    </section>
  );
}
