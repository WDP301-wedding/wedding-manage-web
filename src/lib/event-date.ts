import { useSyncExternalStore } from 'react';

export function minimumEventDate(now = new Date()): string {
  const vietnamDate = new Date(now.getTime() + 7 * 60 * 60_000);
  vietnamDate.setUTCDate(vietnamDate.getUTCDate() + 2);
  return vietnamDate.toISOString().slice(0, 10);
}

function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  window.addEventListener('focus', onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', onChange);
  };
}

export function useMinimumEventDate(): string {
  return useSyncExternalStore(subscribe, minimumEventDate, () => '');
}
