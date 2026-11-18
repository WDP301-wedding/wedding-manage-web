import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';

export type CockpitViewKey = 'floorplan' | 'rundown' | 'bookings' | 'settlement' | 'menu';

export type TableItem = StaffWorkspace['seating']['renderSnapshot'][number];

export type OfferingItem = StaffWorkspace['operations']['offerings'][number];

export type TimelineStep = StaffWorkspace['timeline']['items'][number];

export type MemberItem = StaffWorkspace['members'][number];
