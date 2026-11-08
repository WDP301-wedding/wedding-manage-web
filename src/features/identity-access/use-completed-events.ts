'use client';
import { useState } from 'react';
import {
  getCompletedEvents,
  type CompletedEventsData,
  type CompletedEventsFilters,
} from '../../services/completed-events.service';
import { describeApiError } from '../../lib/api/api-errors';
import { useLiveRefresh } from '../realtime/use-live-refresh';

export function useCompletedEvents(query: CompletedEventsFilters) {
  const scope = JSON.stringify(query);
  const [result, setResult] = useState<{ scope: string; data: CompletedEventsData } | null>(null);
  const [error, setError] = useState<{ scope: string; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const live = useLiveRefresh(
    async (isCurrent) => {
      setPending(true);
      setError(null);
      try {
        const data = await getCompletedEvents(query);
        if (isCurrent()) setResult({ scope, data });
      } catch (e) {
        if (isCurrent()) setError({ scope, message: describeApiError(e).message });
      } finally {
        if (isCurrent()) setPending(false);
      }
    },
    {
      scope: `completed-events:${scope}`,
      initial: true,
      types: ['booking.updated', 'billing.updated', 'contract.updated', 'catalog.updated'],
    },
  );
  const currentError = error?.scope === scope ? error.message : null;
  const data = result?.scope === scope && !currentError ? result.data : null;
  return {
    data,
    error: currentError,
    loading: pending || (!data && !currentError),
    refresh: live.refresh,
  };
}

export function currentVietnamMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return { dateFrom: `${year}-${month}-01`, dateTo: `${year}-${month}-${lastDay}` };
}
