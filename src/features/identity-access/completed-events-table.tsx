import Link from 'next/link';
import { Badge } from '../../components/ui/badge';
import type { CompletedEventsData } from '../../services/completed-events.service';
import { formatVndNullable } from '../../lib/formatters';
import {
  tableWrapClass,
  tableClass,
  theadClass,
  thClass,
  tdClass,
  rowClass,
} from './dashboard-classes';

const labels = {
  PAID: 'Đã thanh toán',
  DEBT: 'Còn nợ',
  PENDING_INVOICE: 'Chưa chốt hóa đơn',
  UNKNOWN: 'Chưa đủ dữ liệu',
};
export function CompletedEventsTable({ items }: Readonly<{ items: CompletedEventsData['items'] }>) {
  return (
    <div className={tableWrapClass}>
      <table className={tableClass} aria-label="Công nợ tiệc đã hoàn tất">
        <thead className={theadClass}>
          <tr>
            {[
              'Tiệc',
              'Ngày tổ chức',
              'Sảnh',
              'Tổng phải trả',
              'Đã thu ròng',
              'Còn phải thu',
              'Trạng thái',
            ].map((label) => (
              <th key={label} scope="col" className={thClass}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.bookingId} className={rowClass}>
              <th scope="row" className={tdClass}>
                <Link
                  className="font-semibold text-primary hover:underline"
                  href={`/billing?bookingId=${item.bookingId}`}
                  prefetch={false}
                >
                  {item.bookingCode}
                </Link>
                <span className="block font-normal">{item.customerName}</span>
              </th>
              <td className={tdClass}>{item.eventDate.split('-').reverse().join('/')}</td>
              <td className={tdClass}>{item.hallName}</td>
              <td className={tdClass}>
                {formatVndNullable(item.totalVnd)}
                {item.invoiceState === 'PROVISIONAL' && (
                  <small className="block text-muted-foreground">
                    Tạm tính — chưa chốt hóa đơn
                  </small>
                )}
              </td>
              <td className={tdClass}>{formatVndNullable(item.netPaidVnd)}</td>
              <td className={tdClass}>
                <span className={item.outstandingVnd ? 'font-semibold text-hy-error' : ''}>
                  {formatVndNullable(item.outstandingVnd)}
                </span>
                {item.creditVnd !== null && item.creditVnd > 0 && (
                  <small className="block text-muted-foreground">
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
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {labels[item.paymentStatus]}
                </Badge>
              </td>
            </tr>
          ))}
          {!items.length && (
            <tr>
              <td colSpan={7} className={tdClass}>
                Không có tiệc hoàn tất phù hợp bộ lọc.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
