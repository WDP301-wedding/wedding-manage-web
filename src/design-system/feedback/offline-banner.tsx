'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;

  return (
    <div
      data-ui-v3
      role="status"
      aria-live="assertive"
      className="sticky top-0 z-40 flex items-start gap-3 bg-hy-warning-bg px-5 py-3 text-sm text-hy-warning motion-safe:animate-in motion-safe:slide-in-from-top-2"
    >
      <WifiOff aria-hidden className="mt-0.5 size-[18px] shrink-0" />
      <span>
        <strong>Mất kết nối mạng.</strong> Bạn đang xem dữ liệu lưu tạm; các thao tác ghi, duyệt và
        thao tác tiền tạm khoá cho đến khi kết nối lại.
      </span>
    </div>
  );
}
