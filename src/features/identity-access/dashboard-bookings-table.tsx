'use client';

import Link from 'next/link';
import { Lock, Star } from 'lucide-react';
import { cn } from 'cn';
import type { AnalyticsBookingsData } from '../../services/analytics.service';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import type { BookingAssignmentsRegistry } from './booking-assignments';
import { CopyButton } from './copy-button';
import {
  linkActionClass,
  rowClass,
  subTextClass,
  tableClass,
  tableWrapClass,
  tdClass,
  theadClass,
  thClass,
} from './dashboard-classes';
import { SortHeader } from './table-controls';

export type DashboardBookingItem = AnalyticsBookingsData['items'][number];

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';
const PHASES: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Bản nháp', variant: 'neutral' },
  AWAITING_DEPOSIT: { label: 'Chờ cọc', variant: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'success' },
  COMPLETED: { label: 'Hoàn thành', variant: 'info' },
  CANCELLED: { label: 'Đã hủy', variant: 'error' },
};

export type BookingSortField = 'eventDate' | 'hallName' | 'shiftCode' | 'tableCount' | 'phase';
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
            <th scope="col" className={thClass}>
              Hồ sơ tiệc
            </th>
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
                  {new Date(booking.eventDate).toLocaleDateString('vi-VN')}
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
                  <Badge variant={phase?.variant ?? 'neutral'}>
                    {phase?.label ?? booking.phase}
                  </Badge>
                </td>
                <td className={tdClass}>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Link
                      className={cn(
                        linkActionClass,
                        'bg-accent text-accent-foreground hover:bg-hy-wine-soft/70',
                      )}
                      href={`/bookings?bookingId=${booking.bookingId}`}
                      prefetch={false}
                    >
                      Xem hồ sơ
                    </Link>
                    <Link
                      className={cn(linkActionClass, 'text-foreground hover:bg-muted')}
                      href={`/billing?bookingId=${booking.bookingId}`}
                      prefetch={false}
                    >
                      Thanh toán
                    </Link>
                    <Link
                      className={cn(linkActionClass, 'text-foreground hover:bg-muted')}
                      href={`/staff?bookingId=${booking.bookingId}`}
                      prefetch={false}
                    >
                      Nhân sự
                    </Link>
                    {mine ? null : assignedToOther ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        title={`Tiệc này đã được ${assignedEmail} tiếp nhận và đang khóa`}
                        className="text-muted-foreground"
                      >
                        <Lock aria-hidden className="size-3.5" />
                        Đã có người nhận
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        title="Tiếp nhận phụ trách tiệc này và khóa với các quản lý khác"
                        onClick={() =>
                          onClaim(booking.bookingId, booking.hallNameSnapshot || undefined)
                        }
                      >
                        <Star aria-hidden className="size-3.5" />
                        Nhận tiệc
                      </Button>
                    )}
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
