import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManagementBookingGateway, ProposalView } from './booking-api';
import { ManagementBookingWorkspace } from './booking-page';

vi.mock('./activation-status', () => ({ ActivationStatus: () => null }));
// Thanh tra cứu tự tạo API client riêng; giữ giao diện thật, chỉ thay phần gọi mạng.
vi.mock('./use-booking-lookup', async () => {
  const { useState } = await import('react');
  return {
    useBookingLookup: () => {
      const [query, changeQuery] = useState('');
      return {
        query,
        changeQuery,
        recent: [],
        matches: [],
        searchStatus: 'idle',
        recentError: null,
        searchError: null,
        retry: () => undefined,
        current: undefined,
      };
    },
  };
});

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
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-09T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('ManagementBookingWorkspace cancellation decisions and calculations', () => {
  it('lets the Manager decide a pending request using the current server revision', async () => {
    const gateway = fakeGateway();
    vi.mocked(gateway.loadProposal).mockResolvedValue({
      ...proposal,
      phase: 'CONFIRMED',
      cancellationRequests: [
        { requestId: 'request', reason: 'Plans changed', requestedAt: '2026-10-08T00:00:00Z' },
      ],
    });
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText('Tìm hồ sơ tiệc'), {
      target: { value: proposal.bookingId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mở hồ sơ' }));
    expect(await screen.findByText('Plans changed')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Lý do quyết định'), {
      target: { value: 'Continue planning' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Từ chối yêu cầu hủy' }));
    await waitFor(() =>
      expect(gateway.decideCancellation).toHaveBeenCalledWith('manager-token', {
        bookingId: proposal.bookingId,
        requestId: 'request',
        expectedRevision: proposal.revision,
        decision: 'REJECT',
        reason: 'Continue planning',
      }),
    );
  });

  it('loads server-owned proposal values instead of calculating money in the client', async () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText('Tìm hồ sơ tiệc'), {
      target: { value: proposal.bookingId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mở hồ sơ' }));

    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();
    expect(screen.getByText(/42\.000\.000/u)).toBeVisible();
    expect(gateway.loadProposal).toHaveBeenCalledWith('manager-token', proposal.bookingId);
  });
});
