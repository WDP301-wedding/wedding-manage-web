'use client';

import { Check, X } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/src/components/ui/badge';
import type { ProposalView } from '@/src/features/booking-lifecycle/api/booking-api';
import {
  settlementLabels,
  type SettlementStatus,
} from '@/src/features/payments-billing/utils/settlement-status';

export interface BookingLifecycleStepperProps {
  phase: ProposalView['phase'] | undefined;
  hasConsultation: boolean;
  agreementsApproved: boolean;
  settlement: SettlementStatus;
}

const STEPS = [
  { id: 'consultation', label: 'Tư vấn', desc: 'Tiếp nhận yêu cầu' },
  { id: 'draft', label: 'Đề xuất & Giữ sảnh', desc: 'Sảnh, ca & thực đơn' },
  { id: 'timeline', label: 'Kịch bản & Hợp đồng', desc: 'Cam kết 2 bên' },
  { id: 'deposit', label: 'Xác nhận & Cọc', desc: 'Cọc theo hợp đồng' },
  { id: 'event', label: 'Tổ chức tiệc', desc: 'Xác nhận tiệc đã tổ chức' },
  { id: 'settlement', label: 'Tất toán sau tiệc', desc: 'Chốt hóa đơn và công nợ' },
] as const;

const markClass = {
  done: 'bg-hy-success text-white',
  active: 'bg-primary text-primary-foreground',
  pending: 'border border-input text-muted-foreground',
  cancelled: 'bg-hy-error text-white',
} as const;
const labelClass = {
  done: 'font-semibold text-hy-success',
  active: 'font-semibold text-primary',
  pending: 'font-medium text-muted-foreground',
  cancelled: 'font-medium text-muted-foreground',
} as const;

export function BookingLifecycleStepper({
  phase,
  hasConsultation,
  agreementsApproved,
  settlement,
}: Readonly<BookingLifecycleStepperProps>) {
  const isCancelled = phase === 'CANCELLED';
  const eventFinished = phase === 'COMPLETED';
  const isSettled = eventFinished && settlement === 'settled';
  const settlementLabel = settlement === 'unknown' ? 'Đang tất toán' : settlementLabels[settlement];
  const activeStep = phase
    ? eventFinished
      ? 'settlement'
      : phase === 'CONFIRMED'
        ? 'event'
        : agreementsApproved
          ? 'deposit'
          : 'timeline'
    : hasConsultation
      ? 'draft'
      : 'consultation';
  const activeIndex = STEPS.findIndex((step) => step.id === activeStep);

  const getStepStatus = (index: number): 'done' | 'active' | 'pending' | 'cancelled' => {
    if (isCancelled) return index === 0 ? 'done' : 'cancelled';
    if (isSettled || index < activeIndex) return 'done';
    if (index === activeIndex) return 'active';
    return 'pending';
  };

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-hy-1"
      aria-label="Tiến trình vòng đời tiệc cưới"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Tiến trình vòng đời tiệc cưới</span>
        <Badge
          variant={
            isCancelled
              ? 'error'
              : phase === 'CONFIRMED' || isSettled
                ? 'success'
                : 'warning'
          }
        >
          {isCancelled
            ? 'Đã hủy tiệc'
            : phase === 'CONFIRMED'
              ? 'Đã xác nhận & Cọc'
              : eventFinished
                ? settlementLabel
                : agreementsApproved
                  ? 'Chờ cọc giữ chỗ'
                  : STEPS[activeIndex]?.label}
        </Badge>
      </div>

      <ol className="grid gap-3 md:grid-cols-6 md:gap-2">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(idx);
          const last = idx === STEPS.length - 1;
          return (
            <li
              key={step.id}
              aria-current={status === 'active' ? 'step' : undefined}
              className="flex items-center gap-3 md:flex-col md:items-stretch md:gap-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    markClass[status],
                  )}
                >
                  {status === 'done' ? (
                    <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
                  ) : status === 'cancelled' ? (
                    <X aria-hidden className="size-3.5" strokeWidth={2.5} />
                  ) : (
                    idx + 1
                  )}
                </span>
                {last ? null : (
                  <span
                    aria-hidden
                    className={cn(
                      'hidden h-0.5 flex-1 rounded-full md:block',
                      status === 'done' ? 'bg-hy-success' : 'bg-border',
                    )}
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className={cn('text-xs', labelClass[status])}>{step.label}</span>
                <span className="text-2xs text-muted-foreground">{step.desc}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
