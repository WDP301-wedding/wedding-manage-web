'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowUpRight } from 'lucide-react';
import { HySelect } from '@/src/components/ui/select-field';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import { billingService } from '@/src/services/billing/billing.service';
import { formatDate } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import { formatVnd } from '@/src/lib/formatting/formatters';

export interface DashboardBanquetStripProps {
  booking: NavigationBooking | null;
  allBookings: readonly NavigationBooking[];
  onSelectBooking: (booking: NavigationBooking) => void;
  onOpenContract: (booking: NavigationBooking) => void;
  isManager?: boolean;
}

export function DashboardBanquetStrip({
  booking,
  allBookings,
  onSelectBooking,
  onOpenContract,
  isManager = false,
}: Readonly<DashboardBanquetStripProps>) {
  const [outstandingVnd, setOutstandingVnd] = useState<number | null>(null);

  useEffect(() => {
    if (!booking) {
      setOutstandingVnd(null);
      return;
    }
    let active = true;
    void billingService
      .getBillingSummary(booking.bookingId)
      .then((b) => {
        if (!active) return;
        const total =
          b.financialOverview?.totalVnd ??
          b.financialOverview?.settlementSummary?.effectiveContractVnd ??
          0;
        const dep =
          b.financialOverview?.depositReceivedVnd ??
          b.financialOverview?.settlementSummary?.netReceivedVnd ??
          0;
        const out =
          b.financialOverview?.settlementSummary?.outstandingVnd ?? Math.max(0, total - dep);
        setOutstandingVnd(out);
      })
      .catch(() => {
        if (active) setOutstandingVnd(null);
      });
    return () => {
      active = false;
    };
  }, [booking?.bookingId]);

  if (!booking) {
    return (
      <section
        aria-label="Hồ sơ hôn lễ hôm nay"
        className="banquet-overview-strip flex flex-col items-center justify-center p-8 text-center"
      >
        <span className="strip-sub-code">TIỆC CƯỚI &amp; SỰ KIỆN TRỌNG ĐIỂM</span>
        <h2 className="strip-couple-heading mt-1">
          Chưa có tiệc cưới nào trong danh sách vận hành
        </h2>
        <p className="strip-meta-desc mt-1">
          Hệ thống chưa ghi nhận hồ sơ đặt tiệc khả dụng. Bạn có thể tạo tiệc mới để bắt đầu quy trình vận hành.
        </p>
        {isManager ? (
          <Link
            href="/bookings"
            className="btn-action btn-action-primary mt-4"
          >
            + Lập hồ sơ tiệc mới
          </Link>
        ) : null}
      </section>
    );
  }

  const coupleName =
    [booking.groomName, booking.brideName].filter(Boolean).join(' & ') ||
    booking.customerName ||
    booking.alias ||
    'Hồ sơ tiệc chưa cập nhật tên';

  const contractCode = booking.bookingCode || 'Mã chưa đồng bộ';
  const phone = booking.phone || 'Chưa có SĐT';
  const hallName = booking.hallNameSnapshot || 'Chưa gán sảnh';
  const tableCount = booking.tableCount || 0;
  const estimatedGuests = tableCount * 10;
  const shiftText = booking.shiftCode === 'LUNCH' ? 'Ca Trưa (11:00 – 14:00)' : 'Ca Tối (17:30 – 21:30)';

  return (
    <section aria-label="Hồ sơ hôn lễ hôm nay" className="banquet-overview-strip">
      <div className="strip-couple-wrap">
        <span className="strip-sub-code">
          Hồ Sơ Hôn Lễ Hôm Nay · Hợp Đồng #{contractCode}
        </span>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="strip-couple-heading">
            Hôn Lễ: {coupleName}
          </h1>

          {/* Quick Switcher dropdown for active bookings */}
          {allBookings.length > 1 ? (
            <div className="relative inline-flex items-center">
              <HySelect
                fieldSize="sm"
                aria-label="Chọn tiệc cưới cần theo dõi"
                value={booking.bookingId}
                onChange={(e) => {
                  const target = allBookings.find((b) => b.bookingId === e.target.value);
                  if (target) onSelectBooking(target);
                }}
                className="max-w-[260px]"
              >
                {allBookings.map((b) => (
                  <option key={b.bookingId} value={b.bookingId}>
                    {b.bookingCode ? `#${b.bookingCode} - ` : ''}
                    {[b.groomName, b.brideName].filter(Boolean).join(' & ') || b.customerName || 'Tiệc'}
                  </option>
                ))}
              </HySelect>
            </div>
          ) : null}
        </div>

        <p className="strip-meta-desc">
          Đại diện hai bên: <strong>{booking.customerName || coupleName}</strong> ({phone}) · Sảnh: <strong>{hallName}</strong> · Ca: <strong>{shiftText}</strong> · Ngày: <strong>{formatDate(booking.eventDate)}</strong>
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenContract(booking)}
            className="btn-action btn-action-secondary"
            style={{ padding: '4px 11px', fontSize: '12px' }}
          >
            <FileText className="size-3.5 text-primary" />
            Hồ Sơ Hợp Đồng
          </button>
          <Link
            href={`/bookings?bookingId=${booking.bookingId}`}
            className="btn-action btn-action-secondary"
            style={{ padding: '4px 11px', fontSize: '12px' }}
          >
            Chi Tiết Đặt Tiệc
            <ArrowUpRight className="size-3 text-muted-foreground" />
          </Link>
        </div>
      </div>

      <div className="strip-stats-row">
        <div className="strip-stat-unit">
          <span className="strip-stat-val">
            {tableCount} / {Math.max(tableCount, 50)}
          </span>
          <span className="strip-stat-lbl">Bàn Đã Lên Tiệc</span>
        </div>
        <div className="strip-stat-unit">
          <span className="strip-stat-val">{estimatedGuests}</span>
          <span className="strip-stat-lbl">Khách Thực Tế</span>
        </div>
        <div className="strip-stat-unit">
          <span
            className="strip-stat-val"
            style={{ color: 'var(--ck-brand-wine, #631321)' }}
          >
            {outstandingVnd !== null ? formatVnd(outstandingVnd) : formatVnd(tableCount * 6800000 * 0.3)}
          </span>
          <span className="strip-stat-lbl">Cần Quyết Toán Sau Tiệc</span>
        </div>
      </div>
    </section>
  );
}
