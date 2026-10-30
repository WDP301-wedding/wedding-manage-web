'use client';

import { useEffect, useRef, useState } from 'react';
import {
  analyticsService,
  type AnalyticsBookingsData,
  type AnalyticsQuery,
} from '../../services/analytics.service';
import { describeApiError } from '../../lib/api/api-errors';
import { axiosApiClient } from '../../lib/api/axios-client';

type Result = Readonly<{
  query: string;
  items: AnalyticsBookingsData['items'];
  cursor: string | null;
  pending: boolean;
  error: string | null;
}>;

interface LookupItem {
  bookingId: string;
  bookingCode: string;
  customerName: string;
  brideName?: string | null;
  groomName?: string | null;
  phone?: string | null;
  email?: string | null;
  eventDate: string;
  hallName: string;
  shiftCode: 'LUNCH' | 'DINNER';
  alias: string | null;
}

/** Server search covers the report range and expands across code, names, bride/groom, phone, and email. */
export function useBookingSearch(query: string) {
  const generation = useRef(0);
  const loadingMore = useRef(false);
  const request = useRef<{ query: AnalyticsQuery; controller: AbortController } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const current = ++generation.current;
    loadingMore.current = false;
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const from = new Date();
      const to = new Date(from);
      from.setDate(from.getDate() - 7);
      to.setDate(to.getDate() + 350);
      const parameters: AnalyticsQuery = {
        dateFrom: from.toISOString().slice(0, 10),
        dateTo: to.toISOString().slice(0, 10),
        search: query,
        pageSize: 100,
      };
      request.current = { query: parameters, controller };
      setResult({ query, items: [], cursor: null, pending: true, error: null });

      const analyticsPromise = analyticsService.getBookings(parameters, controller.signal);
      const lookupsPromise = axiosApiClient
        .get<{ data: LookupItem[] }>('/management/booking-lookups', {
          params: { q: query },
          signal: controller.signal,
        })
        .then((res) => res.data?.data ?? [])
        .catch(() => [] as LookupItem[]);

      void Promise.allSettled([analyticsPromise, lookupsPromise]).then(([analyticsRes, lookupsRes]) => {
        if (generation.current !== current || controller.signal.aborted) return;
        const analyticsData = analyticsRes.status === 'fulfilled' ? analyticsRes.value : null;
        const lookups = lookupsRes.status === 'fulfilled' ? lookupsRes.value : [];
        const lookupMap = new Map(lookups.map((l) => [l.bookingId, l]));

        const mergedItems = (analyticsData?.items ?? []).map((item) => {
          const l = lookupMap.get(item.bookingId);
          if (!l) return item;
          return {
            ...item,
            brideName: l.brideName ?? null,
            groomName: l.groomName ?? null,
            phone: l.phone ?? null,
            email: l.email ?? null,
          };
        });

        const existingIds = new Set(mergedItems.map((i) => i.bookingId));
        for (const l of lookups) {
          if (!existingIds.has(l.bookingId)) {
            const extraItem: AnalyticsBookingsData['items'][number] = {
              bookingId: l.bookingId,
              bookingCode: l.bookingCode,
              customerName: l.customerName,
              brideName: l.brideName ?? null,
              groomName: l.groomName ?? null,
              phone: l.phone ?? null,
              email: l.email ?? null,
              alias: l.alias,
              eventDate: l.eventDate,
              hallId: '',
              hallNameSnapshot: l.hallName,
              shiftCode: l.shiftCode,
              phase: 'CONFIRMED',
              tableCount: 1,
            };
            mergedItems.push(extraItem);
          }
        }

        setResult({
          query,
          items: mergedItems,
          cursor: analyticsData?.nextCursor ?? null,
          pending: false,
          error:
            analyticsRes.status === 'rejected' && lookups.length === 0
              ? describeApiError(analyticsRes.reason).message
              : null,
        });
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
      generation.current++;
    };
  }, [query, retryKey]);

  const more = async () => {
    const active = request.current;
    if (
      !active ||
      !result?.cursor ||
      result.pending ||
      loadingMore.current ||
      result.query !== query
    )
      return;
    loadingMore.current = true;
    const current = generation.current;
    const cursor = result.cursor;
    setResult({ ...result, pending: true, error: null });
    try {
      const data = await analyticsService.getBookings(
        { ...active.query, cursor },
        active.controller.signal,
      );
      if (generation.current !== current || active.controller.signal.aborted) return;
      setResult((previous) =>
        previous && previous.query === query
          ? {
              ...previous,
              items: [
                ...new Map(
                  [...previous.items, ...data.items].map((item) => [item.bookingId, item]),
                ).values(),
              ],
              cursor: data.nextCursor,
              pending: false,
            }
          : previous,
      );
    } catch (error: unknown) {
      if (generation.current !== current || active.controller.signal.aborted) return;
      setResult((previous) =>
        previous
          ? { ...previous, pending: false, error: describeApiError(error).message }
          : previous,
      );
    } finally {
      if (generation.current === current) loadingMore.current = false;
    }
  };
  return {
    items: query && result?.query === query ? result.items : null,
    loading: Boolean(query && (result?.query !== query || result.pending)),
    error: query && result?.query === query ? result.error : null,
    hasMore: Boolean(query && result?.query === query && result.cursor),
    more,
    retry: () => setRetryKey((value) => value + 1),
  };
}
