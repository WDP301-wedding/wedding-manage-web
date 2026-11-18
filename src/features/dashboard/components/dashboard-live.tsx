'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { DashboardBookingsSection } from '@/src/features/dashboard/components/bookings/dashboard-bookings-section';
import { DashboardConsultationsSection } from '@/src/features/dashboard/components/consultations/dashboard-consultations-section';
import { DashboardKpiStrip } from './dashboard-kpi-strip';
import { DashboardVenueCard } from '@/src/features/dashboard/components/venue/dashboard-venue-card';
import { DashboardVenueHalls } from '@/src/features/dashboard/components/venue/dashboard-venue-halls';
import { DashboardBanquetStrip } from './dashboard-banquet-strip';
import { DashboardOperationsCockpit } from '@/src/features/dashboard/components/cockpit/dashboard-operations-cockpit';
import { DashboardContractDrawer } from '@/src/features/dashboard/components/contracts/dashboard-contract-drawer';
import { useBookingClaims } from '@/src/features/dashboard/hooks/use-booking-claims';
import { useDashboardData } from '@/src/features/dashboard/hooks/use-dashboard-data';
import {
  navigationService,
  type NavigationBooking,
} from '@/src/services/bookings/booking-navigation.service';

export type { DashboardBookingItem, DashboardData, DashboardState } from '@/src/features/dashboard/hooks/use-dashboard-data';

export function DashboardLiveView({
  isManager = false,
  currentAccountId,
  currentEmail,
  currentAccountEmail = currentEmail,
  activeView,
  onOpenContract: externalOpenContract,
  onSelectBooking: externalSelectBooking,
}: Readonly<{
  isManager?: boolean;
  currentAccountId?: string;
  currentEmail?: string;
  currentAccountEmail?: string;
  activeView?: 'floorplan' | 'rundown' | 'bookings' | 'settlement' | 'menu';
  onOpenContract?: (booking: NavigationBooking) => void;
  onSelectBooking?: (booking: NavigationBooking) => void;
}>) {
  const { data, state, errorMessage, retry } = useDashboardData(isManager);
  const [consultationTotals, setConsultationTotals] = useState<{
    total: number;
    pending: number;
  } | null>(null);
  const claims = useBookingClaims(currentAccountId, currentAccountEmail);

  // Active bookings list from real Database
  const [activeBookings, setActiveBookings] = useState<readonly NavigationBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<NavigationBooking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Load real bookings to populate hero spotlight and cockpit
  useEffect(() => {
    let active = true;
    void navigationService
      .bookings({ scope: 'all', page: 1, pageSize: 25, sort: 'eventDate', order: 'asc' })
      .then((res) => {
        if (!active) return;
        const items = res.items;
        setActiveBookings(items);

        // Auto-select today's booking or first upcoming booking
        if (items.length > 0) {
          const todayIso = new Date().toISOString().slice(0, 10);
          const todayBooking = items.find((b) => b.eventDate === todayIso);
          setSelectedBooking((prev) => prev ?? todayBooking ?? items[0] ?? null);
        }
      })
      .catch(() => {
        // Silently handled; fallback to empty state
      });

    return () => {
      active = false;
    };
  }, []);

  const handleOpenContract = (booking: NavigationBooking) => {
    if (externalOpenContract) {
      externalOpenContract(booking);
    } else {
      setSelectedBooking(booking);
      setDrawerOpen(true);
    }
  };

  const handleSelectBookingFromTable = (booking: NavigationBooking) => {
    if (externalSelectBooking) {
      externalSelectBooking(booking);
    } else {
      setSelectedBooking(booking);
    }
    if (typeof window !== 'undefined') {
      document.getElementById('dashboard-content')?.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (activeView === 'bookings') {
    return (
      <div className="flex flex-col gap-6">
        <DashboardBookingsSection
          isManager={isManager}
          state={state}
          bookings={data.bookings}
          assignments={claims.assignments}
          resolvedAccountId={claims.resolvedAccountId}
          onClaim={claims.claim}
          lockNotice={claims.lockNotice}
          onDismissLockNotice={claims.dismissLockNotice}
          onSelectBooking={handleSelectBookingFromTable}
        />

        <DashboardConsultationsSection
          onTotalsChange={setConsultationTotals}
          isManager={isManager}
          state={state}
          consultations={data.consultations}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {state === 'error' && errorMessage ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-hy-error-bg px-5 py-4 text-hy-error">
          <div className="flex flex-col gap-0.5">
            <strong className="font-semibold">Lỗi kết nối máy chủ</strong>
            <p className="text-xs">{errorMessage}</p>
          </div>
          <Button variant="outline" size="sm" onClick={retry}>
            Thử tải lại
          </Button>
        </div>
      ) : null}

      {/* 1. Banquet Executive Hero Spotlight (100% Real Database Data) */}
      <DashboardBanquetStrip
        booking={selectedBooking}
        allBookings={activeBookings}
        onSelectBooking={setSelectedBooking}
        onOpenContract={handleOpenContract}
        isManager={isManager}
      />

      {/* 2. Operations Cockpit: Floorplan Studio & Ceremony Rundown (100% Real Database Data) */}
      <DashboardOperationsCockpit
        booking={selectedBooking}
        onOpenContract={handleOpenContract}
      />

      {/* 3. Executive KPI Strip (Real DB data: analytics, counts, halls, revenue) */}
      <DashboardKpiStrip
        consultationSummary={consultationTotals}
        isManager={isManager}
        isLoading={state === 'loading'}
        halls={data.halls}
        consultations={data.consultations}
        analytics={data.analytics}
        restaurant={data.restaurant}
      />

      {/* 4. Master Bookings Pipeline Section (Real DB bookings) */}
      <DashboardBookingsSection
        isManager={isManager}
        state={state}
        bookings={data.bookings}
        assignments={claims.assignments}
        resolvedAccountId={claims.resolvedAccountId}
        onClaim={claims.claim}
        lockNotice={claims.lockNotice}
        onDismissLockNotice={claims.dismissLockNotice}
        onSelectBooking={handleSelectBookingFromTable}
      />

      {/* 5. Recent Inquiries & Consultations (Real DB consultations) */}
      <DashboardConsultationsSection
        onTotalsChange={setConsultationTotals}
        isManager={isManager}
        state={state}
        consultations={data.consultations}
      />

      {/* 6. Venue Profile & Halls Catalog (Real DB restaurant and halls) */}
      <div className="grid grid-cols-1 gap-8">
        <DashboardVenueCard restaurant={data.restaurant} isManager={isManager} />
        <DashboardVenueHalls halls={data.halls} isManager={isManager} />
      </div>

      {/* 7. Slide-over Contract & Folio Drawer (100% Real Contracts API) */}
      <DashboardContractDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        booking={selectedBooking}
      />
    </div>
  );
}
