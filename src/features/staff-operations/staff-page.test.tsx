import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffOperationsPage } from './staff-page';
import { staffService } from '../../services/staff.service';
import type { ManagementIdentitySession } from '../identity-access/session';

vi.mock('../../services/staff.service', () => ({
  staffService: {
    searchGuests: vi.fn(),
    checkInGuest: vi.fn(),
    undoCheckIn: vi.fn(),
    provisionStaffAccount: vi.fn(),
    assignStaff: vi.fn(),
    revokeAssignment: vi.fn(),
    getEventAssignments: vi.fn(),
  },
}));

function createMockSession(isManager = true): ManagementIdentitySession {
  return {
    restore: vi.fn().mockResolvedValue({
      status: 'authenticated',
      presentation: isManager ? 'manager' : 'staff',
      actor: {
        accountId: '10000000-0000-4000-8000-000000000001',
        displayEmail: 'manager@example.com',
        roles: isManager ? ['MANAGER'] : ['STAFF'],
      },
    }),
    snapshot: vi.fn().mockReturnValue({
      status: 'authenticated',
      presentation: isManager ? 'manager' : 'staff',
      actor: {
        accountId: '10000000-0000-4000-8000-000000000001',
        displayEmail: 'manager@example.com',
        roles: isManager ? ['MANAGER'] : ['STAFF'],
      },
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  } as unknown as ManagementIdentitySession;
}

describe('StaffOperationsPage (M6, S1, S2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders check-in desk and allows searching guests', async () => {
    const mockSession = createMockSession(true);
    vi.mocked(staffService.searchGuests).mockResolvedValue({
      items: [
        {
          guestId: 'guest-1',
          name: 'Nguyễn Văn Khách',
          phoneLast4: '1234',
          groupName: 'Nhà trai',
          groupColor: '#10b981',
          tableLabels: ['Bàn 01'],
          checkedIn: false,
          guestGroupId: 'group-1',
          ledgerRevision: 1,
          warning: null,
        },
      ],
      nextCursor: null,
    });

    render(<StaffOperationsPage session={mockSession} />);

    await waitFor(() => {
      expect(screen.getByText('Nhân sự & Tác nghiệp')).toBeDefined();
    });

    const bookingInput = screen.getByLabelText('Mã tiệc (Booking ID)');
    fireEvent.change(bookingInput, { target: { value: 'booking-test-123' } });

    const searchBtn = screen.getByRole('button', { name: 'Tra cứu khách' });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(staffService.searchGuests).toHaveBeenCalledWith('booking-test-123', '');
      expect(screen.getByText('Nguyễn Văn Khách')).toBeDefined();
      expect(screen.getByText('…1234')).toBeDefined();
      expect(screen.getByText('Bàn 01')).toBeDefined();
    });
  });

  it('performs check-in action with large high-contrast button', async () => {
    const mockSession = createMockSession(false);
    vi.mocked(staffService.searchGuests).mockResolvedValue({
      items: [
        {
          guestId: 'guest-1',
          name: 'Trần Thị Khách',
          phoneLast4: '5678',
          groupName: 'Nhà gái',
          groupColor: '#ec4899',
          tableLabels: ['Bàn VIP'],
          checkedIn: false,
          guestGroupId: 'group-2',
          ledgerRevision: 1,
          warning: null,
        },
      ],
      nextCursor: null,
    });
    vi.mocked(staffService.checkInGuest).mockResolvedValue(undefined);

    render(<StaffOperationsPage session={mockSession} />);

    const bookingInput = screen.getByLabelText('Mã tiệc (Booking ID)');
    fireEvent.change(bookingInput, { target: { value: 'booking-test-123' } });

    const searchBtn = screen.getByRole('button', { name: 'Tra cứu khách' });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('Trần Thị Khách')).toBeDefined();
    });

    const checkInBtn = screen.getByRole('button', { name: 'Check-in cho khách Trần Thị Khách' });
    fireEvent.click(checkInBtn);

    await waitFor(() => {
      expect(staffService.checkInGuest).toHaveBeenCalledWith('booking-test-123', 'guest-1');
    });
  });

  it('allows undoing check-in when guest is already checked-in', async () => {
    const mockSession = createMockSession(false);
    vi.mocked(staffService.searchGuests).mockResolvedValue({
      items: [
        {
          guestId: 'guest-2',
          name: 'Lê Văn An',
          phoneLast4: '9999',
          groupName: 'Bạn bè',
          groupColor: '#3b82f6',
          tableLabels: ['Bàn 05'],
          checkedIn: true,
          guestGroupId: 'group-3',
          ledgerRevision: 2,
          warning: null,
        },
      ],
      nextCursor: null,
    });
    vi.mocked(staffService.undoCheckIn).mockResolvedValue(undefined);

    render(<StaffOperationsPage session={mockSession} />);

    const bookingInput = screen.getByLabelText('Mã tiệc (Booking ID)');
    fireEvent.change(bookingInput, { target: { value: 'booking-test-123' } });

    const searchBtn = screen.getByRole('button', { name: 'Tra cứu khách' });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('Lê Văn An')).toBeDefined();
      expect(screen.getByText('Đã check-in')).toBeDefined();
    });

    const undoBtn = screen.getByRole('button', { name: 'Hoàn tác check-in cho khách Lê Văn An' });
    fireEvent.click(undoBtn);

    await waitFor(() => {
      expect(staffService.undoCheckIn).toHaveBeenCalledWith('booking-test-123', 'guest-2');
    });
  });
});
