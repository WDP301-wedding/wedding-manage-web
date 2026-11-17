'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HySelect } from '@/src/components/ui/select-field';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import { formatVnd } from '@/src/lib/formatting/formatters';
import { formatDate } from '@/src/features/booking-lifecycle/utils/booking-helpers';

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
          <span className="solid-tag solid-tag-success">{bookings.length} Tiệc Tuần Này</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <HySelect
            fieldSize="sm"
            aria-label="Lọc theo giai đoạn tiệc"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
          >
            <option value="ALL">Tất cả giai đoạn ({bookings.length})</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="AWAITING_DEPOSIT">Chờ đặt cọc</option>
            <option value="COMPLETED">Đã quyết toán hoàn tất</option>
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

          <Link href="/bookings" className="btn-action btn-action-primary">
            + Lập Hợp Đồng Tiệc Mới
          </Link>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="event-data-table">
          <thead>
            <tr>
              <th>Mã Hợp Đồng</th>
              <th>Cô Dâu &amp; Chú Rể</th>
              <th>Thời Gian &amp; Ca</th>
              <th>Sảnh Tiệc</th>
              <th>Quy Mô</th>
              <th>Tổng Giá Trị HĐ</th>
              <th>Đã Đặt Cọc</th>
              <th>Trạng Thái Vận Hành</th>
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
              const estTotal = (b.tableCount || 30) * 6800000;
              const estDeposit = Math.round(estTotal * 0.7);

              return (
                <tr key={b.bookingId} onClick={() => onSelectBooking(b)}>
                  <td>
                    <span className="contract-ref">
                      #{b.bookingCode || b.bookingId.slice(0, 8)}
                    </span>
                  </td>
                  <td>
                    <div className="couple-full-name">{couple}</div>
                    <div className="couple-phone-sub">Đại diện: {b.phone || 'Chưa cập nhật'}</div>
                  </td>
                  <td>
                    <strong>{formatDate(b.eventDate)}</strong> · {shift}
                  </td>
                  <td>{b.hallNameSnapshot || 'Chưa gán sảnh'}</td>
                  <td>
                    <strong>{b.tableCount || 0}</strong> bàn ({(b.tableCount || 0) * 10} khách)
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatVnd(estTotal)}</td>
                  <td style={{ color: 'var(--ck-status-live)', fontWeight: 600 }}>
                    {formatVnd(estDeposit)} (70%)
                  </td>
                  <td>
                    <span className="solid-tag solid-tag-success">
                      {b.phase === 'CONFIRMED'
                        ? 'Đang Diễn Ra'
                        : b.phase === 'COMPLETED'
                          ? 'Đã Hoàn Tất'
                          : 'Chờ Cọc'}
                    </span>
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
                      Xem Hồ Sơ
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
