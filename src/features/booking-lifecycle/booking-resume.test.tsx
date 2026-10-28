import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagementBookingGateway, ProposalView } from './booking-api';
import { ManagementBookingWorkspace } from './booking-workspace';
const proposal: ProposalView = {
  bookingId: '00000000-0000-4000-8000-000000000101',
  consultationId: '00000000-0000-4000-8000-000000000102',
  phase: 'DRAFT',
  revision: 3,
  eventDate: '2026-11-15',
  planningHeadcount: 280,
  proposal: {
    menus: [
      {
        versionId: 'menu-v1',
        packageId: 'menu',
        versionNumber: 1,
        name: 'Thực đơn Mùa Thu',
        description: 'Theo mùa',
        priceVndPerTable: 5000000,
        tableCount: 28,
        lineTotalVnd: 140000000,
      },
    ],
    hall: {
      id: '00000000-0000-4000-8000-000000000103',
      name: 'Sảnh Ánh Dương',
      description: 'Sảnh vườn',
      maxGuests: 320,
    },
    shift: { code: 'DINNER', startTime: '17:00', endTime: '22:00' },
    menu: {
      versionId: 'menu-v1',
      packageId: 'menu',
      versionNumber: 1,
      name: 'Thực đơn Mùa Thu',
      description: 'Theo mùa',
      priceVndPerTable: 5_000_000,
    },
    tableCount: 28,
    baseChargeVnd: 140_000_000,
    depositAmountVnd: 42_000_000,
  },
  timeline: null,
  effectiveTimeline: null,
  capabilities: {
    accessLevel: 'RESTRICTED',
    canEditTimeline: true,
    canApproveTimeline: true,
    canWithdrawApproval: true,
    canRequestCancellation: false,
  },
};

function fakeGateway(): ManagementBookingGateway {
  return {
    searchCustomers: vi.fn().mockResolvedValue([]),
    loadWorkspace: vi.fn().mockResolvedValue({
      consultationId: proposal.consultationId,
      revision: 1,
      displayName: 'Khách thử',
      email: 'couple@example.test',
      note: null,
      bookingId: proposal.bookingId,
      bookingPhase: proposal.phase,
      preferredDate: null,
      expectedGuests: null,
      preferredHallId: null,
      preferredMenuVersionId: null,
      preferredShift: null,
    }),
    loadSelections: vi.fn().mockResolvedValue({
      halls: [{ id: proposal.proposal.hall.id, name: proposal.proposal.hall.name, maxGuests: 320 }],
      menus: [
        {
          versionId: proposal.proposal.menu.versionId,
          name: proposal.proposal.menu.name,
          versionNumber: 1,
          priceVndPerTable: 5000000,
        },
      ],
      shifts: [proposal.proposal.shift],
    }),
    createConsultation: vi
      .fn()
      .mockResolvedValue({ consultationId: proposal.consultationId, revision: 1 }),
    invite: vi.fn().mockResolvedValue(undefined),
    checkAvailability: vi.fn().mockResolvedValue({ available: true, expiresAt: null }),
    createBooking: vi
      .fn()
      .mockResolvedValue({ bookingId: proposal.bookingId, revision: 1, consultationRevision: 7 }),
    loadProposal: vi.fn().mockResolvedValue(proposal),
    acquireHold: vi.fn().mockResolvedValue(undefined),
    saveTimeline: vi.fn().mockResolvedValue(undefined),
    approveTimeline: vi.fn().mockResolvedValue(undefined),
    requestChange: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    decideCancellation: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(undefined),
  };
}

const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('manager-token');
beforeEach(() => {
  window.history.replaceState(null, '', '/bookings');
});
afterEach(() => {
  window.history.replaceState(null, '', '/bookings');
});
describe('resume consultation by server state', () => {
  it('opens step 3 directly when an intake consultation already has a booking', async () => {
    const gateway = fakeGateway();
    window.history.replaceState(null, '', '/bookings?consultationId=' + proposal.consultationId);
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /3. Tiệc đang xử lý/ })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(gateway.createBooking).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Tạo booking' })).not.toBeInTheDocument();
    expect(gateway.loadProposal).toHaveBeenCalledWith('manager-token', proposal.bookingId);
  });
  it('loads both selected identifiers for a consultation without a booking', async () => {
    const gateway = fakeGateway();
    const context = {
      consultationId: proposal.consultationId,
      revision: 5,
      displayName: 'Lan',
      email: 'lan@example.test',
      note: null,
      bookingId: null,
      bookingPhase: null,
      preferredDate: '2027-12-20',
      expectedGuests: 140,
      preferredHallId: proposal.proposal.hall.id,
      preferredMenuVersionId: proposal.proposal.menu.versionId,
      preferredShift: 'DINNER' as const,
    };
    vi.mocked(gateway.loadWorkspace).mockResolvedValue(context);
    window.history.replaceState(null, '', '/bookings?consultationId=' + context.consultationId);
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} autoLoadCatalog />);
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /2. Khảo sát/ })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Sảnh tiệc')).toHaveValue(context.preferredHallId),
    );
    expect(screen.getByLabelText('Thực đơn đặt tiệc')).toHaveValue(context.preferredMenuVersionId);
    expect(screen.getByLabelText('Số khách dự kiến')).toHaveValue(140);
    expect(screen.getByLabelText('Số bàn')).toHaveValue(null);
    // Another manager window creates the booking before this form is submitted.
    vi.mocked(gateway.loadWorkspace).mockResolvedValue({
      ...context,
      bookingId: proposal.bookingId,
    });
    fireEvent.change(screen.getByLabelText('Số bàn'), { target: { value: '14' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo booking' }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /3. Tiệc đang xử lý/ })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(gateway.createBooking).not.toHaveBeenCalled();
  });
  it('reuses only a selected contact and resets the previous party identity', async () => {
    const gateway = fakeGateway();
    vi.mocked(gateway.searchCustomers).mockResolvedValue([
      { consultationId: proposal.consultationId, displayName: 'Lan', email: 'lan@example.test' },
    ]);
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText(/Tìm khách theo/), { target: { value: 'Lan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm khách đã có' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dùng thông tin cho tiệc mới' }));
    expect(screen.getByLabelText(/Tên (khách|cặp đôi)/)).toHaveValue('Lan');
    expect(screen.getByLabelText('Email liên hệ')).toHaveValue('lan@example.test');
    expect(screen.getByLabelText('Mã hồ sơ tư vấn')).toHaveValue('');
    expect(gateway.createBooking).not.toHaveBeenCalled();
  });
});
