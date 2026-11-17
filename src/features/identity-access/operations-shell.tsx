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
  ChartNoAxesCombinedIcon,
  ClipboardListIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  MenuIcon,
  PrinterIcon,
  Settings2Icon,
  UsersIcon,
  XIcon,
  FileText,
  LogOut,
} from 'lucide-react';
import { SpotlightSearch } from './spotlight-search';

export type CockpitViewKey = 'floorplan' | 'rundown' | 'bookings' | 'settlement' | 'menu';

export const COCKPIT_VIEW_TITLES: Record<CockpitViewKey, string> = {
  floorplan: 'Sơ Đồ Bàn',
  rundown: 'Kịch Bản Lễ & Ra Món',
  bookings: 'Sổ Đặt Tiệc',
  settlement: 'Quyết Toán & QR',
  menu: 'Thực Đơn',
};

const iconButtonClass =
  'flex size-10 items-center justify-center rounded-md text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

export function OperationsShell({
  children,
  activePage,
  contentId,
  snapshot,
  onLogout,
  pending = false,
  activeView = 'floorplan',
  onSelectView,
  activeHallName,
  activeShiftLabel,
  activeFloorLabel,
  tableBadge,
  dishBadge,
  bookingsBadge,
  settlementBadge,
  onOpenContract,
}: Readonly<{
  children: ReactNode;
  activePage:
    | 'archive'
    | 'overview'
    | 'reports'
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
  activeView?: CockpitViewKey;
  onSelectView?: (view: CockpitViewKey) => void;
  activeHallName?: string;
  activeShiftLabel?: string;
  activeFloorLabel?: string;
  tableBadge?: string;
  dishBadge?: string;
  bookingsBadge?: string;
  settlementBadge?: string;
  onOpenContract?: () => void;
}>) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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

  const renderNavItem = (
    id: string,
    href: string,
    active: boolean,
    label: string,
    title: string,
    IconComponent: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>,
  ) => (
    <Link
      id={id}
      className={cn(
        'group flex h-10 w-full items-center rounded-lg text-sm text-foreground/75 no-underline transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:bg-primary aria-[current=page]:font-semibold aria-[current=page]:text-primary-foreground',
        collapsed ? 'min-[1025px]:justify-center min-[1025px]:px-0' : 'px-3',
      )}
      href={href}
      prefetch={false}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      title={title}
      onClick={() => setMobileDrawerOpen(false)}
    >
      <span className="flex size-6 shrink-0 items-center justify-center">
        <IconComponent className="size-4.5 shrink-0" aria-hidden="true" />
      </span>
      <span
        className={cn(
          'overflow-hidden whitespace-nowrap text-sm transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
          collapsed
            ? 'min-[1025px]:max-w-0 min-[1025px]:opacity-0 min-[1025px]:ml-0 min-[1025px]:pointer-events-none'
            : 'max-w-[180px] opacity-100 ml-3',
        )}
      >
        {label}
      </span>
    </Link>
  );

  const renderSectionHeader = (title: string) => (
    <div className="relative flex h-5 items-center px-3 overflow-hidden">
      <span
        className={cn(
          'overflow-hidden whitespace-nowrap text-2xs font-semibold text-muted-foreground select-none transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
          collapsed
            ? 'min-[1025px]:max-w-0 min-[1025px]:opacity-0 min-[1025px]:-translate-x-2'
            : 'max-w-[200px] opacity-100 translate-x-0',
        )}
      >
        {title}
      </span>
      <div
        className={cn(
          'hidden min-[1025px]:block absolute inset-x-2 border-t border-border/60 transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
          collapsed ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );

  const navLinks = (
    <div className="flex flex-col gap-6">
      {/* NHÓM 1: VẬN HÀNH CA TRỰC */}
      <div className="flex flex-col gap-1">
        {renderSectionHeader('VẬN HÀNH CA TRỰC')}
        {renderNavItem(
          'ops-nav-overview',
          '/',
          activePage === 'overview',
          'Tổng quan',
          'Tổng quan vận hành hôm nay',
          LayoutDashboardIcon,
        )}
        {!manager && actor
          ? renderNavItem(
              'ops-nav-assigned-events',
              '/staff',
              activePage === 'staff',
              'Tiệc phân công',
              'Tiệc được phân công',
              UsersIcon,
            )
          : null}
      </div>

      {/* NHÓM 2: KINH DOANH & HỢP ĐỒNG */}
      {manager ? (
        <div className="flex flex-col gap-1">
          {renderSectionHeader('KINH DOANH & HỢP ĐỒNG')}
          {renderNavItem(
            'ops-nav-bookings',
            '/bookings',
            activePage === 'bookings',
            'Điều phối đặt tiệc',
            'Điều phối và lập hợp đồng đặt tiệc',
            CalendarIcon,
          )}
          {renderNavItem(
            'ops-nav-consultations',
            '/consultation-requests',
            activePage === 'consultations',
            'Yêu cầu tư vấn',
            'Xử lý yêu cầu tư vấn tiệc',
            ClipboardListIcon,
          )}
          {renderNavItem(
            'ops-nav-print-orders',
            '/print-orders',
            activePage === 'print-orders',
            'Thiệp & In ấn',
            'Quản lý thiệp mời và in ấn',
            PrinterIcon,
          )}
          {renderNavItem(
            'ops-nav-cancelled',
            '/cancelled-bookings',
            activePage === 'archive',
            'Tiệc đã hủy',
            'Lưu trữ tiệc đã hủy',
            CalendarIcon,
          )}
        </div>
      ) : null}

      {/* NHÓM 3: TÀI CHÍNH & NGHIỆM THU */}
      {manager ? (
        <div className="flex flex-col gap-1">
          {renderSectionHeader('TÀI CHÍNH & BÁO CÁO')}
          {renderNavItem(
            'ops-nav-billing',
            '/billing',
            activePage === 'billing',
            'Quản lý thanh toán',
            'Quyết toán và thu đặt cọc',
            CreditCardIcon,
          )}
          {renderNavItem(
            'ops-nav-reports',
            '/reports',
            activePage === 'reports',
            'Báo cáo doanh thu',
            'Báo cáo vận hành và tài chính',
            ChartNoAxesCombinedIcon,
          )}
        </div>
      ) : null}

      {/* NHÓM 4: HỆ THỐNG & DANH MỤC */}
      {manager ? (
        <div className="flex flex-col gap-1">
          {renderSectionHeader('HỆ THỐNG & THIẾT LẬP')}
          {renderNavItem(
            'ops-nav-catalog',
            '/catalog',
            activePage === 'catalog',
            'Danh mục sảnh & món',
            'Quản lý sảnh tiệc, thực đơn và dịch vụ',
            Settings2Icon,
          )}
          {renderNavItem(
            'ops-nav-staff',
            '/staff',
            activePage === 'staff',
            'Đội ngũ nhân sự',
            'Phân công và điều phối nhân sự',
            UsersIcon,
          )}
        </div>
      ) : null}
    </div>
  );

  const footerProfile = (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      {actor ? (
        <div className="flex flex-col gap-2">
          {/* User Account Link */}
          <Link
            className={cn(
              'group flex items-center rounded-lg border border-border/80 bg-background/50 text-foreground no-underline transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-[current=page]:border-primary overflow-hidden',
              collapsed ? 'min-[1025px]:justify-center min-[1025px]:p-1.5' : 'p-2',
            )}
            href="/account"
            aria-current={activePage === 'account' ? 'page' : undefined}
            aria-label={`Quản lý tài khoản ${actor.displayEmail}`}
            title={actor.displayEmail}
            onClick={() => setMobileDrawerOpen(false)}
          >
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground shadow-sm"
              aria-hidden="true"
            >
              {actor.displayEmail.slice(0, 2).toUpperCase()}
            </span>
            <span
              className={cn(
                'flex flex-col min-w-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
                collapsed
                  ? 'min-[1025px]:max-w-0 min-[1025px]:opacity-0 min-[1025px]:ml-0 min-[1025px]:pointer-events-none'
                  : 'max-w-[160px] opacity-100 ml-3 flex-1',
              )}
            >
              <strong className="truncate text-xs font-semibold">{actor.displayEmail}</strong>
              <small className="truncate text-2xs font-medium text-muted-foreground">
                {manager ? 'Quản lý nhà hàng' : 'Nhân viên vận hành'}
              </small>
            </span>
          </Link>

          {/* Logout Button */}
          <button
            className={cn(
              'flex h-9 items-center justify-center rounded-md border border-border text-xs font-semibold text-foreground/80 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-destructive hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 overflow-hidden',
              collapsed
                ? 'min-[1025px]:size-9 min-[1025px]:mx-auto min-[1025px]:p-0'
                : 'w-full px-3',
            )}
            type="button"
            onClick={() => {
              setMobileDrawerOpen(false);
              onLogout();
            }}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            disabled={pending}
          >
            <LogOut
              className={cn(
                'size-4 shrink-0 transition-all duration-300',
                collapsed ? 'min-[1025px]:mr-0' : 'mr-2',
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
                collapsed
                  ? 'min-[1025px]:max-w-0 min-[1025px]:opacity-0 min-[1025px]:pointer-events-none'
                  : 'max-w-[100px] opacity-100',
              )}
            >
              Đăng xuất
            </span>
          </button>
        </div>
      ) : (
        <Link
          className={cn(
            'flex h-10 w-full items-center rounded-lg text-sm text-foreground/75 no-underline transition-all duration-300 hover:bg-muted hover:text-foreground',
            collapsed ? 'min-[1025px]:justify-center min-[1025px]:px-0' : 'px-3',
          )}
          href="/"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <span className="flex size-6 shrink-0 items-center justify-center">
            <UsersIcon className="size-4.5" />
          </span>
          <span
            className={cn(
              'overflow-hidden whitespace-nowrap text-sm transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]',
              collapsed
                ? 'min-[1025px]:max-w-0 min-[1025px]:opacity-0 min-[1025px]:ml-0 min-[1025px]:pointer-events-none'
                : 'max-w-[100px] opacity-100 ml-3',
            )}
          >
            Đăng nhập
          </span>
        </Link>
      )}
    </div>
  );

  const pageTitles: Record<string, string> = {
    overview: 'Tổng quan vận hành',
    bookings: 'Điều phối đặt tiệc & Hợp đồng',
    billing: 'Quản lý thanh toán & Quyết toán',
    consultations: 'Xử lý yêu cầu tư vấn',
    'print-orders': 'Thiệp cưới & In ấn',
    reports: 'Báo cáo doanh thu & Vận hành',
    catalog: 'Danh mục sảnh & Thực đơn',
    staff: manager ? 'Đội ngũ nhân sự & Tác nghiệp' : 'Tiệc được phân công',
    archive: 'Hồ sơ tiệc đã hủy',
    account: 'Tài khoản & Thiết lập cá nhân',
  };

  return (
    <div
      data-ui-v3
      className="flex min-h-screen flex-col bg-background min-[1025px]:flex-row"
    >
      <a
        className="fixed top-3 left-3 z-[2000] -translate-y-[160%] rounded-md bg-hy-ink px-3.5 py-2 text-sm font-semibold text-white focus:translate-y-0 motion-safe:transition-transform"
        href={`#${contentId}`}
      >
        Đi đến nội dung chính
      </a>

      {/* Mobile Header Bar with Hamburger */}
      <div
        data-ui-v3=""
        className="sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-card px-3 min-[1025px]:hidden"
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

      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen ? (
        <div
          className="fixed inset-0 z-[999] bg-hy-ink/50 min-[1025px]:hidden"
          onClick={handleCloseDrawer}
          aria-hidden="true"
        />
      ) : null}

      {/* Left Navigation Rail (Dual-Rail Command Cockpit) */}
      <aside
        ref={drawerRef}
        id="operations-mobile-drawer"
        data-ui-v3=""
        className={cn(
          'sidebar-no-scrollbar flex flex-col justify-between gap-6 border-r border-border bg-card py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          'transition-[width,padding] duration-300 ease-[cubic-bezier(0.2,0,0,1)] will-change-[width]',
          collapsed
            ? 'min-[1025px]:w-[68px] min-[1025px]:px-2.5'
            : 'min-[1025px]:w-[260px] min-[1025px]:px-4',
          'min-[1025px]:sticky min-[1025px]:top-0 min-[1025px]:h-screen min-[1025px]:overflow-y-auto min-[1025px]:shrink-0',
          mobileDrawerOpen
            ? 'max-[1024px]:fixed max-[1024px]:inset-y-0 max-[1024px]:left-0 max-[1024px]:z-[1000] max-[1024px]:w-[280px] max-[1024px]:px-4 max-[1024px]:overflow-y-auto max-[1024px]:shadow-hy-2 motion-safe:max-[1024px]:animate-in motion-safe:max-[1024px]:slide-in-from-left'
            : 'max-[1024px]:hidden',
        )}
        role={mobileDrawerOpen ? 'dialog' : undefined}
        aria-modal={mobileDrawerOpen ? 'true' : undefined}
        aria-label="Bảng điều hướng quản trị"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex min-h-10 items-center justify-between px-1">
              <div className="flex min-w-0 items-center overflow-hidden">
                <BrandMark
                  compact={collapsed}
                  iconOnly={collapsed}
                  tagline="Trung tâm tiệc cưới &amp; Hội nghị"
                />
              </div>
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
              ) : (
                <button
                  type="button"
                  className={cn(
                    iconButtonClass,
                    'hidden min-[1025px]:flex shrink-0 transition-opacity duration-200',
                    collapsed ? 'min-[1025px]:hidden' : 'min-[1025px]:flex',
                  )}
                  onClick={() => setCollapsed(true)}
                  title="Thu gọn thanh điều hướng"
                  aria-label="Thu gọn thanh điều hướng"
                >
                  <MenuIcon width={20} height={20} aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Collapsed mode hamburger toggle button */}
            <div
              className={cn(
                'hidden min-[1025px]:flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] overflow-hidden',
                collapsed ? 'max-h-10 opacity-100 mt-1' : 'max-h-0 opacity-0 pointer-events-none mt-0',
              )}
            >
              <button
                type="button"
                className={iconButtonClass}
                onClick={() => setCollapsed(false)}
                title="Mở rộng thanh điều hướng"
                aria-label="Mở rộng thanh điều hướng"
              >
                <MenuIcon width={20} height={20} aria-hidden="true" />
              </button>
            </div>
          </div>

          <nav className="flex grow flex-col" aria-label="Điều hướng vận hành">
            {navLinks}
          </nav>
        </div>

        {footerProfile}
      </aside>

      {/* Main Workspace Canvas with Top Action Bar */}
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        {/* Desktop Top Action Bar with Breadcrumbs & Spotlight Search */}
        <header className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b border-border bg-card px-6 min-[1025px]:flex">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span className="font-medium text-muted-foreground/80">Vận Hành Ca Trực</span>
            <span>/</span>
            <span className="font-semibold text-foreground">
              {pageTitles[activePage] ?? 'Tổng quan vận hành'}
            </span>
            {activeHallName ? (
              <>
                <span>/</span>
                <span className="font-medium text-foreground">{activeHallName}</span>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <SpotlightSearch />
            {onOpenContract ? (
              <button
                type="button"
                className="btn-action btn-action-secondary"
                onClick={onOpenContract}
              >
                <FileText className="size-3.5 text-primary" />
                Hồ Sơ Hợp Đồng
              </button>
            ) : null}
            {manager ? (
              <Link
                href="/bookings"
                className="flex h-8.5 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-hy-wine-pressed"
              >
                + Tạo đặt tiệc
              </Link>
            ) : null}
            {actor ? (
              <span className="text-xs font-medium text-muted-foreground">
                {actor.displayEmail}
              </span>
            ) : null}
          </div>
        </header>

        <OfflineBanner />
        <div className="flex-1 [&>main]:mx-auto [&>main]:w-full [&>main]:max-w-[1600px]">
          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </div>
  );
}
