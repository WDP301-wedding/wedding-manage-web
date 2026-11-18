'use client';

import type { ReactNode } from 'react';
import type { useContractPanel } from '@/src/features/booking-lifecycle/hooks/use-contract-panel';
import { BookingUnauthorizedHint } from './booking-unauthorized-hint';
import { ProposalPanel } from '@/src/features/booking-lifecycle/components/proposals/proposal-panel';
import { stepHiddenClass } from '@/src/features/booking-lifecycle/styles/booking-classes';
import { cn } from 'cn';
import { Button } from '@/src/components/ui/button';
import type { Authorize, ManagementBookingGateway, ProposalView } from '@/src/features/booking-lifecycle/api/booking-api';
import type { InviteLogEntry, BookingPrefill } from '@/src/features/booking-lifecycle/utils/booking-helpers';

export interface BookingWorkspaceTabManageProps {
  active: boolean;
  disabled: boolean;
  bookingId: string;
  error: string | null;
  proposal: ProposalView | null;
  contractState: ReturnType<typeof useContractPanel>;
  lifecycleProgress: ReactNode;
  consultation: { id: string; revision: number } | null;
  prefill: BookingPrefill;
  inviteLogs: readonly InviteLogEntry[];
  switchTab: (tab: 'consultation' | 'booking' | 'manage') => void;
  sendWorkspaceInvite: () => Promise<void>;
  setInviteLogs: React.Dispatch<React.SetStateAction<readonly InviteLogEntry[]>>;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
  authorize: Authorize;
  gateway: ManagementBookingGateway;
  refresh: (msg?: string) => Promise<void>;
}

export function BookingWorkspaceTabManage({
  active,
  disabled,
  bookingId,
  error,
  proposal,
  contractState,
  lifecycleProgress,
  consultation,
  prefill,
  inviteLogs,
  switchTab,
  sendWorkspaceInvite,
  setInviteLogs,
  run,
  authorize,
  gateway,
  refresh,
}: Readonly<BookingWorkspaceTabManageProps>) {
  return (
    <section
      aria-labelledby="proposal-heading"
      className={cn('flex flex-col gap-5', !active && stepHiddenClass)}
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-xs text-muted-foreground">Hồ sơ đang xử lý</p>
        <h2 id="proposal-heading" className="text-xl font-semibold">
          Đề xuất &amp; vòng đời
        </h2>
      </div>

      {proposal === null ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <strong className="text-lg font-semibold">Chưa chọn hồ sơ</strong>
          <p className="max-w-[520px] text-muted-foreground">
            Nhập mã booking ở thanh tra cứu phía trên hoặc chọn nhanh từ danh mục{' '}
            <strong className="text-foreground">&quot;Tiệc đã mở gần đây&quot;</strong> để xem đề
            xuất, kịch bản và hợp đồng.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => switchTab('consultation')}>
              1. Tạo hồ sơ tư vấn mới
            </Button>
            <Button type="button" variant="outline" onClick={() => switchTab('booking')}>
              2. Khảo sát sảnh &amp; Đặt tiệc
            </Button>
          </div>
          {error && bookingId ? <BookingUnauthorizedHint bookingId={bookingId} /> : null}
        </div>
      ) : (
        <>
          {active ? lifecycleProgress : null}
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
