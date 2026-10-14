'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { consultationService, type ConsultationRequestItem } from '../../services/consultation.service';
import { catalogService, type PublicHall, type PublicRestaurant } from '../../services/catalog.service';
import { analyticsService, type AnalyticsOverviewData, type AnalyticsBookingsData } from '../../services/analytics.service';
import { ApiServiceError } from '../../lib/api/axios-client';

export type DashboardState = 'loading' | 'error' | 'success';
export type DashboardBookingItem = AnalyticsBookingsData['items'][number];

export interface DashboardData {
  readonly restaurant: PublicRestaurant | null;
  readonly halls: readonly PublicHall[];
  readonly consultations: readonly ConsultationRequestItem[];
  readonly bookings: readonly DashboardBookingItem[];
  readonly analytics: AnalyticsOverviewData | null;
}

function formatVnd(amount: number | null): string {
  if (amount === null || amount === undefined) return 'Chưa ghi nhận';
  return `${amount.toLocaleString('vi-VN')} đ`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Sao chép mã UUID"
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        background: '#ffffff',
        cursor: 'pointer',
        fontSize: '0.72rem',
        color: copied ? '#15803d' : '#4b5563',
        padding: '1px 6px',
        marginLeft: '4px',
        lineHeight: '1.2',
      }}
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? '✓ Đã chép' : 'Sao chép'}
    </button>
  );
}

export function DashboardLiveView({
  isManager,
}: Readonly<{
  isManager: boolean;
}>) {
  const [state, setState] = useState<DashboardState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    restaurant: null,
    halls: [],
    consultations: [],
    bookings: [],
    analytics: null,
  });

  const fetchData = useCallback(async () => {
    setState('loading');
    setErrorMessage(null);

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const dateFrom = `${currentYear}-${currentMonth}-01`;
      const dateTo = `${currentYear}-${currentMonth}-31`;

      const bookingStart = new Date(now);
      bookingStart.setDate(bookingStart.getDate() - 7);
      const bookingEnd = new Date(now);
      bookingEnd.setDate(bookingEnd.getDate() + 350);
      const bookingDateFrom = bookingStart.toISOString().slice(0, 10);
      const bookingDateTo = bookingEnd.toISOString().slice(0, 10);

      const [restaurantRes, hallsRes, consultationsRes, analyticsRes, bookingsRes] = await Promise.allSettled([
        catalogService.getRestaurant(),
        catalogService.getPublicHalls(),
        isManager ? consultationService.getConsultationRequests({ limit: 10 }) : Promise.resolve(null),
        isManager ? analyticsService.getOverview({ dateFrom, dateTo }) : Promise.resolve(null),
        isManager
          ? analyticsService.getBookings({ dateFrom: bookingDateFrom, dateTo: bookingDateTo, pageSize: 50 })
          : Promise.resolve(null),
      ]);

      const restaurant =
        restaurantRes.status === 'fulfilled' ? restaurantRes.value : null;
      const halls = hallsRes.status === 'fulfilled' ? hallsRes.value : [];
      const consultations =
        consultationsRes.status === 'fulfilled' && consultationsRes.value
          ? consultationsRes.value.data
          : [];
      const analytics =
        analyticsRes.status === 'fulfilled' && analyticsRes.value
          ? analyticsRes.value
          : null;
      const bookings =
        bookingsRes.status === 'fulfilled' && bookingsRes.value
          ? bookingsRes.value.items
          : [];

      setData({ restaurant, halls, consultations, bookings, analytics });
      setState('success');
    } catch (error) {
      if (error instanceof ApiServiceError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể tải dữ liệu tổng quan. Vui lòng thử lại.');
      }
      setState('error');
    }
  }, [isManager]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const pendingConsultations = data.consultations.filter(
    (c) => c.status === 'NEW',
  );

  return (
    <div className="dashboard-live-container">
      {/* State: Error with Retry */}
      {state === 'error' && errorMessage ? (
        <div className="booking-error" role="alert" style={{ margin: '1rem 0' }}>
          <strong>Lỗi kết nối máy chủ</strong>
          <p>{errorMessage}</p>
          <button type="button" onClick={() => void fetchData()} className="text-button">
            Thử tải lại
          </button>
        </div>
      ) : null}

      {/* Hero Showcase của Nhà Hàng */}
      <section className="estate-showcase" aria-labelledby="estate-showcase-title">
        <div className="estate-showcase-content">
          <span className="estate-badge">Trung tâm tiệc cưới &amp; Sự kiện</span>
          <h2 id="estate-showcase-title">
            {data.restaurant?.displayName || 'Wedding Estate'}
          </h2>
          <p className="estate-tagline">
            {data.restaurant?.description ||
              'Nơi khởi đầu cho hạnh phúc vẹn tròn · Vận hành tiêu chuẩn cao cấp'}
          </p>
          <div className="estate-meta">
            <span>
              <strong>Địa chỉ:</strong>{' '}
              {data.restaurant?.address || 'Khu đô thị công nghệ cao, TP. Hồ Chí Minh'}
            </span>
            <span>
              <strong>Liên hệ:</strong>{' '}
              {data.restaurant?.publicEmail || 'contact@example.com'}
            </span>
          </div>
        </div>
        <div
          className="estate-showcase-photo"
          role="img"
          aria-label="Bàn tiệc cưới với hoa trắng"
        />
      </section>

      {/* Dải chỉ số KPI */}
      <section className="metrics-strip" aria-label="Chỉ số vận hành">
        <Metric
          label="Không gian sẵn sàng"
          value={state === 'loading' ? '—' : String(data.halls.length).padStart(2, '0')}
          detail={state === 'loading' ? 'Đang đồng bộ…' : `${data.halls.length} sảnh tiệc trong danh mục`}
        />
        <Metric
          label="Yêu cầu tư vấn"
          value={state === 'loading' ? '—' : String(data.consultations.length).padStart(2, '0')}
          detail={
            state === 'loading'
              ? 'Đang đồng bộ…'
              : pendingConsultations.length > 0
                ? `${pendingConsultations.length} yêu cầu chờ xử lý`
                : 'Đã hoàn tất xử lý'
          }
          attention={pendingConsultations.length > 0}
        />
        {isManager ? (
          <>
            <Metric
              label="Tiền thực nhận tháng này"
              value={state === 'loading' || !data.analytics ? '—' : formatVnd(data.analytics.netCashRevenueVnd)}
              detail={state === 'loading' ? 'Đang tổng hợp sổ cái…' : 'Thực thu tiền mặt/chuyển khoản (VND)'}
            />
            <Metric
              label="Tổng cọc đã thu"
              value={state === 'loading' || !data.analytics ? '—' : formatVnd(data.analytics.grossCashReceivedVnd)}
              detail={
                state === 'loading'
                  ? 'Đang tính toán…'
                  : data.analytics?.meta.refreshedAt
                    ? `Độ mới: ${new Date(data.analytics.meta.refreshedAt).toLocaleTimeString('vi-VN')}`
                    : 'Sổ cái đã chốt'
              }
            />
          </>
        ) : (
          <Metric
            label="Ca phục vụ"
            value={state === 'loading' ? '—' : String(data.restaurant?.shifts?.length || 2).padStart(2, '0')}
            detail="Ca trưa & ca tối cố định"
          />
        )}
      </section>

      {/* Lịch tiệc & Sự kiện đã đặt */}
      {isManager ? (
        <section className="schedule-panel dashboard-schedule" id="booked-events" style={{ marginBottom: '2.5rem' }}>
          <div className="section-heading">
            <div>
              <p className="section-kicker">Vận hành tiệc cưới</p>
              <h2>Lịch tiệc &amp; Sự kiện đã đặt ({state === 'loading' ? '…' : data.bookings.length})</h2>
            </div>
            <Link className="text-button" href="/bookings">
              + Tạo đặt tiệc mới
            </Link>
          </div>

          {state === 'loading' ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#5d665f' }}>
              <p>Đang đồng bộ danh sách tiệc cưới từ máy chủ…</p>
            </div>
          ) : data.bookings.length === 0 ? (
            <div className="booking-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <strong>Chưa có buổi tiệc nào trong lịch</strong>
              <p>Bấm &quot;Tạo đặt tiệc mới&quot; hoặc chọn từ danh sách yêu cầu tư vấn để tạo hồ sơ tiệc cưới.</p>
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
                  {data.bookings.map((booking) => (
                    <tr key={booking.bookingId}>
                      <td>
                        <strong>{new Date(booking.eventDate).toLocaleDateString('vi-VN')}</strong>
                      </td>
                      <td>
                        <strong>{booking.hallNameSnapshot || 'Sảnh tiệc'}</strong>
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
                            booking.phase === 'CONFIRMED'
                              ? 'status-ready'
                              : booking.phase === 'CANCELLED'
                                ? 'status-closed'
                                : booking.phase === 'COMPLETED'
                                  ? 'status-ready'
                                  : 'status-review'
                          }`}
                        >
                          {
                            {
                              DRAFT: 'Bản nháp',
                              AWAITING_DEPOSIT: 'Chờ cọc',
                              CONFIRMED: 'Đã xác nhận',
                              COMPLETED: 'Hoàn thành',
                              CANCELLED: 'Đã hủy',
                            }[booking.phase] ?? booking.phase
                          }
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <Link
                            className="booking-primary-link"
                            href={`/bookings?bookingId=${booking.bookingId}`}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                              textDecoration: 'none',
                            }}
                          >
                            Xem hồ sơ →
                          </Link>
                          <Link
                            className="booking-secondary"
                            href={`/billing?bookingId=${booking.bookingId}`}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                              textDecoration: 'none',
                            }}
                          >
                            Thanh toán
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section
          className="schedule-panel dashboard-schedule"
          id="staff-checkin-banner"
          style={{
            marginBottom: '2.5rem',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            border: '1px solid #bbf7d0',
            padding: '2rem',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div>
              <p className="section-kicker" style={{ color: '#16a34a', fontWeight: 600 }}>Tác nghiệp Lễ tân · Check-in</p>
              <h2 style={{ margin: '0.25rem 0', fontSize: '1.5rem', color: '#166534' }}>Bàn đón tiếp &amp; Điểm danh khách mời</h2>
              <p style={{ color: '#374151', margin: '0.5rem 0 0', maxWidth: '640px', lineHeight: 1.5 }}>
                Bạn đang đăng nhập với vai trò <strong>Nhân viên vận hành (Staff)</strong>. Truy cập Bàn đón khách để nhập mã tiệc cưới, tra cứu tên khách và hướng dẫn vị trí bàn tiệc.
              </p>
            </div>
            <Link
              href="/staff"
              className="text-button"
              style={{
                background: '#16a34a',
                color: '#ffffff',
                padding: '0.875rem 1.75rem',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
              }}
            >
              Vào bàn đón khách &amp; Check-in →
            </Link>
          </div>
        </section>
      )}

      {/* Danh sách Yêu cầu tư vấn & Sự kiện */}
      <section className="schedule-panel dashboard-schedule" id="upcoming-events">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Hồ sơ tiếp nhận</p>
            <h2>Yêu cầu tư vấn gần đây</h2>
          </div>
          {isManager ? (
            <Link className="text-button" href="/consultation-requests">
              Xem toàn bộ ({state === 'loading' ? '…' : data.consultations.length})
            </Link>
          ) : null}
        </div>

        {/* State: Empty or Loading */}
        {state === 'loading' ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#5d665f' }}>
            <p>Đang đồng bộ hồ sơ tư vấn từ máy chủ…</p>
          </div>
        ) : state === 'success' && data.consultations.length === 0 ? (
          <div className="booking-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <strong>Chưa có yêu cầu tư vấn nào</strong>
            <p>Hệ thống hiện chưa ghi nhận yêu cầu tư vấn mới từ khách hàng trực tuyến.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table aria-label="Yêu cầu tư vấn gần đây">
              <thead>
                <tr>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Mã hồ sơ tư vấn</th>
                  <th scope="col">Liên hệ</th>
                  <th scope="col">Ngày dự kiến</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.consultations.slice(0, 5).map((item) => (
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
                      <span>{item.email}</span>
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
                              maxWidth: '180px',
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
    </div>
  );
}

function Metric({
  attention = false,
  detail,
  label,
  value,
}: Readonly<{ attention?: boolean; detail: string; label: string; value: string }>) {
  return (
    <article>
      <span className="metric-label">{label}</span>
      <strong className={attention ? 'attention-value' : undefined}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
