import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimBookingAssignment,
  getBookingAssignments,
  releaseBookingAssignment,
  saveBookingAssignments,
} from './booking-assignments';
import { DashboardLiveView } from './dashboard-live';
import { axiosApiClient } from '../../lib/api/axios-client';
import {
  navigationService,
  type NavigationBooking,
} from '../../services/booking-navigation.service';

vi.mock('../../lib/api/axios-client', () => ({ axiosApiClient: { get: vi.fn() } }));
vi.mock('../../services/booking-navigation.service', () => ({
  navigationService: { bookings: vi.fn() },
}));

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
    vi.mocked(axiosApiClient.get).mockResolvedValue({
      data: {
        data: {
          items: [],
          page: 1,
          pageSize: 5,
          total: 0,
          totalPages: 0,
          counts: { total: 0, pending: 0 },
        },
      },
    });
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

  describe('DashboardLiveView server ownership presentation', () => {
    it('uses server ownership instead of a stale browser assignment registry', async () => {
      const managerA = '10000000-0000-4000-8000-000000000001';
      const managerB = '10000000-0000-4000-8000-000000000002';
      const rows: NavigationBooking[] = [
        {
          bookingId: '00000000-0000-4000-8000-000000000001',
          bookingCode: 'HY-000001',
          hallNameSnapshot: 'Sảnh Kim Cương',
          managerAccountId: managerA,
          managerEmail: 'manager-a@wedding.com',
          eventDate: '2026-12-01',
          hallId: '20000000-0000-4000-8000-000000000001',
          shiftCode: 'LUNCH',
          phase: 'CONFIRMED',
          tableCount: 20,
          createdAt: '2026-10-01T10:00:00Z',
          cancelledAt: null,
          customerName: 'Lan và Minh',
          alias: null,
          brideName: null,
          groomName: null,
          phone: null,
          email: null,
        },
        {
          bookingId: '00000000-0000-4000-8000-000000000002',
          bookingCode: 'HY-000002',
          hallNameSnapshot: 'Sảnh Ruby',
          managerAccountId: managerB,
          managerEmail: 'manager-b@wedding.com',
          eventDate: '2026-12-02',
          hallId: '20000000-0000-4000-8000-000000000002',
          shiftCode: 'DINNER',
          phase: 'AWAITING_DEPOSIT',
          tableCount: 30,
          createdAt: '2026-10-02T10:00:00Z',
          cancelledAt: null,
          customerName: 'An và Bình',
          alias: null,
          brideName: null,
          groomName: null,
          phone: null,
          email: null,
        },
      ];
      vi.mocked(navigationService.bookings).mockImplementation((query) =>
        Promise.resolve({
          items: query.scope === 'mine' ? [rows[1]!] : rows,
          page: 1,
          pageSize: 10,
          total: query.scope === 'mine' ? 1 : 2,
          totalPages: 1,
          counts: { mine: 1, all: 2 },
        }),
      );
      saveBookingAssignments({
        [rows[0]!.bookingId]: {
          bookingId: rows[0]!.bookingId,
          assignedAccountId: managerB,
          assignedEmail: 'stale-local-owner@wedding.com',
          assignedAt: '2026-10-01T10:00:00Z',
        },
      });
      render(
        <DashboardLiveView
          isManager
          currentAccountId={managerB}
          currentEmail="manager-b@wedding.com"
        />,
      );
      await screen.findByText('Sảnh Ruby');
      expect(screen.queryByText('Sảnh Kim Cương')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('tab', { name: /Tất cả tiệc nhà hàng/ }));
      await screen.findByText('Sảnh Kim Cương');
      expect(navigationService.bookings).toHaveBeenLastCalledWith(
        expect.objectContaining({ scope: 'all' }),
      );
      expect(screen.getByText('manager-a@wedding.com')).toBeInTheDocument();
      expect(screen.queryByText('stale-local-owner@wedding.com')).not.toBeInTheDocument();
      expect(screen.getByText('Của bạn')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Thao tác HY-000001' }));
      expect(
        await screen.findByRole('menuitem', { name: 'Đã có người phụ trách' }),
      ).toHaveAttribute('aria-disabled', 'true');
      expect(screen.queryByRole('menuitem', { name: 'Nhận tiệc' })).not.toBeInTheDocument();
    });
  });
});
