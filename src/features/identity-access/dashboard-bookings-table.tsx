'use client';

import Link from 'next/link';
import type { AnalyticsBookingsData } from '../../services/analytics.service';
import type { BookingAssignmentsRegistry } from './booking-assignments';
import { dashboardStyles } from './dashboard.styles';
import { CopyButton } from './dashboard-bookings-section';

export type DashboardBookingItem = AnalyticsBookingsData['items'][number];

const PHASE_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  AWAITING_DEPOSIT: 'Chờ cọc',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export interface DashboardBookingsTableProps {
  bookings: readonly DashboardBookingItem[];
  assignments: BookingAssignmentsRegistry;
  resolvedAccountId: string;
  onClaim: (bookingId: string, hallName?: string) => void;
}

export function DashboardBookingsTable({
  bookings,
  assignments,
  resolvedAccountId,
  onClaim,
}: Readonly<DashboardBookingsTableProps>) {
  return (
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
          {bookings.map((booking) => {
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
                      <span style={dashboardStyles.mineBadge} title="Bạn đang phụ trách tiệc này">
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
                        background: 'var(--hy-surface-container, #fdf6ee)',
                        color: 'var(--hy-text, #2b1d22)',
                        border: '1px solid var(--hy-outline, #eadfd6)',
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
  );
}
