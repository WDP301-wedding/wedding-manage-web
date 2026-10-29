'use client';

import Link from 'next/link';
import type { BookingAssignmentsRegistry } from './booking-assignments';
import { dashboardStyles } from './dashboard.styles';
import { DashboardBookingsTable } from './dashboard-bookings-table';
import { StaffCheckinBanner } from './staff-checkin-banner';
import { CopyButton } from './copy-button';
import { useDashboardBookings, type DashboardBookingItem } from './use-dashboard-bookings';
import { DashboardBookingsToolbar } from './dashboard-bookings-toolbar';

export type { DashboardBookingItem };
export { CopyButton };
export type DashboardState = 'loading' | 'error' | 'success';

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
  const {
    serverSearch,
    bookingTab,
    setBookingTab,
    searchQuery,
    setSearchQuery,
    phaseFilter,
    setPhaseFilter,
    sortField,
    sortOrder,
    handleSortChange,
    handleQuickSortChange,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    myBookingsCount,
    currentTabBookings,
    filteredBookings,
    totalPages,
    safeCurrentPage,
    startIndex,
    endIndex,
    paginatedBookings,
  } = useDashboardBookings({
    bookings,
    assignments,
    resolvedAccountId,
  });

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
        <Link className="text-button" href="/bookings" prefetch={false}>
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
      <DashboardBookingsToolbar
        bookingTab={bookingTab}
        setBookingTab={setBookingTab}
        myBookingsCount={myBookingsCount}
        totalBookingsCount={bookings.length}
        isLoading={state === 'loading'}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        phaseFilter={phaseFilter}
        setPhaseFilter={setPhaseFilter}
        sortField={sortField}
        sortOrder={sortOrder}
        onQuickSortChange={handleQuickSortChange}
        onResetPage={() => setCurrentPage(1)}
      />

      {serverSearch.error ? (
        <div role="alert" className="booking-empty">
          <p>{serverSearch.error}</p>
          <button type="button" onClick={serverSearch.retry}>
            Tìm lại từ đầu
          </button>
        </div>
      ) : state === 'loading' || serverSearch.loading ? (
        <div
          style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            color: 'var(--hy-text-muted, #6e5d63)',
          }}
        >
          <p>Đang đồng bộ danh sách tiệc cưới từ máy chủ…</p>
        </div>
      ) : currentTabBookings.length === 0 && !searchQuery.trim() ? (
        bookingTab === 'mine' ? (
          <div className="booking-empty" style={dashboardStyles.emptyCard}>
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
                <strong>{endIndex}</strong> trong <strong>{filteredBookings.length}</strong> kết quả
                đã tải tiệc cưới
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
      {serverSearch.hasMore && !serverSearch.error && (
        <button
          type="button"
          disabled={serverSearch.loading}
          onClick={() => void serverSearch.more()}
        >
          Tải thêm kết quả tìm kiếm
        </button>
      )}
    </section>
  );
}
