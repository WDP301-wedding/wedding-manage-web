'use client';

import { type ReactNode, type RefObject, useRef } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { cn } from 'cn';

/**
 * Khung hộp thoại/ngăn kéo của màn in ấn: nền mờ, bẫy focus, Esc để đóng, nút X.
 * `variant="drawer"` trượt vào từ cạnh phải (khung báo giá).
 */
export function PrintQueueDialog({
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
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawer = variant === 'drawer';
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <div data-ui-v3 className="contents">
          <Dialog.Backdrop
            forceRender
            className="fixed inset-0 z-[1001] bg-hy-ink/40 motion-safe:animate-in motion-safe:fade-in-0"
          />
          <Dialog.Popup
            aria-label={label}
            aria-modal="true"
            initialFocus={initialFocusRef ?? closeButtonRef}
            className={cn(
              'fixed z-[1001] flex flex-col overflow-y-auto overscroll-contain bg-card shadow-hy-2 outline-none',
              drawer
                ? 'inset-y-0 right-0 w-full max-w-[560px] motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-300 motion-safe:ease-hy-decelerate'
                : 'top-1/2 left-1/2 max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 sm:max-h-[calc(100dvh-3rem)] sm:w-[calc(100%-3rem)]',
              !drawer && (size === 'wide' ? 'max-w-5xl' : 'max-w-[560px]'),
            )}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card px-4 py-4 sm:px-6">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 className="text-lg leading-tight font-semibold [overflow-wrap:anywhere]">
                  {title}
                </h2>
                {description ? (
                  <div className="text-xs text-muted-foreground">{description}</div>
                ) : null}
              </div>
              <Dialog.Close
                ref={closeButtonRef}
                type="button"
                aria-label={closeLabel}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X aria-hidden className="size-5" />
              </Dialog.Close>
            </div>
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">{children}</div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
