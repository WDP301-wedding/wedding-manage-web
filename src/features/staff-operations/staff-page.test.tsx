import { webcrypto } from 'node:crypto';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../design-system/notifications';
import { staffService } from '../../services/staff.service';
import { staffWorkspaceService as api } from '../../services/staff-workspace.service';
import type { StaffEvent, StaffWorkspace } from '../../services/staff-workspace.contracts';
import type { ManagementIdentitySession } from '../identity-access/session';
import { StaffOperationsPage } from './staff-page';
vi.mock('../../services/staff.service', () => ({
  staffService: {
    provisionStaffAccount: vi.fn(),
    assignStaff: vi.fn(),
    revokeAssignment: vi.fn(),
    getEventAssignments: vi.fn(),
    directory: vi.fn(),
    setOperationalAccess: vi.fn(),
  },
}));
vi.mock('../../services/staff-workspace.service', () => ({
  staffWorkspaceService: {
    events: vi.fn(),
    read: vi.fn(),
    work: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    history: vi.fn(),
  },
}));
const bookingId = '11111111-1111-4111-8111-111111111111';
const accountId = '10000000-0000-4000-8000-000000000001';
const staffId = '10000000-0000-4000-8000-000000000002';
const assignedEvent: StaffEvent = {
  bookingId,
  bookingCode: 'HY-000018',
  alias: 'Tiệc Lan và Minh',
  eventDate: '2026-11-15',
  hallName: 'Sảnh Ánh Dương',
  shiftCode: 'DINNER',
  phase: 'CONFIRMED',
};
const assignment = {
  assignmentId: '10000000-0000-4000-8000-000000000003',
  bookingId,
  staffAccountId: staffId,
  staffLabel: 'staff@example.com',
  status: 'ACTIVE' as const,
  revision: 3,
};
function workspace(isManager: boolean): StaffWorkspace {
  return {
    bookingId,
    bookingCode: assignedEvent.bookingCode,
    alias: assignedEvent.alias,
    isManager,
    operations: {
      phase: 'CONFIRMED',
      brideName: 'Lan',
      groomName: 'Minh',
      tableCount: 15,
      offerings: [
        {
          category: 'MENU',
          name: 'Thực đơn mùa cưới',
          description: 'Súp hải sản',
          unit: 'bàn',
          quantity: 15,
        },
      ],
    },
    planningHeadcount: 150,
    timeline: {
      eventDate: assignedEvent.eventDate,
      hallName: assignedEvent.hallName,
      revisionNumber: 1,
      shiftStartTime: '17:00',
      shiftEndTime: '22:00',
      items: [],
    },
    seating: { status: 'CONFIRMED', renderSnapshot: [] },
    members: [{ accountId: staffId, label: 'staff@example.com' }],
  };
}
function renderPage(isManager: boolean) {
  const snapshot = {
    status: 'authenticated',
    denial: null,
    presentation: isManager ? 'manager' : 'staff',
    actor: {
      accountId,
      displayEmail: 'actor@example.com',
      roles: [isManager ? 'MANAGER' : 'STAFF'],
    },
  };
  const session = {
    restore: vi.fn().mockResolvedValue(snapshot),
    snapshot: vi.fn().mockReturnValue(snapshot),
    logout: vi.fn().mockResolvedValue(undefined),
  } as unknown as ManagementIdentitySession;
  vi.mocked(api.read).mockResolvedValue(workspace(isManager));
  render(<StaffOperationsPage session={session} />, { wrapper: NotificationProvider });
}
async function open(isManager: boolean) {
  renderPage(isManager);
  fireEvent.click(await screen.findByRole('button', { name: /HY-000018 · Tiệc Lan và Minh/ }));
  await screen.findByRole('region', { name: 'Thông tin tiệc được phân công' });
}
// jsdom does not implement the browser's modal dialog lifecycle.
const dialogMethods = {
  showModal: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal'),
  close: Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close'),
};
beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = true;
      },
    },
    close: {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = false;
      },
    },
  });
});
afterAll(() => {
  for (const [name, descriptor] of Object.entries(dialogMethods)) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('crypto', webcrypto);
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.mocked(api.events).mockResolvedValue({ items: [assignedEvent], nextAfterId: null });
  vi.mocked(api.work).mockResolvedValue({ items: [], nextAfterId: null });
  vi.mocked(staffService.getEventAssignments).mockResolvedValue([]);
  vi.mocked(staffService.directory).mockResolvedValue({
    items: [{ accountId: staffId, email: 'staff@example.com', credentialSetupRequired: false }],
    nextAfterId: null,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});
describe('assigned event personnel and Staff workspace', () => {
  it('opens assigned operational information without named-list/check-in controls', async () => {
    await open(false);
    expect(screen.getByText('150 khách')).toBeVisible();
    expect(screen.getByText('15 bàn')).toBeVisible();
    expect(screen.getByText('Thực đơn mùa cưới')).toBeVisible();
    expect(screen.queryByRole('tab', { name: 'Nhân sự' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Check-in|Điều kiện đón khách|Khách có tên/)).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Công việc & Bàn giao' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Kịch bản tiệc' }));
    expect(await screen.findByText(/Kịch bản đã duyệt · phiên bản/)).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Sơ đồ bàn' }));
    expect(
      await screen.findByRole('heading', { name: 'Sơ đồ bàn và hướng dẫn nhóm khách' }),
    ).toBeVisible();
  });
  it('searches by HY code within the accessible event list', async () => {
    renderPage(true);
    fireEvent.change(await screen.findByLabelText('Tìm mã HY hoặc tên tiệc'), {
      target: { value: 'hy-000018' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm tiệc' }));
    await waitFor(() =>
      expect(api.events).toHaveBeenCalledWith('hy-000018', undefined, 'CONFIRMED'),
    );
  });
  it('assigns a selected account with the current revoked revision', async () => {
    vi.mocked(staffService.getEventAssignments).mockResolvedValue([
      { ...assignment, status: 'REVOKED' },
    ]);
    vi.mocked(staffService.assignStaff).mockResolvedValue(assignment);
    await open(true);
    fireEvent.click(await screen.findByRole('button', { name: /^staff@example\.com/u }));
    const button = screen.getByRole('button', { name: 'Phân công vào tiệc hiện tại' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() =>
      expect(staffService.assignStaff).toHaveBeenCalledWith(
        { bookingId, staffAccountId: staffId, expectedRevision: 3 },
        expect.any(String),
      ),
    );
  });
  it('prevents duplicate active assignment', async () => {
    vi.mocked(staffService.getEventAssignments).mockResolvedValue([assignment]);
    await open(true);
    fireEvent.click(await screen.findByRole('button', { name: /^staff@example\.com/u }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Phân công vào tiệc hiện tại' })).toBeDisabled(),
    );
    expect(staffService.assignStaff).not.toHaveBeenCalled();
  });
  it('revokes an assignment with a recorded reason and refreshes the workspace', async () => {
    vi.mocked(staffService.getEventAssignments).mockResolvedValue([assignment]);
    await open(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'Điều chỉnh nhân sự phục vụ tiệc' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /Xác nhận/ }));
    await waitFor(() =>
      expect(staffService.revokeAssignment).toHaveBeenCalledWith(
        bookingId,
        assignment.assignmentId,
        3,
        'Điều chỉnh nhân sự phục vụ tiệc',
        expect.any(String),
      ),
    );
    await waitFor(() => expect(vi.mocked(api.read).mock.calls.length).toBeGreaterThan(1));
  });
  it('reloads the directory after provisioning an account and selects it', async () => {
    vi.mocked(staffService.provisionStaffAccount).mockResolvedValue({
      accountId: staffId,
      credentialSetupRequired: true,
    });
    await open(true);
    fireEvent.click(screen.getByText('Mời hoặc khôi phục quyền nhân viên'));
    fireEvent.change(screen.getByLabelText('Email nhân viên'), {
      target: { value: 'new@example.com' },
    });
    const before = vi.mocked(staffService.directory).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Mời nhân viên' }));
    await waitFor(() =>
      expect(vi.mocked(staffService.directory).mock.calls.length).toBeGreaterThan(before),
    );
    expect(screen.getByLabelText('Nhân viên đã chuẩn bị')).toHaveValue('new@example.com');
  });
  it('clears the previous workspace when another event fails authorization', async () => {
    await open(false);
    fireEvent.click(screen.getByRole('tab', { name: 'Kịch bản tiệc' }));
    vi.mocked(api.events).mockResolvedValue({
      items: [{ ...assignedEvent, bookingId: staffId, bookingCode: 'HY-000019' }],
      nextAfterId: null,
    });
    vi.mocked(api.read).mockRejectedValue(new Error('EVENT_ASSIGNMENT_REQUIRED'));
    fireEvent.click(screen.getByText('Chọn hoặc chuyển tiệc'));
    fireEvent.click(screen.getByRole('button', { name: 'Tìm tiệc' }));
    fireEvent.click(await screen.findByRole('button', { name: /HY-000019/ }));
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Thông tin tiệc được phân công' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByText('Thực đơn mùa cưới')).not.toBeInTheDocument();
  });
  it('lets Staff update an assigned unfinished task with the displayed revision and note', async () => {
    const task = {
      id: staffId,
      bookingId,
      kind: 'TASK' as const,
      title: 'Chuẩn bị âm thanh',
      description: 'Kiểm tra micro',
      priority: 'NORMAL' as const,
      status: 'OPEN' as const,
      assignedAccountId: accountId,
      createdByAccountId: staffId,
      revision: 4,
      createdAt: '2026-11-08T01:00:00Z',
      updatedAt: '2026-11-08T01:00:00Z',
    };
    vi.mocked(api.work).mockResolvedValue({ items: [task], nextAfterId: null });
    vi.mocked(api.update).mockResolvedValue({ ...task, status: 'IN_PROGRESS', revision: 5 });
    await open(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Cập nhật công việc' }));
    const editor = screen.getByRole('form', { name: 'Xác nhận cập nhật tác nghiệp' });
    fireEvent.change(editor.querySelector('select[name="status"]')!, {
      target: { value: 'IN_PROGRESS' },
    });
    fireEvent.change(within(editor).getByLabelText('Ghi chú xác nhận'), {
      target: { value: 'Đang kiểm tra micro sân khấu' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith(
        bookingId,
        staffId,
        { expectedRevision: 4, status: 'IN_PROGRESS', note: 'Đang kiểm tra micro sân khấu' },
        expect.any(String),
      ),
    );
  });
  it('lets Staff report an incident without assigning it to another person', async () => {
    await open(false);
    fireEvent.click(screen.getByRole('button', { name: 'Sự cố' }));
    fireEvent.click(await screen.findByText('Báo sự cố'));
    fireEvent.change(screen.getByLabelText('Tiêu đề'), {
      target: { value: 'Micro không hoạt động' },
    });
    fireEvent.change(screen.getByLabelText('Nội dung cụ thể'), {
      target: { value: 'Cần thay pin trước khi bắt đầu' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ghi nhận' }));
    await waitFor(() =>
      expect(api.create).toHaveBeenCalledWith(
        bookingId,
        {
          kind: 'INCIDENT',
          title: 'Micro không hoạt động',
          description: 'Cần thay pin trước khi bắt đầu',
          priority: 'NORMAL',
          assignedAccountId: null,
        },
        expect.any(String),
      ),
    );
  });
  it('only exposes handover acknowledgement to its recipient, never the author or another Manager', async () => {
    const item = {
      id: staffId,
      bookingId,
      kind: 'HANDOVER' as const,
      title: 'Bàn giao ca',
      description: 'Kiểm tra thiết bị dự phòng',
      priority: 'NORMAL' as const,
      status: 'OPEN' as const,
      assignedAccountId: staffId,
      createdByAccountId: '10000000-0000-4000-8000-000000000004',
      revision: 1,
      createdAt: '2026-11-08T01:00:00Z',
      updatedAt: '2026-11-08T01:00:00Z',
    };
    vi.mocked(api.work).mockResolvedValue({ items: [item], nextAfterId: null });
    await open(true);
    fireEvent.click(screen.getByRole('tab', { name: 'Công việc & Bàn giao' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Bàn giao ca' }));
    expect(await screen.findByText('Kiểm tra thiết bị dự phòng')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Xác nhận nhận bàn giao' }),
    ).not.toBeInTheDocument();
  });
});
