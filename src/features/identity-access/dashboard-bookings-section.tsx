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
  state,
  bookings,
  assignments,
  resolvedAccountId,
  onClaim,
  lockNotice,
  onDismissLockNotice,
}: Readonly<DashboardBookingsSectionProps>) {
  const view = useDashboardBookings({ bookings, assignments, resolvedAccountId });

  if (!isManager) {
    return <StaffCheckinBanner />;
  }

  const { serverSearch, bookingTab, filteredBookings } = view;
  const loading = state === 'loading' || serverSearch.loading;
  const createLink = (
    <Link
      className={buttonVariants({ variant: 'outline', size: 'sm' })}
      href="/bookings"
      prefetch={false}
    >
      <Plus aria-hidden className="size-3.5" />
      Tạo đặt tiệc mới
    </Link>
  );

  let body;
  if (serverSearch.error) {
    body = (
      <div role="alert" className={emptyClass}>
        <p>{serverSearch.error}</p>
        <Button variant="outline" size="sm" onClick={serverSearch.retry}>
          Tìm lại từ đầu
        </Button>
      </div>
    );
  } else if (loading) {
    body = <p className={emptyClass}>Đang đồng bộ danh sách tiệc cưới từ máy chủ…</p>;
  } else if (view.currentTabBookings.length === 0 && !view.searchQuery.trim()) {
    body =
      bookingTab === 'mine' ? (
        <div className={emptyClass}>
          <strong className="text-base font-semibold text-foreground">
            Chưa có buổi tiệc nào trong &quot;Tiệc của tôi&quot;
          </strong>
          <p className="max-w-[520px]">
            Bạn chưa nhận phụ trách hoặc tạo tiệc cưới nào. Hãy bấm &quot;Tạo đặt tiệc mới&quot;
            hoặc chuyển sang tab <strong>Tất cả tiệc nhà hàng</strong> để theo dõi lịch và nhận
            tiệc.
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {createLink}
            <Button variant="ghost" size="sm" onClick={() => view.setBookingTab('all')}>
              Xem tất cả tiệc nhà hàng ({bookings.length})
            </Button>
          </div>
        </div>
      ) : (
        <div className={emptyClass}>
          <strong className="text-base font-semibold text-foreground">
            Chưa có buổi tiệc nào trong lịch
          </strong>
          <p>
            Bấm &quot;Tạo đặt tiệc mới&quot; hoặc chọn từ danh sách yêu cầu tư vấn để tạo hồ sơ tiệc
            cưới.
          </p>
        </div>
      );
  } else if (filteredBookings.length === 0) {
    body = (
      <div className={emptyClass}>
        <strong className="text-base font-semibold text-foreground">
          Không tìm thấy tiệc cưới phù hợp
        </strong>
        <p>Không có buổi tiệc nào khớp với từ khóa tìm kiếm hoặc trạng thái lọc đã chọn.</p>
      </div>
    );
  } else {
    body = (
      <>
        <DashboardBookingsTable
          bookings={view.paginatedBookings}
          assignments={assignments}
          resolvedAccountId={resolvedAccountId}
          onClaim={onClaim}
          sortField={view.sortField}
          sortOrder={view.sortOrder}
          onSortChange={view.handleSortChange}
        />
        <TablePagination
          info={
            <span>
              Hiển thị <strong>{view.startIndex + 1}</strong> – <strong>{view.endIndex}</strong>{' '}
              trong <strong>{filteredBookings.length}</strong> kết quả đã tải tiệc cưới
            </span>
          }
          pageSize={view.pageSize}
          pageSizes={[5, 10, 20, 50]}
          onPageSize={(size) => {
            view.setPageSize(size);
            view.setCurrentPage(1);
          }}
          page={view.safeCurrentPage}
          totalPages={view.totalPages}
          onPage={view.setCurrentPage}
          navLabel="Phân trang lịch tiệc"
        />
      </>
    );
  }

  return (
    <section className={sectionClass} id="booked-events">
      <div className={sectionHeaderClass}>
        <h2 className={sectionTitleClass}>
          Lịch tiệc &amp; Sự kiện đã đặt (
          {state === 'loading'
            ? '…'
            : bookingTab === 'mine'
              ? view.myBookingsCount
              : bookings.length}
          )
        </h2>
        {createLink}
      </div>

      {lockNotice ? (
        <div
          role="status"
          className={cn(
            'flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-xs motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1',
            noticeTone[lockNotice.type],
          )}
        >
          <span>{lockNotice.message}</span>
          <button
            type="button"
            onClick={onDismissLockNotice}
            aria-label="Đóng thông báo"
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </div>
      ) : null}

      <DashboardBookingsToolbar
        bookingTab={bookingTab}
        setBookingTab={view.setBookingTab}
        myBookingsCount={view.myBookingsCount}
        totalBookingsCount={bookings.length}
        isLoading={state === 'loading'}
        searchQuery={view.searchQuery}
        setSearchQuery={view.setSearchQuery}
        phaseFilter={view.phaseFilter}
        setPhaseFilter={view.setPhaseFilter}
        sortField={view.sortField}
        sortOrder={view.sortOrder}
        onQuickSortChange={view.handleQuickSortChange}
        onResetPage={() => view.setCurrentPage(1)}
      />

      {body}

      {serverSearch.hasMore && !serverSearch.error && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          disabled={serverSearch.loading}
          onClick={() => void serverSearch.more()}
        >
          Tải thêm kết quả tìm kiếm
        </Button>
      )}
    </section>
  );
}
