'use client';

import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { cn } from 'cn';
import { Button, buttonVariants } from '../../components/ui/button';
import type { BookingAssignmentsRegistry } from './booking-assignments';
import { DashboardBookingsTable } from './dashboard-bookings-table';
import { DashboardBookingsToolbar } from './dashboard-bookings-toolbar';
import {
  emptyClass,
  sectionClass,
  sectionHeaderClass,
  sectionTitleClass,
} from './dashboard-classes';
import { StaffCheckinBanner } from './staff-checkin-banner';
import { TablePagination } from './table-controls';
import type { LockNotice } from './use-booking-claims';
import { useDashboardBookings, type DashboardBookingItem } from './use-dashboard-bookings';
import type { DashboardState } from './use-dashboard-data';

export interface DashboardBookingsSectionProps {
  isManager: boolean;
  state: DashboardState;
  bookings: readonly DashboardBookingItem[];
  assignments: BookingAssignmentsRegistry;
  resolvedAccountId: string;
  onClaim: (bookingId: string, hallName?: string) => void;
  lockNotice: LockNotice;
  onDismissLockNotice: () => void;
}

const noticeTone = {
  success: 'bg-hy-success-bg text-hy-success',
  warning: 'bg-hy-warning-bg text-hy-warning',
  info: 'bg-hy-info-bg text-hy-info',
} as const;

export function DashboardBookingsSection({
  isManager,
  bookings,
  assignments,
  resolvedAccountId,
  onClaim,
  lockNotice,
  onDismissLockNotice,
}: Readonly<DashboardBookingsSectionProps>) {
  const view = useDashboardBookings({
    bookings,
    assignments,
    resolvedAccountId,
    enabled: isManager,
  });
  if (!isManager) return <StaffCheckinBanner />;
  return (
    <section className={sectionClass} id="booked-events">
      <div className={sectionHeaderClass}>
        <h2 className={sectionTitleClass}>
          Lịch tiệc &amp; Sự kiện đã đặt (
          {view.bookingTab === 'mine' ? view.myBookingsCount : view.allBookingsCount})
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/cancelled-bookings"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Tiệc đã hủy
          </Link>
          <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href="/bookings">
            <Plus aria-hidden className="size-3.5" />
            Tạo đặt tiệc mới
          </Link>
        </div>
      </div>
      {lockNotice && (
        <div
          role="status"
          className={cn(
            'flex items-center justify-between gap-3 rounded-lg p-3 text-sm',
            noticeTone[lockNotice.type],
          )}
        >
          <span>{lockNotice.message}</span>
          <button type="button" onClick={onDismissLockNotice} aria-label="Đóng thông báo">
            <X aria-hidden className="size-4" />
          </button>
        </div>
      )}
      <DashboardBookingsToolbar
        bookingTab={view.bookingTab}
        setBookingTab={view.setBookingTab}
        myBookingsCount={view.myBookingsCount}
        totalBookingsCount={view.allBookingsCount}
        isLoading={view.loading}
        searchQuery={view.searchQuery}
        setSearchQuery={view.setSearchQuery}
        phaseFilter={view.phaseFilter}
        setPhaseFilter={view.setPhaseFilter}
        paymentFilter={view.paymentFilter}
        setPaymentFilter={view.setPaymentFilter}
        sortField={view.sortField}
        sortOrder={view.sortOrder}
        onQuickSortChange={view.handleQuickSortChange}
      />
      {view.error ? (
        <div role="alert" className={emptyClass}>
          <p>{view.error}</p>
          <Button variant="outline" onClick={() => void view.refresh()}>
            Thử lại
          </Button>
        </div>
      ) : view.loading ? (
        <p role="status" className={emptyClass}>
          Đang tải trang tiệc…
        </p>
      ) : view.total === 0 ? (
        <p className={emptyClass}>Không có tiệc phù hợp. Tiệc đã hủy được lưu tại khu vực riêng.</p>
      ) : (
        <DashboardBookingsTable
          bookings={view.paginatedBookings}
          assignments={view.serverAssignments}
          resolvedAccountId={resolvedAccountId}
          onClaim={onClaim}
          sortField={view.sortField}
          sortOrder={view.sortOrder}
          onSortChange={view.handleSortChange}
        />
      )}
      <TablePagination
        info={
          <span>
            Hiển thị{' '}
            <strong>
              {view.total === 0 ? 0 : view.startIndex + 1}–{view.endIndex}
            </strong>{' '}
            / <strong>{view.total}</strong> tiệc
          </span>
        }
        pageSize={view.pageSize}
        pageSizes={[5, 10, 20, 50]}
        onPageSize={view.setPageSize}
        page={view.safeCurrentPage}
        totalPages={view.totalPages}
        onPage={view.setCurrentPage}
        navLabel="Phân trang lịch tiệc"
      />
    </section>
  );
}
