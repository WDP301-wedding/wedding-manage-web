import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ManagementBookingGateway, ProposalView } from './booking-api';
import { ManagementBookingWorkspace } from './booking-page';

const proposal: ProposalView = {
  bookingId: '00000000-0000-4000-8000-000000000101',
  consultationId: '00000000-0000-4000-8000-000000000102',
  phase: 'DRAFT', revision: 3, eventDate: '2026-11-15', planningHeadcount: 280,
  proposal: {
    hall: { id: '00000000-0000-4000-8000-000000000103', name: 'Sảnh Ánh Dương', description: 'Sảnh vườn', maxGuests: 320 },
    shift: { code: 'DINNER', startTime: '17:00', endTime: '22:00' },
    menu: { versionId: 'menu-v1', packageId: 'menu', versionNumber: 1, name: 'Thực đơn Mùa Thu', description: 'Theo mùa', priceVndPerTable: 5_000_000 },
    tableCount: 28, baseChargeVnd: 140_000_000, depositAmountVnd: 42_000_000,
  },
  timeline: null,
  capabilities: { accessLevel: 'RESTRICTED', canEditTimeline: true, canApproveTimeline: true, canRequestCancellation: false },
};

function fakeGateway(): ManagementBookingGateway {
  return {
    createConsultation: vi.fn().mockResolvedValue({ consultationId: proposal.consultationId, revision: 1 }),
    invite: vi.fn().mockResolvedValue(undefined),
    checkAvailability: vi.fn().mockResolvedValue({ available: true, expiresAt: null }),
    createBooking: vi.fn().mockResolvedValue({ bookingId: proposal.bookingId, revision: 1 }),
    loadProposal: vi.fn().mockResolvedValue(proposal),
    acquireHold: vi.fn().mockResolvedValue(undefined),
    saveTimeline: vi.fn().mockResolvedValue(undefined),
    approveTimeline: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(undefined),
  };
}

const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('manager-token');

describe('Management booking lifecycle workspace', () => {
  it('creates a consultation and keeps the returned revision for invitation', async () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);

    fireEvent.change(screen.getByLabelText('Tên cặp đôi'), { target: { value: 'Minh & An' } });
    fireEvent.change(screen.getByLabelText('Email liên hệ'), { target: { value: 'couple@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ tư vấn' }));

    expect(await screen.findByText('Đã tạo hồ sơ tư vấn.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lời mời cộng tác' }));
    await waitFor(() => expect(gateway.invite).toHaveBeenCalledWith('manager-token', {
      consultationId: proposal.consultationId, expectedRevision: 1,
    }));
  });

  it('loads server-owned proposal values instead of calculating money in the client', async () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText('Mã booking'), { target: { value: proposal.bookingId } });
    fireEvent.click(screen.getByRole('button', { name: 'Tải hồ sơ' }));

    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();
    expect(screen.getByText(/42\.000\.000/u)).toBeVisible();
    expect(gateway.loadProposal).toHaveBeenCalledWith('manager-token', proposal.bookingId);
  });
});
