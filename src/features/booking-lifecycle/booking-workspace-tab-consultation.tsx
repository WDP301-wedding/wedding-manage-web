'use client';

import { ExistingCustomerPicker } from './existing-customer-picker';
import { ConsultationPanel } from './consultation-panel';
import { bookingStyles } from './booking.styles';
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
      aria-label="Hồ sơ tư vấn cặp đôi"
      style={
        active
          ? bookingStyles.stepContainerVisible('820px')
          : bookingStyles.stepContainerHidden
      }
    >
      <ExistingCustomerPicker
        authorize={authorize}
        gateway={gateway}
        disabled={disabled}
        onChoose={(customer) => {
          resetConsultation();
          setPrefill({ displayName: customer.displayName, email: customer.email });
          setMessage(
            'Đã chọn khách cũ. Kiểm tra thông tin và tạo hồ sơ tư vấn mới cho tiệc mới; hồ sơ cũ được giữ nguyên.',
          );
        }}
      />
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
  );
}
