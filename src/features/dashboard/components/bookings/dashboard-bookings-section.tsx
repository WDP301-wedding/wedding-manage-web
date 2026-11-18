'use client';

import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { cn } from 'cn';
import { Button, buttonVariants } from '@/src/components/ui/button';
import { DashboardBookingsTable } from './dashboard-bookings-table';
import { DashboardBookingsToolbar } from './dashboard-bookings-toolbar';
import {
  emptyClass,
  rowClass,
  sectionClass,
  sectionHeaderClass,
  sectionTitleClass,
  tableClass,
  tableWrapClass,
  tdClass,
  thClass,
  theadClass,
} from '@/src/features/dashboard/styles/dashboard-classes';
import { Skeleton } from '@/src/components/ui/skeleton';
import { StaffCheckinBanner } from '@/src/features/dashboard/components/cockpit/staff-checkin-banner';
import { TablePagination } from '@/src/components/data-display/table-controls';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import type { LockNotice } from '@/src/features/dashboard/hooks/use-booking-claims';
import { useDashboardBookings } from '@/src/features/dashboard/hooks/use-dashboard-bookings';

export interface DashboardBookingsSectionProps {
  isManager: boolean;
  resolvedAccountId: string;
  onClaim: (bookingId: string, hallName?: string) => void;
  lockNotice: LockNotice;
  onDismissLockNotice: () => void;
  onSelectBooking?: ((booking: NavigationBooking) => void) | undefined;
}

const noticeTone = {
  success: 'bg-hy-success-bg text-hy-success',
  warning: 'bg-hy-warning-bg text-hy-warning',
  info: 'bg-hy-info-bg text-hy-info',
} as const;

export function DashboardBookingsSection({
  isManager,
  resolvedAccountId,
  onClaim,
  lockNotice,
  onDismissLockNotice,
  onSelectBooking,
}: Readonly<DashboardBookingsSectionProps>) {
  const view = useDashboardBookings({
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
        <div className={tableWrapClass} aria-busy="true" aria-label="Đang tải danh sách tiệc">
          <table className={tableClass}>
            <thead className={theadClass}>
              <tr>
                <th className={thClass}>Mã tiệc &amp; Khách hàng</th>
                <th className={thClass}>Ngày tiệc</th>
                <th className={thClass}>Sảnh &amp; Ca</th>
                <th className={thClass}>Số bàn</th>
                <th className={thClass}>Trạng thái</th>
                <th className={thClass}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className={rowClass}>
                  <td className={tdClass}>
                    <Skeleton className="h-4 w-32 mb-1.5" />
                    <Skeleton className="h-3 w-20" />
                  </td>
                  <td className={tdClass}>
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className={tdClass}>
                    <Skeleton className="h-4 w-28" />
                  </td>
                  <td className={tdClass}>
                    <Skeleton className="h-4 w-12" />
                  </td>
                  <td className={tdClass}>
                    <Skeleton className="h-6 w-20 rounded-md" />
                  </td>
                  <td className={tdClass}>
                    <Skeleton className="h-8 w-16 rounded-md" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          onSelectBooking={onSelectBooking}
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
