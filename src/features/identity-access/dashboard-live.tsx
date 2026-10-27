'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtimeSubscription } from '../realtime/use-realtime';
import { useRefreshQueue } from '../realtime/refresh-queue';
import { catalogCacheTtlMs } from '../venue-catalog/catalog-cache';
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
import { describeApiError } from '../../lib/api/api-errors';
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
import { DashboardKpiStrip } from './dashboard-kpi-strip';
import { DashboardVenueHalls } from './dashboard-venue-halls';
import { notify } from '../../design-system/notifications';

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
      const msg = `✓ Bạn đã tiếp nhận tiệc ${hallName || ''} (${bookingId.slice(0, 8)}…). Tiệc này đã được khóa cho tài khoản của bạn.`;
      notify.success(msg);
      setLockNotice({
        type: 'success',
        message: msg,
      });
      setAssignments(getBookingAssignments());
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wedding_booking_assignments_changed'));
      }
    } else {
      const msg = `Tiệc này đã được ${result.existingAssignment?.assignedEmail || 'quản lý khác'} tiếp nhận và khóa. Bạn không thể nhận trùng tiệc.`;
      notify.warning(msg);
      setLockNotice({
        type: 'warning',
        message: msg,
      });
      setAssignments(getBookingAssignments());
    }
  };

  const handleRelease = (bookingId: string) => {
    const result = releaseBookingAssignment(bookingId, resolvedAccountId);
    if (result.success) {
      const msg = `Đã hủy tiếp nhận tiệc (${bookingId.slice(0, 8)}…). Tiệc này có thể được tiếp nhận bởi quản lý khác.`;
      notify.info(msg);
      setLockNotice({
        type: 'info',
        message: msg,
      });
      setAssignments(getBookingAssignments());
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('wedding_booking_assignments_changed'));
      }
    }
  };

  const catalogData = useRef<{
    value: Pick<DashboardData, 'restaurant' | 'halls'>;
    expiresAt: number;
  } | null>(null);
  const catalogGeneration = useRef(0);
  const dataSequence = useRef(0);
  const invalidateRead = useCallback(() => {
    dataSequence.current++;
  }, []);
  const fetchData = useCallback(async () => {
    const sequence = ++dataSequence.current;
    setState('loading');
    setErrorMessage(null);

    try {
      const generation = catalogGeneration.current;
      const currentCatalog = catalogData.current;
      const cachedCatalog =
        currentCatalog && currentCatalog.expiresAt > Date.now() ? currentCatalog.value : null;
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
          cachedCatalog
            ? Promise.resolve(cachedCatalog.restaurant)
            : catalogService.getRestaurant(),
          cachedCatalog ? Promise.resolve(cachedCatalog.halls) : catalogService.getPublicHalls(),
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

      if (sequence !== dataSequence.current) return;
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

      if (
        generation === catalogGeneration.current &&
        restaurantRes.status === 'fulfilled' &&
        hallsRes.status === 'fulfilled'
      ) {
        catalogData.current = {
          value: { restaurant, halls },
          expiresAt: Date.now() + catalogCacheTtlMs,
        };
      }
      setData({ restaurant, halls, consultations, bookings, analytics });
      setState('success');
    } catch (error) {
      if (sequence !== dataSequence.current) return;
      const friendly = describeApiError(error);
      const msg = friendly.message || 'Không thể tải dữ liệu tổng quan. Vui lòng thử lại.';
      setErrorMessage(msg);
      notify.error(error, { fallbackMessage: msg });
      setState('error');
    }
  }, [isManager]);

  const refresh = useRefreshQueue(fetchData, isManager ? 'manager-dashboard' : 'staff-dashboard');
  useEffect(() => {
    void refresh.run();
    return invalidateRead;
  }, [refresh, invalidateRead]);

  useRealtimeSubscription({
    onEvent: (event) => {
      if (event.type === 'notification.received') return;
      if (event.type === 'catalog.updated') {
        catalogGeneration.current++;
        catalogData.current = null;
      }
      refresh.schedule();
    },
    onResync: () => {
      catalogGeneration.current++;
      catalogData.current = null;
      refresh.schedule();
    },
  });

  return (
    <div className="dashboard-live-container">
      {/* State: Error with Retry */}
      {state === 'error' && errorMessage ? (
        <div className="booking-error" style={{ margin: '1rem 0' }}>
          <strong>Lỗi kết nối máy chủ</strong>
          <p>{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              catalogGeneration.current++;
              catalogData.current = null;
              void refresh.refresh();
            }}
            className="text-button"
          >
            Thử tải lại
          </button>
        </div>
      ) : null}

      {/* Hero Showcase của Nhà Hàng */}
      <section className="estate-showcase" aria-labelledby="estate-showcase-title">
        <div className="estate-showcase-content">
          <span className="estate-badge">Trung tâm tiệc cưới &amp; Sự kiện</span>
          <h2 id="estate-showcase-title">{data.restaurant?.displayName || 'Hỷ Yến'}</h2>
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
              <strong>Liên hệ:</strong> {data.restaurant?.publicEmail || 'contact@hyyen.vn'}
            </span>
          </div>
        </div>
        <div
          className="estate-showcase-photo"
          role="img"
          aria-label="Bàn tiệc cưới với hoa trắng phong cách Hỷ Yến"
        />
      </section>

      {/* Dải chỉ số KPI */}
      <DashboardKpiStrip
        isManager={isManager}
        isLoading={state === 'loading'}
        halls={data.halls}
        consultations={data.consultations}
        analytics={data.analytics}
        restaurant={data.restaurant}
      />

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
      <DashboardVenueHalls halls={data.halls} isManager={isManager} />
    </div>
  );
}
