'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { AnalyticsBookingsData } from '../../services/analytics.service';
import type { BookingAssignmentsRegistry } from './booking-assignments';
import { dashboardStyles } from './dashboard.styles';

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
      style={{
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: '2px 4px',
        fontSize: '0.75rem',
        color: copied ? '#16a34a' : '#64748b',
        borderRadius: '3px',
      }}
      aria-label="Sao chép UUID"
    >
      {copied ? '✓' : '⧉'}
    </button>
  );
}

const PHASE_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  AWAITING_DEPOSIT: 'Chờ cọc',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

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

  const isMine = useCallback(
    (bId: string) => assignments[bId]?.assignedAccountId === resolvedAccountId,
    [assignments, resolvedAccountId],
  );

  const myBookings = bookings.filter((b) => isMine(b.bookingId));
  const myBookingsCount = myBookings.length;
  const bookingTab = userSelectedTab ?? (myBookingsCount > 0 ? 'mine' : 'all');
  const setBookingTab = (tab: 'mine' | 'all') => setUserSelectedTab(tab);

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

      {/* Bộ lọc chuyển tab & tìm kiếm */}
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
              {state === 'loading' ? '…' : bookings.length}
            </span>
          </button>
        </div>

        {/* Quick Filter: Search + Status */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search"
            placeholder="Tìm sảnh tiệc, UUID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm tiệc cưới"
            style={dashboardStyles.searchInput}
          />
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
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
        </div>
      </div>

      {state === 'loading' ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#5d665f' }}>
          <p>Đang đồng bộ danh sách tiệc cưới từ máy chủ…</p>
        </div>
      ) : currentTabBookings.length === 0 ? (
        bookingTab === 'mine' ? (
          <div className="booking-empty" style={dashboardStyles.emptyCard}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <strong
              style={{
                fontSize: '1.05rem',
                color: '#243b2a',
                display: 'block',
                marginBottom: '0.35rem',
              }}
            >
              Chưa có buổi tiệc nào trong &quot;Tiệc của tôi&quot;
            </strong>
            <p
              style={{
                color: '#5d665f',
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
                  border: '1px solid #d1d5db',
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
        <div className="table-scroll">
          <table aria-label="Lịch tiệc và sự kiện đã đặt">
            <thead>
              <tr>
                <th scope="col">Ngày tổ chức</th>
                <th scope="col">Sảnh tiệc</th>
                <th scope="col">Ca</th>
                <th scope="col">Quy mô</th>
                <th scope="col">Mã booking (UUID)</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => {
                const assignment = assignments[booking.bookingId];
                const mine = assignment?.assignedAccountId === resolvedAccountId;
                const assignedToOther = Boolean(
                  assignment && assignment.assignedAccountId !== resolvedAccountId,
                );
                const assignedEmail = assignment?.assignedEmail ?? 'Quản lý khác';

                return (
                  <tr key={booking.bookingId}>
                    <td>
                      <strong>{new Date(booking.eventDate).toLocaleDateString('vi-VN')}</strong>
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <strong>{booking.hallNameSnapshot || 'Sảnh tiệc'}</strong>
                        {mine ? (
                          <span
                            style={dashboardStyles.mineBadge}
                            title="Bạn đang phụ trách tiệc này"
                          >
                            Của bạn
                          </span>
                        ) : assignedToOther ? (
                          <span
                            style={dashboardStyles.assignedBadge}
                            title={`Tiệc đã được tiếp nhận và khóa bởi: ${assignedEmail}`}
                          >
                            🔒 {assignedEmail}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <span className="shift-badge">
                        {booking.shiftCode === 'LUNCH' ? 'Trưa' : 'Tối'}
                      </span>
                    </td>
                    <td>{booking.tableCount} bàn</td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
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
                          title={booking.bookingId}
                        >
                          {booking.bookingId}
                        </code>
                        <CopyButton text={booking.bookingId} />
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status ${
                          booking.phase === 'CONFIRMED' || booking.phase === 'COMPLETED'
                            ? 'status-ready'
                            : booking.phase === 'CANCELLED'
                              ? 'status-closed'
                              : 'status-review'
                        }`}
                      >
                        {PHASE_LABELS[booking.phase] ?? booking.phase}
                      </span>
                    </td>
                    <td>
                      <div style={dashboardStyles.actionGroup}>
                        <Link
                          className="booking-primary-link"
                          href={`/bookings?bookingId=${booking.bookingId}`}
                          style={dashboardStyles.actionLink}
                        >
                          Xem hồ sơ →
                        </Link>
                        <Link
                          className="booking-secondary"
                          href={`/billing?bookingId=${booking.bookingId}`}
                          style={dashboardStyles.actionLink}
                        >
                          Thanh toán
                        </Link>
                        <Link
                          className="booking-secondary"
                          href={`/staff?bookingId=${booking.bookingId}`}
                          style={dashboardStyles.actionLink}
                        >
                          Nhân sự
                        </Link>
                        {mine ? null : assignedToOther ? (
                          <button
                            type="button"
                            disabled
                            title={`Tiệc này đã được ${assignedEmail} tiếp nhận và đang khóa`}
                            style={dashboardStyles.lockedButton}
                          >
                            🔒 Đã có người nhận
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Tiếp nhận phụ trách tiệc này và khóa với các quản lý khác"
                            onClick={() =>
                              onClaim(booking.bookingId, booking.hallNameSnapshot || undefined)
                            }
                            style={dashboardStyles.claimActiveButton}
                          >
                            ☆ Nhận tiệc
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
