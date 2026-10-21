'use client';

import Link from 'next/link';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import type { DashboardState } from './dashboard-bookings-section';
import { DashboardConsultationsTable } from './dashboard-consultations-table';
import { dashboardStyles } from './dashboard.styles';
import {
  type ConsultationSortField,
  type SortOrder,
  useDashboardConsultations,
} from './use-dashboard-consultations';

export type { ConsultationSortField, SortOrder };

export interface DashboardConsultationsSectionProps {
  isManager: boolean;
  state: DashboardState;
  consultations: readonly ConsultationRequestItem[];
}

export function DashboardConsultationsSection({
  isManager,
  state,
  consultations,
}: Readonly<DashboardConsultationsSectionProps>) {
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortField,
    sortOrder,
    pageSize,
    setPageSize,
    handleSortChange,
    handleQuickSortChange,
    sortedConsultations,
    paginatedConsultations,
    totalPages,
    safeCurrentPage,
    startIndex,
    endIndex,
    setCurrentPage,
  } = useDashboardConsultations(consultations);

  return (
    <section className="schedule-panel dashboard-schedule" id="upcoming-events">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Hồ sơ tiếp nhận</p>
          <h2>Yêu cầu tư vấn gần đây</h2>
        </div>
        {isManager ? (
          <Link className="text-button" href="/consultation-requests">
            Xem toàn bộ ({state === 'loading' ? '…' : consultations.length})
          </Link>
        ) : null}
      </div>

      {state === 'loading' ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#5d665f' }}>
          <p>Đang đồng bộ danh sách yêu cầu tư vấn từ máy chủ…</p>
        </div>
      ) : consultations.length === 0 ? (
        <div className="booking-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <strong>Chưa có yêu cầu tư vấn nào được ghi nhận</strong>
          <p>Khách hàng đăng ký tư vấn qua website sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <>
          {/* Quick Filter: Search + Status + Sort */}
          <div style={dashboardStyles.filterBar}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                placeholder="Tìm theo tên, email, sđt…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Tìm kiếm yêu cầu tư vấn"
                style={dashboardStyles.searchInput}
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Lọc theo trạng thái yêu cầu"
                style={dashboardStyles.selectFilter}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="NEW">Chờ xử lý</option>
                <option value="CONVERTED">Đã chuyển đổi</option>
                <option value="CLOSED">Đã đóng</option>
              </select>

              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => handleQuickSortChange(e.target.value)}
                aria-label="Sắp xếp yêu cầu tư vấn"
                style={dashboardStyles.selectFilter}
              >
                <option value="createdAt-desc">📅 Ngày đăng ký: Mới nhất</option>
                <option value="createdAt-asc">📅 Ngày đăng ký: Cũ nhất</option>
                <option value="displayName-asc">👤 Khách hàng: A → Z</option>
                <option value="displayName-desc">👤 Khách hàng: Z → A</option>
                <option value="preferredDate-asc">🎉 Ngày dự kiến: Gần nhất</option>
                <option value="status-asc">🏷️ Trạng thái: A → Z</option>
              </select>
            </div>
          </div>

          {sortedConsultations.length === 0 ? (
            <div
              className="booking-empty"
              style={{
                padding: '2rem 1rem',
                textAlign: 'center',
                background: 'var(--hy-surface-container, #fdf6ee)',
                borderRadius: '8px',
                border: '1px dashed var(--hy-outline, #eadfd6)',
                margin: '1rem 0',
              }}
            >
              <p style={{ margin: 0, color: 'var(--hy-text-muted, #6e5d63)' }}>
                Không tìm thấy yêu cầu tư vấn phù hợp với điều kiện lọc.
              </p>
            </div>
          ) : (
            <DashboardConsultationsTable
              items={paginatedConsultations}
              sortField={sortField}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
            />
          )}

          {sortedConsultations.length > 0 && (
            <div style={dashboardStyles.paginationContainer}>
              <div style={dashboardStyles.paginationInfo}>
                <span>
                  Hiển thị <strong>{startIndex + 1}</strong> – <strong>{endIndex}</strong> /{' '}
                  <strong>{sortedConsultations.length}</strong> yêu cầu tư vấn
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
                  </select>
                </label>
              </div>

              {totalPages > 1 && (
                <div
                  style={dashboardStyles.paginationButtonGroup}
                  role="navigation"
                  aria-label="Phân trang yêu cầu tư vấn"
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
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
