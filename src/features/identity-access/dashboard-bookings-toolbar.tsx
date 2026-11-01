'use client';

import { cn } from 'cn';
import type { BookingSortField, SortOrder } from './dashboard-bookings-table';
import { filterSelectClass, toolbarClass } from './dashboard-classes';
import { SearchField } from './table-controls';

export interface DashboardBookingsToolbarProps {
  bookingTab: 'mine' | 'all';
  setBookingTab: (tab: 'mine' | 'all') => void;
  myBookingsCount: number;
  totalBookingsCount: number;
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  phaseFilter: string;
  setPhaseFilter: (p: string) => void;
  sortField: BookingSortField;
  sortOrder: SortOrder;
  onQuickSortChange: (val: string) => void;
  onResetPage: () => void;
}

const segmentClass =
  'inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:bg-card aria-selected:font-semibold aria-selected:text-foreground aria-selected:shadow-hy-1';

export function DashboardBookingsToolbar({
  bookingTab,
  setBookingTab,
  myBookingsCount,
  totalBookingsCount,
  isLoading,
  searchQuery,
  setSearchQuery,
  phaseFilter,
  setPhaseFilter,
  sortField,
  sortOrder,
  onQuickSortChange,
  onResetPage,
}: Readonly<DashboardBookingsToolbarProps>) {
  return (
    <div className={toolbarClass}>
      <div
        role="tablist"
        aria-label="Phân loại lịch tiệc"
        className="inline-flex rounded-lg bg-secondary p-1"
      >
        <button
          type="button"
          role="tab"
          id="tab-my-bookings"
          aria-selected={bookingTab === 'mine'}
          onClick={() => setBookingTab('mine')}
          className={segmentClass}
        >
          <span>Tiệc của tôi</span>
          <span className="tabular-nums">{myBookingsCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-all-bookings"
          aria-selected={bookingTab === 'all'}
          onClick={() => setBookingTab('all')}
          className={segmentClass}
        >
          <span>Tất cả tiệc nhà hàng</span>
          <span className="tabular-nums">{isLoading ? '…' : totalBookingsCount}</span>
        </button>
      </div>

      <SearchField
        label="Tìm kiếm tiệc cưới"
        placeholder="Tìm theo mã HY, tên cô dâu chú rể, người đặt, SĐT, email, sảnh…"
        value={searchQuery}
        onChange={(value) => {
          setSearchQuery(value);
          onResetPage();
        }}
      />
      <select
        value={phaseFilter}
        onChange={(e) => {
          setPhaseFilter(e.target.value);
          onResetPage();
        }}
        aria-label="Lọc theo trạng thái tiệc"
        className={filterSelectClass}
      >
        <option value="ALL">Tất cả trạng thái</option>
        <option value="CONFIRMED">Đã xác nhận</option>
        <option value="AWAITING_DEPOSIT">Chờ cọc</option>
        <option value="DRAFT">Bản nháp</option>
        <option value="COMPLETED">Hoàn thành</option>
        <option value="CANCELLED">Đã hủy</option>
      </select>
      <select
        value={`${sortField}-${sortOrder}`}
        onChange={(e) => onQuickSortChange(e.target.value)}
        aria-label="Sắp xếp danh sách"
        className={cn(filterSelectClass)}
      >
        <option value="recency-desc">Độ mới: Mới nhất trước</option>
        <option value="recency-asc">Độ mới: Cũ nhất trước</option>
        <option value="eventDate-asc">Ngày tiệc: Gần nhất trước</option>
        <option value="eventDate-desc">Ngày tiệc: Xa nhất trước</option>
        <option value="tableCount-desc">Quy mô: Nhiều bàn nhất</option>
        <option value="tableCount-asc">Quy mô: Ít bàn nhất</option>
        <option value="hallName-asc">Sảnh: A → Z</option>
        <option value="hallName-desc">Sảnh: Z → A</option>
        <option value="phase-asc">Trạng thái: A → Z</option>
      </select>
    </div>
  );
}
