'use client';

import { dashboardStyles } from './dashboard.styles';
import type { BookingSortField, SortOrder } from './dashboard-bookings-table';

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
    <div style={dashboardStyles.filterBar}>
      {/* Tab Switcher */}
      <div role="tablist" aria-label="Phân loại lịch tiệc" style={dashboardStyles.tabList}>
        <button
          type="button"
          role="tab"
          id="tab-my-bookings"
          aria-selected={bookingTab === 'mine'}
          onClick={() => setBookingTab('mine')}
          style={dashboardStyles.tabButton(bookingTab === 'mine')}
        >
          <span>Tiệc của tôi</span>
          <span style={dashboardStyles.tabCountBadge(bookingTab === 'mine', true)}>
            {myBookingsCount}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-all-bookings"
          aria-selected={bookingTab === 'all'}
          onClick={() => setBookingTab('all')}
          style={dashboardStyles.tabButton(bookingTab === 'all')}
        >
          <span>Tất cả tiệc nhà hàng</span>
          <span style={dashboardStyles.tabCountBadge(bookingTab === 'all', false)}>
            {isLoading ? '…' : totalBookingsCount}
          </span>
        </button>
      </div>

      {/* Quick Filter: Search + Status + Sort */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="Tìm theo mã HY, tên cô dâu chú rể, người đặt, SĐT, email, sảnh…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            onResetPage();
          }}
          aria-label="Tìm kiếm tiệc cưới"
          style={dashboardStyles.searchInput}
        />
        <select
          value={phaseFilter}
          onChange={(e) => {
            setPhaseFilter(e.target.value);
            onResetPage();
          }}
          aria-label="Lọc theo trạng thái tiệc"
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
        >
          <option value="eventDate-asc">Ngày tiệc: Gần nhất trước</option>
          <option value="eventDate-desc">Ngày tiệc: Xa nhất trước</option>
          <option value="tableCount-desc">Quy mô: Nhiều bàn nhất</option>
          <option value="tableCount-asc">Quy mô: Ít bàn nhất</option>
          <option value="hallName-asc">Sảnh: A → Z</option>
          <option value="hallName-desc">Sảnh: Z → A</option>
          <option value="phase-asc">Trạng thái: A → Z</option>
        </select>
      </div>
    </div>
  );
}
