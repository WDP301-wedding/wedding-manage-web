'use client';

import { useEffect, useRef, useState } from 'react';
import { useRefreshQueue } from './refresh-queue';
import { useRealtimeSubscription } from './use-realtime';
import type { RealtimeEventType } from './realtime-client';

type Options = Readonly<{
  scope: string;
  bookingId?: string | null | undefined;
  types: readonly RealtimeEventType[];
  enabled?: boolean;
  blocked?: boolean;
  initial?: boolean;
  invalidateOnBlock?: boolean;
}>;

/** A resource owns its authoritative read; never replace a draft or race a financial command. */
export function useLiveRefresh(
  read: (isCurrent: () => boolean) => void | Promise<void>,
  {
    scope,
    bookingId,
    types,
    enabled = true,
    blocked = false,
    initial = false,
    invalidateOnBlock = false,
  }: Options,
) {
  const epoch = useRef(0);
  const latest = useRef({ scope, enabled, blocked });
  useEffect(() => {
    latest.current = { scope, enabled, blocked };
  }, [scope, enabled, blocked]);
  useEffect(() => {
    if (invalidateOnBlock && blocked) epoch.current++;
  }, [invalidateOnBlock, blocked]);
  const [waiting, setWaiting] = useState(false);
  const queue = useRefreshQueue(async () => {
    if (!enabled) return;
    if (blocked) {
      setWaiting(true);
      return;
    }
    setWaiting(false);
    const version = epoch.current;
    await read(() => {
      if (latest.current.scope !== scope || !latest.current.enabled) return false;
      if (epoch.current !== version || (invalidateOnBlock && latest.current.blocked)) {
        setWaiting(true);
        return false;
      }
      return true;
    });
  }, scope);
  useEffect(
    () => () => {
      epoch.current++;
    },
    [scope],
  );
  useEffect(() => {
    if (enabled && initial) void queue.run().catch(() => undefined);
  }, [enabled, initial, queue]);
  useEffect(() => {
    if (enabled && !blocked && waiting) queue.schedule();
  }, [enabled, blocked, waiting, queue]);
  useRealtimeSubscription({
    bookingId,
    enabled,
    filterBooking: true,
    onEvent: (event) => {
      if (types.includes(event.type)) queue.schedule();
    },
    onResync: queue.schedule,
  });
  return { waiting, refresh: queue.refresh, schedule: queue.schedule };
}

export function LiveUpdateNotice({ waiting }: Readonly<{ waiting: boolean }>) {
  return waiting ? (
    <p role="status">
      Có cập nhật mới. Dữ liệu sẽ được đồng bộ sau khi bạn hoàn tất hoặc hủy thao tác đang làm.
    </p>
  ) : null;
}
