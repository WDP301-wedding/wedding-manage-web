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

export type BookingSortField = 'eventDate' | 'hallName' | 'shiftCode' | 'tableCount' | 'phase';
export type SortOrder = 'asc' | 'desc';

export interface DashboardBookingsTableProps {
  bookings: readonly DashboardBookingItem[];
  assignments: BookingAssignmentsRegistry;
  resolvedAccountId: string;
  onClaim: (bookingId: string, hallName?: string) => void;
  sortField?: BookingSortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: BookingSortField) => void;
}

export function DashboardBookingsTable({
  bookings,
  assignments,
  resolvedAccountId,
  onClaim,
  sortField,
  sortOrder,
  onSortChange,
}: Readonly<DashboardBookingsTableProps>) {
  return (
    <div className="table-scroll">
      <table aria-label="Lịch tiệc và sự kiện đã đặt">
        <thead>
          <tr>
            <th scope="col">
              <button
                type="button"
                onClick={() => onSortChange?.('eventDate')}
                style={dashboardStyles.thSortButton}
                title="Sắp xếp theo ngày tổ chức"
              >
                <span>Ngày tổ chức</span>
                <span style={dashboardStyles.sortIcon(sortField === 'eventDate')}>
                  {sortField === 'eventDate' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </button>
            </th>
            <th scope="col">
              <button
                type="button"
                onClick={() => onSortChange?.('hallName')}
                style={dashboardStyles.thSortButton}
                title="Sắp xếp theo sảnh tiệc"
              >
                <span>Sảnh tiệc</span>
                <span style={dashboardStyles.sortIcon(sortField === 'hallName')}>
                  {sortField === 'hallName' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </button>
            </th>
            <th scope="col">
              <button
                type="button"
                onClick={() => onSortChange?.('shiftCode')}
                style={dashboardStyles.thSortButton}
                title="Sắp xếp theo ca tiệc"
              >
                <span>Ca</span>
                <span style={dashboardStyles.sortIcon(sortField === 'shiftCode')}>
                  {sortField === 'shiftCode' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </button>
            </th>
            <th scope="col">
              <button
                type="button"
                onClick={() => onSortChange?.('tableCount')}
                style={dashboardStyles.thSortButton}
                title="Sắp xếp theo quy mô số bàn"
              >
                <span>Quy mô</span>
                <span style={dashboardStyles.sortIcon(sortField === 'tableCount')}>
                  {sortField === 'tableCount' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </button>
            </th>
            <th scope="col">Hồ sơ tiệc</th>
            <th scope="col">
              <button
                type="button"
                onClick={() => onSortChange?.('phase')}
                style={dashboardStyles.thSortButton}
                title="Sắp xếp theo trạng thái"
              >
                <span>Trạng thái</span>
                <span style={dashboardStyles.sortIcon(sortField === 'phase')}>
                  {sortField === 'phase' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </button>
            </th>
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
                        {assignedEmail}
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
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {booking.bookingCode ? (
                        <strong>{booking.bookingCode}</strong>
                      ) : (
                        <span className="muted">Mã hồ sơ chưa đồng bộ</span>
                      )}
                      {booking.bookingCode && <CopyButton text={booking.bookingCode} />}
                    </div>
                    <span>{booking.customerName || 'Chưa có tên khách'}</span>
                    {booking.alias && booking.alias !== booking.customerName && (
                      <small>{booking.alias}</small>
                    )}
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: 12 }}>
                        Thông tin kỹ thuật
                      </summary>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          overflowWrap: 'anywhere',
                        }}
                      >
                        <code style={{ fontFamily: 'var(--font-code)' }}>{booking.bookingId}</code>
                        <CopyButton text={booking.bookingId} />
                      </div>
                    </details>
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
                      prefetch={false}
                      style={dashboardStyles.actionLink}
                    >
                      Xem hồ sơ →
                    </Link>
                    <Link
                      className="booking-secondary"
                      href={`/billing?bookingId=${booking.bookingId}`}
                      prefetch={false}
                      style={dashboardStyles.actionLink}
                    >
                      Thanh toán
                    </Link>
                    <Link
                      className="booking-secondary"
                      href={`/staff?bookingId=${booking.bookingId}`}
                      prefetch={false}
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
                        Đã có người nhận
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
