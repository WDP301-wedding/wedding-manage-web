import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';

export type TableItem = StaffWorkspace['seating']['renderSnapshot'][number];

export type OfferingItem = StaffWorkspace['operations']['offerings'][number];

export type TimelineStep = StaffWorkspace['timeline']['items'][number];

export type MemberItem = StaffWorkspace['members'][number];

export interface DashboardOperationsCockpitProps {
  booking: NavigationBooking | null;
  activeView?: 'floorplan' | 'rundown' | 'bookings' | 'settlement' | 'menu';
  onOpenContract?: ((booking: NavigationBooking) => void) | undefined;
}
