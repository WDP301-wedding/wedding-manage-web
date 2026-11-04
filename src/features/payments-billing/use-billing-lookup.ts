import { useEffect, useRef, useState } from 'react';
import { axiosApiClient } from '../../lib/api/axios-client';
import type { BookingIdentity } from '../booking-lifecycle/use-booking-lookup';
import type { Authorize } from './use-billing-workspace';

export function useBillingLookup(authorize: Authorize) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<BookingIdentity[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const cancel = () => {
    epoch.current++;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
  };
  useEffect(() => () => cancel(), []);
  const resolve = async (term: string, ids = false) => {
    cancel();
    const version = epoch.current;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const rows = await authorize(async (token) => {
        const response = await axiosApiClient.get<{ data: BookingIdentity[] }>(
          '/management/booking-lookups',
          {
            params: ids ? { ids: term } : { q: term },
            signal: abort.signal,
            headers: { Authorization: 'Bearer ' + token },
          },
        );
        return response.data.data;
      });
      return version === epoch.current && !abort.signal.aborted ? rows : null;
    } catch (cause) {
      if (version !== epoch.current || abort.signal.aborted) return null;
      throw cause;
    }
  };
  const change = (value: string) => {
    cancel();
    setQuery(value);
    setMatches([]);
    setOpen(false);
    setError(null);
    if (value.trim().length < 2) return;
    timer.current = setTimeout(() => {
      void resolve(value.trim())
        .then((rows) => {
          if (rows) {
            setMatches(rows);
            setOpen(rows.length > 0);
          }
        })
        .catch((cause: unknown) => {
          if (cause instanceof Error && cause.name === 'CanceledError') return;
          setError('Chưa tìm được hồ sơ. Hãy thử lại hoặc nhập mã HY đầy đủ.');
        });
    }, 250);
  };
  const choose = (identity: BookingIdentity) => {
    cancel();
    setQuery(identity.bookingCode);
    setMatches([]);
    setOpen(false);
    setError(null);
  };
  return {
    query,
    setQuery,
    matches,
    setMatches,
    open,
    setOpen,
    error,
    change,
    resolve,
    choose,
    cancel,
  };
}
