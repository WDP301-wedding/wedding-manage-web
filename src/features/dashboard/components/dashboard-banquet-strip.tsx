'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, ArrowUpRight } from 'lucide-react';
import { HySelect } from '@/src/components/ui/select-field';
import { Skeleton } from '@/src/components/ui/skeleton';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';
import { billingService } from '@/src/services/billing/billing.service';
import { formatDate } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import { formatVnd } from '@/src/lib/formatting/formatters';

export interface DashboardBanquetStripProps {
  booking: NavigationBooking | null;
  workspace?: StaffWorkspace | null;
  allBookings: readonly NavigationBooking[];
  onSelectBooking: (booking: NavigationBooking) => void;
  onOpenContract: (booking: NavigationBooking) => void;
  isManager?: boolean;
  loading?: boolean;
}

export function DashboardBanquetStrip({
  booking,
  workspace = null,
  allBookings,
  onSelectBooking,
  onOpenContract,
  isManager = false,
  loading = false,
}: Readonly<DashboardBanquetStripProps>) {
  const [outstandingVnd, setOutstandingVnd] = useState<number | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);

  useEffect(() => {
    if (!booking) {
      setOutstandingVnd(null);
      setLoadingBilling(false);
      return;
    }
    let active = true;
    setLoadingBilling(true);
    void billingService
      .getBillingSummary(booking.bookingId)
      .then((b) => {
        if (!active) return;
        const out =
          b.financialOverview?.settlementSummary?.outstandingVnd ??
          b.totals?.outstandingVnd ??
          null;
        setOutstandingVnd(out);
      })
      .catch(() => {
        if (active) setOutstandingVnd(null);
      })
      .finally(() => {
        if (active) setLoadingBilling(false);
      });
    return () => {
      active = false;
    };
  }, [booking?.bookingId]);

  if (loading && !booking) {
    return (
      <section aria-busy="true" className="banquet-overview-strip">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="strip-stats-row">
          <Skeleton className="h-12 w-24 rounded-lg" />
          <Skeleton className="h-12 w-24 rounded-lg" />
          <Skeleton className="h-12 w-36 rounded-lg" />
        </div>
      </section>
    );
  }

  if (!booking) {
    return (
      <section
        aria-label="Hồ sơ hôn lễ"
        className="banquet-overview-strip flex flex-col items-center justify-center p-8 text-center"
      >
        <span className="strip-sub-code">TIỆC CƯỚI &amp; SỰ KIỆN VẬN HÀNH</span>
        <h2 className="strip-couple-heading mt-1">
          Chưa có tiệc cưới nào trong danh sách vận hành
        </h2>
        <p className="strip-meta-desc mt-1">
          Hệ thống chưa ghi nhận hồ sơ đặt tiệc khả dụng. Bạn có thể tạo tiệc mới để bắt đầu quy trình vận hành.
        </p>
        {isManager ? (
          <Link href="/bookings" className="btn-action btn-action-primary mt-4 no-underline">
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

  const contractCode = booking.bookingCode || booking.bookingId.slice(0, 8);
  const phone = booking.phone || 'Chưa có SĐT';
  const hallName = workspace?.timeline.hallName || booking.hallNameSnapshot || 'Chưa gán sảnh';
  const tableCount = workspace?.operations.tableCount ?? booking.tableCount ?? 0;
  const shiftLabel = booking.shiftCode === 'LUNCH' ? 'Ca Trưa' : 'Ca Tối';
  const shiftText = workspace?.timeline
    ? `${shiftLabel} (${workspace.timeline.shiftStartTime} – ${workspace.timeline.shiftEndTime})`
    : shiftLabel;

  return (
    <section aria-label="Hồ sơ tiệc đang theo dõi" className="banquet-overview-strip">
      <div className="strip-couple-wrap">
        <span className="strip-sub-code">
          Hồ Sơ Tiệc Đang Theo Dõi · Hợp Đồng #{contractCode}
        </span>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="strip-couple-heading">Hôn Lễ: {coupleName}</h1>

          {/* Quick Switcher dropdown for real active bookings */}
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
                    {[b.groomName, b.brideName].filter(Boolean).join(' & ') ||
                      b.customerName ||
                      'Tiệc'}
                  </option>
                ))}
              </HySelect>
            </div>
          ) : null}
        </div>

        <p className="strip-meta-desc">
          Đại diện: <strong>{booking.customerName || coupleName}</strong> ({phone}) · Sảnh:{' '}
          <strong>{hallName}</strong> · Ca: <strong>{shiftText}</strong> · Ngày:{' '}
          <strong>{formatDate(booking.eventDate)}</strong>
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
            className="btn-action btn-action-secondary no-underline"
            style={{ padding: '4px 11px', fontSize: '12px' }}
          >
            Chi Tiết Đặt Tiệc
            <ArrowUpRight className="size-3 text-muted-foreground" />
          </Link>
        </div>
      </div>

      <div className="strip-stats-row">
        <div className="strip-stat-unit">
          <span className="strip-stat-val tabular-nums">{tableCount}</span>
          <span className="strip-stat-lbl">Số Bàn Hợp Đồng</span>
        </div>
        <div className="strip-stat-unit">
          <span className="strip-stat-val tabular-nums">
            {workspace ? workspace.planningHeadcount : '—'}
          </span>
          <span className="strip-stat-lbl">Khách Dự Kiến</span>
        </div>
        <div className="strip-stat-unit">
          {loadingBilling ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <span
              className="strip-stat-val tabular-nums"
              style={{ color: 'var(--ck-brand-wine, #631321)' }}
            >
              {outstandingVnd !== null ? formatVnd(outstandingVnd) : '—'}
            </span>
          )}
          <span className="strip-stat-lbl">Còn Phải Thu</span>
        </div>
      </div>
    </section>
  );
}
