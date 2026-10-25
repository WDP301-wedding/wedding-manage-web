'use client';

import Link from 'next/link';
import { OperationsShell } from '../identity-access/operations-shell';
import { intakeStyles } from './intake.styles';
import { useConsultationRequests, type SortOption } from './use-consultation-requests';
import { ConsultationKpiBar } from './consultation-kpi-bar';
import { ConsultationRequestsList } from './consultation-requests-list';

export function ConsultationRequestsPage() {
  const {
    snapshot,
    access,
    queue,
    pending,
    error,
    notice,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    load,
    act,
    logout,
    stats,
    filteredItems,
  } = useConsultationRequests();

  return (
    <OperationsShell
      activePage="consultations"
      contentId="consultation-main"
      snapshot={snapshot}
      onLogout={logout}
      pending={pending}
    >
      <main className="booking-shell" id="consultation-main">
        <header className="booking-header">
          <div>
            <p className="section-kicker">Wedding Estate · Operations</p>
            <h1>Yêu cầu tư vấn</h1>
            <p>Tiếp nhận lời nhắn và mở hồ sơ để cùng khách hàng chuẩn bị buổi tiệc.</p>
          </div>
        </header>

        {access === 'loading' && <p role="status">Đang xác minh quyền quản lý…</p>}
        {access === 'denied' && (
          <section>
            <h2>Cần tài khoản Quản lý</h2>
            <Link href="/">Đăng nhập để tiếp tục</Link>
          </section>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <div role="alert">
            <p>{error}</p>
            {access === 'manager' && (
              <button type="button" disabled={pending} onClick={() => void load()}>
                Tải lại
              </button>
            )}
          </div>
        )}

        {access === 'manager' && (
          <>
            {pending && <p role="status">Đang xử lý…</p>}
            {queue?.data.length === 0 && (
              <section>
                <h2>Chưa có yêu cầu tư vấn</h2>
                <p>Yêu cầu được gửi từ trang công khai sẽ xuất hiện tại đây.</p>
              </section>
            )}

            {queue && queue.data.length > 0 && (
              <>
                <ConsultationKpiBar
                  statusFilter={statusFilter}
                  onFilterChange={setStatusFilter}
                  stats={stats}
                />

                {/* Filter and Search Bar */}
                <div style={intakeStyles.filterBar}>
                  <div style={intakeStyles.tabList}>
                    <button
                      type="button"
                      style={intakeStyles.tabButton(statusFilter === 'ALL')}
                      onClick={() => setStatusFilter('ALL')}
                    >
                      Tất cả
                      <span style={intakeStyles.tabCountBadge(statusFilter === 'ALL')}>
                        {stats.total}
                      </span>
                    </button>
                    <button
                      type="button"
                      style={intakeStyles.tabButton(statusFilter === 'NEW')}
                      onClick={() => setStatusFilter('NEW')}
                    >
                      Chờ tiếp nhận
                      <span style={intakeStyles.tabCountBadge(statusFilter === 'NEW', '#7a1f3d')}>
                        {stats.newCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      style={intakeStyles.tabButton(statusFilter === 'CONVERTED')}
                      onClick={() => setStatusFilter('CONVERTED')}
                    >
                      Đã mở tư vấn
                      <span
                        style={intakeStyles.tabCountBadge(statusFilter === 'CONVERTED', '#2f6b4f')}
                      >
                        {stats.convertedCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      style={intakeStyles.tabButton(statusFilter === 'CLOSED')}
                      onClick={() => setStatusFilter('CLOSED')}
                    >
                      Đã kết thúc
                      <span
                        style={intakeStyles.tabCountBadge(statusFilter === 'CLOSED', '#64748b')}
                      >
                        {stats.closedCount}
                      </span>
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <input
                      type="search"
                      maxLength={120}
                      aria-label="Tìm yêu cầu trong toàn bộ danh sách"
                      placeholder="Tìm theo tên, email, sđt…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={intakeStyles.searchInput}
                    />

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}

                      aria-label="Sắp xếp danh sách"
                    >
                      <option value="newest">Mới nhận nhất</option>
                      <option value="oldest">Cũ nhất</option>
                      <option value="date-asc">Ngày tiệc gần nhất</option>
                      <option value="guests-desc">Số khách nhiều nhất</option>
                      <option value="name-asc">Tên khách (A-Z)</option>
                    </select>

                    {(statusFilter !== 'ALL' || searchQuery.trim()) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('ALL');
                          setSearchQuery('');
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--hy-wine, #7a1f3d)',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: '4px 8px',
                        }}
                      >
                        Đặt lại
                      </button>
                    )}
                  </div>
                </div>
                {filteredItems.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2.5rem 1rem',
                      background: 'var(--hy-surface-container, #fdf6ee)',
                      borderRadius: '12px',
                      border: '1px dashed var(--hy-outline, #eadfd6)',
                      color: 'var(--hy-text-muted, #6e5d63)',
                      margin: '1.5rem 0',
                    }}
                  >
                    <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
                      {pending
                        ? 'Đang tải kết quả mới…'
                        : 'Không tìm thấy yêu cầu tư vấn nào phù hợp với bộ lọc hiện tại.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter('ALL');
                        setSearchQuery('');
                      }}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--hy-wine, #7a1f3d)',
                        background: '#ffffff',
                        color: 'var(--hy-wine, #7a1f3d)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                ) : (
                  <ConsultationRequestsList
                    items={filteredItems}
                    pending={pending}
                    onAction={act}
                    nextCursor={queue.nextCursor}
                    onLoadMore={load}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
    </OperationsShell>
  );
}
