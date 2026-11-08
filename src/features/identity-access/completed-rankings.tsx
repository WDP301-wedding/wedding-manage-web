'use client';
import { useState } from 'react';
import type { CompletedEventsData } from '../../services/completed-events.service';
import { formatVndNullable } from '../../lib/formatters';
import { HySelect } from '../../components/ui/select-field';
import {
  tableWrapClass,
  tableClass,
  theadClass,
  thClass,
  tdClass,
  rowClass,
  filterSelectClass,
} from './dashboard-classes';

export function CompletedRankings({ data }: Readonly<{ data: CompletedEventsData }>) {
  const [hallSort, setHallSort] = useState('usage');
  const [category, setCategory] = useState('ALL');
  const [offeringSort, setOfferingSort] = useState('usage');
  const halls = [...data.halls].sort((a, b) =>
    hallSort === 'revenue'
      ? b.revenueVnd - a.revenueVnd ||
        b.bookingCount - a.bookingCount ||
        a.hallId.localeCompare(b.hallId)
      : b.bookingCount - a.bookingCount ||
        b.revenueVnd - a.revenueVnd ||
        a.hallId.localeCompare(b.hallId),
  );
  const offerings = data.offerings
    .filter((o) => category === 'ALL' || o.category === category)
    .sort((a, b) =>
      offeringSort === 'revenue'
        ? b.revenueVnd - a.revenueVnd || b.bookingCount - a.bookingCount
        : b.bookingCount - a.bookingCount || b.revenueVnd - a.revenueVnd,
    );
  const maxUsage = Math.max(0, ...halls.map((h) => h.bookingCount));
  const maxRevenue = Math.max(0, ...halls.map((h) => h.revenueVnd));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Hiệu quả từng sảnh</h3>
          <p className="text-sm text-muted-foreground">
            Sử dụng nhiều nhất:{' '}
            {maxUsage
              ? halls
                  .filter((h) => h.bookingCount === maxUsage)
                  .map((h) => h.hallName)
                  .join(', ')
              : 'Chưa có tiệc hoàn tất'}
            .
          </p>
          <p className="text-sm text-muted-foreground">
            Doanh thu cao nhất:{' '}
            {maxRevenue
              ? halls
                  .filter((h) => h.revenueVnd === maxRevenue)
                  .map((h) => h.hallName)
                  .join(', ')
              : 'Chưa có doanh thu hóa đơn'}
            .
          </p>
        </div>
        <HySelect
          aria-label="Xếp hạng sảnh theo"
          value={hallSort}
          onChange={(e) => setHallSort(e.target.value)}
          className={filterSelectClass}
        >
          <option value="usage">Số tiệc nhiều nhất</option>
          <option value="revenue">Doanh thu cao nhất</option>
        </HySelect>
      </div>
      <div className={tableWrapClass}>
        <table className={tableClass} aria-label="Hiệu quả từng sảnh">
          <thead className={theadClass}>
            <tr>
              {[
                'Sảnh',
                'Tiệc hoàn tất',
                'Tỷ trọng sử dụng',
                'Doanh thu đã chốt',
                'Đã thu ròng',
                'Còn phải thu',
              ].map((label) => (
                <th key={label} scope="col" className={thClass}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {halls.map((h) => (
              <tr key={h.hallId} className={rowClass}>
                <th scope="row" className={tdClass}>
                  {h.hallName}
                </th>
                <td className={tdClass}>{h.bookingCount}</td>
                <td className={tdClass}>
                  {data.summary.completedCount
                    ? new Intl.NumberFormat('vi-VN', {
                        style: 'percent',
                        maximumFractionDigits: 1,
                      }).format(h.bookingCount / data.summary.completedCount)
                    : '0%'}
                </td>
                <td className={tdClass}>
                  {formatVndNullable(h.revenueVnd)}
                  <small className="block text-muted-foreground">{h.finalizedCount} hóa đơn</small>
                </td>
                <td className={tdClass}>{formatVndNullable(h.netPaidVnd)}</td>
                <td className={tdClass}>{formatVndNullable(h.outstandingVnd)}</td>
              </tr>
            ))}
            {!halls.length && (
              <tr>
                <td colSpan={6} className={tdClass}>
                  Chưa có dữ liệu sảnh trong kỳ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Gói menu và dịch vụ</h3>
          <p className="text-sm text-muted-foreground">
            Số tiệc chọn và số lượng của tiệc hoàn tất; giá trị chỉ từ hóa đơn đã chốt.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HySelect
            aria-label="Loại gói thống kê"
            className={filterSelectClass}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="ALL">Menu và dịch vụ</option>
            <option value="MENU">Menu</option>
            <option value="SERVICE">Dịch vụ</option>
          </HySelect>
          <HySelect
            aria-label="Xếp hạng gói theo"
            className={filterSelectClass}
            value={offeringSort}
            onChange={(e) => setOfferingSort(e.target.value)}
          >
            <option value="usage">Được chọn nhiều nhất</option>
            <option value="revenue">Giá trị cao nhất</option>
          </HySelect>
        </div>
      </div>
      <div className={tableWrapClass}>
        <table className={tableClass} aria-label="Gói menu và dịch vụ">
          <thead className={theadClass}>
            <tr>
              {[
                'Gói',
                'Loại',
                'Số tiệc chọn',
                'Tổng số lượng',
                'Tiệc đã chốt hóa đơn',
                'Giá trị đã chốt',
              ].map((label) => (
                <th key={label} scope="col" className={thClass}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offerings.map((o) => (
              <tr key={o.category + o.sourceId} className={rowClass}>
                <th scope="row" className={tdClass}>
                  {o.name}
                </th>
                <td className={tdClass}>{o.category === 'MENU' ? 'Menu' : 'Dịch vụ'}</td>
                <td className={tdClass}>{o.bookingCount}</td>
                <td className={tdClass}>
                  {o.quantity} {o.unit}
                </td>
                <td className={tdClass}>{o.finalizedBookingCount}</td>
                <td className={tdClass}>{formatVndNullable(o.revenueVnd)}</td>
              </tr>
            ))}
            {!offerings.length && (
              <tr>
                <td colSpan={6} className={tdClass}>
                  Chưa có menu hoặc dịch vụ được chọn trong kỳ.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Giá trị ngoài menu/dịch vụ (in thiệp, phát sinh và điều chỉnh chung):{' '}
        {formatVndNullable(data.summary.unallocatedRevenueVnd)}. Không phân bổ tiền cọc vào từng
        gói.
      </p>
    </>
  );
}
