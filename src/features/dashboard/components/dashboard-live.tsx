'use client';

import { DashboardBookingsSection } from '@/src/features/dashboard/components/bookings/dashboard-bookings-section';
import { DashboardConsultationsSection } from '@/src/features/dashboard/components/consultations/dashboard-consultations-section';
import { useBookingClaims } from '@/src/features/dashboard/hooks/use-booking-claims';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';

export function DashboardLiveView({
  isManager = false,
  currentAccountId,
  currentEmail,
  currentAccountEmail = currentEmail,
  onSelectBooking,
}: Readonly<{
  isManager?: boolean;
  currentAccountId?: string;
  currentEmail?: string;
  currentAccountEmail?: string;
  onSelectBooking?: (booking: NavigationBooking) => void;
}>) {
  const claims = useBookingClaims(currentAccountId, currentAccountEmail);

  const handleSelectBookingFromTable = (booking: NavigationBooking) => {
    onSelectBooking?.(booking);
    if (typeof window !== 'undefined') {
      document.getElementById('dashboard-content')?.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <DashboardBookingsSection
        isManager={isManager}
        resolvedAccountId={claims.resolvedAccountId}
        onClaim={claims.claim}
        lockNotice={claims.lockNotice}
        onDismissLockNotice={claims.dismissLockNotice}
        onSelectBooking={handleSelectBookingFromTable}
      />

      <DashboardConsultationsSection isManager={isManager} />
    </div>
  );
}
