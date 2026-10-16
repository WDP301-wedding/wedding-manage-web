'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  analyticsService,
  type AnalyticsBookingsData,
  type AnalyticsOverviewData,
} from '../../services/analytics.service';
import {
  catalogService,
  type PublicHall,
  type PublicRestaurant,
} from '../../services/catalog.service';
import {
  consultationService,
  type ConsultationRequestItem,
} from '../../services/consultation.service';
import { ApiServiceError } from '../../lib/api/axios-client';
import {
  type BookingAssignment,
  type BookingAssignmentsRegistry,
  BOOKING_ASSIGNMENTS_REGISTRY_KEY,
  resolveCurrentAccountId,
  resolveCurrentAccountEmail,
  getBookingAssignments,
  saveBookingAssignments,
  claimBookingAssignment,
  releaseBookingAssignment,
  getMyManagedBookingsKey,
  getMyManagedBookingIds,
  saveMyManagedBookingIds,
  addMyManagedBookingId,
  removeMyManagedBookingId,
} from './booking-assignments';
import { DashboardBookingsSection } from './dashboard-bookings-section';
import { DashboardConsultationsSection } from './dashboard-consultations-section';

// Re-export assignment types & utilities for consumers
export type { BookingAssignment, BookingAssignmentsRegistry };
export {
  BOOKING_ASSIGNMENTS_REGISTRY_KEY,
  resolveCurrentAccountId,
  resolveCurrentAccountEmail,
  getBookingAssignments,
  saveBookingAssignments,
  claimBookingAssignment,
  releaseBookingAssignment,
  getMyManagedBookingsKey,
  getMyManagedBookingIds,
  saveMyManagedBookingIds,
  addMyManagedBookingId,
  removeMyManagedBookingId,
};

export type DashboardState = 'loading' | 'error' | 'success';
export type DashboardBookingItem = AnalyticsBookingsData['items'][number];

export interface DashboardData {
  restaurant: PublicRestaurant | null;
  halls: readonly PublicHall[];
  consultations: readonly ConsultationRequestItem[];
  bookings: readonly DashboardBookingItem[];
  analytics: AnalyticsOverviewData | null;
}

function formatVnd(amount: number | null): string {
  if (amount === null || Number.isNaN(amount)) return '—';
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

export function DashboardLiveView({
  isManager = false,
  currentAccountId,
  currentEmail,
  currentAccountEmail = currentEmail,
}: Readonly<{
  isManager?: boolean;
  currentAccountId?: string;
  currentEmail?: string;
  currentAccountEmail?: string;
}>) {
  const [data, setData] = useState<DashboardData>({
    restaurant: null,
    halls: [],
    consultations: [],
    bookings: [],
    analytics: null,
  });
  const [state, setState] = useState<DashboardState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvedAccountId = resolveCurrentAccountId(currentAccountId);
  const resolvedAccountEmail = resolveCurrentAccountEmail(currentAccountEmail);

  const [assignments, setAssignments] = useState<BookingAssignmentsRegistry>(() =>
    getBookingAssignments(),
  );
  const [lockNotice, setLockNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    const handleSync = () => {
      setAssignments(getBookingAssignments());
    };
    window.addEventListener('storage', handleSync);
    window.addEventListener('wedding_booking_assignments_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('wedding_booking_assignments_changed', handleSync);
    };
  }, []);

  const handleClaim = (bookingId: string, hallName?: string) => {
    const result = claimBookingAssignment(
      bookingId,
      resolvedAccountId,
      resolvedAccountEmail,
      hallName,
    );
    if (result.success) {
      setLockNotice({
        type: 'success',
        message: `✓ Bạn đã tiếp nhận tiệc ${hallName || ''} (${bookingId.slice(0, 8)}…). Tiệc này đã được khóa cho tài khoản của bạn.`,
      });
      setAssignments(getBookingAssignments());
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wedding_booking_assignments_changed'));
      }
    } else {
      setLockNotice({
        type: 'warning',
        message: `🔒 Tiệc này đã được ${result.existingAssignment?.assignedEmail || 'quản lý khác'} tiếp nhận và khóa. Bạn không thể nhận trùng tiệc.`,
      });
      setAssignments(getBookingAssignments());
    }
  };

  const handleRelease = (bookingId: string) => {
    const result = releaseBookingAssignment(bookingId, resolvedAccountId);
    if (result.success) {
      setLockNotice({
        type: 'info',
        message: `Đã hủy tiếp nhận tiệc (${bookingId.slice(0, 8)}…). Tiệc này có thể được tiếp nhận bởi quản lý khác.`,
      });
      setAssignments(getBookingAssignments());
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wedding_booking_assignments_changed'));
      }
    }
  };

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

      const [restaurantRes, hallsRes, consultationsRes, analyticsRes, bookingsRes] =
        await Promise.allSettled([
          catalogService.getRestaurant(),
          catalogService.getPublicHalls(),
          isManager
            ? consultationService.getConsultationRequests({ limit: 10 })
            : Promise.resolve(null),
          isManager ? analyticsService.getOverview({ dateFrom, dateTo }) : Promise.resolve(null),
          isManager
            ? analyticsService.getBookings({
                dateFrom: bookingDateFrom,
                dateTo: bookingDateTo,
                pageSize: 50,
              })
            : Promise.resolve(null),
        ]);

      const restaurant = restaurantRes.status === 'fulfilled' ? restaurantRes.value : null;
      const halls = hallsRes.status === 'fulfilled' ? hallsRes.value : [];
      const consultations =
        consultationsRes.status === 'fulfilled' && consultationsRes.value
          ? consultationsRes.value.data
          : [];
      const analytics =
        analyticsRes.status === 'fulfilled' && analyticsRes.value ? analyticsRes.value : null;
      const bookings =
        bookingsRes.status === 'fulfilled' && bookingsRes.value ? bookingsRes.value.items : [];

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

  const pendingConsultations = data.consultations.filter((c) => c.status === 'NEW');

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
          <h2 id="estate-showcase-title">{data.restaurant?.displayName || 'Wedding Estate'}</h2>
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
              <strong>Liên hệ:</strong> {data.restaurant?.publicEmail || 'contact@example.com'}
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
          detail={
            state === 'loading' ? 'Đang đồng bộ…' : `${data.halls.length} sảnh tiệc trong danh mục`
          }
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
              value={
                state === 'loading' || !data.analytics
                  ? '—'
                  : formatVnd(data.analytics.netCashRevenueVnd)
              }
              detail={
                state === 'loading'
                  ? 'Đang tổng hợp sổ cái…'
                  : 'Thực thu tiền mặt/chuyển khoản (VND)'
              }
            />
            <Metric
              label="Tổng cọc đã thu"
              value={
                state === 'loading' || !data.analytics
                  ? '—'
                  : formatVnd(data.analytics.grossCashReceivedVnd)
              }
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
            value={
              state === 'loading'
                ? '—'
                : String(data.restaurant?.shifts?.length || 2).padStart(2, '0')
            }
            detail="Ca trưa & ca tối cố định"
          />
        )}
      </section>

      {/* Lịch tiệc & Sự kiện đã đặt (Bookings Section) */}
      <DashboardBookingsSection
        isManager={isManager}
        state={state}
        bookings={data.bookings}
        assignments={assignments}
        resolvedAccountId={resolvedAccountId}
        onClaim={handleClaim}
        lockNotice={lockNotice}
        onDismissLockNotice={() => setLockNotice(null)}
      />

      {/* Danh sách Yêu cầu tư vấn & Sự kiện */}
      <DashboardConsultationsSection
        isManager={isManager}
        state={state}
        consultations={data.consultations}
      />

      {/* Danh sách Sảnh Tiệc Sẵn Sàng */}
      <section className="schedule-panel dashboard-schedule" id="available-halls">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Không gian tiệc</p>
            <h2>Danh mục sảnh cưới khả dụng ({data.halls.length})</h2>
          </div>
          {isManager ? (
            <Link className="text-button" href="/catalog">
              Quản lý danh mục →
            </Link>
          ) : null}
        </div>

        {data.halls.length === 0 ? (
          <div className="booking-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <p>Không có sảnh cưới nào đang mở trong hệ thống.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table aria-label="Danh mục sảnh tiệc">
              <thead>
                <tr>
                  <th scope="col">Tên sảnh</th>
                  <th scope="col">Sức chứa tối đa</th>
                  <th scope="col">Trạng thái hoạt động</th>
                  <th scope="col">Mô tả</th>
                </tr>
              </thead>
              <tbody>
                {data.halls.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <strong>{h.name}</strong>
                    </td>
                    <td>{h.maxGuests} khách</td>
                    <td>
                      <span className="status status-ready">Đang hoạt động</span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>{h.description || '—'}</td>
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
}: Readonly<{
  attention?: boolean;
  detail: string;
  label: string;
  value: string;
}>) {
  return (
    <div className={`metric-card${attention ? ' metric-attention' : ''}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      <span className="metric-detail">{detail}</span>
    </div>
  );
}
