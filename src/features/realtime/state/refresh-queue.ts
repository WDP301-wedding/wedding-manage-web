'use client';

import { useEffect, useMemo } from 'react';

const refreshBurstWindowMs = 400;

/** One in-flight read per owner. Events arriving during a read retain one trailing refresh. */
export function createRefreshQueue(
  initialRead: () => Promise<void> = () => Promise.resolve(),
  delayMs = refreshBurstWindowMs,
) {
  let read = initialRead;
  let current: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queued = false;
  let generation = 0;
  let following: Promise<void> | null = null;
  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const schedule = () => {
    queued = true;
    if (current !== null || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      // Read owners expose errors in their own UI; never leave a background rejection unhandled.
      void run().catch(() => undefined);
    }, delayMs);
  };
  const run = (): Promise<void> => {
    if (current !== null) return current;
    clearTimer();
    queued = false;
    const started = generation;
    const request = Promise.resolve().then(() => {
      if (started === generation) return read();
      return undefined;
    });
    current = request;
    const finish = () => {
      if (current !== request) return;
      current = null;
      if (queued && started === generation) schedule();
    };
    void request.then(finish, finish);
    return request;
  };
  // Explicit post-mutation reads must not join a request that started before the write.
  const refresh = (): Promise<void> => {
    if (current === null) return run();
    if (following !== null) return following;
    const requested = generation;
    const pending = current
      .catch(() => undefined)
      .then(() => {
        if (requested === generation) return run();
        return undefined;
      });
    following = pending;
    const clearFollowing = () => {
      if (following === pending) following = null;
    };
    void pending.then(clearFollowing, clearFollowing);
    return pending;
  };
  return {
    run,
    refresh,
    schedule,
    setReader(next: () => Promise<void>) {
      read = next;
    },
    cancel() {
      generation++;
      current = null;
      following = null;
      queued = false;
      clearTimer();
    },
  };
}

/** Changing the resource scope cancels pending work without sharing private data across owners. */
export function useRefreshQueue(read: () => Promise<void>, scope: unknown) {
  const owner = useMemo(() => ({ scope, queue: createRefreshQueue() }), [scope]);
  const queue = owner.queue;
  useEffect(() => {
    queue.setReader(read);
  }, [queue, read]);
  useEffect(() => () => queue.cancel(), [queue]);
  return queue;
}
