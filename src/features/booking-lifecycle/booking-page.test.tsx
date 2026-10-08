import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { ManagementIdentitySession } from '../identity-access/session';

import type { ManagementBookingGateway, ProposalView } from './booking-api';
import { ManagementBookingPage, ManagementBookingWorkspace } from './booking-page';

const proposal: ProposalView = {
  bookingId: '00000000-0000-4000-8000-000000000101',
  consultationId: '00000000-0000-4000-8000-000000000102',
  phase: 'DRAFT',
  revision: 3,
  eventDate: '2026-11-15',
  planningHeadcount: 280,
  proposal: {
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
afterEach(() => {
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

describe('Management booking lifecycle workspace', () => {
  it('clears the displayed proposal when template loading loses authenticated access', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3001/api/v1');
    const gateway = fakeGateway();
    await open(gateway);
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Sign in again.',
              requestId: '00000000-0000-4000-8000-000000000201',
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tải mẫu kịch bản' }));
    await screen.findByRole('alert');
    await waitFor(() => expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument());
    expect(screen.getByText('Chưa chọn hồ sơ')).toBeVisible();
  });

  it.each([
    { available: true, expiresAt: null, message: 'Khung giờ đang trống.' },
    { available: false, expiresAt: null, message: 'Khung giờ đang được giữ.' },
    { available: false, expiresAt: '2026-12-20T12:00:00Z', message: 'Khung giờ đang được giữ đến' },
  ])('renders server availability: $message', async ({ available, expiresAt, message }) => {
    const gateway = fakeGateway();
    vi.mocked(gateway.checkAvailability).mockResolvedValue({ available, expiresAt });
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tải danh mục đặt tiệc' }));
    await screen.findByRole('option', { name: 'Sảnh Ánh Dương · tối đa 320 khách' });
    fireEvent.change(screen.getByLabelText('Mã hồ sơ tư vấn'), {
      target: { value: proposal.consultationId },
    });
    fireEvent.change(screen.getByLabelText('Sảnh tiệc'), {
      target: { value: proposal.proposal.hall.id },
    });
    fireEvent.change(screen.getByLabelText('Thực đơn đặt tiệc'), {
      target: { value: proposal.proposal.menu.versionId },
    });
    fireEvent.change(screen.getByLabelText('Ngày tổ chức'), {
      target: { value: proposal.eventDate },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lịch' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(message));
    expect(gateway.checkAvailability).toHaveBeenCalledWith(
      'manager-token',
      expect.objectContaining({
        hallId: proposal.proposal.hall.id,
        eventDate: proposal.eventDate,
        shiftCode: 'DINNER',
      }),
    );
  });

  it.each(['halls', 'menus', 'shifts'] as const)(
    'disables booking when the catalog has no %s',
    async (missing) => {
      const gateway = fakeGateway();
      const selections = await gateway.loadSelections('manager-token');
      vi.mocked(gateway.loadSelections).mockResolvedValue({ ...selections, [missing]: [] });
      render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
      fireEvent.click(screen.getByRole('button', { name: 'Tải danh mục đặt tiệc' }));
      expect(
        await screen.findByText(
          'Danh mục chưa đủ thông tin đặt tiệc. Cập nhật trong mục Danh mục rồi tải lại.',
        ),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: 'Tạo booking' })).toBeDisabled();
    },
  );

  it('retains the consultation and note after invitation delivery fails, then retries', async () => {
    const gateway = fakeGateway();
    vi.mocked(gateway.invite)
      .mockRejectedValueOnce(failure('PROVIDER_UNAVAILABLE', 503))
      .mockResolvedValue(undefined);
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText('Tên cặp đôi'), { target: { value: 'Minh & An' } });
    fireEvent.change(screen.getByLabelText('Email liên hệ'), {
      target: { value: 'couple@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: '  Garden wedding  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ tư vấn' }));
    await screen.findByText('Đã tạo hồ sơ tư vấn.');
    expect(gateway.createConsultation).toHaveBeenCalledWith('manager-token', {
      displayName: 'Minh & An',
      intendedEmail: 'couple@example.com',
      note: 'Garden wedding',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lời mời cộng tác' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Mã hồ sơ tư vấn')).toHaveValue(proposal.consultationId);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lời mời cộng tác' }));
    expect(await screen.findByText('Đã yêu cầu gửi lời mời không gian cộng tác.')).toBeVisible();
    expect(gateway.createConsultation).toHaveBeenCalledTimes(1);
    expect(gateway.invite).toHaveBeenCalledTimes(2);
  });
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
  ])('handles command failure and blocks repeated stale operations: %s', async (error, message) => {
    const gateway = fakeGateway();
    await open(gateway);
    vi.mocked(gateway.acquireHold).mockRejectedValue(error);
    fireEvent.click(screen.getByRole('button', { name: 'Giữ lịch 15 phút' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    if (error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0)) {
      expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('button', { name: 'Giữ lịch 15 phút' })).toBeDisabled();
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
      expect(
        await screen.findByText(
          presentation === 'anonymous'
            ? 'Cần đăng nhập'
            : presentation === 'staff'
              ? 'Không có quyền truy cập'
              : 'Điều phối đặt tiệc',
        ),
      ).toBeVisible();
    },
  );
  it('creates a consultation and keeps the returned revision for invitation', async () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);

    fireEvent.change(screen.getByLabelText('Tên cặp đôi'), { target: { value: 'Minh & An' } });
    fireEvent.change(screen.getByLabelText('Email liên hệ'), {
      target: { value: 'couple@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ tư vấn' }));

    expect(await screen.findByText('Đã tạo hồ sơ tư vấn.')).toBeVisible();
    expect(screen.getByLabelText('Mã hồ sơ tư vấn')).toHaveValue(proposal.consultationId);
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lời mời cộng tác' }));
    await waitFor(() =>
      expect(gateway.invite).toHaveBeenCalledWith('manager-token', {
        consultationId: proposal.consultationId,
        expectedRevision: 1,
      }),
    );
  });

  it('uses catalog choices and sends the selected immutable menu version', async () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText('Tên cặp đôi'), { target: { value: 'Minh & An' } });
    fireEvent.change(screen.getByLabelText('Email liên hệ'), {
      target: { value: 'couple@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ tư vấn' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Mã hồ sơ tư vấn')).toHaveValue(proposal.consultationId),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tải danh mục đặt tiệc' }));
    const hall = await screen.findByRole('option', { name: 'Sảnh Ánh Dương · tối đa 320 khách' });
    expect(hall).toHaveValue(proposal.proposal.hall.id);
    fireEvent.change(screen.getByLabelText('Mã hồ sơ tư vấn'), {
      target: { value: proposal.consultationId },
    });
    fireEvent.change(screen.getByLabelText('Sảnh tiệc'), {
      target: { value: proposal.proposal.hall.id },
    });
    fireEvent.change(screen.getByLabelText('Thực đơn đặt tiệc'), {
      target: { value: proposal.proposal.menu.versionId },
    });
    fireEvent.change(screen.getByLabelText('Ngày tổ chức'), {
      target: { value: proposal.eventDate },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo booking' }));
    await waitFor(() =>
      expect(gateway.createBooking).toHaveBeenCalledWith('manager-token', {
        consultationId: proposal.consultationId,
        hallId: proposal.proposal.hall.id,
        eventDate: proposal.eventDate,
        shiftCode: 'DINNER',
        menuPackageVersionId: proposal.proposal.menu.versionId,
        tableCount: 20,
        planningHeadcount: 200,
        expectedRevision: 1,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gửi lời mời cộng tác' }));
    await waitFor(() =>
      expect(gateway.invite).toHaveBeenCalledWith('manager-token', {
        consultationId: proposal.consultationId,
        expectedRevision: 7,
      }),
    );
  });

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
    fireEvent.change(screen.getByLabelText('Mã booking'), {
      target: { value: proposal.bookingId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tải hồ sơ' }));
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
    fireEvent.change(screen.getByLabelText('Mã booking'), {
      target: { value: proposal.bookingId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tải hồ sơ' }));

    expect(await screen.findByText('Sảnh Ánh Dương')).toBeVisible();
    expect(screen.getByText(/42\.000\.000/u)).toBeVisible();
    expect(gateway.loadProposal).toHaveBeenCalledWith('manager-token', proposal.bookingId);
  });
});
