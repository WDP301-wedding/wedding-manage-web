import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { ManagementIdentitySession } from '../identity-access/session';

import type { ManagementBookingGateway, ProposalView } from './booking-api';
import { ManagementBookingPage, ManagementBookingWorkspace } from './booking-page';

vi.mock('./activation-status', () => ({ ActivationStatus: () => null }));

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

async function open(gateway: ManagementBookingGateway, value: ProposalView = proposal) {
  vi.mocked(gateway.loadProposal).mockResolvedValue(value);
  render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
  fireEvent.change(screen.getByLabelText('Mã booking'), { target: { value: proposal.bookingId } });
  fireEvent.click(screen.getByRole('button', { name: 'Tải hồ sơ' }));
  await screen.findByText('Sảnh Ánh Dương');
}

function failure(code: string, status?: number) {
  return new ApiClientError({
    kind: 'api',
    code,
    message: code,
    requestId: 'request',
    ...(status === undefined ? {} : { status }),
  });
}

describe('Management booking timeline, cancellation and access', () => {
  it('holds the slot and saves an empty initial timeline against the server revision', async () => {
    const gateway = fakeGateway();
    await open(gateway);
    fireEvent.click(screen.getByRole('button', { name: 'Giữ lịch 15 phút' }));
    await waitFor(() =>
      expect(gateway.acquireHold).toHaveBeenCalledWith('manager-token', proposal.bookingId, 3),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Lưu kịch bản mới' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));
    await waitFor(() =>
      expect(gateway.saveTimeline).toHaveBeenCalledWith('manager-token', {
        bookingId: proposal.bookingId,
        expectedRevision: 3,
        predecessorRevisionId: null,
        items: [],
      }),
    );
  });

  it('approves the displayed timeline and submits post-deposit replacement separately', async () => {
    const gateway = fakeGateway();
    const timeline = {
      revisionId: 'timeline',
      revisionNumber: 1,
      predecessorRevisionId: null,
      managerApprovedAt: null,
      coupleApprovedAt: null,
      items: [
        { itemId: 'one', order: 0, startTime: '18:00', title: 'Welcome', description: 'Note' },
      ],
    };
    await open(gateway, { ...proposal, phase: 'CONFIRMED', timeline, effectiveTimeline: timeline });
    fireEvent.click(screen.getByRole('button', { name: 'Phê duyệt revision hiện tại' }));
    await waitFor(() =>
      expect(gateway.approveTimeline).toHaveBeenCalledWith('manager-token', {
        bookingId: proposal.bookingId,
        revisionId: 'timeline',
        expectedRevision: 3,
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Gửi yêu cầu thay đổi' })).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText('Lý do thay đổi'), { target: { value: 'Garden' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu thay đổi' }));
    await waitFor(() =>
      expect(gateway.requestChange).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({
          bookingId: proposal.bookingId,
          expectedRevision: 3,
          reason: 'Garden',
        }),
      ),
    );
    expect(gateway.saveTimeline).not.toHaveBeenCalled();
  });

  it('uses Manager cancellation and completion commands with the displayed revision', async () => {
    const gateway = fakeGateway();
    await open(gateway, { ...proposal, phase: 'CONFIRMED' });
    fireEvent.change(screen.getByLabelText('Lý do hủy'), { target: { value: 'Change plans' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hủy booking' }));
    await waitFor(() =>
      expect(gateway.cancel).toHaveBeenCalledWith('manager-token', {
        bookingId: proposal.bookingId,
        expectedRevision: 3,
        reason: 'Change plans',
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Đánh dấu hoàn thành' })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Đánh dấu hoàn thành' }));
    await waitFor(() =>
      expect(gateway.complete).toHaveBeenCalledWith('manager-token', {
        bookingId: proposal.bookingId,
        expectedRevision: 3,
      }),
    );
  });

  it.each(['CONFIRMED', 'CANCELLED', 'COMPLETED'] as const)(
    'does not offer a temporary hold for a %s booking',
    async (phase) => {
      const gateway = fakeGateway();
      await open(gateway, { ...proposal, phase });
      const hold = screen.getByRole('button', { name: 'Giữ lịch 15 phút' });
      expect(hold).toBeDisabled();
      fireEvent.click(hold);
      expect(gateway.acquireHold).not.toHaveBeenCalled();
    },
  );

  it('accepts a pending cancellation request with a required decision reason', async () => {
    const gateway = fakeGateway();
    await open(gateway, {
      ...proposal,
      cancellationRequests: [
        { requestId: 'request', reason: 'Cancel please', requestedAt: '2026-10-08T00:00:00Z' },
      ],
    });
    fireEvent.change(screen.getByLabelText('Lý do quyết định'), { target: { value: 'Agreed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận yêu cầu hủy' }));
    await waitFor(() =>
      expect(gateway.decideCancellation).toHaveBeenCalledWith('manager-token', {
        bookingId: proposal.bookingId,
        requestId: 'request',
        expectedRevision: 3,
        decision: 'APPROVE',
        reason: 'Agreed',
      }),
    );
  });

  it.each([
    [failure('STALE_BOOKING_REVISION', 409), 'Hồ sơ đã thay đổi'],
    [failure('SLOT_NOT_AVAILABLE', 409), 'Khung giờ vừa được giữ'],
    [failure('DEPOSIT_INTENT_ACTIVE', 409), 'Đang có giao dịch tiền cọc'],
    [failure('BOOKING_NOT_FOUND', 404), 'Không tìm thấy hồ sơ'],
    [failure('UNKNOWN', 401), 'Yêu cầu chưa hoàn tất'],
    [failure('UNKNOWN', 403), 'Yêu cầu chưa hoàn tất'],
    [failure('UNKNOWN'), 'Yêu cầu chưa hoàn tất'],
    [new Error('offline'), 'Không thể hoàn tất yêu cầu'],
  ])('handles command failure and allows correction or retry: %s', async (error, message) => {
    const gateway = fakeGateway();
    await open(gateway);
    vi.mocked(gateway.acquireHold).mockRejectedValue(error);
    fireEvent.click(screen.getByRole('button', { name: 'Giữ lịch 15 phút' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    if (error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0)) {
      expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('button', { name: 'Giữ lịch 15 phút' })).toBeEnabled();
      expect(screen.getByLabelText('Lý do hủy')).toBeEnabled();
    }
  });

  it.each(['anonymous', 'staff', 'manager'] as const)(
    'restores the %s access state',
    async (presentation) => {
      vi.spyOn(ManagementIdentitySession.prototype, 'restore').mockResolvedValue(
        presentation === 'anonymous'
          ? { status: 'anonymous', denial: null }
          : {
              status: 'authenticated',
              denial: null,
              presentation,
              actor: {
                accountId: 'manager',
                displayEmail: 'manager@example.com',
                roles: [],
                sessionId: 'session',
              },
            },
      );
      render(<ManagementBookingPage />);
      expect(screen.getByText('Đang xác minh quyền quản lý…')).toBeVisible();
      const sidebar = screen.getByRole('navigation', { name: 'Điều hướng vận hành' });
      expect(sidebar).toBeVisible();
      expect(
        await screen.findByText(
          presentation === 'anonymous'
            ? 'Cần đăng nhập'
            : presentation === 'staff'
              ? 'Không có quyền truy cập'
              : 'Điều phối đặt tiệc',
        ),
      ).toBeVisible();
      if (presentation === 'manager') {
        expect(within(sidebar).getByRole('link', { name: 'Quản lý thanh toán' })).toHaveAttribute(
          'href',
          '/billing',
        );
        expect(within(sidebar).getByRole('link', { name: 'Đặt tiệc' })).toHaveAttribute(
          'aria-current',
          'page',
        );
        expect(within(sidebar).getByRole('link', { name: 'Yêu cầu tư vấn' })).toHaveAttribute(
          'href',
          '/consultation-requests',
        );
        expect(within(sidebar).getByRole('link', { name: 'Tổng quan' })).toHaveAttribute(
          'href',
          '/',
        );
      } else {
        expect(
          within(sidebar).queryByRole('link', { name: 'Quản lý thanh toán' }),
        ).not.toBeInTheDocument();
        expect(within(sidebar).queryByRole('link', { name: 'Đặt tiệc' })).not.toBeInTheDocument();
      }
    },
  );
});
