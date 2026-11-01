'use client';

import { useEffect, useRef } from 'react';
import { sharedManagementRealtime, type RealtimeEvent } from './realtime-client';

export interface UseRealtimeOptions {
  readonly bookingId?: string | null | undefined;
  readonly filterBooking?: boolean | undefined;
  readonly onEvent?: ((event: RealtimeEvent) => void) | undefined;
  readonly onResync?: (() => void) | undefined;
  readonly enabled?: boolean | undefined;
}

export function useRealtimeSubscription({
  bookingId,
  filterBooking = false,
  onEvent,
  onResync,
  enabled = true,
}: UseRealtimeOptions): void {
  const onEventRef = useRef(onEvent);
  const onResyncRef = useRef(onResync);

  useEffect(() => {
    onEventRef.current = onEvent;
    onResyncRef.current = onResync;
  });

  useEffect(() => {
    if (!enabled) return;

    const unsubEvent = sharedManagementRealtime.addEventListener((event) => {
      if (
        filterBooking &&
        bookingId &&
        event.scope.bookingId &&
        event.scope.bookingId !== bookingId
      ) {
        return; // Ignore other bookings only when explicitly opted in
      }
      onEventRef.current?.(event);
    });

    const unsubResync = sharedManagementRealtime.addResyncListener(() => {
      onResyncRef.current?.();
    });

    let unsubBooking: (() => void) | undefined;
    if (bookingId) {
      unsubBooking = sharedManagementRealtime.subscribeBooking(bookingId);
    }

    return () => {
      unsubEvent();
      unsubResync();
      unsubBooking?.();
    };
  }, [bookingId, enabled, filterBooking]);
}
