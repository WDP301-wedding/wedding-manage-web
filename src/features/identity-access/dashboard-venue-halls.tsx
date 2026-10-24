'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PublicHall } from '../../services/catalog.service';
import { dashboardStyles } from './dashboard.styles';

export type HallSortField = 'name' | 'maxGuests';
export type SortOrder = 'asc' | 'desc';

export function DashboardVenueHalls({
  halls,
  isManager = false,
}: Readonly<{
  halls: readonly PublicHall[];
  isManager?: boolean;
}>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<HallSortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const handleSortChange = (field: HallSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'maxGuests' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleQuickSortChange = (val: string) => {
    const [f, o] = val.split('-') as [HallSortField, SortOrder];
    setSortField(f);
    setSortOrder(o);
    setCurrentPage(1);
  };

  const filteredHalls = useMemo(() => {
    if (!searchQuery.trim()) return halls;
    const q = searchQuery.toLowerCase().trim();
    return halls.filter(
      (h) =>
        (h.name || '').toLowerCase().includes(q) || (h.description || '').toLowerCase().includes(q),
    );
  }, [halls, searchQuery]);

  const sortedHalls = useMemo(() => {
    return [...filteredHalls].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '', 'vi');
      } else if (sortField === 'maxGuests') {
        cmp = (a.maxGuests || 0) - (b.maxGuests || 0);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredHalls, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedHalls.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedHalls.length);
  const paginatedHalls = sortedHalls.slice(startIndex, endIndex);

  return (
    <section className="schedule-panel dashboard-schedule" id="available-halls">
      <div className="section-heading">
        <div>
          <p className="section-kicker" style={{ color: 'var(--hy-wine, #7a1f3d)' }}>
            Không gian tiệc
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--hy-text, #2b1d22)' }}>
            Danh mục sảnh cưới khả dụng ({halls.length})
          </h2>
        </div>
        {isManager ? (
          <Link
            className="text-button"
            href="/catalog"
            prefetch={false}
            style={{ color: 'var(--hy-wine, #7a1f3d)', fontWeight: 600 }}
          >
            Quản lý danh mục →
          </Link>
        ) : null}
      </div>

      {halls.length === 0 ? (
        <div
          className="booking-empty"
          style={{
            padding: '2.5rem 1rem',
            textAlign: 'center',
            background: 'var(--hy-surface, #ffffff)',
            borderRadius: '12px',
            border: '1px dashed var(--hy-outline, #eadfd6)',
            color: 'var(--hy-text-muted, #6e5d63)',
          }}
        >
          <p style={{ margin: 0 }}>Không có sảnh cưới nào đang mở trong hệ thống.</p>
        </div>
      ) : (
        <>
          {/* Filter & Sort Bar */}
          <div style={dashboardStyles.filterBar}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                placeholder="Tìm sảnh tiệc, mô tả…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Tìm kiếm sảnh cưới"
                style={dashboardStyles.searchInput}
              />

              <select
                value={`${sortField}-${sortOrder}`}
                onChange={(e) => handleQuickSortChange(e.target.value)}
                aria-label="Sắp xếp danh mục sảnh"
              >
                <option value="name-asc">Tên sảnh: A → Z</option>
                <option value="name-desc">Tên sảnh: Z → A</option>
                <option value="maxGuests-desc">Sức chứa: Nhiều nhất trước</option>
                <option value="maxGuests-asc">Sức chứa: Ít nhất trước</option>
              </select>
            </div>
          </div>

          {sortedHalls.length === 0 ? (
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
                Không tìm thấy sảnh cưới nào phù hợp với từ khóa tìm kiếm.
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table
                aria-label="Danh mục sảnh tiệc"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  background: 'var(--hy-surface, #ffffff)',
                  borderRadius: '12px',
                  border: '1px solid var(--hy-outline, #eadfd6)',
                  overflow: 'hidden',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: 'var(--hy-surface-container, #fdf6ee)',
                      borderBottom: '1px solid var(--hy-outline, #eadfd6)',
                    }}
                  >
                    <th scope="col" style={{ padding: '0.75rem 1rem' }}>
                      <button
                        type="button"
                        onClick={() => handleSortChange('name')}
                        style={dashboardStyles.thSortButton}
                        title="Sắp xếp theo tên sảnh"
                      >
                        <span>Tên sảnh</span>
                        <span style={dashboardStyles.sortIcon(sortField === 'name')}>
                          {sortField === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                    <th scope="col" style={{ padding: '0.75rem 1rem' }}>
                      <button
                        type="button"
                        onClick={() => handleSortChange('maxGuests')}
                        style={dashboardStyles.thSortButton}
                        title="Sắp xếp theo sức chứa"
                      >
                        <span>Sức chứa tối đa</span>
                        <span style={dashboardStyles.sortIcon(sortField === 'maxGuests')}>
                          {sortField === 'maxGuests' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                    <th
                      scope="col"
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        color: 'var(--hy-text-muted, #6e5d63)',
                        fontWeight: 600,
                      }}
                    >
                      Trạng thái hoạt động
                    </th>
                    <th
                      scope="col"
                      style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        color: 'var(--hy-text-muted, #6e5d63)',
                        fontWeight: 600,
                      }}
                    >
                      Mô tả
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHalls.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--hy-outline, #eadfd6)' }}>
                      <td
                        style={{
                          padding: '0.75rem 1rem',
                          fontWeight: 600,
                          color: 'var(--hy-text, #2b1d22)',
                        }}
                      >
                        {h.name}
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 1rem',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--hy-text, #2b1d22)',
                        }}
                      >
                        {h.maxGuests} khách
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          className="status status-ready"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'var(--hy-status-success-bg, #e7f1ea)',
                            color: 'var(--hy-status-success, #2f6b4f)',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                          }}
                        >
                          Đang hoạt động
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '0.75rem 1rem',
                          maxWidth: '300px',
                          color: 'var(--hy-text-muted, #6e5d63)',
                          fontSize: '0.875rem',
                        }}
                      >
                        {h.description || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sortedHalls.length > 0 && (
            <div style={dashboardStyles.paginationContainer}>
              <div style={dashboardStyles.paginationInfo}>
                <span>
                  Hiển thị <strong>{startIndex + 1}</strong> – <strong>{endIndex}</strong> /{' '}
                  <strong>{sortedHalls.length}</strong> sảnh tiệc
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
                  </select>
                </label>
              </div>

              {totalPages > 1 && (
                <div
                  style={dashboardStyles.paginationButtonGroup}
                  role="navigation"
                  aria-label="Phân trang sảnh cưới"
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
