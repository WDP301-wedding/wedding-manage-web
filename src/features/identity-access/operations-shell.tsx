'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { ManagementSessionSnapshot } from './session';
import { BrandMark } from '../../design-system/brand-mark';
import { OfflineBanner } from '../../design-system/offline-banner';
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
} from '../print-orders/icons';

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

  const navClass = (page: typeof activePage) =>
    `nav-item${activePage === page ? ' nav-item-active' : ''}`;

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
        className={navClass('overview')}
        href="/"
        prefetch={false}
        aria-current={activePage === 'overview' ? 'page' : undefined}
        aria-label="Tổng quan"
        title="Tổng quan"
        onClick={() => setMobileDrawerOpen(false)}
      >
        <span className="nav-icon" aria-hidden="true">
          <LayoutDashboardIcon width={18} height={18} />
        </span>
        <span>Tổng quan</span>
      </Link>
      {manager ? (
        <>
          <Link
            id="ops-nav-bookings"
            className={navClass('bookings')}
            href="/bookings"
            prefetch={false}
            aria-current={activePage === 'bookings' ? 'page' : undefined}
            aria-label="Đặt tiệc"
            title="Đặt tiệc"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <span className="nav-icon" aria-hidden="true">
              <CalendarIcon width={18} height={18} />
            </span>
            <span>Đặt tiệc</span>
          </Link>
          <Link
            id="ops-nav-billing"
            className={navClass('billing')}
            href="/billing"
            prefetch={false}
            aria-current={activePage === 'billing' ? 'page' : undefined}
            aria-label="Quản lý thanh toán"
            title="Quản lý thanh toán"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <span className="nav-icon" aria-hidden="true">
              <CreditCardIcon width={18} height={18} />
            </span>
            <span>Quản lý thanh toán</span>
          </Link>
          <Link
            id="ops-nav-consultations"
            className={navClass('consultations')}
            href="/consultation-requests"
            prefetch={false}
            aria-current={activePage === 'consultations' ? 'page' : undefined}
            aria-label="Yêu cầu tư vấn"
            title="Yêu cầu tư vấn"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <span className="nav-icon" aria-hidden="true">
              <ClipboardListIcon width={18} height={18} />
            </span>
            <span>Yêu cầu tư vấn</span>
          </Link>
          <Link
            id="ops-nav-print-orders"
            className={navClass('print-orders')}
            href="/print-orders"
            prefetch={false}
            aria-current={activePage === 'print-orders' ? 'page' : undefined}
            aria-label="Thiệp và in ấn"
            title="Thiệp và in ấn"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <span className="nav-icon" aria-hidden="true">
              <PrinterIcon width={18} height={18} />
            </span>
            <span>Thiệp và in ấn</span>
          </Link>
          <Link
            id="ops-nav-staff"
            className={navClass('staff')}
            href="/staff"
            prefetch={false}
            aria-current={activePage === 'staff' ? 'page' : undefined}
            aria-label="Nhân sự"
            title="Nhân sự"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <span className="nav-icon" aria-hidden="true">
              <UsersIcon width={18} height={18} />
            </span>
            <span>Nhân sự</span>
          </Link>
          <Link
            id="ops-nav-catalog"
            className={navClass('catalog')}
            href="/catalog"
            prefetch={false}
            aria-current={activePage === 'catalog' ? 'page' : undefined}
            aria-label="Danh mục"
            title="Danh mục"
            onClick={() => setMobileDrawerOpen(false)}
          >
            <span className="nav-icon" aria-hidden="true">
              <Settings2Icon width={18} height={18} />
            </span>
            <span>Danh mục</span>
          </Link>
        </>
      ) : actor ? (
        <Link
          id="ops-nav-staff-checkin"
          className={navClass('staff')}
          href="/staff"
          prefetch={false}
          aria-current={activePage === 'staff' ? 'page' : undefined}
          aria-label="Bàn đón khách"
          title="Bàn đón khách"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <span className="nav-icon" aria-hidden="true">
            <UsersIcon width={18} height={18} />
          </span>
          <span>Bàn đón khách</span>
        </Link>
      ) : null}
    </>
  );

  const footerProfile = (
    <div className="sidebar-footer">
      {actor ? (
        <div className="profile-block">
          <Link
            className="operations-account-link"
            href="/account"
            aria-current={activePage === 'account' ? 'page' : undefined}
            aria-label={`Quản lý tài khoản ${actor.displayEmail}`}
            onClick={() => setMobileDrawerOpen(false)}
          >
            <span className="operations-account-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 22, height: 22, flexShrink: 0 }}
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
              </svg>
            </span>
            <span className="operations-account-label">
              <strong>{actor.displayEmail}</strong>
              <small>{manager ? 'Quản lý nhà hàng' : 'Nhân viên vận hành'}</small>
            </span>
          </Link>
          <button
            className="operations-logout"
            type="button"
            onClick={() => {
              setMobileDrawerOpen(false);
              onLogout();
            }}
            disabled={pending}
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <Link className="nav-item" href="/" onClick={() => setMobileDrawerOpen(false)}>
          Đăng nhập
        </Link>
      )}
    </div>
  );

  return (
    <div className="admin-shell operations-shell">
      <a className="skip-link" href={`#${contentId}`}>
        Đi đến nội dung chính
      </a>

      {/* Mobile Header Bar with Hamburger */}
      <div className="operations-mobile-header" aria-label="Thanh điều hướng di động">
        <button
          ref={triggerRef}
          type="button"
          className="operations-hamburger"
          aria-label="Mở bảng điều hướng"
          aria-expanded={mobileDrawerOpen}
          aria-controls="operations-mobile-drawer"
          onClick={() => setMobileDrawerOpen(true)}
        >
          <MenuIcon width={22} height={22} />
        </button>
        <div className="admin-brand operations-mobile-brand">
          <BrandMark compact tagline="Quản trị nhà hàng" />
        </div>
      </div>

      {/* Mobile Drawer Backdrop & Dialog */}
      {mobileDrawerOpen ? (
        <div
          className="operations-drawer-backdrop"
          onClick={handleCloseDrawer}
          aria-hidden="true"
        />
      ) : null}

      <aside
        ref={drawerRef}
        id="operations-mobile-drawer"
        className={`admin-sidebar${mobileDrawerOpen ? ' operations-drawer-open' : ''}`}
        role={mobileDrawerOpen ? 'dialog' : undefined}
        aria-modal={mobileDrawerOpen ? 'true' : undefined}
        aria-label="Bảng điều hướng quản trị"
      >
        <div className="admin-brand">
          <BrandMark tagline="Quản trị nhà hàng" />
          {mobileDrawerOpen ? (
            <button
              ref={closeButtonRef}
              type="button"
              className="operations-drawer-close"
              aria-label="Đóng bảng điều hướng"
              onClick={handleCloseDrawer}
            >
              <XIcon width={20} height={20} />
            </button>
          ) : null}
        </div>

        <nav className="admin-navigation" aria-label="Điều hướng vận hành">
          {navLinks}
        </nav>

        {footerProfile}
      </aside>

      <div className="operations-main-container">
        <OfflineBanner />
        {children}
      </div>
    </div>
  );
}
