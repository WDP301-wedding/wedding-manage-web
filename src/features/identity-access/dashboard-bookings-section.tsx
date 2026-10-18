'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { AnalyticsBookingsData } from '../../services/analytics.service';
import type { BookingAssignmentsRegistry } from './booking-assignments';
import { dashboardStyles } from './dashboard.styles';
import type { BookingSortField, SortOrder } from './dashboard-bookings-table';
import { DashboardBookingsTable } from './dashboard-bookings-table';
import { StaffCheckinBanner } from './staff-checkin-banner';

export type DashboardBookingItem = AnalyticsBookingsData['items'][number];
export type DashboardState = 'loading' | 'error' | 'success';

export function CopyButton({ text }: Readonly<{ text: string }>) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Đã sao chép UUID!' : 'Sao chép mã UUID'}
      style={dashboardStyles.copyButton(copied)}
      aria-label="Sao chép UUID"
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}

export interface DashboardBookingsSectionProps {
  isManager: boolean;
  state: DashboardState;
  bookings: readonly DashboardBookingItem[];
  assignments: BookingAssignmentsRegistry;
  resolvedAccountId: string;
  onClaim: (bookingId: string, hallName?: string) => void;
  lockNotice: {
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null;
  onDismissLockNotice: () => void;
}

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
  const [userSelectedTab, setUserSelectedTab] = useState<'mine' | 'all' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [sortField, setSortField] = useState<BookingSortField>('eventDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isMine = useCallback(
    (bId: string) => assignments[bId]?.assignedAccountId === resolvedAccountId,
    [assignments, resolvedAccountId],
  );

  const myBookings = bookings.filter((b) => isMine(b.bookingId));
  const myBookingsCount = myBookings.length;
  const bookingTab = userSelectedTab ?? (myBookingsCount > 0 ? 'mine' : 'all');
  const setBookingTab = (tab: 'mine' | 'all') => {
    setUserSelectedTab(tab);
    setCurrentPage(1);
  };

  const handleSortChange = (field: BookingSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'tableCount' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleQuickSortChange = (val: string) => {
    const [f, o] = val.split('-') as [BookingSortField, SortOrder];
    setSortField(f);
    setSortOrder(o);
    setCurrentPage(1);
  };

  const currentTabBookings = bookingTab === 'mine' ? myBookings : bookings;

  const filteredBookings = currentTabBookings.filter((b) => {
    if (phaseFilter !== 'ALL' && b.phase !== phaseFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const hallMatch = (b.hallNameSnapshot || '').toLowerCase().includes(q);
      const idMatch = b.bookingId.toLowerCase().includes(q);
      const emailMatch = (assignments[b.bookingId]?.assignedEmail || '').toLowerCase().includes(q);
      return hallMatch || idMatch || emailMatch;
    }
    return true;
  });

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'eventDate') {
      const timeA = new Date(a.eventDate).getTime();
      const timeB = new Date(b.eventDate).getTime();
      cmp = timeA - timeB;
      if (cmp === 0) {
        cmp = a.shiftCode.localeCompare(b.shiftCode);
      }
    } else if (sortField === 'hallName') {
      cmp = (a.hallNameSnapshot || '').localeCompare(b.hallNameSnapshot || '', 'vi');
    } else if (sortField === 'tableCount') {
      cmp = (a.tableCount || 0) - (b.tableCount || 0);
    } else if (sortField === 'shiftCode') {
      cmp = a.shiftCode.localeCompare(b.shiftCode);
    } else if (sortField === 'phase') {
      cmp = a.phase.localeCompare(b.phase);
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sortedBookings.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedBookings.length);
  const paginatedBookings = sortedBookings.slice(startIndex, endIndex);

  if (!isManager) {
    return <StaffCheckinBanner />;
  }

  return (
    <section
      className="schedule-panel dashboard-schedule"
      id="booked-events"
      style={dashboardStyles.scheduleSection}
    >
      <div className="section-heading" style={dashboardStyles.sectionHeading}>
        <div>
          <p className="section-kicker">Vận hành tiệc cưới</p>
          <h2>
            Lịch tiệc &amp; Sự kiện đã đặt (
            {state === 'loading' ? '…' : bookingTab === 'mine' ? myBookingsCount : bookings.length})
          </h2>
        </div>
        <Link className="text-button" href="/bookings">
          + Tạo đặt tiệc mới
        </Link>
      </div>

      {/* Thông báo tiếp nhận & khóa tiệc */}
      {lockNotice ? (
        <div role="status" style={dashboardStyles.lockNotice(lockNotice.type)}>
          <span>{lockNotice.message}</span>
          <button
            type="button"
            onClick={onDismissLockNotice}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'inherit',
              marginLeft: '8px',
            }}
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* Bộ lọc chuyển tab & tìm kiếm & sắp xếp */}
      <div style={dashboardStyles.filterBar}>
        {/* Tab Switcher */}
        <div role="tablist" aria-label="Phan loai lich tiec" style={dashboardStyles.tabList}>
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
              {state === 'loading' ? '…' : bookings.length}
            </span>
          </button>
        </div>

        {/* Quick Filter: Search + Status + Sort */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Tìm sảnh tiệc, UUID…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Tìm kiếm tiệc cưới"
            style={dashboardStyles.searchInput}
          />
          <select
            value={phaseFilter}
            onChange={(e) => {
              setPhaseFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Lọc theo trạng thái tiệc"
            style={dashboardStyles.selectFilter}
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
            onChange={(e) => handleQuickSortChange(e.target.value)}
            aria-label="Sắp xếp danh sách"
            style={dashboardStyles.selectFilter}
          >
            <option value="eventDate-asc">📅 Ngày tiệc: Gần nhất trước</option>
            <option value="eventDate-desc">📅 Ngày tiệc: Xa nhất trước</option>
            <option value="tableCount-desc">👥 Quy mô: Nhiều bàn nhất</option>
            <option value="tableCount-asc">👥 Quy mô: Ít bàn nhất</option>
            <option value="hallName-asc">🏛️ Sảnh: A → Z</option>
            <option value="hallName-desc">🏛️ Sảnh: Z → A</option>
            <option value="phase-asc">🏷️ Trạng thái: A → Z</option>
          </select>
        </div>
      </div>

      {state === 'loading' ? (
        <div
          style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            color: 'var(--hy-text-muted, #6e5d63)',
          }}
        >
          <p>Đang đồng bộ danh sách tiệc cưới từ máy chủ…</p>
        </div>
      ) : currentTabBookings.length === 0 ? (
        bookingTab === 'mine' ? (
          <div className="booking-empty" style={dashboardStyles.emptyCard}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <strong
              style={{
                fontSize: '1.05rem',
                color: 'var(--hy-wine, #7a1f3d)',
                display: 'block',
                marginBottom: '0.35rem',
              }}
            >
              Chưa có buổi tiệc nào trong &quot;Tiệc của tôi&quot;
            </strong>
            <p
              style={{
                color: 'var(--hy-text-muted, #6e5d63)',
                maxWidth: '520px',
                margin: '0 auto 1.25rem',
                lineHeight: 1.5,
              }}
            >
              Bạn chưa nhận phụ trách hoặc tạo tiệc cưới nào. Hãy bấm &quot;Tạo đặt tiệc mới&quot;
              hoặc chuyển sang tab <strong>Tất cả tiệc nhà hàng</strong> để theo dõi lịch và nhận
              tiệc.
            </p>
            <div
              style={{
                display: 'inline-flex',
                gap: '0.75rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <Link
                className="primary-button"
                href="/bookings"
                style={{ padding: '6px 14px', fontSize: '0.85rem', textDecoration: 'none' }}
              >
                + Tạo đặt tiệc mới
              </Link>
              <button
                type="button"
                className="text-button"
                onClick={() => setBookingTab('all')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  background: '#ffffff',
                  border: '1px solid var(--hy-outline, #eadfd6)',
                  color: 'var(--hy-text, #2b1d22)',
                }}
              >
                Xem tất cả tiệc nhà hàng ({bookings.length}) →
              </button>
            </div>
          </div>
        ) : (
          <div className="booking-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <strong>Chưa có buổi tiệc nào trong lịch</strong>
            <p>
              Bấm &quot;Tạo đặt tiệc mới&quot; hoặc chọn từ danh sách yêu cầu tư vấn để tạo hồ sơ
              tiệc cưới.
            </p>
          </div>
        )
      ) : filteredBookings.length === 0 ? (
        <div className="booking-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <strong>Không tìm thấy tiệc cưới phù hợp</strong>
          <p>Không có buổi tiệc nào khớp với từ khóa tìm kiếm hoặc trạng thái lọc đã chọn.</p>
        </div>
      ) : (
        <>
          <DashboardBookingsTable
            bookings={paginatedBookings}
            assignments={assignments}
            resolvedAccountId={resolvedAccountId}
            onClaim={onClaim}
            sortField={sortField}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />

          {/* Thanh phân trang kiểm soát quy mô */}
          <div style={dashboardStyles.paginationContainer}>
            <div style={dashboardStyles.paginationInfo}>
              <span>
                Hiển thị <strong>{filteredBookings.length === 0 ? 0 : startIndex + 1}</strong> –{' '}
                <strong>{endIndex}</strong> trên tổng số <strong>{filteredBookings.length}</strong>{' '}
                tiệc cưới
              </span>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginLeft: '8px',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--hy-text-muted, #6e5d63)' }}>
                  Hiển thị:
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={dashboardStyles.pageSizeSelect}
                  aria-label="Số dòng hiển thị mỗi trang"
                >
                  <option value={5}>5 / trang</option>
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
              </label>
            </div>

            {totalPages > 1 ? (
              <div
                style={dashboardStyles.paginationButtonGroup}
                role="navigation"
                aria-label="Phân trang lịch tiệc"
              >
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  style={dashboardStyles.paginationNavButton(safeCurrentPage === 1)}
                  title="Trang đầu"
                  aria-label="Trang đầu"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={dashboardStyles.paginationNavButton(safeCurrentPage === 1)}
                  title="Trang trước"
                  aria-label="Trang trước"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    totalPages > 7 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - safeCurrentPage) > 2
                  ) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return (
                        <span
                          key={`ellipsis-${pageNum}`}
                          style={{ padding: '0 4px', color: 'var(--hy-text-muted, #6e5d63)' }}
                        >
                          …
                        </span>
                      );
                    }
                    return null;
                  }
                  const isActive = pageNum === safeCurrentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      style={dashboardStyles.paginationPageButton(isActive)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={dashboardStyles.paginationNavButton(safeCurrentPage === totalPages)}
                  title="Trang sau"
                  aria-label="Trang sau"
                >
                  ›
                </button>
                <button
                  type="button"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  style={dashboardStyles.paginationNavButton(safeCurrentPage === totalPages)}
                  title="Trang cuối"
                  aria-label="Trang cuối"
                >
                  »
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
