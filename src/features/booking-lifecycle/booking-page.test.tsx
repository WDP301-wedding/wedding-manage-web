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
      bookingId: null,
      bookingPhase: null,
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

describe('Management booking lifecycle workspace', () => {
  it('keeps controls usable before catalog loading and explains the next step', () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    for (const label of ['Sảnh tiệc', 'Ca', 'Thực đơn đặt tiệc', 'Ngày tổ chức'])
      expect(screen.getByLabelText(label)).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Tạo booking' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kiểm tra lịch' })).toBeEnabled();
    expect(gateway.createBooking).not.toHaveBeenCalled();
  });

  it('rejects past dates and tomorrow, then allows checking a slot without a consultation or menu', async () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    expect(screen.getByRole('textbox', { name: 'Ngày tổ chức' })).toHaveAttribute(
      'min',
      '2026-10-11',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tải danh mục đặt tiệc' }));
    await screen.findByRole('option', { name: 'Sảnh Ánh Dương · tối đa 320 khách' });
    fireEvent.change(screen.getByLabelText('Sảnh tiệc'), {
      target: { value: proposal.proposal.hall.id },
    });
    for (const value of ['2020-01-01', '2026-10-09', '2026-10-10']) {
      fireEvent.change(screen.getByLabelText('Ca'), { target: { value: 'DINNER' } });
      fireEvent.change(screen.getByRole('textbox', { name: 'Ngày tổ chức' }), {
        target: { value },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lịch' }));
      expect(screen.getByRole('alert')).toHaveTextContent('phải từ ngày mốt');
      fireEvent.click(screen.getByRole('button', { name: 'Tạo booking' }));
      expect(screen.getByRole('alert')).toHaveTextContent('phải từ ngày mốt');
    }
    expect(gateway.checkAvailability).not.toHaveBeenCalled();
    expect(gateway.createBooking).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Ca'), { target: { value: 'DINNER' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Ngày tổ chức' }), {
      target: { value: '2026-10-11' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lịch' }));
    await screen.findByText('Khung giờ đang trống.');
    expect(gateway.checkAvailability).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText(/Tên (khách|cặp đôi)/), { target: { value: 'Lan' } });
    fireEvent.change(screen.getByLabelText('Email liên hệ'), {
      target: { value: 'lan@example.test' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ tư vấn' }));
    await screen.findByText('Đã tạo hồ sơ tư vấn.');
    fireEvent.change(screen.getByLabelText('Số bàn'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Số khách dự kiến'), { target: { value: '120' } });
    fireEvent.change(screen.getByLabelText('Thực đơn đặt tiệc'), {
      target: { value: proposal.proposal.menu.versionId },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo booking' }));
    await waitFor(() =>
      expect(gateway.createBooking).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({ eventDate: '2026-10-11' }),
      ),
    );
  }, 15000);

  it('updates the date minimum when an overnight page regains focus', () => {
    render(<ManagementBookingWorkspace authorize={authorize} gateway={fakeGateway()} />);
    expect(screen.getByRole('textbox', { name: 'Ngày tổ chức' })).toHaveAttribute(
      'min',
      '2026-10-11',
    );
    vi.setSystemTime(new Date('2026-10-09T17:00:00Z'));
    fireEvent.focus(window);
    expect(screen.getByRole('textbox', { name: 'Ngày tổ chức' })).toHaveAttribute(
      'min',
      '2026-10-12',
    );
  });

  it('keeps catalog selections and booking drafts when a consultation is created', async () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tải danh mục đặt tiệc' }));
    await screen.findByRole('option', { name: 'Sảnh Ánh Dương · tối đa 320 khách' });
    fireEvent.change(screen.getByLabelText('Sảnh tiệc'), {
      target: { value: proposal.proposal.hall.id },
    });
    fireEvent.change(screen.getByLabelText('Ca'), { target: { value: 'DINNER' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Ngày tổ chức' }), {
      target: { value: '2026-10-11' },
    });
    fireEvent.change(screen.getByLabelText('Số bàn'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/Tên (khách|cặp đôi)/), { target: { value: 'Minh & An' } });
    fireEvent.change(screen.getByLabelText('Email liên hệ'), {
      target: { value: 'couple@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ tư vấn' }));
    await screen.findByText('Đã tạo hồ sơ tư vấn.');
    expect(screen.getByLabelText('Mã hồ sơ tư vấn')).toHaveValue(proposal.consultationId);
    expect(screen.getByLabelText('Sảnh tiệc')).toHaveValue(proposal.proposal.hall.id);
    expect(screen.getByRole('textbox', { name: 'Ngày tổ chức' })).toHaveValue('2026-10-11');
    expect(screen.getByLabelText('Số bàn')).toHaveValue(12);
  });

  it('keeps timeline inputs and actions usable after a failed save', async () => {
    const gateway = fakeGateway();
    vi.mocked(gateway.saveTimeline).mockRejectedValueOnce(
      failure('TIMELINE_ITEM_TIME_INVALID', 422),
    );
    await open(gateway);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm mốc chương trình' }));
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu mốc 1'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Nội dung mốc 1'), { target: { value: 'Đón khách' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('từ 17:00 đến trước 22:00');
    expect(screen.getByLabelText('Nội dung mốc 1')).toBeEnabled();
    expect(screen.getByLabelText('Nội dung mốc 1')).toHaveValue('Đón khách');
    expect(screen.getByRole('button', { name: 'Thêm mốc chương trình' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Giờ bắt đầu mốc 1'), { target: { value: '18:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu kịch bản mới' }));
    await waitFor(() => expect(gateway.saveTimeline).toHaveBeenCalledTimes(2));
    expect(gateway.saveTimeline).toHaveBeenLastCalledWith(
      'manager-token',
      expect.objectContaining({
        items: [expect.objectContaining({ startTime: '18:00', title: 'Đón khách' })],
      }),
    );
  });

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
    fireEvent.change(screen.getByLabelText('Ca'), { target: { value: 'DINNER' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Ngày tổ chức' }), {
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
    'explains missing %s without disabling booking actions',
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
      fireEvent.click(screen.getByRole('button', { name: 'Tạo booking' }));
      expect(gateway.createBooking).not.toHaveBeenCalled();
    },
  );

  it('keeps a newly created consultation attached and prevents creating it again accidentally', async () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText(/Tên (khách|cặp đôi)/), { target: { value: 'Minh & An' } });
    fireEvent.change(screen.getByLabelText('Email liên hệ'), {
      target: { value: 'couple@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Ghi chú'), { target: { value: 'Garden wedding' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ tư vấn' }));
    await screen.findByText('Đã tạo hồ sơ tư vấn.');
    expect(gateway.createConsultation).toHaveBeenCalledWith('manager-token', {
      displayName: 'Minh & An',
      intendedEmail: 'couple@example.com',
      note: 'Garden wedding',
    });
    expect(screen.getByLabelText('Mã hồ sơ tư vấn')).toHaveValue(proposal.consultationId);
    expect(screen.getByRole('button', { name: 'Đã tạo hồ sơ tư vấn' })).toBeDisabled();
    expect(gateway.createConsultation).toHaveBeenCalledTimes(1);
  });

  it('uses catalog choices and sends the selected immutable menu version', async () => {
    const gateway = fakeGateway();
    render(<ManagementBookingWorkspace authorize={authorize} gateway={gateway} />);
    fireEvent.change(screen.getByLabelText(/Tên (khách|cặp đôi)/), { target: { value: 'Minh & An' } });
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
    fireEvent.change(screen.getByLabelText('Ca'), { target: { value: 'DINNER' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Ngày tổ chức' }), {
      target: { value: proposal.eventDate },
    });
    fireEvent.change(screen.getByLabelText('Số bàn'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Số khách dự kiến'), { target: { value: '200' } });
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
    await waitFor(() =>
      expect(gateway.loadProposal).toHaveBeenCalledWith('manager-token', proposal.bookingId),
    );
  });
});
