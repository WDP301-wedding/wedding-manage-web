'use client';

import { cn } from 'cn';
import { Badge } from '@/src/components/ui/badge';
import type { CompletedEventsData } from '@/src/services/analytics/completed-events.service';
import { formatUnitLabel, formatVndNullable } from '@/src/lib/formatting/formatters';
import { tableClass, theadClass, thClass, tdClass, rowClass } from '@/src/features/dashboard/styles/dashboard-classes';

export type HallSortOption = 'revenue' | 'usage';
export type OfferingCategoryOption = 'ALL' | 'MENU' | 'SERVICE';
export type OfferingSortOption = 'revenue' | 'usage';

export function CompletedHallsTable({
  data,
  hallSort,
}: Readonly<{
  data: CompletedEventsData;
  hallSort: HallSortOption;
}>) {
  const halls = [...data.halls].sort((a, b) =>
    hallSort === 'revenue'
      ? b.revenueVnd - a.revenueVnd ||
        b.bookingCount - a.bookingCount ||
        a.hallId.localeCompare(b.hallId)
      : b.bookingCount - a.bookingCount ||
        b.revenueVnd - a.revenueVnd ||
        a.hallId.localeCompare(b.hallId),
  );
  const maxUsage = Math.max(0, ...halls.map((h) => h.bookingCount));
  const maxRevenue = Math.max(0, ...halls.map((h) => h.revenueVnd));

  return (
    <div className="overflow-x-auto">
      <table className={tableClass} aria-label="Hiệu quả từng sảnh">
        <thead className={theadClass}>
          <tr>
            <th scope="col" className={cn(thClass, 'pl-5')}>
              Sảnh tiệc
            </th>
            <th scope="col" className={cn(thClass, 'text-right')}>
              Tiệc hoàn tất
            </th>
            <th scope="col" className={cn(thClass, 'w-56')}>
              Tỷ trọng sử dụng
            </th>
            <th scope="col" className={cn(thClass, 'text-right')}>
              Doanh thu đã chốt
            </th>
            <th scope="col" className={cn(thClass, 'text-right')}>
              Đã thu ròng
            </th>
            <th scope="col" className={cn(thClass, 'pr-5 text-right')}>
              Còn phải thu
            </th>
          </tr>
        </thead>
        <tbody>
          {halls.map((h) => {
            const shareRatio =
              data.summary.completedCount > 0
                ? h.bookingCount / data.summary.completedCount
                : 0;
            const sharePercent = Math.min(100, Math.max(0, shareRatio * 100));
            const shareLabel = new Intl.NumberFormat('vi-VN', {
              style: 'percent',
              maximumFractionDigits: 1,
            }).format(shareRatio);
            const hasDebt = h.outstandingVnd !== null && h.outstandingVnd > 0;

            return (
              <tr key={h.hallId} className={rowClass}>
                <th scope="row" className={cn(tdClass, 'pl-5 text-left font-normal')}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{h.hallName}</span>
                    {maxRevenue > 0 && h.revenueVnd === maxRevenue ? (
                      <Badge variant="brand">Top doanh thu</Badge>
                    ) : null}
                    {maxUsage > 0 && h.bookingCount === maxUsage ? (
                      <Badge variant="info">Đặt nhiều nhất</Badge>
                    ) : null}
                  </div>
                </th>
                <td className={cn(tdClass, 'text-right font-semibold tabular-nums')}>
                  {h.bookingCount}
                </td>
                <td className={tdClass}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-2 flex-1 overflow-hidden rounded-full bg-secondary"
                      aria-hidden="true"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-300"
                        style={{ width: `${sharePercent}%` }}
                      />
                    </div>
                    <span className="w-11 text-right text-xs font-semibold text-muted-foreground tabular-nums">
                      {shareLabel}
                    </span>
                  </div>
                </td>
                <td className={cn(tdClass, 'text-right tabular-nums')}>
                  <span className="block font-semibold text-foreground">
                    {formatVndNullable(h.revenueVnd)}
                  </span>
                  <small className="mt-0.5 block text-2xs text-muted-foreground">
                    {h.finalizedCount} hóa đơn đã chốt
                  </small>
                </td>
                <td className={cn(tdClass, 'text-right font-medium text-hy-success tabular-nums')}>
                  {formatVndNullable(h.netPaidVnd)}
                </td>
                <td className={cn(tdClass, 'pr-5 text-right tabular-nums')}>
                  <span
                    className={
                      hasDebt ? 'font-semibold text-primary' : 'text-muted-foreground'
                    }
                  >
                    {formatVndNullable(h.outstandingVnd)}
                  </span>
                </td>
              </tr>
            );
          })}
          {!halls.length && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                Chưa có dữ liệu sảnh trong kỳ báo cáo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CompletedOfferingsTable({
  data,
  category,
  offeringSort,
}: Readonly<{
  data: CompletedEventsData;
  category: OfferingCategoryOption;
  offeringSort: OfferingSortOption;
}>) {
  const offerings = data.offerings
    .filter((o) => category === 'ALL' || o.category === category)
    .sort((a, b) =>
      offeringSort === 'revenue'
        ? b.revenueVnd - a.revenueVnd || b.bookingCount - a.bookingCount
        : b.bookingCount - a.bookingCount || b.revenueVnd - a.revenueVnd,
    );

  return (
    <div className="overflow-x-auto">
      <table className={tableClass} aria-label="Gói menu và dịch vụ">
        <thead className={theadClass}>
          <tr>
            <th scope="col" className={cn(thClass, 'pl-5')}>
              Tên gói
            </th>
            <th scope="col" className={thClass}>
              Phân loại
            </th>
            <th scope="col" className={cn(thClass, 'text-right')}>
              Số tiệc chọn
            </th>
            <th scope="col" className={cn(thClass, 'text-right')}>
              Tổng số lượng
            </th>
            <th scope="col" className={cn(thClass, 'text-right')}>
              Hóa đơn đã chốt
            </th>
            <th scope="col" className={cn(thClass, 'pr-5 text-right')}>
              Giá trị đã chốt
            </th>
          </tr>
        </thead>
        <tbody>
          {offerings.map((o) => (
            <tr key={o.category + o.sourceId} className={rowClass}>
              <th scope="row" className={cn(tdClass, 'pl-5 text-left font-semibold')}>
                {o.name}
              </th>
              <td className={tdClass}>
                <Badge variant={o.category === 'MENU' ? 'brand' : 'neutral'}>
                  {o.category === 'MENU' ? 'Menu' : 'Dịch vụ'}
                </Badge>
              </td>
              <td className={cn(tdClass, 'text-right font-medium tabular-nums')}>
                {o.bookingCount}
              </td>
              <td className={cn(tdClass, 'text-right text-muted-foreground tabular-nums')}>
                {o.quantity.toLocaleString('vi-VN')} {formatUnitLabel(o.unit)}
              </td>
              <td className={cn(tdClass, 'text-right text-muted-foreground tabular-nums')}>
                {o.finalizedBookingCount}
              </td>
              <td className={cn(tdClass, 'pr-5 text-right font-semibold tabular-nums')}>
                {formatVndNullable(o.revenueVnd)}
              </td>
            </tr>
          ))}
          {!offerings.length && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                Chưa có menu hoặc dịch vụ được chọn trong kỳ báo cáo.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
