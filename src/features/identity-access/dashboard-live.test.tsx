import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BOOKING_ASSIGNMENTS_REGISTRY_KEY,
  claimBookingAssignment,
  DashboardLiveView,
  getBookingAssignments,
  releaseBookingAssignment,
  saveBookingAssignments,
} from './dashboard-live';

vi.mock('../../services/consultation.service', () => ({
  consultationService: {
    getConsultationRequests: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

vi.mock('../../services/catalog.service', () => ({
  catalogService: {
    getRestaurant: vi.fn().mockResolvedValue({ id: 'rest-1', name: 'Nhà hàng Grand', shifts: [] }),
    getPublicHalls: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../services/analytics.service', () => ({
  analyticsService: {
    getOverview: vi.fn().mockResolvedValue(null),
    getBookings: vi.fn().mockResolvedValue({
      items: [
        {
          bookingId: '00000000-0000-4000-8000-000000000001',
          eventDate: '2026-12-01',
          hallNameSnapshot: 'Sảnh Kim Cương',
          shiftCode: 'LUNCH',
          tableCount: 20,
          phase: 'CONFIRMED',
        },
        {
          bookingId: '00000000-0000-4000-8000-000000000002',
          eventDate: '2026-12-02',
          hallNameSnapshot: 'Sảnh Ruby',
          shiftCode: 'DINNER',
          tableCount: 30,
          phase: 'AWAITING_DEPOSIT',
        },
      ],
    }),
  },
}));

describe('Booking assignment locking and synchronization', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('claimBookingAssignment and releaseBookingAssignment logic', () => {
    it('allows Manager A to claim an unassigned booking and locks it against Manager B', () => {
      const bId = 'booking-101';
      const claimA = claimBookingAssignment(bId, 'acc-manager-a', 'manager-a@test.com');
      expect(claimA.success).toBe(true);

      const registry = getBookingAssignments();
      expect(registry[bId]).toBeDefined();
      expect(registry[bId]?.assignedAccountId).toBe('acc-manager-a');
      expect(registry[bId]?.assignedEmail).toBe('manager-a@test.com');

      // Manager B attempts to claim the same booking
      const claimB = claimBookingAssignment(bId, 'acc-manager-b', 'manager-b@test.com');
      expect(claimB.success).toBe(false);
      expect(claimB.existingAssignment?.assignedAccountId).toBe('acc-manager-a');
      expect(claimB.existingAssignment?.assignedEmail).toBe('manager-a@test.com');
    });

    it('prevents Manager B from releasing a booking owned by Manager A, but allows Manager A to release it', () => {
      const bId = 'booking-202';
      claimBookingAssignment(bId, 'acc-manager-a', 'manager-a@test.com');

      // Manager B tries to release Manager A's booking
      const releaseB = releaseBookingAssignment(bId, 'acc-manager-b');
      expect(releaseB.success).toBe(false);
      expect(getBookingAssignments()[bId]).toBeDefined();

      // Manager A releases their own booking
      const releaseA = releaseBookingAssignment(bId, 'acc-manager-a');
      expect(releaseA.success).toBe(true);
      expect(getBookingAssignments()[bId]).toBeUndefined();

      // Now Manager B can claim it
      const claimB = claimBookingAssignment(bId, 'acc-manager-b', 'manager-b@test.com');
      expect(claimB.success).toBe(true);
      expect(getBookingAssignments()[bId]?.assignedAccountId).toBe('acc-manager-b');
    });
  });

  describe('DashboardLiveView locking presentation', () => {
    it('renders disabled lock button for bookings claimed by another manager and enables claiming unassigned ones', async () => {
      // Seed registry: Booking 1 is claimed by Manager A
      saveBookingAssignments({
        '00000000-0000-4000-8000-000000000001': {
          bookingId: '00000000-0000-4000-8000-000000000001',
          assignedAccountId: 'acc-manager-a',
          assignedEmail: 'manager-a@wedding.com',
          assignedAt: new Date().toISOString(),
        },
      });

      // Render as Manager B
      render(
        <DashboardLiveView
          isManager={true}
          currentAccountId="acc-manager-b"
          currentEmail="manager-b@wedding.com"
        />,
      );

      // Wait for table to load
      await screen.findByText('Sảnh Kim Cương');
      await screen.findByText('Sảnh Ruby');

      // Booking 1 (claimed by Manager A):
      // Manager B sees lock badge with Manager A's email
      expect(screen.getByText('manager-a@wedding.com')).toBeInTheDocument();
      // Manager B sees disabled locked button
      const lockedBtn = screen.getByRole('button', { name: 'Đã có người nhận' });
      expect(lockedBtn).toBeDisabled();

      // Booking 2 (unassigned):
      // Manager B sees "☆ Nhận tiệc" button
      const claimBtn = screen.getByRole('button', { name: '☆ Nhận tiệc' });
      expect(claimBtn).toBeEnabled();

      // Manager B clicks "☆ Nhận tiệc" on Booking 2
      fireEvent.click(claimBtn);

      // Status message is displayed
      await screen.findByText(/Bạn đã tiếp nhận tiệc Sảnh Ruby/);

      // Booking 2 now has "Của bạn" badge
      expect(screen.getByText('Của bạn')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '★ Bỏ nhận' })).not.toBeInTheDocument();
    });
  });
});
