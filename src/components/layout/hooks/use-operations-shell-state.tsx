'use client';
import Link from 'next/link';
import { cn } from 'cn';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { ManagementSessionSnapshot } from '@/src/features/identity-access/session/session';
import {
  CalendarIcon,
  ClipboardListIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  PrinterIcon,
  Settings2Icon,
  UsersIcon,
} from 'lucide-react';

export type OperationsShellProps = Readonly<{
  children: ReactNode;
  activePage:
    | 'archive'
    | 'overview'
    | 'reports'
    | 'finance'
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
  activeHallName?: string;
}>;
export function useOperationsShellState({
  children,
  activePage,
  contentId,
  snapshot,
  onLogout,
  pending = false,
  activeHallName,
}: OperationsShellProps) {
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
    IconComponent: React.ComponentType<{
      className?: string;
      'aria-hidden'?: boolean | 'true' | 'false';
    }>,
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
            'ops-nav-finance',
            '/finance',
            activePage === 'finance' || activePage === 'billing' || activePage === 'reports',
            'Tài chính',
            'Doanh thu, thanh toán và quyết toán',
            CreditCardIcon,
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
  const pageTitles: Record<string, string> = {
    overview: 'Tổng quan vận hành',
    bookings: 'Điều phối đặt tiệc & Hợp đồng',
    billing: 'Quản lý thanh toán & Quyết toán',
    finance: 'Tài chính',
    consultations: 'Xử lý yêu cầu tư vấn',
    'print-orders': 'Thiệp cưới & In ấn',
    reports: 'Báo cáo doanh thu & Vận hành',
    catalog: 'Danh mục sảnh & Thực đơn',
    staff: manager ? 'Đội ngũ nhân sự & Tác nghiệp' : 'Tiệc được phân công',
    archive: 'Hồ sơ tiệc đã hủy',
    account: 'Tài khoản & Thiết lập cá nhân',
  };
  return {
    children,
    activePage,
    contentId,
    onLogout,
    pending,
    activeHallName,
    drawerRef,
    triggerRef,
    closeButtonRef,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    collapsed,
    setCollapsed,
    actor,
    manager,
    handleCloseDrawer,
    navLinks,
    pageTitles,
  };
}
