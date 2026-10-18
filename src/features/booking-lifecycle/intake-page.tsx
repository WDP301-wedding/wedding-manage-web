'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createApiClient, ApiClientError } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
import {
  createIdentityApi,
  ManagementIdentitySession,
  sharedManagementSession,
} from '../identity-access/session';
import type { ManagementSessionSnapshot } from '../identity-access/session';
import { OperationsShell } from '../identity-access/operations-shell';
import { intakeStyles } from './intake.styles';

const session = sharedManagementSession;
let resolvedApi: ReturnType<typeof createApiClient> | undefined;
const getApi = () => (resolvedApi ??= createApiClient());
type Queue = components['schemas']['ConsultationRequestList'];
type Item = Queue['data'][number];

type StatusFilter = 'ALL' | 'NEW' | 'CONVERTED' | 'CLOSED';
type SortOption = 'newest' | 'oldest' | 'date-asc' | 'guests-desc' | 'name-asc';

export function ConsultationRequestsPage() {
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  const [access, setAccess] = useState<'loading' | 'manager' | 'denied'>('loading');
  const [queue, setQueue] = useState<Queue | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filter & sort state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const load = useCallback(async (cursor?: string) => {
    setPending(true);
    setError(null);
    try {
      const result = await session.authorize((token) =>
        getApi().GET('/management/consultation-requests', {
          headers: { Authorization: `Bearer ${token}` },
          params: { query: { limit: 20, ...(cursor ? { cursor } : {}) } },
        }),
      );
      if (!result.data) throw new Error('Không tải được danh sách.');
      const page: Queue = {
        ...result.data,
        data: Array.from(result.data.data, (item) => ({ ...item })),
      };
      setQueue((previous) =>
        cursor && previous ? { ...page, data: [...previous.data, ...page.data] } : page,
      );
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403].includes(caught.status ?? 0)) {
        setQueue(null);
        setAccess('denied');
      }
      setError('Không tải được yêu cầu tư vấn. Hãy thử lại.');
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void session
      .restore()
      .then((snapshot) => {
        if (!active) return;
        setSnapshot(snapshot);
        if (snapshot.status !== 'authenticated' || snapshot.presentation !== 'manager') {
          setAccess('denied');
          return;
        }
        setAccess('manager');
        void load();
      })
      .catch(() => {
        if (active) setAccess('denied');
      });
    return () => {
      active = false;
    };
  }, [load]);

  async function act(item: Item, action: 'conversion' | 'closure') {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await session.authorize((token) =>
        action === 'conversion'
          ? getApi().POST('/management/consultation-requests/{id}/conversion', {
              headers: { Authorization: `Bearer ${token}` },
              params: { path: { id: item.id } },
            })
          : getApi().POST('/management/consultation-requests/{id}/closure', {
              headers: { Authorization: `Bearer ${token}` },
              params: { path: { id: item.id } },
            }),
      );
      setNotice(
        action === 'conversion'
          ? 'Đã mở hồ sơ tư vấn. Chọn Tiếp tục đặt tiệc để gửi lời mời và chuẩn bị đề xuất.'
          : 'Đã đóng yêu cầu tư vấn.',
      );
      await load();
    } catch (caught) {
      if (caught instanceof ApiClientError && [401, 403].includes(caught.status ?? 0)) {
        setQueue(null);
        setAccess('denied');
      }
      setError('Không hoàn tất được thao tác. Tải lại để kiểm tra trạng thái mới nhất.');
    } finally {
      setPending(false);
    }
  }

  const logout = () => {
    setPending(true);
    setError(null);
    setNotice(null);
    void session
      .logout()
      .catch(() =>
        setError('Không thể kết nối máy chủ để đăng xuất. Hãy tải lại trang rồi thử lại.'),
      )
      .finally(() => {
        setSnapshot(session.snapshot());
        setQueue(null);
        setAccess('denied');
        setPending(false);
      });
  };

  // KPI stats
  const stats = useMemo(() => {
    const data = queue?.data ?? [];
    return {
      total: data.length,
      newCount: data.filter((i) => i.status === 'NEW').length,
      convertedCount: data.filter((i) => i.status === 'CONVERTED').length,
      closedCount: data.filter((i) => i.status === 'CLOSED').length,
    };
  }, [queue?.data]);

  // Filtered and sorted data
  const filteredItems = useMemo(() => {
    if (!queue?.data) return [];
    let list = [...queue.data];

    if (statusFilter !== 'ALL') {
      list = list.filter((item) => item.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.displayName ?? '').toLowerCase().includes(q) ||
          (item.email ?? '').toLowerCase().includes(q) ||
          (item.phone ?? '').toLowerCase().includes(q) ||
          (item.message ?? '').toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date-asc': {
          if (!a.preferredDate && !b.preferredDate) return 0;
          if (!a.preferredDate) return 1;
          if (!b.preferredDate) return -1;
          return new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime();
        }
        case 'guests-desc':
          return (b.expectedGuests ?? 0) - (a.expectedGuests ?? 0);
        case 'name-asc':
          return (a.displayName ?? '').localeCompare(b.displayName ?? '', 'vi');
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [queue?.data, statusFilter, searchQuery, sortBy]);

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
                {/* KPI Summary Cards */}
                <div style={intakeStyles.kpiGrid}>
                  <div
                    style={intakeStyles.kpiCard(statusFilter === 'ALL')}
                    onClick={() => setStatusFilter('ALL')}
                    role="button"
                    tabIndex={0}
                    aria-label={`Thẻ thống kê: Tổng yêu cầu (${stats.total})`}
                  >
                    <span style={intakeStyles.kpiLabel}>TỔNG YÊU CẦU</span>
                    <span style={intakeStyles.kpiValue}>{stats.total}</span>
                  </div>

                  <div
                    style={intakeStyles.kpiCard(statusFilter === 'NEW', '#7a1f3d')}
                    onClick={() => setStatusFilter('NEW')}
                    role="button"
                    tabIndex={0}
                    aria-label={`Thẻ thống kê: Chờ tiếp nhận (${stats.newCount})`}
                  >
                    <span style={intakeStyles.kpiLabel}>CHỜ TIẾP NHẬN</span>
                    <span style={{ ...intakeStyles.kpiValue, color: '#7a1f3d' }}>
                      {stats.newCount}
                    </span>
                  </div>

                  <div
                    style={intakeStyles.kpiCard(statusFilter === 'CONVERTED', '#2f6b4f')}
                    onClick={() => setStatusFilter('CONVERTED')}
                    role="button"
                    tabIndex={0}
                    aria-label={`Thẻ thống kê: Đã mở tư vấn (${stats.convertedCount})`}
                  >
                    <span style={intakeStyles.kpiLabel}>ĐÃ MỞ TƯ VẤN</span>
                    <span style={{ ...intakeStyles.kpiValue, color: '#2f6b4f' }}>
                      {stats.convertedCount}
                    </span>
                  </div>

                  <div
                    style={intakeStyles.kpiCard(statusFilter === 'CLOSED', '#94a3b8')}
                    onClick={() => setStatusFilter('CLOSED')}
                    role="button"
                    tabIndex={0}
                    aria-label={`Thẻ thống kê: Đã kết thúc (${stats.closedCount})`}
                  >
                    <span style={intakeStyles.kpiLabel}>ĐÃ KẾT THÚC</span>
                    <span style={{ ...intakeStyles.kpiValue, color: '#64748b' }}>
                      {stats.closedCount}
                    </span>
                  </div>
                </div>

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
                      placeholder="Tìm theo tên, email, sđt…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={intakeStyles.searchInput}
                    />

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      style={intakeStyles.sortSelect}
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

                {/* Items List or Filter Empty */}
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
                      Không tìm thấy yêu cầu tư vấn nào phù hợp với bộ lọc hiện tại.
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
                  <div className="intake-list">
                    {filteredItems.map((item) => (
                      <article
                        className="intake-item"
                        key={item.id}
                        style={intakeStyles.intakeItem(item.status)}
                      >
                        <div style={intakeStyles.cardHeader}>
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '4px',
                              }}
                            >
                              <p className="section-kicker" style={{ margin: 0 }}>
                                {
                                  {
                                    NEW: 'Cần tiếp nhận',
                                    CONVERTED: 'Đã mở hồ sơ',
                                    CLOSED: 'Đã đóng',
                                  }[item.status]
                                }
                              </p>
                              <span style={intakeStyles.statusBadge(item.status)}>
                                {item.status === 'NEW' && 'Mới'}
                                {item.status === 'CONVERTED' && 'Đang tư vấn'}
                                {item.status === 'CLOSED' && 'Lưu trữ'}
                              </span>
                            </div>
                            <h2>{item.displayName}</h2>
                            <p style={intakeStyles.contactChips}>
                              <a href={`mailto:${item.email}`}>{item.email}</a>
                              {item.phone && (
                                <>
                                  {' '}
                                  · <a href={`tel:${item.phone}`}>{item.phone}</a>
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        <dl>
                          <div>
                            <dt>Ngày mong muốn</dt>
                            <dd>{item.preferredDate ?? 'Chưa chọn'}</dd>
                          </div>
                          <div>
                            <dt>Số khách dự kiến</dt>
                            <dd>{item.expectedGuests ?? 'Chưa cung cấp'}</dd>
                          </div>
                          <div>
                            <dt>Đã nhận</dt>
                            <dd>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</dd>
                          </div>
                        </dl>

                        {item.message && <p className="intake-message">{item.message}</p>}

                        {item.status === 'NEW' && (
                          <div className="intake-actions">
                            <button
                              className="booking-primary-link"
                              type="button"
                              disabled={pending}
                              onClick={() => void act(item, 'conversion')}
                              style={intakeStyles.primaryActionBtn}
                            >
                              Mở hồ sơ tư vấn
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => void act(item, 'closure')}
                              style={intakeStyles.secondaryActionBtn}
                            >
                              Đóng yêu cầu
                            </button>
                          </div>
                        )}

                        {item.status === 'CONVERTED' && item.consultationId && (
                          <div style={intakeStyles.convertedBanner}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                              }}
                            >
                              <small
                                style={{
                                  color: 'var(--hy-text-muted, #6e5d63)',
                                  fontWeight: 600,
                                }}
                              >
                                Mã hồ sơ tư vấn:
                              </small>
                              <code
                                style={{
                                  fontSize: '0.82rem',
                                  background: '#ffffff',
                                  border: '1px solid var(--hy-status-success-border, #bbf7d0)',
                                  color: 'var(--hy-status-success, #2f6b4f)',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                {item.consultationId}
                              </code>
                            </div>
                            {(() => {
                              const params = new URLSearchParams({
                                consultationId: item.consultationId,
                                consultationRevision: String(item.consultationRevision ?? 1),
                              });
                              if (item.displayName) params.set('displayName', item.displayName);
                              if (item.email) params.set('email', item.email);
                              if (item.preferredDate)
                                params.set('preferredDate', item.preferredDate);
                              if (
                                item.expectedGuests !== undefined &&
                                item.expectedGuests !== null
                              ) {
                                params.set('expectedGuests', String(item.expectedGuests));
                              }
                              if (item.message) params.set('note', item.message);
                              return (
                                <Link
                                  className="booking-primary-link"
                                  href={`/bookings?${params.toString()}`}
                                  style={intakeStyles.primaryActionBtn}
                                >
                                  Tiếp tục đặt tiệc
                                </Link>
                              );
                            })()}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}

                {queue?.nextCursor && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void load(queue.nextCursor!)}
                    style={intakeStyles.loadMoreBtn}
                  >
                    Xem thêm yêu cầu
                  </button>
                )}
              </>
            )}
          </>
        )}
      </main>
    </OperationsShell>
  );
}
