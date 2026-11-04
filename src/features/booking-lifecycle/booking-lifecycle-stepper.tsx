'use client';

import { Check, X } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '../../components/ui/badge';

export interface BookingLifecycleStepperProps {
  phase: string;
  agreementsApproved: boolean;
}

const STEPS = [
  { id: 'consultation', label: 'Tư vấn', desc: 'Tiếp nhận yêu cầu' },
  { id: 'draft', label: 'Đề xuất & Giữ sảnh', desc: 'Sảnh, ca & thực đơn' },
  { id: 'timeline', label: 'Kịch bản & Hợp đồng', desc: 'Cam kết 2 bên' },
  { id: 'deposit', label: 'Xác nhận & Cọc', desc: 'Đặt cọc 30%' },
  { id: 'completed', label: 'Hoàn thành', desc: 'Kết thúc tổ chức tiệc' },
];

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
  agreementsApproved,
}: Readonly<BookingLifecycleStepperProps>) {
  const isCancelled = phase === 'CANCELLED';

  const getStepStatus = (index: number): 'done' | 'active' | 'pending' | 'cancelled' => {
    if (isCancelled) {
      if (index === 0) return 'done';
      return 'cancelled';
    }
    if (phase === 'COMPLETED') return 'done';
    if (phase === 'CONFIRMED') {
      if (index <= 3) return 'done';
      if (index === 4) return 'active';
      return 'pending';
    }
    // This indicator is mounted only after a booking proposal exists.
    if (index <= 1) return 'done';
    if (agreementsApproved) {
      if (index <= 2) return 'done';
      if (index === 3) return 'active';
      return 'pending';
    }
    if (index === 2) return 'active';
    return 'pending';
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-hy-1"
      aria-label="Tiến trình vòng đời tiệc cưới"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">Tiến trình vòng đời tiệc cưới</span>
        <Badge
          variant={
            isCancelled
              ? 'error'
              : phase === 'CONFIRMED' || phase === 'COMPLETED'
                ? 'success'
                : 'warning'
          }
        >
          {isCancelled
            ? 'Đã hủy tiệc'
            : phase === 'CONFIRMED'
              ? 'Đã xác nhận & Cọc'
              : phase === 'COMPLETED'
                ? 'Hoàn thành tiệc'
                : agreementsApproved
                  ? 'Chờ cọc giữ chỗ'
                  : 'Kịch bản & Hợp đồng'}
        </Badge>
      </div>

      <ol className="grid gap-3 sm:grid-cols-5 sm:gap-2">
        {STEPS.map((step, idx) => {
          const status = getStepStatus(idx);
          const last = idx === STEPS.length - 1;
          return (
            <li
              key={step.id}
              aria-current={status === 'active' ? 'step' : undefined}
              className="flex items-center gap-3 sm:flex-col sm:items-stretch sm:gap-2"
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
                      'hidden h-0.5 flex-1 rounded-full sm:block',
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
    </div>
  );
}
