'use client';

import { useEffect, useRef, useState } from 'react';
import {
  analyticsService,
  type AnalyticsBookingsData,
  type AnalyticsQuery,
} from '../../services/analytics.service';
import { describeApiError } from '../../lib/api/api-errors';

type Result = Readonly<{
  query: string;
  items: AnalyticsBookingsData['items'];
  cursor: string | null;
  pending: boolean;
  error: string | null;
}>;

/** Server search covers the report range, not just the dashboard's first loaded page. */
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
      void analyticsService
        .getBookings(parameters, controller.signal)
        .then((data) => {
          if (generation.current !== current || controller.signal.aborted) return;
          setResult({
            query,
            items: data.items,
            cursor: data.nextCursor,
            pending: false,
            error: null,
          });
        })
        .catch((error: unknown) => {
          if (generation.current !== current || controller.signal.aborted) return;
          setResult({
            query,
            items: [],
            cursor: null,
            pending: false,
            error: describeApiError(error).message,
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
