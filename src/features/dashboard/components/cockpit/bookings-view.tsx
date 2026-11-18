'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/src/components/ui/badge';
import { HySelect } from '@/src/components/ui/select-field';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import { formatDate } from '@/src/features/booking-lifecycle/utils/booking-helpers';

const phaseMeta: Record<
  string,
  { label: string; variant: 'neutral' | 'warning' | 'success' | 'info' | 'error' }
> = {
  DRAFT: { label: 'Bản nháp', variant: 'neutral' },
  AWAITING_DEPOSIT: { label: 'Chờ đặt cọc', variant: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'success' },
  COMPLETED: { label: 'Đã hoàn tất', variant: 'info' },
  CANCELLED: { label: 'Đã hủy', variant: 'error' },
};

export function RealBookingsView({
  bookings,
  onSelectBooking,
  onOpenContract,
}: Readonly<{
  bookings: readonly NavigationBooking[];
  onSelectBooking: (b: NavigationBooking) => void;
  onOpenContract: (b: NavigationBooking) => void;
}>) {
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [hallFilter, setHallFilter] = useState('ALL');

  const filtered = bookings.filter((b) => {
    if (phaseFilter !== 'ALL' && b.phase !== phaseFilter) return false;
    if (hallFilter !== 'ALL' && b.hallNameSnapshot !== hallFilter) return false;
    return true;
  });

  const halls = Array.from(new Set(bookings.map((b) => b.hallNameSnapshot).filter(Boolean)));

  return (
    <div className="master-event-card">
      <div className="event-filter-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="panel-box-title">Sổ Hợp Đồng &amp; Đặt Tiệc</span>
          <Badge variant="success">{bookings.length} tiệc</Badge>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <HySelect
            fieldSize="sm"
            aria-label="Lọc theo giai đoạn tiệc"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
          >
            <option value="ALL">Tất cả giai đoạn ({bookings.length})</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="AWAITING_DEPOSIT">Chờ đặt cọc</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="COMPLETED">Đã hoàn tất</option>
          </HySelect>

          <HySelect
            fieldSize="sm"
            aria-label="Lọc theo sảnh tiệc"
            value={hallFilter}
            onChange={(e) => setHallFilter(e.target.value)}
          >
            <option value="ALL">Tất cả các sảnh</option>
            {halls.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </HySelect>

          <Link href="/bookings" className="btn-action btn-action-primary no-underline">
            + Lập Hồ Sơ Tiệc Mới
          </Link>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="event-data-table">
          <thead>
            <tr>
              <th>Mã Hồ Sơ</th>
              <th>Cô Dâu &amp; Chú Rể</th>
              <th>Ngày Tổ Chức &amp; Ca</th>
              <th>Sảnh Tiệc</th>
              <th>Số Bàn</th>
              <th>Trạng Thái</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const couple =
                [b.groomName, b.brideName].filter(Boolean).join(' & ') ||
                b.customerName ||
                'Hồ sơ tiệc';
              const shift = b.shiftCode === 'LUNCH' ? 'Ca Trưa' : 'Ca Tối';
              const meta = phaseMeta[b.phase] ?? { label: b.phase, variant: 'neutral' as const };

              return (
                <tr key={b.bookingId} onClick={() => onSelectBooking(b)}>
                  <td>
                    <span className="contract-ref">
                      #{b.bookingCode || b.bookingId.slice(0, 8)}
                    </span>
                  </td>
                  <td>
                    <div className="couple-full-name">{couple}</div>
                    <div className="couple-phone-sub">
                      {b.customerName ? `Đại diện: ${b.customerName}` : ''}
                      {b.phone ? ` · ${b.phone}` : ''}
                    </div>
                  </td>
                  <td className="tabular-nums">
                    <strong>{formatDate(b.eventDate)}</strong> · {shift}
                  </td>
                  <td>{b.hallNameSnapshot || 'Chưa gán sảnh'}</td>
                  <td className="tabular-nums">
                    <strong>{b.tableCount}</strong> bàn
                  </td>
                  <td>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-action btn-action-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenContract(b);
                      }}
                    >
                      Xem Hợp Đồng
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                  Không có tiệc nào phù hợp bộ lọc hiện tại.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
