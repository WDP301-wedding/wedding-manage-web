'use client';

import { useEffect, useRef } from 'react';
import { sharedManagementRealtime, type RealtimeEvent } from './realtime-client';

export interface UseRealtimeOptions {
  readonly bookingId?: string | null | undefined;
  readonly onEvent?: ((event: RealtimeEvent) => void) | undefined;
  readonly onResync?: (() => void) | undefined;
  readonly enabled?: boolean | undefined;
}

export function useRealtimeSubscription({
  bookingId,
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
      if (bookingId && event.scope.bookingId && event.scope.bookingId !== bookingId) {
        return; // Ignore other bookings
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
  }, [bookingId, enabled]);
}

/**
 * Creates a debounced, single-flight coalesced fetcher that prevents
 * burst events from creating refetch storms or stale out-of-order writes.
 */
export function createCoalescedFetcher(fetcher: () => Promise<void>, minIntervalMs = 400) {
  let inFlight = false;
  let scheduled = false;
  let lastExecution = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function execute() {
    inFlight = true;
    lastExecution = Date.now();
    try {
      await fetcher();
    } finally {
      inFlight = false;
      if (scheduled) {
        scheduled = false;
        const delay = Math.max(0, minIntervalMs - (Date.now() - lastExecution));
        timer = setTimeout(() => {
          void execute();
        }, delay);
      }
    }
  }

  return {
    trigger() {
      if (inFlight) {
        scheduled = true;
        return;
      }

      const elapsed = Date.now() - lastExecution;
      if (elapsed < minIntervalMs) {
        if (!scheduled) {
          scheduled = true;
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            scheduled = false;
            void execute();
          }, minIntervalMs - elapsed);
        }
        return;
      }

      void execute();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      scheduled = false;
      inFlight = false;
    },
  };
}
