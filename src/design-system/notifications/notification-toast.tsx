'use client';

import { useEffect, useRef } from 'react';
import type { NotificationItem } from './notification-types';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from 'cn';

const toastIcon = {
  success: CircleCheck,
  error: CircleX,
  warning: TriangleAlert,
  info: Info,
} as const;
const toastTone = {
  success: 'border-hy-success/30 text-hy-success',
  error: 'border-hy-error/30 text-hy-error',
  warning: 'border-hy-warning/30 text-hy-warning',
  info: 'border-hy-info/30 text-hy-info',
} as const;

interface NotificationToastProps {
  item: NotificationItem;
  onDismiss: (id: string) => void;
}

export function NotificationToast({ item, onDismiss }: Readonly<NotificationToastProps>) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingTimeRef = useRef<number>(item.durationMs);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (item.durationMs <= 0) return;

    const startTimer = () => {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onDismiss(item.id);
      }, remainingTimeRef.current);
    };

    startTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [item.id, item.durationMs, onDismiss]);

  const handleMouseEnter = () => {
    if (timerRef.current && item.durationMs > 0 && startTimeRef.current !== null) {
      clearTimeout(timerRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(1000, remainingTimeRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    if (item.durationMs > 0) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        onDismiss(item.id);
      }, remainingTimeRef.current);
    }
  };

  const isAlert = item.type === 'error' || item.type === 'warning';

  const Icon = toastIcon[item.type];
  return (
    <div
      className={cn(
        'pointer-events-auto relative flex items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-hy-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-200',
        toastTone[item.type],
      )}
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-foreground">
        {item.title && <div className="font-semibold">{item.title}</div>}
        <p className="text-sm [overflow-wrap:anywhere]">{item.message}</p>
        {item.requestId && (
          <span className="text-2xs text-muted-foreground" title={item.requestId}>
            Mã yêu cầu: {item.requestId.slice(0, 8)}…
          </span>
        )}
      </div>
      <button
        type="button"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={() => onDismiss(item.id)}
        aria-label="Đóng thông báo"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
