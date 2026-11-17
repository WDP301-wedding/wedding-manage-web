'use client';
import { RevenueInitialSkeleton } from './revenue-skeletons';
import { CompletedEventsDashboardContent } from './completed-events-dashboard-content';

import { RefreshCw } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { HySelect } from '@/src/components/ui/select-field';
import { formatVndNullable } from '@/src/lib/formatting/formatters';
import { completedEventsQuerySchema } from '@/src/services/analytics/completed-events.schemas';
import {
  CompletedHallsTable,
  CompletedOfferingsTable,
  type HallSortOption,
  type OfferingCategoryOption,
  type OfferingSortOption,
} from './completed-rankings';
import { CompletedEventsTable } from './completed-events-table';
import { TablePagination } from '@/src/components/data-display/table-controls';
import { sectionClass } from '@/src/features/dashboard/styles/dashboard-classes';
import {
  useRevenueDashboardState,
  type CompletedEventsDashboardProps,
} from '@/src/features/finance/revenue/hooks/use-revenue-dashboard-state';

export function CompletedEventsDashboard(props: CompletedEventsDashboardProps) {
  const model = useRevenueDashboardState(props);
  const {
    preset,
    setPreset,
    dates,
    setDates,
    validationError,
    view,
    displayData,
    refresh,
    applyPreset,
    applyDates,
    isFilteringDebt,
    toggleDebtQuickFilter,
    collectionRate,
    hasOutstanding,
  } = model;
  return (
    <section
      className={cn(sectionClass, 'gap-5')}
      aria-labelledby="completed-events-title"
      aria-busy={view.loading}
    >
      <h2 id="completed-events-title" className="sr-only">
        Hiệu quả tiệc đã hoàn tất
      </h2>

      {/* Global Period Bar (1 compact horizontal enterprise strip) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-hy-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-semibold text-muted-foreground">Kỳ báo cáo:</span>
          <div className="inline-flex rounded-lg bg-secondary p-0.5 text-xs">
            {(
              [
                ['this-month', 'Tháng này'],
                ['last-month', 'Tháng trước'],
                ['quarter', 'Quý này'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={preset === key}
                onClick={() => applyPreset(key)}
                className={cn(
                  'rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer',
                  preset === key
                    ? 'bg-card font-semibold text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

          <form onSubmit={applyDates} className="flex flex-wrap items-center gap-2">
            <Input
              fieldSize="sm"
              name="dateFrom"
              aria-label="Từ ngày tiệc"
              type="date"
              required
              value={dates.dateFrom}
              onChange={(e) => {
                setPreset('custom');
                setDates((prev) => ({ ...prev, dateFrom: e.target.value }));
              }}
              className="w-auto"
            />
            <span className="text-xs text-muted-foreground" aria-hidden="true">
              →
            </span>
            <Input
              fieldSize="sm"
              name="dateTo"
              aria-label="Đến ngày tiệc"
              type="date"
              required
              value={dates.dateTo}
              onChange={(e) => {
                setPreset('custom');
                setDates((prev) => ({ ...prev, dateTo: e.target.value }));
              }}
              className="w-auto"
            />
            <Button type="submit" variant="outline" size="sm" disabled={view.loading}>
              Xem
            </Button>
          </form>
        </div>

        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => void view.refresh()}
          disabled={view.loading}
        >
          <RefreshCw
            aria-hidden="true"
            className={cn('size-3.5', view.loading && 'motion-safe:animate-spin')}
          />
          Làm mới
        </Button>
      </div>

      {validationError && (
        <p role="alert" className="text-sm font-medium text-hy-error">
          {validationError}
        </p>
      )}

      {view.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-hy-error-bg px-4 py-3 text-sm text-hy-error"
        >
          <span>Không thể tải báo cáo. {view.error}</span>
          <Button variant="outline" size="sm" onClick={() => void view.refresh()}>
            Thử lại
          </Button>
        </div>
      )}

      {!displayData && view.loading ? (
        <RevenueInitialSkeleton />
      ) : displayData ? (
        <>
          {displayData.meta.status === 'SOURCE_NOT_READY' && (
            <p
              role="status"
              className="rounded-xl border border-border bg-hy-warning-bg px-4 py-2.5 text-xs font-medium text-hy-warning"
            >
              Một số tiệc chưa đủ dữ liệu tài chính. Các khoản chưa xác định được hiển thị bằng dấu
              —.
            </p>
          )}

          {/* 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-hy-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Tiệc hoàn tất</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Trong kỳ
                </span>
              </div>
              <strong className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-foreground">
                {displayData.summary.completedCount}
              </strong>
              <span className="mt-1 text-xs text-muted-foreground">
                {displayData.summary.finalizedCount} đã chốt hóa đơn ·{' '}
                {displayData.summary.provisionalCount} chưa chốt
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-hy-1">
              <span className="text-xs font-medium text-muted-foreground">Doanh thu đã chốt</span>
              <strong className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-foreground [overflow-wrap:anywhere]">
                {formatVndNullable(displayData.summary.revenueVnd)}
              </strong>
              <span className="mt-1 text-xs text-muted-foreground">
                {displayData.summary.provisionalCount > 0
                  ? `Tạm tính chưa chốt: ${formatVndNullable(displayData.summary.provisionalTotalVnd)}`
                  : 'Giá trị hóa đơn đã chốt, gồm phụ lục'}
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-hy-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Đã thu ròng</span>
                {collectionRate !== null ? (
                  <span className="rounded-full bg-hy-success-bg px-2 py-0.5 text-[11px] font-semibold tabular-nums text-hy-success">
                    {collectionRate}%
                  </span>
                ) : null}
              </div>
              <strong className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-hy-success [overflow-wrap:anywhere]">
                {formatVndNullable(displayData.summary.netPaidVnd)}
              </strong>
              <span className="mt-1 text-xs text-muted-foreground">
                Thanh toán đã xác nhận trừ hoàn tiền
              </span>
            </div>

            {/* Interactive Outstanding KPI Card */}
            <button
              type="button"
              onClick={toggleDebtQuickFilter}
              aria-pressed={isFilteringDebt}
              className={cn(
                'flex min-w-0 flex-col justify-between rounded-xl border bg-card p-5 text-left shadow-hy-1 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                isFilteringDebt
                  ? 'border-primary bg-accent/40 ring-1 ring-primary'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Còn phải thu</span>
                {hasOutstanding ? (
                  <span className="rounded-full bg-hy-error-bg px-2 py-0.5 text-[11px] font-semibold text-hy-error">
                    Cần thu hồi
                  </span>
                ) : null}
              </div>
              <strong
                className={cn(
                  'mt-2 text-2xl font-bold tracking-tight tabular-nums [overflow-wrap:anywhere]',
                  hasOutstanding ? 'text-primary' : 'text-foreground',
                )}
              >
                {formatVndNullable(displayData.summary.outstandingVnd)}
              </strong>
              <span className="mt-1 text-xs font-medium text-primary/80">
                {isFilteringDebt
                  ? 'Đang lọc tiệc còn nợ · Bấm để xem tất cả'
                  : 'Bấm để lọc nhanh tiệc còn nợ →'}
              </span>
            </button>
          </div>

          {/* Unified Multi-View Workspace Card */}
          <CompletedEventsDashboardContent model={{ ...model, displayData }} />
        </>
      ) : null}
    </section>
  );
}
