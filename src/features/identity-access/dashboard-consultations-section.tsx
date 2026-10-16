'use client';

import Link from 'next/link';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import { CopyButton, type DashboardState } from './dashboard-bookings-section';

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
        <div className="table-scroll">
          <table aria-label="Danh sách yêu cầu tư vấn gần đây">
            <thead>
              <tr>
                <th scope="col">Ngày đăng ký</th>
                <th scope="col">Khách hàng</th>
                <th scope="col">Mã hồ sơ</th>
                <th scope="col">Số điện thoại</th>
                <th scope="col">Ngày dự kiến</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {consultations.slice(0, 5).map((item) => (
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
    </section>
  );
}
