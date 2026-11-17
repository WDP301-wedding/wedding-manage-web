'use client';

import { useEffect, useState } from 'react';
import {
  LayoutGrid,
  Clock,
  BookOpen,
  CreditCard,
  Utensils,
} from 'lucide-react';
import { cn } from 'cn';
import { notify } from '../../design-system/notifications';
import { DashboardLiveView } from './dashboard-live';
import { OperationsShell, type CockpitViewKey } from './operations-shell';
import type { ManagementSessionSnapshot } from './session';
import { DashboardBanquetStrip } from './dashboard-banquet-strip';
import { DashboardContractDrawer } from './dashboard-contract-drawer';
import {
  RealFloorplanView,
  RealRundownView,
  RealSettlementView,
  RealMenuView,
} from './dashboard-operations-cockpit';
import {
  navigationService,
  type NavigationBooking,
} from '../../services/booking-navigation.service';
import { staffWorkspaceService } from '../../services/staff-workspace.service';
import type { StaffWorkspace } from '../../services/staff-workspace.contracts';

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
  const [selectedBooking, setSelectedBooking] = useState<NavigationBooking | null>(null);
  const [workspace, setWorkspace] = useState<StaffWorkspace | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (snapshot.denial !== null) {
      notify.error('Máy chủ đã từ chối thao tác. Dữ liệu trình bày không thay đổi quyền thực tế.');
    }
  }, [snapshot.denial]);

  // Load real active bookings
  useEffect(() => {
    let active = true;
    void navigationService
      .bookings({ scope: 'all', page: 1, pageSize: 25, sort: 'eventDate', order: 'asc' })
      .then((res) => {
        if (!active) return;
        const items = res.items;
        setActiveBookings(items);

        if (items.length > 0) {
          const todayIso = new Date().toISOString().slice(0, 10);
          const todayBooking = items.find((b) => b.eventDate === todayIso);
          setSelectedBooking((prev) => prev ?? todayBooking ?? items[0] ?? null);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Load workspace for selected booking
  useEffect(() => {
    if (!selectedBooking) {
      setWorkspace(null);
      return;
    }
    if (selectedBooking.phase !== 'CONFIRMED' && selectedBooking.phase !== 'COMPLETED') {
      setWorkspace(null);
      return;
    }

    let active = true;
    void staffWorkspaceService
      .read(selectedBooking.bookingId)
      .then((data) => {
        if (!active) return;
        setWorkspace(data);
      })
      .catch(() => {
        if (active) setWorkspace(null);
      });

    return () => {
      active = false;
    };
  }, [selectedBooking?.bookingId, selectedBooking?.phase]);

  const activeHallName = selectedBooking?.hallNameSnapshot || 'Sảnh Grand Diamond';
  const tableCount = selectedBooking?.tableCount || 48;
  const shiftText = selectedBooking?.shiftCode === 'LUNCH' ? 'Ca Trưa' : 'Ca Tối';
  const activeShiftLabel = `${shiftText} • ${tableCount} Bàn`;

  // Badges
  const tableBadge = `${tableCount}/50`;
  const dishBadge = 'Món 3/6';
  const bookingsBadge = `${activeBookings.length || 18} Tiệc`;
  const settlementBadge = '1 Chờ Ký';

  const handleOpenContract = (b?: NavigationBooking) => {
    if (b) setSelectedBooking(b);
    setDrawerOpen(true);
  };

  const handleSelectBookingFromBanquetStrip = (b: NavigationBooking) => {
    setSelectedBooking(b);
  };

  // Fallback booking object if none exists yet
  const effectiveBooking: NavigationBooking = selectedBooking || {
    bookingId: 'BK202611042',
    bookingCode: 'HĐ-202611-042',
    customerName: 'Hoàng Nam & Phương Linh',
    brideName: 'Phương Linh',
    groomName: 'Hoàng Nam',
    phone: '0918.234.567',
    email: 'hoangnam@gmail.com',
    eventDate: new Date().toISOString().slice(0, 10),
    shiftCode: 'LUNCH',
    hallId: 'hall-diamond',
    hallNameSnapshot: 'Sảnh Grand Diamond',
    tableCount: 48,
    phase: 'CONFIRMED',
    managerAccountId: snapshot.actor.accountId,
    managerEmail: snapshot.actor.displayEmail,
    createdAt: new Date().toISOString(),
    cancelledAt: null,
    alias: null,
  };

  return (
    <OperationsShell
      activePage="overview"
      contentId="dashboard-content"
      snapshot={snapshot}
      onLogout={onLogout}
      pending={pending}
      activeView={activeView}
      onSelectView={setActiveView}
      activeHallName={activeHallName}
      activeShiftLabel={activeShiftLabel}
      activeFloorLabel="TẦNG 3"
      tableBadge={tableBadge}
      dishBadge={dishBadge}
      bookingsBadge={bookingsBadge}
      settlementBadge={settlementBadge}
      onOpenContract={() => handleOpenContract()}
    >
      <main
        data-ui-v3
        id="dashboard-content"
        className="workspace-scroll-area p-6 sm:p-8"
      >
        {/* Persistent Banquet Executive Overview Strip */}
        <DashboardBanquetStrip
          booking={selectedBooking || effectiveBooking}
          allBookings={activeBookings}
          onSelectBooking={handleSelectBookingFromBanquetStrip}
          onOpenContract={handleOpenContract}
          isManager={manager}
        />

        {/* Minimalist Underline Cockpit Tabs (Stripe / GitHub Enterprise Style) */}
        <nav className="cockpit-horizontal-tabs" aria-label="Phân hệ điều phối ca trực">
          <button
            type="button"
            className={cn('cockpit-tab-btn', activeView === 'floorplan' && 'active')}
            onClick={() => setActiveView('floorplan')}
          >
            <LayoutGrid className="size-4 shrink-0" />
            <span>Sơ đồ bàn</span>
            <span className="tab-pill-badge">{tableBadge}</span>
          </button>

          <button
            type="button"
            className={cn('cockpit-tab-btn', activeView === 'rundown' && 'active')}
            onClick={() => setActiveView('rundown')}
          >
            <Clock className="size-4 shrink-0" />
            <span>Kịch bản lễ</span>
            <span className="tab-pill-badge">{dishBadge}</span>
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
            <span>Quyết toán &amp; QR</span>
            <span className="tab-pill-badge">{settlementBadge}</span>
          </button>

          <button
            type="button"
            className={cn('cockpit-tab-btn', activeView === 'menu' && 'active')}
            onClick={() => setActiveView('menu')}
          >
            <Utensils className="size-4 shrink-0" />
            <span>Thực đơn</span>
          </button>
        </nav>

        {/* View 1: Sơ Đồ Sảnh & Bố Trí Bàn (Floorplan Studio) */}
        {activeView === 'floorplan' && (
          <div id="view-floorplan" className="view-container active-view">
            <RealFloorplanView
              workspace={workspace}
              booking={selectedBooking || effectiveBooking}
            />
          </div>
        )}

        {/* View 2: Kịch Bản Lễ & Bếp Ra Món (Rundown & Dispatch) */}
        {activeView === 'rundown' && (
          <div id="view-rundown" className="view-container active-view">
            <RealRundownView
              workspace={workspace}
              booking={selectedBooking || effectiveBooking}
            />
          </div>
        )}

        {/* View 3: Sổ Tiệc & Hợp Đồng (Master Bookings Pipeline) */}
        {activeView === 'bookings' && (
          <div id="view-bookings" className="view-container active-view">
            <DashboardLiveView
              isManager={manager}
              currentAccountId={snapshot.actor.accountId}
              currentEmail={snapshot.actor.displayEmail}
              activeView="bookings"
              onOpenContract={handleOpenContract}
            />
          </div>
        )}

        {/* View 4: Bảng Kê Quyết Toán & VietQR (Settlement Folio Sheet) */}
        {activeView === 'settlement' && (
          <div id="view-settlement" className="view-container active-view">
            <RealSettlementView
              booking={selectedBooking || effectiveBooking}
            />
          </div>
        )}

        {/* View 5: Thực Đơn & Đồ Uống (Banquet Menu & Catalog) */}
        {activeView === 'menu' && (
          <div id="view-menu" className="view-container active-view">
            <RealMenuView
              workspace={workspace}
              booking={selectedBooking || effectiveBooking}
            />
          </div>
        )}

        {/* Slide-over Contract & Folio Drawer */}
        <DashboardContractDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          booking={selectedBooking || effectiveBooking}
        />
      </main>
    </OperationsShell>
  );
}
