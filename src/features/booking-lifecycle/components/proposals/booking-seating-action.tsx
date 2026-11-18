'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { SeatingPlanView } from '@/src/components/data-display/seating-plan-view';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import type { Authorize } from '@/src/features/booking-lifecycle/api/booking-api';
import {
  type BookingSeatingPlan,
  readBookingSeatingPlan,
} from '@/src/services/bookings/seating.service';

const statusLabels: Record<BookingSeatingPlan['status'], string> = {
  DRAFT: 'Bản nháp',
  CONFIRMED: 'Đã xác nhận',
  REQUIRES_REVIEW: 'Cần rà soát',
};

const warningLabels: Record<string, string> = {
  LAYOUT_RETIRED: 'Mẫu sơ đồ đã ngừng sử dụng.',
  PLANNING_HEADCOUNT_CHANGED: 'Số khách dự kiến đã thay đổi kể từ khi xác nhận sơ đồ.',
  HEADCOUNT_OUTSIDE_LAYOUT_RANGE: 'Số khách dự kiến nằm ngoài sức chứa của mẫu.',
  EXCEPTION_EXCEEDS_PHYSICAL_CAPACITY:
    'Số khách dự kiến vượt sức chứa thực tế của sơ đồ hoặc sảnh.',
};

type SeatingResult = { plan: BookingSeatingPlan | null } | { error: true };

export function BookingSeatingAction({
  authorize,
  bookingId,
  canRead,
  hallName,
}: Readonly<{
  authorize: Authorize;
  bookingId: string;
  canRead: boolean;
  hallName: string;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const hintId = useId();
  const [result, setResult] = useState<SeatingResult | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canRead) return;
    const controller = new AbortController();
    void authorize((token) => readBookingSeatingPlan(token, bookingId, controller.signal))
      .then((plan) => {
        if (!controller.signal.aborted) setResult({ plan });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ error: true });
      });
    return () => controller.abort();
  }, [authorize, bookingId, canRead, attempt]);

  const plan = result && 'plan' in result ? result.plan : null;
  const hasError = result !== null && 'error' in result;
  const hint =
    !canRead || (result !== null && !hasError)
      ? 'Chưa có sơ đồ bàn'
      : hasError
        ? 'Không tải được sơ đồ bàn.'
        : 'Đang tải sơ đồ bàn…';

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!plan}
        aria-describedby={plan ? undefined : hintId}
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <LayoutGrid aria-hidden />
        Xem sơ đồ bàn
      </Button>
      {!plan && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <p id={hintId} role="status">
            {hint}
          </p>
          {hasError && (
            <Button
              type="button"
              variant="link"
              size="xs"
              onClick={() => {
                setResult(null);
                setAttempt((value) => value + 1);
              }}
            >
              Thử lại
            </Button>
          )}
        </div>
      )}
      {plan && (
        <dialog
          ref={dialog}
          aria-labelledby={titleId}
          className="m-auto max-h-[90dvh] w-[min(68rem,calc(100%-1.5rem))] max-w-none overflow-y-auto rounded-xl border border-border bg-card p-0 text-foreground shadow-hy-2 backdrop:bg-hy-ink/40"
        >
          <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card p-4 sm:p-6">
            <div className="min-w-0">
              <h3 id={titleId} className="text-lg font-semibold">
                Sơ đồ bàn
              </h3>
              <p className="text-sm break-words text-muted-foreground">
                {hallName} · {plan.layoutName}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => dialog.current?.close()}
            >
              Đóng
            </Button>
          </header>
          <div className="grid gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={plan.status === 'CONFIRMED' ? 'success' : 'warning'}>
                {statusLabels[plan.status]}
              </Badge>
              <span className="text-xs text-muted-foreground">Phiên bản {plan.revisionNumber}</span>
            </div>
            <dl className="grid gap-2 sm:grid-cols-3">
              {[
                ['Bàn trên sơ đồ', `${plan.renderSnapshot.length} bàn`],
                ['Số khách dự kiến', `${plan.currentPlanningHeadcount} khách`],
                ['Sức chứa sơ đồ', `${plan.totalSeatCapacity} ghế`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-muted px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            {plan.warnings.length > 0 && (
              <ul className="rounded-lg bg-hy-warning-bg px-3 py-2 text-sm">
                {plan.warnings.map((warning) => (
                  <li key={warning}>{warningLabels[warning] ?? 'Sơ đồ cần được kiểm tra lại.'}</li>
                ))}
              </ul>
            )}
            <SeatingPlanView tables={plan.renderSnapshot} />
          </div>
        </dialog>
      )}
    </div>
  );
}
