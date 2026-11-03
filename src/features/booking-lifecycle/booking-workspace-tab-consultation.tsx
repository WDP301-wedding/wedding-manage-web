'use client';

import { ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ExistingCustomerPicker } from './existing-customer-picker';
import { ConsultationPanel } from './consultation-panel';
import { stepHiddenClass } from './booking-classes';
import { cn } from 'cn';
import { parseConsultationChoices } from './booking-helpers';
import type { Authorize, ManagementBookingGateway } from './booking-api';
import type { InviteLogEntry, BookingPrefill } from './booking-helpers';

export interface BookingWorkspaceTabConsultationProps {
  active: boolean;
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  disabled: boolean;
  consultation: { id: string; revision: number } | null;
  prefill: BookingPrefill;
  inviteLogs: readonly InviteLogEntry[];
  setInviteLogs: React.Dispatch<React.SetStateAction<readonly InviteLogEntry[]>>;
  sendWorkspaceInvite: () => Promise<void>;
  resetConsultation: () => void;
  setPrefill: React.Dispatch<React.SetStateAction<BookingPrefill>>;
  setMessage: (msg: string | null) => void;
  setConsultation: (c: { id: string; revision: number } | null) => void;
  switchTab: (tab: 'consultation' | 'booking' | 'manage') => void;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
}

export function BookingWorkspaceTabConsultation({
  active,
  authorize,
  gateway,
  disabled,
  consultation,
  prefill,
  inviteLogs,
  setInviteLogs,
  sendWorkspaceInvite,
  resetConsultation,
  setPrefill,
  setMessage,
  setConsultation,
  switchTab,
  run,
}: Readonly<BookingWorkspaceTabConsultationProps>) {
  return (
    <section
      data-ui-v3
      aria-label="Hồ sơ tư vấn cặp đôi"
      className={cn('grid grid-cols-1 items-start gap-6 lg:grid-cols-12', !active && stepHiddenClass)}
    >
      <div className="flex flex-col gap-4 lg:col-span-5">
        <ExistingCustomerPicker
          authorize={authorize}
          gateway={gateway}
          disabled={disabled}
          onChoose={(customer) => {
            resetConsultation();
            setPrefill({
              displayName: customer.displayName,
              email: customer.email,
              sourceConsultationId: customer.consultationId,
            });
            setMessage(
              'Đã chọn khách cũ. Khi tạo hồ sơ mới, hệ thống sẽ liên kết tài khoản đã có quyền truy cập trong các hồ sơ bạn quản lí. Hồ sơ và quyền của tiệc cũ được giữ nguyên.',
            );
          }}
        />
        <Button
          variant={consultation ? 'default' : 'ghost'}
          className="h-auto min-h-11 self-start py-2 text-left whitespace-normal"
          onClick={() => switchTab('booking')}
        >
          Tiếp tục sang bước Khảo sát sảnh &amp; Đặt tiệc
          <ArrowRight aria-hidden />
        </Button>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-7">
        <ConsultationPanel
          activationVisible={active}
          disabled={disabled}
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
              const choices = parseConsultationChoices(input.note);
              setConsultation({ id: result.consultationId, revision: result.revision });
              window.history.replaceState(
                null,
                '',
                '/bookings?consultationId=' + result.consultationId,
              );
              setPrefill((prev: BookingPrefill) => ({
                ...prev,
                displayName: input.displayName,
                email: input.intendedEmail,
                note: input.note,
                preferredHallName: prev.preferredHallName || choices.hallName,
                preferredMenuName: prev.preferredMenuName || choices.menuName,
                preferredShift: prev.preferredShift || choices.shift,
              }));
              setMessage('Đã tạo hồ sơ tư vấn.');
              switchTab('booking');
            }
          }}
        />
      </div>
    </section>
  );
}
