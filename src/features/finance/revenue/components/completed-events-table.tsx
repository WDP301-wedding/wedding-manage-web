import Link from 'next/link';
import { cn } from 'cn';
import { Badge } from '@/src/components/ui/badge';
import type { CompletedEventsData } from '@/src/services/analytics/completed-events.service';
import { formatVndNullable } from '@/src/lib/formatting/formatters';
import {
  tableWrapClass,
  tableClass,
  theadClass,
  thClass,
  tdClass,
  rowClass,
} from '@/src/features/dashboard/styles/dashboard-classes';

const labels = {
  PAID: 'Đã thanh toán',
  DEBT: 'Còn nợ',
  PENDING_INVOICE: 'Chưa chốt hóa đơn',
  UNKNOWN: 'Chưa đủ dữ liệu',
};

export function CompletedEventsTable({
  items,
  onOpenBilling,
  embedded = false,
}: Readonly<{
  items: CompletedEventsData['items'];
  onOpenBilling?: ((bookingId: string) => void) | undefined;
  embedded?: boolean;
}>) {
  const handleBillingClick = (event: React.MouseEvent<HTMLAnchorElement>, bookingId: string) => {
    if (
      !onOpenBilling ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    onOpenBilling(bookingId);
  };

  const table = (
    <table className={tableClass} aria-label="Công nợ tiệc đã hoàn tất">
      <thead className={theadClass}>
        <tr>
          <th scope="col" className={cn(thClass, 'pl-5')}>
            Tiệc &amp; Khách hàng
          </th>
          <th scope="col" className={thClass}>
            Ngày tổ chức · Sảnh
          </th>
          <th scope="col" className={cn(thClass, 'text-right')}>
            Tổng phải trả
          </th>
          <th scope="col" className={cn(thClass, 'text-right')}>
            Đã thu ròng
          </th>
          <th scope="col" className={cn(thClass, 'text-right')}>
            Còn phải thu
          </th>
          <th scope="col" className={thClass}>
            Trạng thái
          </th>
          <th scope="col" className={cn(thClass, 'pr-5 text-right')}>
            Thao tác
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const hasDebt = item.outstandingVnd !== null && item.outstandingVnd > 0;
          return (
            <tr key={item.bookingId} className={rowClass}>
              <th scope="row" className={cn(tdClass, 'pl-5 text-left font-normal')}>
                <Link
                  className="font-semibold text-foreground hover:text-primary hover:underline"
                  href={`/billing?bookingId=${item.bookingId}`}
                  prefetch={false}
                  onClick={(event) => handleBillingClick(event, item.bookingId)}
                >
                  {item.customerName}
                </Link>
                <span className="mt-0.5 block text-2xs text-muted-foreground">
                  {item.bookingCode}
                  {item.invoiceState === 'PROVISIONAL' ? (
                    <span className="ml-1.5 text-hy-warning">· Tạm tính</span>
                  ) : null}
                </span>
              </th>
              <td className={tdClass}>
                <span className="block text-xs font-medium text-foreground tabular-nums">
                  {item.eventDate.split('-').reverse().join('/')}
                </span>
                <span className="mt-0.5 block text-2xs text-muted-foreground">{item.hallName}</span>
              </td>
              <td className={cn(tdClass, 'text-right font-medium tabular-nums')}>
                {formatVndNullable(item.totalVnd)}
              </td>
              <td className={cn(tdClass, 'text-right font-medium tabular-nums text-hy-success')}>
                {formatVndNullable(item.netPaidVnd)}
              </td>
              <td className={cn(tdClass, 'text-right tabular-nums')}>
                <span
                  className={
                    hasDebt ? 'font-semibold text-primary' : 'text-muted-foreground'
                  }
                >
                  {formatVndNullable(item.outstandingVnd)}
                </span>
                {item.creditVnd !== null && item.creditVnd > 0 && (
                  <small className="mt-0.5 block text-2xs text-muted-foreground">
                    Dư có: {formatVndNullable(item.creditVnd)}
                  </small>
                )}
              </td>
              <td className={tdClass}>
                <Badge
                  variant={
                    item.paymentStatus === 'PAID'
                      ? 'success'
                      : item.paymentStatus === 'DEBT'
                        ? 'error'
                        : 'neutral'
                  }
                >
                  {labels[item.paymentStatus]}
                </Badge>
              </td>
              <td className={cn(tdClass, 'pr-5 text-right')}>
                <Link
                  href={`/billing?bookingId=${item.bookingId}`}
                  prefetch={false}
                  onClick={(event) => handleBillingClick(event, item.bookingId)}
                  className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-3 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary/40 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {hasDebt ? 'Thu tiền →' : 'Chi tiết →'}
                </Link>
              </td>
            </tr>
          );
        })}
        {!items.length && (
          <tr>
            <td colSpan={7} className="px-6 py-12 text-center text-sm text-muted-foreground">
              Không có tiệc hoàn tất phù hợp bộ lọc trong kỳ báo cáo.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  if (embedded) {
    return <div className="overflow-x-auto">{table}</div>;
  }

  return <div className={tableWrapClass}>{table}</div>;
}
