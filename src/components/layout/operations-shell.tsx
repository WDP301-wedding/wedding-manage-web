'use client';
import Link from 'next/link';
import { cn } from 'cn';
import { BrandMark } from '@/src/design-system/branding/brand-mark';
import { OfflineBanner } from '@/src/design-system/feedback/offline-banner';
import { PageTransition } from '@/src/design-system/motion/page-transition';
import { MenuIcon, XIcon } from 'lucide-react';
import { SpotlightSearch } from '@/src/components/navigation/spotlight-search';
import { iconButtonClass } from './operations-shell-config';
import { TopRightAccountMenu } from './top-right-account-menu';
import {
  useOperationsShellState,
  type OperationsShellProps,
} from '@/src/components/layout/hooks/use-operations-shell-state';
export function OperationsShell(props: OperationsShellProps) {
  const model = useOperationsShellState(props);
  const {
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
  } = model;
  return (
    <div data-ui-v3 className="flex min-h-screen flex-col bg-background min-[1025px]:flex-row">
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
        <div className="ml-auto">
          <TopRightAccountMenu
            actor={actor}
            manager={manager}
            activePage={activePage}
            pending={pending}
            onLogout={onLogout}
            compact
          />
        </div>
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
                collapsed
                  ? 'max-h-10 opacity-100 mt-1'
                  : 'max-h-0 opacity-0 pointer-events-none mt-0',
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
            {manager ? (
              <>
                <SpotlightSearch />
                <Link
                  href="/bookings"
                  className="flex h-8.5 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-hy-wine-pressed"
                >
                  + Tạo đặt tiệc
                </Link>
                <span className="h-5 w-px bg-border" aria-hidden="true" />
              </>
            ) : null}
            <TopRightAccountMenu
              actor={actor}
              manager={manager}
              activePage={activePage}
              pending={pending}
              onLogout={onLogout}
            />
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
