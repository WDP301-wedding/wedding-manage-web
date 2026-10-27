'use client';

import { useEffect, useRef } from 'react';
import type { NotificationItem } from './notification-types';
import styles from './notification.module.css';

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

  return (
    <div
      className={`${styles.toast} ${
        item.type === 'success'
          ? styles.toastSuccess
          : item.type === 'error'
            ? styles.toastError
            : item.type === 'warning'
              ? styles.toastWarning
              : styles.toastInfo
      }`}
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.iconWrapper}>
        {item.type === 'success' && (
          <svg
            className={styles.iconSuccess}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )}
        {item.type === 'error' && (
          <svg
            className={styles.iconError}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )}
        {item.type === 'warning' && (
          <svg
            className={styles.iconWarning}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
        {item.type === 'info' && (
          <svg
            className={styles.iconInfo}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
      </div>

      <div className={styles.content}>
        {item.title && <div className={styles.title}>{item.title}</div>}
        <p className={styles.message}>{item.message}</p>
        {item.requestId && (
          <span className={styles.requestId} title={item.requestId}>
            Mã yêu cầu: {item.requestId.slice(0, 8)}…
          </span>
        )}
      </div>

      <button
        type="button"
        className={styles.closeButton}
        onClick={() => onDismiss(item.id)}
        aria-label="Đóng thông báo"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
