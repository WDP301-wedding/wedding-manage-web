'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import { CopyButton, type DashboardState } from './dashboard-bookings-section';
import { dashboardStyles } from './dashboard.styles';

export type ConsultationSortField = 'createdAt' | 'displayName' | 'preferredDate' | 'status';
export type SortOrder = 'asc' | 'desc';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortField, setSortField] = useState<ConsultationSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const handleSortChange = (field: ConsultationSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleQuickSortChange = (val: string) => {
    const [f, o] = val.split('-') as [ConsultationSortField, SortOrder];
    setSortField(f);
    setSortOrder(o);
    setCurrentPage(1);
  };

  const filteredConsultations = useMemo(() => {
    return consultations.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (item.displayName || '').toLowerCase().includes(q);
        const emailMatch = (item.email || '').toLowerCase().includes(q);
        const phoneMatch = (item.phone || '').toLowerCase().includes(q);
        const idMatch = (item.consultationId || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || idMatch;
      }
      return true;
    });
  }, [consultations, statusFilter, searchQuery]);

  const sortedConsultations = useMemo(() => {
    return [...filteredConsultations].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'createdAt') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = timeA - timeB;
      } else if (sortField === 'displayName') {
        cmp = (a.displayName || '').localeCompare(b.displayName || '', 'vi');
      } else if (sortField === 'preferredDate') {
        if (!a.preferredDate && !b.preferredDate) cmp = 0;
        else if (!a.preferredDate) cmp = 1;
        else if (!b.preferredDate) cmp = -1;
        else cmp = new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime();
      } else if (sortField === 'status') {
        cmp = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredConsultations, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedConsultations.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedConsultations.length);
  const paginatedConsultations = sortedConsultations.slice(startIndex, endIndex);

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
            <div className="table-scroll">
              <table aria-label="Danh sách yêu cầu tư vấn gần đây">
                <thead>
                  <tr>
                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => handleSortChange('createdAt')}
                        style={dashboardStyles.thSortButton}
                        title="Sắp xếp theo ngày đăng ký"
                      >
                        <span>Ngày đăng ký</span>
                        <span style={dashboardStyles.sortIcon(sortField === 'createdAt')}>
                          {sortField === 'createdAt' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => handleSortChange('displayName')}
                        style={dashboardStyles.thSortButton}
                        title="Sắp xếp theo khách hàng"
                      >
                        <span>Khách hàng</span>
                        <span style={dashboardStyles.sortIcon(sortField === 'displayName')}>
                          {sortField === 'displayName' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                    <th scope="col">Mã hồ sơ</th>
                    <th scope="col">Số điện thoại</th>
                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => handleSortChange('preferredDate')}
                        style={dashboardStyles.thSortButton}
                        title="Sắp xếp theo ngày dự kiến"
                      >
                        <span>Ngày dự kiến</span>
                        <span style={dashboardStyles.sortIcon(sortField === 'preferredDate')}>
                          {sortField === 'preferredDate' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => handleSortChange('status')}
                        style={dashboardStyles.thSortButton}
                        title="Sắp xếp theo trạng thái"
                      >
                        <span>Trạng thái</span>
                        <span style={dashboardStyles.sortIcon(sortField === 'status')}>
                          {sortField === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedConsultations.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString('vi-VN')
                            : 'Hôm nay'}
                        </strong>
                      </td>
                      <td>
                        <strong>{item.displayName || 'Khách vãng lai'}</strong>
                        <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>
                          {item.email}
                        </span>
                      </td>
                      <td>
                        {item.consultationId ? (
                          <div
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <code
                              style={{
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                background: '#f1f5f9',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                maxWidth: '170px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              }}
                              title={item.consultationId}
                            >
                              {item.consultationId}
                            </code>
                            <CopyButton text={item.consultationId} />
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Chưa cấp mã</span>
                        )}
                      </td>
                      <td>{item.phone || '—'}</td>
                      <td>{item.preferredDate || 'Chưa định ngày'}</td>
                      <td>
                        <span
                          className={`status ${
                            item.status === 'CONVERTED'
                              ? 'status-ready'
                              : item.status === 'CLOSED'
                                ? 'status-closed'
                                : 'status-review'
                          }`}
                        >
                          {item.status === 'CONVERTED'
                            ? 'Đã chuyển đổi'
                            : item.status === 'CLOSED'
                              ? 'Đã đóng'
                              : 'Chờ xử lý'}
                        </span>
                      </td>
                      <td>
                        {item.status === 'CONVERTED' && item.consultationId ? (
                          <Link
                            className="booking-primary-link"
                            href={`/bookings?consultationId=${item.consultationId}&consultationRevision=${item.consultationRevision ?? 1}`}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                              textDecoration: 'none',
                            }}
                          >
                            Đặt tiệc →
                          </Link>
                        ) : item.status === 'NEW' ? (
                          <Link
                            href="/consultation-requests"
                            style={{
                              fontSize: '0.8rem',
                              color: '#047857',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                            }}
                          >
                            Xử lý →
                          </Link>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
