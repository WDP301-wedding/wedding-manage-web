'use client';

import Link from 'next/link';
import { BookingActions } from './booking-actions';
import { cn } from 'cn';
import type { AnalyticsBookingsData } from '@/src/services/analytics/analytics.service';
import { Badge } from '@/src/components/ui/badge';
import type { BookingAssignmentsRegistry } from '@/src/features/dashboard/api/booking-assignments';
import { CopyButton } from '@/src/components/ui/copy-button';
import {
  rowClass,
  subTextClass,
  tableClass,
  tableWrapClass,
  tdClass,
  theadClass,
  thClass,
} from '@/src/features/dashboard/styles/dashboard-classes';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import { SortHeader } from '@/src/components/data-display/table-controls';
import { formatDate, isEventPast } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import { formatVnd } from '@/src/lib/formatting/formatters';

export type DashboardBookingItem = NavigationBooking;

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';
const PHASES: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Bản nháp', variant: 'neutral' },
  AWAITING_DEPOSIT: { label: 'Chờ cọc', variant: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'success' },
  COMPLETED: { label: 'Hoàn thành', variant: 'info' },
  CANCELLED: { label: 'Đã hủy', variant: 'error' },
};

export type BookingSortField =
  'recency' | 'eventDate' | 'hallName' | 'shiftCode' | 'tableCount' | 'phase';
export type SortOrder = 'asc' | 'desc';

export interface DashboardBookingsTableProps {
  bookings: readonly DashboardBookingItem[];
  assignments: BookingAssignmentsRegistry;
  resolvedAccountId: string;
  onClaim: (bookingId: string, hallName?: string) => void;
  sortField?: BookingSortField | undefined;
  sortOrder?: SortOrder | undefined;
  onSortChange?: ((field: BookingSortField) => void) | undefined;
  onSelectBooking?: ((booking: DashboardBookingItem) => void) | undefined;
}

const sortColumns: { field: BookingSortField; label: string; title: string }[] = [
  { field: 'eventDate', label: 'Ngày tổ chức', title: 'Sắp xếp theo ngày tổ chức' },
  { field: 'hallName', label: 'Sảnh tiệc', title: 'Sắp xếp theo sảnh tiệc' },
  { field: 'shiftCode', label: 'Ca', title: 'Sắp xếp theo ca tiệc' },
  { field: 'tableCount', label: 'Quy mô', title: 'Sắp xếp theo quy mô số bàn' },
];

function BookingProfile({ booking }: Readonly<{ booking: DashboardBookingItem }>) {
  const couple = [booking.groomName, booking.brideName].filter(Boolean).join(' & ');
  const contact = [booking.phone, booking.email].filter(Boolean).join(' • ');
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        {booking.bookingCode ? (
          <div className="flex items-center gap-1">
            <span className="font-mono text-2xs font-bold text-primary">
              #{booking.bookingCode}
            </span>
            <CopyButton text={booking.bookingCode} />
          </div>
        ) : (
          <span className={subTextClass}>Mã hồ sơ chưa đồng bộ</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <strong className="text-sm font-bold text-foreground">
          {couple || booking.customerName || 'Chưa có tên khách'}
        </strong>
      </div>

      {contact && <small className={subTextClass}>{contact}</small>}
      {booking.alias && booking.alias !== booking.customerName && (
        <small className="text-2xs text-muted-foreground/80">{booking.alias}</small>
      )}
    </div>
  );
}

export function DashboardBookingsTable({
  bookings,
  assignments,
  resolvedAccountId,
  onClaim,
  sortField,
  sortOrder = 'asc',
  onSortChange,
  onSelectBooking,
}: Readonly<DashboardBookingsTableProps>) {
  return (
    <div className={tableWrapClass}>
      <table aria-label="Lịch tiệc và sự kiện đã đặt" className={cn(tableClass, 'min-w-[1000px]')}>
        <thead className={theadClass}>
          <tr>
            {sortColumns.map((column) => (
              <SortHeader
                key={column.field}
                label={column.label}
                title={column.title}
                active={sortField === column.field}
                order={sortOrder}
                onSort={() => onSortChange?.(column.field)}
              />
            ))}
            <SortHeader
              label="Hồ sơ tiệc"
              title="Sắp xếp theo độ mới của tiệc"
              active={sortField === 'recency'}
              order={sortOrder}
              onSort={() => onSortChange?.('recency')}
            />
            <SortHeader
              label="Trạng thái"
              title="Sắp xếp theo trạng thái"
              active={sortField === 'phase'}
              order={sortOrder}
              onSort={() => onSortChange?.('phase')}
            />
            <th scope="col" className={cn(thClass, 'text-right')}>
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {bookings.map((booking) => {
            const assignment = assignments[booking.bookingId];
            const mine = assignment?.assignedAccountId === resolvedAccountId;
            const assignedToOther = Boolean(
              assignment && assignment.assignedAccountId !== resolvedAccountId,
            );
            const assignedEmail = assignment?.assignedEmail ?? 'Quản lý khác';
            const phase = PHASES[booking.phase];

            return (
              <tr
                key={booking.bookingId}
                className={cn(rowClass, 'transition-colors hover:bg-muted/50')}
              >
                <td className={cn(tdClass, 'font-semibold whitespace-nowrap tabular-nums')}>
                  {formatDate(booking.eventDate)}
                </td>
                <td className={tdClass}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground">
                      {booking.hallNameSnapshot || 'Sảnh tiệc'}
                    </span>
                    {mine ? (
                      <small className="text-2xs font-semibold text-primary" title="Bạn đang phụ trách tiệc này">
                        ✓ Phụ trách
                      </small>
                    ) : assignedToOther ? (
                      <small
                        className={cn(subTextClass, 'break-all')}
                        title={`Tiệc đã được tiếp nhận và khóa bởi: ${assignedEmail}`}
                      >
                        {assignedEmail}
                      </small>
                    ) : null}
                  </div>
                </td>
                <td className={tdClass}>
                  <span className="inline-flex rounded border border-border bg-muted/60 px-2 py-0.5 text-2xs font-semibold text-foreground">
                    {booking.shiftCode === 'LUNCH' ? 'Trưa' : 'Tối'}
                  </span>
                </td>
                <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                  <strong className="font-bold text-foreground">{booking.tableCount}</strong>
                  <span className="text-xs text-muted-foreground"> bàn</span>
                </td>
                <td className={tdClass}>
                  <BookingProfile booking={booking} />
                </td>
                <td className={tdClass}>
                  {(() => {
                    const isOverdue =
                      (booking.phase === 'DRAFT' || booking.phase === 'AWAITING_DEPOSIT') &&
                      isEventPast(booking.eventDate);
                    return (
                      <Badge variant={isOverdue ? 'error' : (phase?.variant ?? 'neutral')}>
                        {isOverdue ? 'Quá hạn tổ chức' : (phase?.label ?? booking.phase)}
                      </Badge>
                    );
                  })()}
                </td>
                <td className={cn(tdClass, 'text-right')}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectBooking?.(booking)}
                      className="inline-flex h-8 items-center rounded-md border border-border bg-card px-2.5 text-2xs font-semibold text-foreground shadow-xs transition-colors hover:border-hy-outline-strong hover:bg-muted"
                    >
                      Xem ca trực
                    </button>
                    <Link
                      href={`/bookings?bookingId=${booking.bookingId}`}
                      prefetch={false}
                      className="inline-flex h-8 items-center rounded-md border border-border bg-card px-2.5 text-2xs font-semibold text-foreground shadow-xs transition-colors hover:border-hy-outline-strong hover:bg-muted"
                    >
                      Xem hồ sơ
                    </Link>
                    <BookingActions
                      booking={booking}
                      mine={mine}
                      assignedToOther={assignedToOther}
                      assignedEmail={assignedEmail}
                      onClaim={onClaim}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
