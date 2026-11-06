'use client';

import { useState } from 'react';

import { Button } from '../../components/ui/button';
import { DashboardBookingsSection } from './dashboard-bookings-section';
import { DashboardConsultationsSection } from './dashboard-consultations-section';
import { DashboardKpiStrip } from './dashboard-kpi-strip';
import { DashboardVenueCard } from './dashboard-venue-card';
import { DashboardVenueHalls } from './dashboard-venue-halls';
import { DashboardAnalyticsExtra } from './dashboard-analytics-extra';
import { useBookingClaims } from './use-booking-claims';
import { useDashboardData } from './use-dashboard-data';

export type { DashboardBookingItem, DashboardData, DashboardState } from './use-dashboard-data';

export function DashboardLiveView({
  isManager = false,
  currentAccountId,
  currentEmail,
  currentAccountEmail = currentEmail,
}: Readonly<{
  isManager?: boolean;
  currentAccountId?: string;
  currentEmail?: string;
  currentAccountEmail?: string;
}>) {
  const { data, state, errorMessage, retry } = useDashboardData(isManager);
  const [consultationTotals, setConsultationTotals] = useState<{
    total: number;
    pending: number;
  } | null>(null);
  const claims = useBookingClaims(currentAccountId, currentAccountEmail);

  return (
    <div className="flex flex-col gap-8">
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

      <DashboardVenueCard restaurant={data.restaurant} isManager={isManager} />

      <DashboardKpiStrip
        consultationSummary={consultationTotals}
        isManager={isManager}
        isLoading={state === 'loading'}
        halls={data.halls}
        consultations={data.consultations}
        analytics={data.analytics}
        restaurant={data.restaurant}
      />

      <DashboardAnalyticsExtra
        analytics={data.analytics}
        halls={data.halls}
        bookings={data.bookings}
        isManager={isManager}
      />

      <DashboardBookingsSection
        isManager={isManager}
        state={state}
        bookings={data.bookings}
        assignments={claims.assignments}
        resolvedAccountId={claims.resolvedAccountId}
        onClaim={claims.claim}
        lockNotice={claims.lockNotice}
        onDismissLockNotice={claims.dismissLockNotice}
      />

      <DashboardConsultationsSection
        onTotalsChange={setConsultationTotals}
        isManager={isManager}
        state={state}
        consultations={data.consultations}
      />

      <DashboardVenueHalls halls={data.halls} isManager={isManager} />
    </div>
  );
}
