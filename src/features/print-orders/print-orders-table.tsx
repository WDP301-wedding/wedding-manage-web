import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { toneBadge } from './print-order-classes';
import {
  deriveCommercialStatus,
  deriveProductionStatus,
  formatVietnameseDateTime,
  type PrintOrderView,
} from './print-orders-types';

export interface PrintOrdersTableProps {
  orders: readonly PrintOrderView[];
  filteredOrders: readonly PrintOrderView[];
  selectedOrder: PrintOrderView | null;
  onSelectOrder: (order: PrintOrderView) => void;
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

const thClass =
  'px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-muted-foreground';
const tdClass = 'px-4 py-3 align-top';

function Summary({
  value,
  label,
  tone,
}: Readonly<{ value: number; label: string; tone?: 'warning' | 'error' }>) {
  return (
    <div className="flex min-w-0 flex-[1_1_10rem] flex-col gap-0.5 bg-card px-5 py-4">
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
  selected,
  onSelect,
}: Readonly<{ order: PrintOrderView; selected: boolean; onSelect: () => void }>) {
  const commercial = deriveCommercialStatus(order);
  const production = deriveProductionStatus(order);
  const totalCopies = order.lines.reduce((s, l) => s + l.quantity, 0);
  return (
    <tr
      onClick={onSelect}
      className={cn(
        'cursor-pointer border-t border-border transition-colors hover:bg-muted/60',
        selected && 'bg-accent/60 hover:bg-accent/60',
      )}
    >
      <td className={tdClass}>
        <button
          type="button"
          aria-pressed={selected}
          aria-label={`Chọn đơn in ${order.orderId}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="flex flex-col items-start rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <strong className="font-semibold whitespace-nowrap">{order.orderId}</strong>
          <small className="text-xs text-muted-foreground">Phiên bản {order.revision}</small>
        </button>
      </td>
      <td className={tdClass}>
        <strong className="font-semibold">{order.displayCouple ?? 'Chưa gán thông tin'}</strong>
        <small className="block text-xs text-muted-foreground">
          {order.displayEventDate ?? 'Chưa có thông tin ngày tiệc'}
        </small>
      </td>
      <td className={tdClass}>{order.displayHall ?? 'Chưa gán thông tin'}</td>
      <td className={cn(tdClass, 'text-right tabular-nums')}>
        <strong className="font-semibold">{totalCopies} bản</strong>
        <small className="block text-xs text-muted-foreground">
          {order.lines.length} dòng thiết kế
        </small>
      </td>
      <td className={tdClass}>
        <Badge variant={toneBadge[commercial.tone]} className="h-auto whitespace-normal">
          {commercial.label}
        </Badge>
      </td>
      <td className={tdClass}>
        <Badge variant={toneBadge[production.tone]} className="h-auto whitespace-normal">
          {production.label}
        </Badge>
      </td>
      <td className={cn(tdClass, 'text-xs whitespace-nowrap text-muted-foreground tabular-nums')}>
        <time dateTime={order.updatedAt}>{formatVietnameseDateTime(order.updatedAt)}</time>
      </td>
    </tr>
  );
}

const filters = ['Tất cả', 'Chờ sản xuất', 'Đang sản xuất', 'Sẵn sàng'] as const;

export function PrintOrdersTable(props: PrintOrdersTableProps) {
  const { orders, filteredOrders, selectedOrder, loading, query, statusFilter } = props;
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
          className="flex max-w-full gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--hy-outline)]"
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

      <div
        className="overflow-x-auto rounded-xl border border-border bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        tabIndex={0}
        role="region"
        aria-label="Danh sách đơn in"
      >
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <caption className="sr-only">Danh sách các đơn in ấn thiệp cưới</caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className={thClass}>
                Mã đơn in
              </th>
              <th scope="col" className={thClass}>
                Cặp đôi &amp; Ngày tiệc
              </th>
              <th scope="col" className={thClass}>
                Sảnh tiệc
              </th>
              <th scope="col" className={cn(thClass, 'text-right')}>
                Số lượng bản in
              </th>
              <th scope="col" className={thClass}>
                Thương mại
              </th>
              <th scope="col" className={thClass}>
                Sản xuất
              </th>
              <th scope="col" className={thClass}>
                Cập nhật
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Đang tải danh sách đơn in từ máy chủ…
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
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
                  selected={selectedOrder?.orderId === order.orderId}
                  onSelect={() => props.onSelectOrder(order)}
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
