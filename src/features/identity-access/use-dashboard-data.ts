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
import { navigationService } from '../../services/booking-navigation.service';
import { type ConsultationRequestItem } from '../../services/consultation.service';
import { describeApiError } from '../../lib/api/api-errors';
import { notify } from '../../design-system/notifications';

export type DashboardState = 'loading' | 'error' | 'success';
export type DashboardBookingItem = AnalyticsBookingsData['items'][number];

export interface DashboardData {
  restaurant: PublicRestaurant | null;
  halls: readonly PublicHall[];
  consultations: readonly ConsultationRequestItem[];
  bookings: readonly DashboardBookingItem[];
  analytics: AnalyticsOverviewData | null;
}

const emptyData: DashboardData = {
  restaurant: null,
  halls: [],
  consultations: [],
  bookings: [],
  analytics: null,
};

/** Tải dữ liệu Tổng quan, giữ danh mục trong bộ nhớ đệm ngắn và làm mới theo sự kiện realtime. */
export function useDashboardData(isManager: boolean) {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [state, setState] = useState<DashboardState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const catalogData = useRef<{
    value: Pick<DashboardData, 'restaurant' | 'halls'>;
    expiresAt: number;
  } | null>(null);
  const catalogGeneration = useRef(0);
  const dataSequence = useRef(0);
  const invalidateRead = useCallback(() => {
    dataSequence.current++;
  }, []);
  const dropCatalogCache = () => {
    catalogGeneration.current++;
    catalogData.current = null;
  };

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
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const dateFrom = `${now.getFullYear()}-${month}-01`;
      const dateTo = `${now.getFullYear()}-${month}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
      const [restaurantRes, hallsRes, analyticsRes, bookingsRes] = await Promise.allSettled([
        cachedCatalog ? Promise.resolve(cachedCatalog.restaurant) : catalogService.getRestaurant(),
        cachedCatalog ? Promise.resolve(cachedCatalog.halls) : catalogService.getPublicHalls(),
        isManager ? analyticsService.getOverview({ dateFrom, dateTo }) : Promise.resolve(null),
        isManager ? navigationService.bookings({ pageSize: 50, scope: 'all' }) : Promise.resolve(null),
      ]);

      if (sequence !== dataSequence.current) return;
      const restaurant = restaurantRes.status === 'fulfilled' ? restaurantRes.value : null;
      const halls = hallsRes.status === 'fulfilled' ? hallsRes.value : [];
      const consultations: readonly ConsultationRequestItem[] = [];
      const analytics =
        analyticsRes.status === 'fulfilled' && analyticsRes.value ? analyticsRes.value : null;
      const bookings =
        bookingsRes.status === 'fulfilled' && bookingsRes.value?.items ? bookingsRes.value.items : [];

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
      const msg =
        describeApiError(error).message || 'Không thể tải dữ liệu tổng quan. Vui lòng thử lại.';
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
      if (event.type === 'catalog.updated') dropCatalogCache();
      refresh.schedule();
    },
    onResync: () => {
      dropCatalogCache();
      refresh.schedule();
    },
  });

  const retry = () => {
    dropCatalogCache();
    void refresh.refresh();
  };

  return { data, state, errorMessage, retry };
}
