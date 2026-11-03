'use client';

import Link from 'next/link';
import { cn } from 'cn';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { ManagementSessionSnapshot } from './session';
import { BrandMark } from '../../design-system/brand-mark';
import { OfflineBanner } from '../../design-system/offline-banner';
import { PageTransition } from '../../design-system/page-transition';
import {
  CalendarIcon,
  ClipboardListIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  MenuIcon,
  PrinterIcon,
  Settings2Icon,
  UsersIcon,
  XIcon,
} from 'lucide-react';

const navItemClass =
  'flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground no-underline transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-accent-foreground';
const iconButtonClass =
  'flex size-11 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

export function OperationsShell({
  children,
  activePage,
  contentId,
  snapshot,
  onLogout,
  pending = false,
}: Readonly<{
  children: ReactNode;
  activePage:
    | 'archive'
    | 'overview'
    | 'bookings'
    | 'consultations'
    | 'catalog'
    | 'account'
    | 'print-orders'
    | 'billing'
    | 'staff';
  contentId: string;
  snapshot: ManagementSessionSnapshot | null;
  onLogout: () => void;
  pending?: boolean;
}>) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const actor =
    snapshot?.status === 'authenticated' && snapshot.presentation !== 'denied'
      ? snapshot.actor
      : null;
  const manager = snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';

  // Complete Tab Focus Trap & Keyboard Escape & Scroll Lock
  useEffect(() => {
    if (!mobileDrawerOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button initially
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMobileDrawerOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !drawerRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !drawerRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    const trigger = triggerRef.current;
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      trigger?.focus();
    };
  }, [mobileDrawerOpen]);

  const handleCloseDrawer = () => {
    setMobileDrawerOpen(false);
    triggerRef.current?.focus();
  };

  const navLinks = (
    <>
      <Link
        id="ops-nav-overview"
        className={navItemClass}
        href="/"
        prefetch={false}
        aria-current={activePage === 'overview' ? 'page' : undefined}
        aria-label="Tổng quan"
        title="Tổng quan"
        onClick={() => setMobileDrawerOpen(false)}
      >
        <LayoutDashboardIcon width={18} height={18} aria-hidden="true" />
        <span>Tổng quan</span>
      </Link>
      {manager ? (
        <>
          <Link
            id="ops-nav-bookings"
            className={navItemClass}
            href="/bookings"
            prefetch={false}
            aria-current={activePage === 'bookings' ? 'page' : undefined}
            aria-label="Đặt tiệc"
            title="Đặt tiệc"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <CalendarIcon width={18} height={18} aria-hidden="true" />
            <span>Đặt tiệc</span>
          </Link>
          <Link
            id="ops-nav-billing"
            className={navItemClass}
            href="/billing"
            prefetch={false}
            aria-current={activePage === 'billing' ? 'page' : undefined}
            aria-label="Quản lý thanh toán"
            title="Quản lý thanh toán"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <CreditCardIcon width={18} height={18} aria-hidden="true" />
            <span>Quản lý thanh toán</span>
          </Link>
          <Link
            id="ops-nav-consultations"
            className={navItemClass}
            href="/consultation-requests"
            prefetch={false}
            aria-current={activePage === 'consultations' ? 'page' : undefined}
            aria-label="Yêu cầu tư vấn"
            title="Yêu cầu tư vấn"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <ClipboardListIcon width={18} height={18} aria-hidden="true" />
            <span>Yêu cầu tư vấn</span>
          </Link>
          <Link
            id="ops-nav-print-orders"
            className={navItemClass}
            href="/print-orders"
            prefetch={false}
            aria-current={activePage === 'print-orders' ? 'page' : undefined}
            aria-label="Thiệp và in ấn"
            title="Thiệp và in ấn"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <PrinterIcon width={18} height={18} aria-hidden="true" />
            <span>Thiệp và in ấn</span>
          </Link>
          <Link
            id="ops-nav-staff"
            className={navItemClass}
            href="/staff"
            prefetch={false}
            aria-current={activePage === 'staff' ? 'page' : undefined}
            aria-label="Nhân sự"
            title="Nhân sự"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <UsersIcon width={18} height={18} aria-hidden="true" />
            <span>Nhân sự</span>
          </Link>
          <Link
            className={navItemClass}
            href="/cancelled-bookings"
            aria-current={activePage === 'archive' ? 'page' : undefined}
            onClick={() => setMobileDrawerOpen(false)}
          >
            <CalendarIcon width={18} height={18} aria-hidden />
            <span>Tiệc đã hủy</span>
          </Link>
          <Link
            id="ops-nav-catalog"
            className={navItemClass}
            href="/catalog"
            prefetch={false}
            aria-current={activePage === 'catalog' ? 'page' : undefined}
            aria-label="Danh mục"
            title="Danh mục"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <Settings2Icon width={18} height={18} aria-hidden="true" />
            <span>Danh mục</span>
          </Link>
        </>
      ) : actor ? (
        <Link
          id="ops-nav-staff-checkin"
          className={navItemClass}
          href="/staff"
          prefetch={false}
          aria-current={activePage === 'staff' ? 'page' : undefined}
          aria-label="Bàn đón khách"
          title="Bàn đón khách"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <UsersIcon width={18} height={18} aria-hidden="true" />
          <span>Bàn đón khách</span>
        </Link>
      ) : null}
    </>
  );

  const footerProfile = (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      {actor ? (
        <>
          <Link
            className="flex items-center gap-3 rounded-lg p-2 text-foreground no-underline hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:bg-accent"
            href="/account"
            aria-current={activePage === 'account' ? 'page' : undefined}
            aria-label={`Quản lý tài khoản ${actor.displayEmail}`}
            onClick={() => setMobileDrawerOpen(false)}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
              </svg>
            </span>
            <span className="flex min-w-0 flex-col">
              <strong className="truncate text-xs font-semibold">{actor.displayEmail}</strong>
              <small className="text-2xs text-muted-foreground">
                {manager ? 'Quản lý nhà hàng' : 'Nhân viên vận hành'}
              </small>
            </span>
          </Link>
          <button
            className="h-9 rounded-lg px-2 text-left text-xs font-semibold text-primary hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            type="button"
            onClick={() => {
              setMobileDrawerOpen(false);
              onLogout();
            }}
            disabled={pending}
          >
            Đăng xuất
          </button>
        </>
      ) : (
        <Link className={navItemClass} href="/" onClick={() => setMobileDrawerOpen(false)}>
          Đăng nhập
        </Link>
      )}
    </div>
  );

  return (
    <div
      data-ui-v3
      className="flex min-h-screen flex-col bg-background min-[1025px]:grid min-[1025px]:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[264px_minmax(0,1fr)]"
    >
      <a
        className="fixed top-3 left-3 z-[2000] -translate-y-[160%] rounded-lg bg-hy-ink px-3.5 py-2.5 text-sm font-semibold text-white focus:translate-y-0 motion-safe:transition-transform"
        href={`#${contentId}`}
      >
        Đi đến nội dung chính
      </a>

      {/* Mobile Header Bar with Hamburger */}
      <div
        data-ui-v3=""
        className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b border-border bg-card px-2 min-[1025px]:hidden"
        aria-label="Thanh điều hướng di động"
      >
        <button
          ref={triggerRef}
          type="button"
          className={iconButtonClass}
          aria-label="Mở bảng điều hướng"
          aria-expanded={mobileDrawerOpen}
          aria-controls="operations-mobile-drawer"
          onClick={() => setMobileDrawerOpen(true)}
        >
          <MenuIcon width={22} height={22} aria-hidden="true" />
        </button>
        <BrandMark compact tagline="Quản trị nhà hàng" />
      </div>

      {/* Mobile Drawer Backdrop & Dialog */}
      {mobileDrawerOpen ? (
        <div
          className="fixed inset-0 z-[999] bg-hy-ink/40 min-[1025px]:hidden"
          onClick={handleCloseDrawer}
          aria-hidden="true"
        />
      ) : null}

      <aside
        ref={drawerRef}
        id="operations-mobile-drawer"
        data-ui-v3=""
        className={cn(
          'flex flex-col gap-6 border-r border-border bg-card px-4 py-6',
          'min-[1025px]:sticky min-[1025px]:top-0 min-[1025px]:h-screen min-[1025px]:overflow-y-auto',
          mobileDrawerOpen
            ? 'max-[1024px]:fixed max-[1024px]:inset-y-0 max-[1024px]:left-0 max-[1024px]:z-[1000] max-[1024px]:w-[280px] max-[1024px]:overflow-y-auto max-[1024px]:shadow-hy-2 motion-safe:max-[1024px]:animate-in motion-safe:max-[1024px]:slide-in-from-left'
            : 'max-[1024px]:hidden',
        )}
        role={mobileDrawerOpen ? 'dialog' : undefined}
        aria-modal={mobileDrawerOpen ? 'true' : undefined}
        aria-label="Bảng điều hướng quản trị"
      >
        <div className="flex items-center justify-between gap-2 px-2">
          <BrandMark tagline="Quản trị nhà hàng" />
          {mobileDrawerOpen ? (
            <button
              ref={closeButtonRef}
              type="button"
              className={iconButtonClass}
              aria-label="Đóng bảng điều hướng"
              onClick={handleCloseDrawer}
            >
              <XIcon width={20} height={20} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <nav className="flex grow flex-col gap-1" aria-label="Điều hướng vận hành">
          {navLinks}
        </nav>

        {footerProfile}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col [&>main]:mx-auto [&>main]:w-full [&>main]:max-w-[1680px]">
        <OfflineBanner />
        <PageTransition>{children}</PageTransition>
      </div>
    </div>
  );
}
