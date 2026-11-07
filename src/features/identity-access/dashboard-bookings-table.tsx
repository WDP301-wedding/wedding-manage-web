'use client';

import { BookingActions } from './booking-actions';

import { cn } from 'cn';
import type { AnalyticsBookingsData } from '../../services/analytics.service';
import { Badge } from '../../components/ui/badge';
import type { BookingAssignmentsRegistry } from './booking-assignments';
import { CopyButton } from './copy-button';
import {
  rowClass,
  subTextClass,
  tableClass,
  tableWrapClass,
  tdClass,
  theadClass,
  thClass,
} from './dashboard-classes';
import type { NavigationBooking } from '../../services/booking-navigation.service';
import { SortHeader } from './table-controls';
import { formatDate, isEventPast } from '../booking-lifecycle/booking-helpers';
import { formatVnd } from '../../lib/formatters';

export type DashboardBookingItem = NavigationBooking;

export function getBookingPaymentInfo(booking: DashboardBookingItem): {
  status: 'PAID' | 'DEBT' | 'AWAITING_DEPOSIT' | 'DRAFT' | 'CANCELLED';
  label: string;
  variant: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  amount?: string | undefined;
} {
  if (booking.phase === 'CANCELLED') {
    return { status: 'CANCELLED', label: 'Đã hủy', variant: 'error' };
  }
  if (booking.phase === 'DRAFT') {
    return { status: 'DRAFT', label: 'Chưa cọc', variant: 'neutral' };
  }
  if (booking.phase === 'AWAITING_DEPOSIT') {
    return { status: 'AWAITING_DEPOSIT', label: 'Chờ cọc', variant: 'warning' };
  }
  if (
    booking.paymentStatus === 'PAID' ||
    (booking.outstandingVnd !== undefined &&
      booking.outstandingVnd !== null &&
      booking.outstandingVnd <= 0)
  ) {
    return { status: 'PAID', label: 'Đã trả hết', variant: 'success' };
  }
  if (
    booking.paymentStatus === 'DEBT' ||
    (booking.outstandingVnd !== undefined &&
      booking.outstandingVnd !== null &&
      booking.outstandingVnd > 0)
  ) {
    const isPast = isEventPast(booking.eventDate);
    return {
      status: 'DEBT',
      label: isPast ? 'Đang nợ' : 'Chờ tất toán',
      variant: isPast ? 'error' : 'warning',
      amount: booking.outstandingVnd ? formatVnd(booking.outstandingVnd) : 'Chờ quyết toán',
    };
  }
  if (booking.phase === 'COMPLETED') {
    return { status: 'PAID', label: 'Đã trả hết', variant: 'success' };
  }
  if (booking.phase === 'CONFIRMED') {
    return { status: 'DEBT', label: 'Đang nợ', variant: 'warning', amount: 'Chờ quyết toán' };
  }
  return { status: 'DRAFT', label: 'Chưa cọc', variant: 'neutral' };
}

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
  sortField?: BookingSortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: BookingSortField) => void;
}

const sortColumns: { field: BookingSortField; label: string; title: string }[] = [
  { field: 'eventDate', label: 'Ngày tổ chức', title: 'Sắp xếp theo ngày tổ chức' },
  { field: 'hallName', label: 'Sảnh tiệc', title: 'Sắp xếp theo sảnh tiệc' },
  { field: 'shiftCode', label: 'Ca', title: 'Sắp xếp theo ca tiệc' },
  { field: 'tableCount', label: 'Quy mô', title: 'Sắp xếp theo quy mô số bàn' },
];

function BookingProfile({ booking }: Readonly<{ booking: DashboardBookingItem }>) {
  const couple = [booking.groomName, booking.brideName].filter(Boolean).join(' & ');
  const contact = [booking.phone, booking.email].filter(Boolean).join(', ');
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        {booking.bookingCode ? (
          <>
            <strong className="font-semibold">{booking.bookingCode}</strong>
            <CopyButton text={booking.bookingCode} />
          </>
        ) : (
          <span className={subTextClass}>Mã hồ sơ chưa đồng bộ</span>
        )}
      </div>
      <span>{booking.customerName || 'Chưa có tên khách'}</span>
      {couple && <small className="text-xs font-medium text-primary">{couple}</small>}
      {contact && <small className={subTextClass}>{contact}</small>}
      {booking.alias && booking.alias !== booking.customerName && (
        <small className={subTextClass}>{booking.alias}</small>
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
}: Readonly<DashboardBookingsTableProps>) {
  return (
    <div className={tableWrapClass}>
      <table aria-label="Lịch tiệc và sự kiện đã đặt" className={cn(tableClass, 'min-w-[960px]')}>
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
            <th scope="col" className={thClass}>
              Thanh toán
            </th>
            <th scope="col" className={cn(thClass, 'text-right')}>
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const assignment = assignments[booking.bookingId];
            const mine = assignment?.assignedAccountId === resolvedAccountId;
            const assignedToOther = Boolean(
              assignment && assignment.assignedAccountId !== resolvedAccountId,
            );
            const assignedEmail = assignment?.assignedEmail ?? 'Quản lý khác';
            const phase = PHASES[booking.phase];

            return (
              <tr key={booking.bookingId} className={rowClass}>
                <td className={cn(tdClass, 'font-semibold whitespace-nowrap tabular-nums')}>
                  {formatDate(booking.eventDate)}
                </td>
                <td className={tdClass}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold">{booking.hallNameSnapshot || 'Sảnh tiệc'}</span>
                    {mine ? (
                      <small className="text-xs text-primary" title="Bạn đang phụ trách tiệc này">
                        Của bạn
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
                <td className={tdClass}>{booking.shiftCode === 'LUNCH' ? 'Trưa' : 'Tối'}</td>
                <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                  {booking.tableCount} bàn
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
                <td className={tdClass}>
                  {(() => {
                    const payment = getBookingPaymentInfo(booking);
                    return (
                      <div className="flex flex-col gap-0.5">
                        <Badge variant={payment.variant}>{payment.label}</Badge>
                        {payment.amount && (
                          <span
                            className={cn(
                              'text-2xs font-semibold tabular-nums',
                              payment.variant === 'error' ? 'text-hy-error' : 'text-muted-foreground',
                            )}
                          >
                            {payment.variant === 'error' ? 'Nợ' : 'Còn lại'}: {payment.amount}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className={tdClass}>
                  <BookingActions
                    booking={booking}
                    mine={mine}
                    assignedToOther={assignedToOther}
                    assignedEmail={assignedEmail}
                    onClaim={onClaim}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
