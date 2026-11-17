'use client';

import Link from 'next/link';
import { cn } from 'cn';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, UserCircle, UsersIcon, LogOut } from 'lucide-react';

export function TopRightAccountMenu({
  actor,
  manager,
  activePage,
  pending,
  onLogout,
  compact = false,
}: Readonly<{
  actor: { displayEmail: string } | null;
  manager: boolean;
  activePage: string;
  pending: boolean;
  onLogout: () => void;
  compact?: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!actor) {
    return (
      <Link
        href="/"
        className="flex h-8.5 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-foreground no-underline transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <UsersIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        Đăng nhập
      </Link>
    );
  }

  const initials = actor.displayEmail.slice(0, 2).toUpperCase();
  const displayHandle = actor.displayEmail.split('@')[0] || actor.displayEmail;
  const roleLabel = manager ? 'Quản lý nhà hàng' : 'Nhân viên vận hành';

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Tài khoản ${actor.displayEmail}`}
        title={actor.displayEmail}
        className={cn(
          'group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 text-left transition-all duration-150 hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer',
          compact && 'pr-1.5',
          open && 'bg-muted/90',
        )}
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-hy-wine-pressed text-xs font-semibold tracking-wide text-primary-foreground shadow-sm ring-2 ring-primary/15 transition-transform duration-150 group-hover:scale-[1.02]">
          {initials}
          <span
            className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-hy-success ring-2 ring-card"
            aria-hidden="true"
          />
        </span>
        {!compact ? (
          <span className="flex flex-col">
            <span className="max-w-[130px] truncate text-xs font-semibold leading-4 text-foreground">
              {displayHandle}
            </span>
            <span className="text-[11px] leading-3.5 text-muted-foreground">
              {manager ? 'Quản lý' : 'Nhân viên'}
            </span>
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground/75 transition-transform duration-200 group-hover:text-foreground',
            open && 'rotate-180 text-foreground',
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2.5 w-72 origin-top-right rounded-2xl border border-black/[0.08] bg-card p-2 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.05)] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-hy-wine-pressed text-xs font-bold tracking-wide text-primary-foreground shadow-sm ring-2 ring-primary/15"
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <strong className="truncate text-xs font-semibold text-foreground">
                {actor.displayEmail}
              </strong>
              <span className="inline-flex w-fit items-center rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="mt-1.5 flex flex-col gap-0.5">
            <Link
              role="menuitem"
              href="/account"
              aria-current={activePage === 'account' ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-foreground no-underline transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                activePage === 'account' && 'bg-accent/70 font-semibold text-primary',
              )}
            >
              <UserCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>Thông tin tài khoản</span>
            </Link>

            <div className="my-1 border-t border-border/70" role="separator" />

            <button
              role="menuitem"
              type="button"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-foreground/85 transition-colors hover:bg-hy-error-bg hover:text-hy-error focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
