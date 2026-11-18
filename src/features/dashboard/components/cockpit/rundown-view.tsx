'use client';

import Link from 'next/link';
import { ArrowUpRight, Users } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';
import { formatDate } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import { SEATING_STATUS_META } from '@/src/features/dashboard/hooks/use-floorplan-view-state';

export function RealRundownView({
  workspace,
  booking,
  loading = false,
}: Readonly<{
  workspace: StaffWorkspace | null;
  booking: NavigationBooking;
  loading?: boolean;
}>) {
  const timeline = workspace?.timeline ?? null;
  const timelineItems = timeline?.items ?? [];
  const members = workspace?.members ?? [];
  const isUnconfirmed = booking.phase !== 'CONFIRMED' && booking.phase !== 'COMPLETED';
  const seatingMeta = workspace ? SEATING_STATUS_META[workspace.seating.status] : null;

  return (
    <div className="rundown-two-col">
      {/* Real Event Timeline Rundown */}
      <div className="rundown-panel-box">
        <div className="panel-box-header">
          <div>
            <h2 className="panel-box-title">
              Kịch Bản Lễ Cưới ({booking.shiftCode === 'LUNCH' ? 'Ca Trưa' : 'Ca Tối'})
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {timeline
                ? `${timeline.hallName} · ${formatDate(timeline.eventDate)} · ${timeline.shiftStartTime} – ${timeline.shiftEndTime} · Phiên bản #${timeline.revisionNumber}`
                : `${booking.hallNameSnapshot || 'Chưa gán sảnh'} · ${formatDate(booking.eventDate)}`}
            </p>
          </div>
          <Link
            href={`/bookings?bookingId=${booking.bookingId}`}
            className="btn-action btn-action-secondary no-underline"
            style={{ padding: '5px 11px', fontSize: '12px' }}
          >
            Chỉnh sửa kịch bản
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3 py-4" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3.5 w-72" />
              </div>
            ))}
          </div>
        ) : timelineItems.length > 0 ? (
          <div className="timeline-chain">
            {timelineItems.map((step) => (
              <div key={step.itemId} className="chain-node">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text tabular-nums">{step.startTime}</span>
                  <span className="chain-step-name">{step.title}</span>
                </div>
                {step.description ? <p className="chain-step-desc">{step.description}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-foreground">
              {isUnconfirmed
                ? 'Kịch bản vận hành chỉ hiển thị sau khi tiệc được xác nhận'
                : 'Chưa có mốc kịch bản nào được duyệt cho tiệc này'}
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Quản lý hoặc cặp đôi có thể soạn và phê duyệt các mốc thời gian kịch bản trong trang
              Hồ sơ đặt tiệc.
            </p>
            <Link
              href={`/bookings?bookingId=${booking.bookingId}`}
              className="btn-action btn-action-secondary mt-2 no-underline"
            >
              Mở hồ sơ tiệc để thiết lập kịch bản
            </Link>
          </div>
        )}
      </div>

      {/* Real Operational Context & Assigned Staff */}
      <div className="rundown-panel-box">
        <div className="panel-box-header">
          <div>
            <h2 className="panel-box-title">Thông Tin Điều Phối &amp; Nhân Sự</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Dữ liệu vận hành đồng bộ từ hồ sơ tiệc và bảng phân công
            </p>
          </div>
          {seatingMeta ? <Badge variant={seatingMeta.tone}>{seatingMeta.label}</Badge> : null}
        </div>

        <div className="spec-items-list">
          <div className="spec-line">
            <span className="spec-label">Sảnh tổ chức:</span>
            <span className="spec-val">{timeline?.hallName || booking.hallNameSnapshot || '—'}</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Khung giờ ca:</span>
            <span className="spec-val tabular-nums">
              {timeline
                ? `${timeline.shiftStartTime} – ${timeline.shiftEndTime}`
                : booking.shiftCode === 'LUNCH'
                  ? 'Ca Trưa'
                  : 'Ca Tối'}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Quy mô tiệc:</span>
            <span className="spec-val tabular-nums">
              {workspace
                ? `${workspace.operations.tableCount} bàn · ${workspace.planningHeadcount} khách dự kiến`
                : `${booking.tableCount} bàn`}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Số mốc kịch bản:</span>
            <span className="spec-val tabular-nums">{timelineItems.length} mốc</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Users className="size-3.5 text-primary" aria-hidden="true" />
              Nhân sự được phân công ({members.length})
            </span>
            <Link
              href={`/staff?bookingId=${booking.bookingId}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Quản lý phân công →
            </Link>
          </div>

          {members.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {members.map((member) => (
                <li
                  key={member.accountId}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs"
                >
                  <span className="font-medium text-foreground">{member.label}</span>
                  <Badge variant="neutral">Đang phụ trách</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              Chưa có nhân sự nào được phân công cho tiệc này.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
