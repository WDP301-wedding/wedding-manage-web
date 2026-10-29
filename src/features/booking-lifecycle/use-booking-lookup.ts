'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import type { Client } from 'openapi-fetch';
import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { Authorize } from './booking-api';
import { errorMessage } from './booking-helpers';

const identitySchema = z.object({
  bookingId: z.string().uuid(),
  bookingCode: z.string().regex(/^HY-\d{6,}$/),
  customerName: z.string(),
  eventDate: z.string().date(),
  hallName: z.string(),
  shiftCode: z.enum(['LUNCH', 'DINNER']),
  alias: z.string().nullable(),
});
export type BookingIdentity = z.infer<typeof identitySchema>;
type LookupPaths = {
  '/management/booking-lookups': {
    get: {
      parameters: { query: { q?: string; ids?: string } };
      responses: { 200: { content: { 'application/json': { data: BookingIdentity[] } } } };
    };
  };
};

export function useBookingLookup(
  authorize: Authorize,
  recentIds: readonly string[],
  currentId: string,
  revision?: number,
) {
  const api = useMemo(() => createApiClient() as ApiClient & Client<LookupPaths>, []);
  const authorizeRef = useRef(authorize);
  useEffect(() => {
    authorizeRef.current = authorize;
  }, [authorize]);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<BookingIdentity[]>([]);
  const [matches, setMatches] = useState<BookingIdentity[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [recentError, setRecentError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const ids = [...new Set([currentId, ...recentIds])]
    .filter((id) => z.string().uuid().safeParse(id).success)
    .slice(0, 20)
    .join(',');
  const lookup = useCallback(
    async (params: { q?: string; ids?: string }, signal: AbortSignal) => {
      return authorizeRef.current(async (token) => {
        const { data } = await api.GET('/management/booking-lookups', {
          headers: { Authorization: 'Bearer ' + token },
          params: { query: params },
          signal,
          cache: 'no-store',
        });
        return identitySchema.array().parse(data?.data);
      });
    },
    [api],
  );
  useEffect(() => {
    const controller = new AbortController();
    if (!ids) return;
    void lookup({ ids }, controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
        const order = ids.split(',');
        setRecent(rows.sort((a, b) => order.indexOf(a.bookingId) - order.indexOf(b.bookingId)));
        setRecentError(null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setRecent([]);
        setRecentError(errorMessage(error));
      });
    return () => controller.abort();
  }, [ids, lookup, retry, revision]);
  const term = query.trim();
  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearchStatus('loading');
      void lookup({ q: term }, controller.signal)
        .then((rows) => {
          if (controller.signal.aborted) return;
          setMatches(rows);
          setSearchStatus('ready');
          setSearchError(null);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setMatches([]);
          setSearchStatus('error');
          setSearchError(errorMessage(error));
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, lookup, retry]);
  const changeQuery = (value: string) => {
    setQuery(value);
    setMatches([]);
    setSearchError(null);
    setSearchStatus(value.trim().length >= 2 ? 'loading' : 'idle');
  };
  return {
    query,
    changeQuery,
    recent: ids ? recent : [],
    matches,
    searchStatus,
    recentError,
    searchError,
    retry: () => setRetry((value) => value + 1),
    current: [...recent, ...matches].find((item) => item.bookingId === currentId),
  };
}
