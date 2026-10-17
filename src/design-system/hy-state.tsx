'use client';

import { useState } from 'react';
import { Skeleton } from './skeleton';

export type StateKind = 'loading' | 'empty' | 'error' | 'locked';

export interface StateInfo {
  title: string;
  body: string;
  cta?: string;
  refCode?: string;
}

export function HyState({
  kind,
  info,
  onCta,
  onRetry,
}: Readonly<{
  kind: StateKind;
  info?: StateInfo;
  onCta?: () => void;
  onRetry?: () => void;
}>) {
  const [copied, setCopied] = useState(false);

  if (kind === 'loading') {
    return <Skeleton label={info?.title || 'Đang tải…'} variant="page" />;
  }

  const handleCopyRef = async () => {
    if (!info?.refCode) return;
    try {
      await navigator.clipboard.writeText(info.refCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard write failures in unsupported environments
    }
  };

  const isError = kind === 'error';
  const isLocked = kind === 'locked';

  return (
    <div
      className={`hy-state-container hy-state-${kind}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="hy-state-icon-wrap" aria-hidden="true">
        {isError ? (
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : isLocked ? (
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        )}
      </div>

      {isLocked ? (
        <span className="hy-state-badge">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Mở sau khi đặt cọc
        </span>
      ) : null}

      <h3 className="hy-state-title">{info?.title || 'Thông báo trạng thái'}</h3>
      <p className="hy-state-body">{info?.body || ''}</p>

      <div className="hy-state-actions">
        {isError && onRetry ? (
          <button type="button" className="hy-btn hy-btn-primary" onClick={onRetry}>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Thử lại
          </button>
        ) : null}

        {info?.cta && onCta ? (
          <button
            type="button"
            className={isError ? 'hy-btn hy-btn-secondary' : 'hy-btn hy-btn-primary'}
            onClick={onCta}
          >
            {info.cta}
          </button>
        ) : null}
      </div>

      {isError && info?.refCode ? (
        <div className="hy-state-ref">
          <span>
            Mã tham chiếu: <code>{info.refCode}</code>
          </span>
          <button
            type="button"
            className="hy-icon-btn"
            aria-label="Sao chép mã tham chiếu"
            title="Sao chép mã tham chiếu"
            onClick={() => void handleCopyRef()}
          >
            {copied ? (
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="#2f6b4f"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
