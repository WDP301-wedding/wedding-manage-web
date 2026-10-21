'use client';

import Link from 'next/link';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import { CopyButton } from './copy-button';
import { dashboardStyles } from './dashboard.styles';
import type { ConsultationSortField, SortOrder } from './use-dashboard-consultations';

export interface DashboardConsultationsTableProps {
  items: readonly ConsultationRequestItem[];
  sortField: ConsultationSortField;
  sortOrder: SortOrder;
  onSortChange: (field: ConsultationSortField) => void;
}

export function DashboardConsultationsTable({
  items,
  sortField,
  sortOrder,
  onSortChange,
}: Readonly<DashboardConsultationsTableProps>) {
  return (
    <div className="table-scroll">
      <table aria-label="Danh sách yêu cầu tư vấn gần đây">
        <thead>
          <tr>
            <th scope="col">
              <button
                type="button"
                onClick={() => onSortChange('createdAt')}
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
                onClick={() => onSortChange('displayName')}
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
                onClick={() => onSortChange('preferredDate')}
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
                onClick={() => onSortChange('status')}
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
          {items.map((item) => (
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
                  (() => {
                    const params = new URLSearchParams({
                      consultationId: item.consultationId,
                      consultationRevision: String(item.consultationRevision ?? 1),
                    });
                    if (item.displayName) params.set('displayName', item.displayName);
                    if (item.email) params.set('email', item.email);
                    if (item.preferredDate) params.set('preferredDate', item.preferredDate);
                    if (item.expectedGuests !== undefined && item.expectedGuests !== null) {
                      params.set('expectedGuests', String(item.expectedGuests));
                    }
                    if (item.message) params.set('note', item.message);
                    return (
                      <Link
                        className="booking-primary-link"
                        href={`/bookings?${params.toString()}`}
                        prefetch={false}
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
                    );
                  })()
                ) : item.status === 'NEW' ? (
                  <Link
                    href="/consultation-requests"
                    prefetch={false}
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
  );
}
