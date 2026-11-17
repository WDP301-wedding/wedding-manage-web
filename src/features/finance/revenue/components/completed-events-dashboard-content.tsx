'use client';
import { RevenueTableSkeleton } from './revenue-skeletons';
import { cn } from 'cn';
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
import type { useRevenueDashboardState } from '@/src/features/finance/revenue/hooks/use-revenue-dashboard-state';
export function CompletedEventsDashboardContent({
  model,
}: Readonly<{
  model: ReturnType<typeof useRevenueDashboardState> & {
    displayData: NonNullable<ReturnType<typeof useRevenueDashboardState>['displayData']>;
  };
}>) {
  const {
    onOpenBilling,
    query,
    setQuery,
    subTab,
    setSubTab,
    hallSort,
    setHallSort,
    offeringCategory,
    setOfferingCategory,
    offeringSort,
    setOfferingSort,
    view,
    displayData,
  } = model;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-hy-1">
      {/* Unified Card Header: 3 Sub-tabs + Context-Aware Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 pt-3">
        <div
          role="tablist"
          aria-label="Góc nhìn báo cáo doanh thu"
          className="flex items-center gap-5 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(
            [
              {
                id: 'debts' as const,
                label: 'Công nợ từng tiệc',
                count:
                  query.paymentStatus === 'ALL'
                    ? displayData.summary.completedCount
                    : displayData.total,
              },
              {
                id: 'halls' as const,
                label: 'Hiệu quả từng sảnh',
                count: displayData.halls.length,
              },
              {
                id: 'offerings' as const,
                label: 'Gói menu & dịch vụ',
                count: displayData.offerings.length,
              },
            ] as const
          ).map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(tab.id)}
                className={cn(
                  'relative inline-flex items-center gap-2 pb-3.5 text-sm whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none',
                  active
                    ? 'font-semibold text-primary after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-t after:bg-primary'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Context-Aware Controls */}
        <div className="flex flex-wrap items-center gap-2 pb-3">
          {subTab === 'debts' ? (
            <HySelect
              fieldSize="sm"
              aria-label="Lọc công nợ tiệc hoàn tất"
              value={query.paymentStatus ?? 'ALL'}
              onChange={(e) => {
                const paymentStatus = completedEventsQuerySchema.shape.paymentStatus.parse(
                  e.target.value,
                );
                setQuery((prev) => ({ ...prev, paymentStatus, page: 1 }));
              }}
            >
              <option value="ALL">Tất cả thanh toán</option>
              <option value="DEBT">Còn nợ</option>
              <option value="PAID">Đã thanh toán</option>
            </HySelect>
          ) : null}

          {subTab === 'halls' ? (
            <HySelect
              fieldSize="sm"
              aria-label="Xếp hạng sảnh theo"
              value={hallSort}
              onChange={(e) => setHallSort(e.target.value as HallSortOption)}
            >
              <option value="revenue">Doanh thu cao nhất</option>
              <option value="usage">Số tiệc nhiều nhất</option>
            </HySelect>
          ) : null}

          {subTab === 'offerings' ? (
            <>
              <HySelect
                fieldSize="sm"
                aria-label="Loại gói thống kê"
                value={offeringCategory}
                onChange={(e) => setOfferingCategory(e.target.value as OfferingCategoryOption)}
              >
                <option value="ALL">Menu và dịch vụ</option>
                <option value="MENU">Menu</option>
                <option value="SERVICE">Dịch vụ</option>
              </HySelect>
              <HySelect
                fieldSize="sm"
                aria-label="Xếp hạng gói theo"
                value={offeringSort}
                onChange={(e) => setOfferingSort(e.target.value as OfferingSortOption)}
              >
                <option value="revenue">Giá trị cao nhất</option>
                <option value="usage">Được chọn nhiều nhất</option>
              </HySelect>
            </>
          ) : null}
        </div>
      </div>

      {/* Active Sub-Tab Body */}
      {view.loading ? (
        <RevenueTableSkeleton />
      ) : subTab === 'debts' ? (
        <CompletedEventsTable items={displayData.items} onOpenBilling={onOpenBilling} embedded />
      ) : subTab === 'halls' ? (
        <CompletedHallsTable data={displayData} hallSort={hallSort} />
      ) : (
        <CompletedOfferingsTable
          data={displayData}
          category={offeringCategory}
          offeringSort={offeringSort}
        />
      )}

      {/* Unified Card Footer */}
      <div className="border-t border-border bg-muted/40 px-5 py-3">
        {subTab === 'debts' ? (
          <TablePagination
            info={`${displayData.total} tiệc phù hợp`}
            pageSize={query.pageSize ?? 10}
            pageSizes={[10, 20, 50]}
            onPageSize={(pageSize) => setQuery((prev) => ({ ...prev, pageSize, page: 1 }))}
            page={displayData.page}
            totalPages={displayData.totalPages}
            onPage={(page) => setQuery((prev) => ({ ...prev, page }))}
            navLabel="Phân trang công nợ tiệc hoàn tất"
          />
        ) : subTab === 'halls' ? (
          <p className="text-xs text-muted-foreground">
            Tổng hợp hiệu quả trên <strong>{displayData.halls.length}</strong> sảnh tiệc trong kỳ
            báo cáo.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Giá trị ngoài menu/dịch vụ (in thiệp, phát sinh và điều chỉnh chung):{' '}
            <strong className="text-foreground">
              {formatVndNullable(displayData.summary.unallocatedRevenueVnd)}
            </strong>
            . Không phân bổ tiền cọc vào từng gói.
          </p>
        )}
      </div>
    </div>
  );
}
