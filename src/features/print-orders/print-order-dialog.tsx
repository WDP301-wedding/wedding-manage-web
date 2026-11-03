'use client';

import { type ReactNode, type RefObject, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from 'cn';
import { useFocusTrap } from './focus-trap';

/**
 * Khung hộp thoại/ngăn kéo của màn in ấn: nền mờ, bẫy focus, Esc để đóng, nút X.
 * `variant="drawer"` trượt vào từ cạnh phải (khung báo giá).
 */
export function PrintOrderDialog({
  label,
  title,
  description,
  closeLabel = 'Đóng hộp thoại',
  onClose,
  initialFocusRef,
  variant = 'modal',
  size = 'default',
  children,
}: Readonly<{
  label: string;
  title: ReactNode;
  description?: ReactNode;
  closeLabel?: string;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  variant?: 'modal' | 'drawer';
  size?: 'default' | 'wide';
  children: ReactNode;
}>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  useFocusTrap({
    isOpen: true,
    containerRef,
    initialFocusRef: initialFocusRef ?? closeButtonRef,
    onClose,
  });

  const drawer = variant === 'drawer';
  return (
    <div data-ui-v3 className="contents">
      <div
        className="fixed inset-0 z-[1000] bg-hy-ink/40 motion-safe:animate-in motion-safe:fade-in-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          'fixed z-[1001] flex flex-col overflow-y-auto bg-card shadow-hy-2 outline-none',
          drawer
            ? 'inset-y-0 right-0 w-full max-w-[560px] motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-300 motion-safe:ease-hy-decelerate'
            : 'top-1/2 left-1/2 max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95',
          !drawer && (size === 'wide' ? 'max-w-5xl' : 'max-w-[560px]'),
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{title}</h2>
            {description ? (
              <div className="text-xs text-muted-foreground">{description}</div>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
