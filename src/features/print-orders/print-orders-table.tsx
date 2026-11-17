import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { toneBadge } from './print-order-classes';
import {
  deriveCommercialStatus,
  deriveProductionStatus,
  printOrderDisplay,
  type PrintOrderView,
} from './print-orders-types';

export interface PrintOrdersTableProps {
  orders: readonly PrintOrderView[];
  filteredOrders: readonly PrintOrderView[];
  onOpenDetails: (order: PrintOrderView) => void;
  loading: boolean;
  loadError: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: string;
  onFilterChange: (status: string) => void;
  onManualRefresh: () => void;
  countAll: number;
  countApproved: number;
  countInProduction: number;
  countReady: number;
  countBlockedProposal: number;
  countExpired: number;
  cursorHistory: string[];
  nextCursor: string | null;
  onPrevPage: () => void;
  onNextPage: () => void;
  isSubmitting: boolean;
}

const thClass = 'px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground';
const tdClass =
  'min-w-0 [overflow-wrap:anywhere] lg:border-t lg:border-border lg:px-4 lg:py-3 lg:align-middle';

function Summary({
  value,
  label,
  tone,
}: Readonly<{ value: number; label: string; tone?: 'warning' | 'error' }>) {
  return (
    <div className="flex min-w-0 flex-[1_1_8rem] flex-col gap-0.5 bg-card px-4 py-3 sm:flex-[1_1_10rem] sm:px-5 sm:py-4">
      <dd
        className={cn(
          'text-xl font-bold tabular-nums',
          tone === 'warning' && 'text-hy-warning',
          tone === 'error' && 'text-hy-error',
        )}
      >
        {value}
      </dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

function OrderRow({
  order,
  onOpenDetails,
  disabled,
}: Readonly<{ order: PrintOrderView; onOpenDetails: () => void; disabled: boolean }>) {
  const status =
    order.status === 'REQUESTED' || order.status === 'QUOTED' || order.status === 'CANCELLED'
      ? deriveCommercialStatus(order)
      : deriveProductionStatus(order);
  const display = printOrderDisplay(order);
  const totalCopies = order.lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <tr
      role="row"
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 hover:bg-muted/30 focus-within:bg-muted/40 lg:table-row lg:border-0"
    >
      <td role="cell" className={cn(tdClass, 'col-span-2')}>
        <strong className="font-semibold">{order.orderId}</strong>
        <small className="block text-xs text-muted-foreground">Phiên bản {order.revision}</small>
      </td>
      <td role="cell" className={cn(tdClass, 'col-span-2')}>
        <strong className="font-semibold">{display.couple}</strong>
        <small className="block text-xs text-muted-foreground">
          {display.eventDate} · {display.hall}
        </small>
      </td>
      <td role="cell" className={cn(tdClass, 'tabular-nums lg:text-right')}>
        <strong className="font-semibold">{totalCopies.toLocaleString('vi-VN')} bản</strong>
      </td>
      <td role="cell" className={tdClass}>
        <Badge variant={toneBadge[status.tone]} className="h-auto whitespace-normal">
          {status.label}
        </Badge>
      </td>
      <td role="cell" className={cn(tdClass, 'col-span-2 text-right')}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 lg:h-9"
          aria-haspopup="dialog"
          aria-label={`Chi tiết đơn in ${order.orderId}`}
          disabled={disabled}
          onClick={onOpenDetails}
        >
          Chi tiết
          <ChevronRight aria-hidden className="size-3.5" />
        </Button>
      </td>
    </tr>
  );
}

const filters = ['Tất cả', 'Chờ sản xuất', 'Đang sản xuất', 'Sẵn sàng'] as const;

export function PrintOrdersTable(props: PrintOrdersTableProps) {
  const { orders, filteredOrders, loading, query, statusFilter } = props;
  const counts: Record<(typeof filters)[number], number> = {
    'Tất cả': props.countAll,
    'Chờ sản xuất': props.countApproved,
    'Đang sản xuất': props.countInProduction,
    'Sẵn sàng': props.countReady,
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <dl
        aria-label="Tóm tắt trạng thái hàng đợi"
        className="flex flex-wrap gap-px overflow-hidden rounded-xl border border-border bg-border shadow-hy-1"
      >
        <Summary value={props.countAll} label="Tổng đơn đang theo dõi" />
        <Summary value={props.countApproved} label="Chờ bắt đầu sản xuất" tone="warning" />
        {props.countBlockedProposal > 0 ? (
          <Summary
            value={props.countBlockedProposal}
            label="Đang chờ duyệt đề xuất (Chặn sản xuất)"
            tone="warning"
          />
        ) : null}
        <Summary value={props.countInProduction} label="Đang sản xuất" />
        <Summary value={props.countReady} label="Sẵn sàng bàn giao" />
        {props.countExpired > 0 ? (
          <Summary value={props.countExpired} label="Báo giá hết hạn 7 ngày" tone="error" />
        ) : null}
      </dl>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div
          aria-label="Lọc trạng thái đơn"
          role="group"
          className="flex flex-wrap gap-1 shadow-[inset_0_-1px_0_var(--hy-outline)]"
        >
          {filters.map((filter) => {
            const active = statusFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={active}
                onClick={() => props.onFilterChange(filter)}
                className={cn(
                  'inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  active
                    ? 'border-primary font-semibold text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {filter}
                <span className="rounded-full bg-secondary px-2 text-2xs font-semibold text-foreground tabular-nums">
                  {counts[filter]}
                </span>
              </button>
            );
          })}
        </div>
        <label className="flex h-11 min-w-0 flex-[0_1_320px] items-center gap-2 rounded-lg border border-input bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
          <Search aria-hidden className="size-4 shrink-0" />
          <input
            type="search"
            placeholder="Tìm mã đơn, tên cặp đôi, sảnh tiệc…"
            value={query}
            onChange={(e) => props.onQueryChange(e.target.value)}
            aria-label="Tìm kiếm đơn in"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
          />
        </label>
      </div>

      {query ? (
        <p className="text-xs text-muted-foreground">
          Hiển thị {filteredOrders.length} / {orders.length} đơn trên trang hiện tại khớp từ khóa
          &quot;{query}&quot;.
        </p>
      ) : null}

      {props.loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-hy-error-bg px-5 py-4 text-hy-error">
          <div className="flex flex-col gap-0.5">
            <strong className="font-semibold">Lỗi kết nối máy chủ</strong>
            <p className="text-xs">{props.loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={props.onManualRefresh}>
            Thử lại
          </Button>
        </div>
      ) : null}

      <div className="min-w-0 rounded-xl border border-border bg-card">
        <table
          role="table"
          className="block w-full border-separate border-spacing-0 text-sm lg:table"
        >
          <caption className="sr-only">Danh sách các đơn in ấn thiệp cưới</caption>
          <thead role="rowgroup" className="sr-only bg-muted lg:not-sr-only">
            <tr role="row">
              <th role="columnheader" scope="col" className={cn(thClass, 'rounded-tl-xl')}>
                Mã đơn in
              </th>
              <th role="columnheader" scope="col" className={thClass}>
                Cặp đôi và tiệc
              </th>
              <th role="columnheader" scope="col" className={cn(thClass, 'text-right')}>
                Số lượng
              </th>
              <th role="columnheader" scope="col" className={thClass}>
                Trạng thái
              </th>
              <th
                role="columnheader"
                scope="col"
                className={cn(thClass, 'rounded-tr-xl text-right')}
              >
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup" className="block lg:table-row-group">
            {loading && orders.length === 0 ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr
                  key={i}
                  role="row"
                  className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 lg:table-row lg:border-0"
                >
                  <td role="cell" className={cn(tdClass, 'col-span-2')}>
                    <Skeleton className="h-4 w-28 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </td>
                  <td role="cell" className={cn(tdClass, 'col-span-2')}>
                    <Skeleton className="h-4 w-36 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </td>
                  <td role="cell" className={cn(tdClass, 'lg:text-right')}>
                    <Skeleton className="h-4 w-16 lg:ml-auto" />
                  </td>
                  <td role="cell" className={tdClass}>
                    <Skeleton className="h-6 w-24 rounded-md" />
                  </td>
                  <td role="cell" className={cn(tdClass, 'col-span-2 text-right')}>
                    <Skeleton className="h-8 w-24 rounded-lg ml-auto" />
                  </td>
                </tr>
              ))
            ) : filteredOrders.length === 0 ? (
              <tr role="row" className="block lg:table-row">
                <td
                  role="cell"
                  colSpan={5}
                  className="block px-4 py-10 text-center text-muted-foreground lg:table-cell"
                >
                  {query
                    ? 'Không tìm thấy đơn in nào phù hợp từ khóa.'
                    : 'Không có đơn in nào trong trạng thái đã chọn.'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <OrderRow
                  key={order.orderId}
                  order={order}
                  disabled={props.isSubmitting}
                  onOpenDetails={() => props.onOpenDetails(order)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Trang hiện tại: {orders.length} đơn in
          {props.cursorHistory.length > 0
            ? ` (Trang ${props.cursorHistory.length + 1})`
            : ' (Trang đầu)'}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={props.onPrevPage}
            disabled={props.cursorHistory.length === 0 || loading || props.isSubmitting}
          >
            <ChevronLeft aria-hidden className="size-4" />
            Trang trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={props.onNextPage}
            disabled={!props.nextCursor || loading || props.isSubmitting}
          >
            Trang sau
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
