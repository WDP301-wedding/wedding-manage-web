'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, Clock, BookOpen, CreditCard, Utensils } from 'lucide-react';
import { cn } from 'cn';
import { notify } from '@/src/design-system/notifications/index';
import { DashboardLiveView } from '@/src/features/dashboard/components/dashboard-live';
import { OperationsShell } from '@/src/components/layout/operations-shell';
import type { ManagementSessionSnapshot } from '@/src/features/identity-access/session/session';
import { DashboardBanquetStrip } from '@/src/features/dashboard/components/dashboard-banquet-strip';
import { DashboardContractDrawer } from '@/src/features/dashboard/components/contracts/dashboard-contract-drawer';
import type { CockpitViewKey } from '@/src/features/dashboard/components/cockpit/cockpit-types';
import { RealFloorplanView } from '@/src/features/dashboard/components/cockpit/floorplan-view';
import { RealRundownView } from '@/src/features/dashboard/components/cockpit/rundown-view';
import { RealSettlementView } from '@/src/features/dashboard/components/cockpit/settlement-view';
import { RealMenuView } from '@/src/features/dashboard/components/cockpit/menu-view';
import { StaffCheckinBanner } from '@/src/features/dashboard/components/cockpit/staff-checkin-banner';
import {
  navigationService,
  type NavigationBooking,
} from '@/src/services/bookings/booking-navigation.service';
import { staffWorkspaceService } from '@/src/services/staff/staff-workspace.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';

export function OperationsDashboard({
  onLogout,
  pending,
  snapshot,
}: Readonly<{
  onLogout: () => void;
  pending: boolean;
  snapshot: Extract<ManagementSessionSnapshot, { status: 'authenticated' }>;
}>) {
  const manager = snapshot.presentation === 'manager';
  const [activeView, setActiveView] = useState<CockpitViewKey>('floorplan');
  const [activeBookings, setActiveBookings] = useState<readonly NavigationBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(manager);
  const [selectedBooking, setSelectedBooking] = useState<NavigationBooking | null>(null);
  const [workspace, setWorkspace] = useState<StaffWorkspace | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (snapshot.denial !== null) {
      notify.error('Máy chủ đã từ chối thao tác. Dữ liệu trình bày không thay đổi quyền thực tế.');
    }
  }, [snapshot.denial]);

  // Load real active bookings from backend (Manager only — /management/booking-page requires MANAGER)
  useEffect(() => {
    if (!manager) {
      setActiveBookings([]);
      setSelectedBooking(null);
      setLoadingBookings(false);
      return;
    }

    let active = true;
    setLoadingBookings(true);
    void navigationService
      .bookings({ scope: 'all', page: 1, pageSize: 25, sort: 'eventDate', order: 'asc' })
      .then((res) => {
        if (!active) return;
        const items = res.items;
        setActiveBookings(items);

        if (items.length > 0) {
          const todayIso = new Date().toISOString().slice(0, 10);
          const todayBooking = items.find((b) => b.eventDate === todayIso);
          const confirmedBooking = items.find(
            (b) => b.phase === 'CONFIRMED' || b.phase === 'COMPLETED',
          );
          setSelectedBooking(
            (prev) => prev ?? todayBooking ?? confirmedBooking ?? items[0] ?? null,
          );
        } else {
          setSelectedBooking(null);
        }
      })
      .catch(() => {
        if (active) setActiveBookings([]);
      })
      .finally(() => {
        if (active) setLoadingBookings(false);
      });

    return () => {
      active = false;
    };
  }, [manager]);

  // Load real workspace (seating, timeline, offerings, members) for selected booking
  useEffect(() => {
    if (!manager || !selectedBooking) {
      setWorkspace(null);
      setLoadingWorkspace(false);
      return;
    }
    if (selectedBooking.phase !== 'CONFIRMED' && selectedBooking.phase !== 'COMPLETED') {
      setWorkspace(null);
      setLoadingWorkspace(false);
      return;
    }

    let active = true;
    setLoadingWorkspace(true);
    void staffWorkspaceService
      .read(selectedBooking.bookingId)
      .then((data) => {
        if (!active) return;
        setWorkspace(data);
      })
      .catch(() => {
        if (active) setWorkspace(null);
      })
      .finally(() => {
        if (active) setLoadingWorkspace(false);
      });

    return () => {
      active = false;
    };
  }, [manager, selectedBooking?.bookingId, selectedBooking?.phase]);

  const activeHallName =
    workspace?.timeline.hallName || selectedBooking?.hallNameSnapshot || undefined;

  // 100% Real Tab Badges (zero hardcoded placeholders)
  const seatingCount = workspace?.seating.renderSnapshot.length ?? 0;
  const tableBadge = selectedBooking
    ? seatingCount > 0
      ? `${seatingCount} bàn`
      : `${selectedBooking.tableCount} bàn`
    : undefined;
  const timelineBadge =
    workspace !== null ? `${workspace.timeline.items.length} mốc` : undefined;
  const bookingsBadge = `${activeBookings.length} tiệc`;
  const offeringsBadge =
    workspace && workspace.operations.offerings.length > 0
      ? `${workspace.operations.offerings.length}`
      : undefined;

  const handleOpenContract = (b?: NavigationBooking) => {
    if (b) setSelectedBooking(b);
    setDrawerOpen(true);
  };

  const handleSelectBookingFromBanquetStrip = (b: NavigationBooking) => {
    setSelectedBooking(b);
    setActiveBookings((prev) =>
      prev.some((item) => item.bookingId === b.bookingId) ? prev : [b, ...prev],
    );
  };

  return (
    <OperationsShell
      activePage="overview"
      contentId="dashboard-content"
      snapshot={snapshot}
      onLogout={onLogout}
      pending={pending}
      {...(manager && activeHallName ? { activeHallName } : {})}
    >
      <main data-ui-v3 id="dashboard-content" className="workspace-scroll-area p-6 sm:p-8">
        {!manager ? (
          <StaffCheckinBanner />
        ) : (
          <>
            {/* Persistent Banquet Executive Overview Strip (100% Real Data) */}
            <DashboardBanquetStrip
              booking={selectedBooking}
              workspace={workspace}
              allBookings={activeBookings}
              onSelectBooking={handleSelectBookingFromBanquetStrip}
              onOpenContract={handleOpenContract}
              isManager={manager}
              loading={loadingBookings}
            />

        {selectedBooking ? (
          <>
            {/* Minimalist Underline Cockpit Tabs */}
            <nav className="cockpit-horizontal-tabs" aria-label="Phân hệ điều phối ca trực">
              <button
                type="button"
                className={cn('cockpit-tab-btn', activeView === 'floorplan' && 'active')}
                onClick={() => setActiveView('floorplan')}
              >
                <LayoutGrid className="size-4 shrink-0" />
                <span>Sơ đồ bàn</span>
                {tableBadge ? <span className="tab-pill-badge">{tableBadge}</span> : null}
              </button>

              <button
                type="button"
                className={cn('cockpit-tab-btn', activeView === 'rundown' && 'active')}
                onClick={() => setActiveView('rundown')}
              >
                <Clock className="size-4 shrink-0" />
                <span>Kịch bản lễ</span>
                {timelineBadge ? <span className="tab-pill-badge">{timelineBadge}</span> : null}
              </button>

              <button
                type="button"
                className={cn('cockpit-tab-btn', activeView === 'bookings' && 'active')}
                onClick={() => setActiveView('bookings')}
              >
                <BookOpen className="size-4 shrink-0" />
                <span>Sổ đặt tiệc</span>
                <span className="tab-pill-badge">{bookingsBadge}</span>
              </button>

              <button
                type="button"
                className={cn('cockpit-tab-btn', activeView === 'settlement' && 'active')}
                onClick={() => setActiveView('settlement')}
              >
                <CreditCard className="size-4 shrink-0" />
                <span>Tài chính &amp; Quyết toán</span>
              </button>

              <button
                type="button"
                className={cn('cockpit-tab-btn', activeView === 'menu' && 'active')}
                onClick={() => setActiveView('menu')}
              >
                <Utensils className="size-4 shrink-0" />
                <span>Thực đơn &amp; Dịch vụ</span>
                {offeringsBadge ? <span className="tab-pill-badge">{offeringsBadge}</span> : null}
              </button>
            </nav>

            {/* View 1: Sơ Đồ Sảnh & Bố Trí Bàn (100% Real Customer Seating Data) */}
            {activeView === 'floorplan' && (
              <div id="view-floorplan" className="view-container active-view">
                <RealFloorplanView
                  key={selectedBooking.bookingId}
                  workspace={workspace}
                  booking={selectedBooking}
                  loading={loadingWorkspace}
                />
              </div>
            )}

            {/* View 2: Kịch Bản Lễ & Phân Công Nhân Sự (100% Real Timeline & Staff) */}
            {activeView === 'rundown' && (
              <div id="view-rundown" className="view-container active-view">
                <RealRundownView
                  workspace={workspace}
                  booking={selectedBooking}
                  loading={loadingWorkspace}
                />
              </div>
            )}

            {/* View 3: Sổ Tiệc & Hợp Đồng */}
            {activeView === 'bookings' && (
              <div id="view-bookings" className="view-container active-view">
                <DashboardLiveView
                  isManager={manager}
                  currentAccountId={snapshot.actor.accountId}
                  currentEmail={snapshot.actor.displayEmail}
                  onSelectBooking={handleSelectBookingFromBanquetStrip}
                />
              </div>
            )}

            {/* View 4: Tài Chính & Quyết Toán (100% Real Contract Lines & Ledger) */}
            {activeView === 'settlement' && (
              <div id="view-settlement" className="view-container active-view">
                <RealSettlementView booking={selectedBooking} />
              </div>
            )}

            {/* View 5: Thực Đơn & Dịch Vụ (100% Real Offerings & Contract Lines) */}
            {activeView === 'menu' && (
              <div id="view-menu" className="view-container active-view">
                <RealMenuView
                  workspace={workspace}
                  booking={selectedBooking}
                  loading={loadingWorkspace}
                />
              </div>
            )}

            {/* Slide-over Contract & Folio Drawer */}
            <DashboardContractDrawer
              isOpen={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              booking={selectedBooking}
            />
          </>
        ) : null}
          </>
        )}
      </main>
    </OperationsShell>
  );
}
