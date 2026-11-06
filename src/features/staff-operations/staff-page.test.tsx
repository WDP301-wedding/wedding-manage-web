import { webcrypto } from 'node:crypto';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../design-system/notifications';
import { staffService, type GuestSearchResultItem } from '../../services/staff.service';
import { staffWorkspaceService } from '../../services/staff-workspace.service';
import type { StaffEvent, StaffWorkspace } from '../../services/staff-workspace.contracts';
import type { ManagementIdentitySession } from '../identity-access/session';
import { StaffOperationsPage } from './staff-page';

vi.mock('../../services/staff.service', () => ({
  staffService: {
    searchGuests: vi.fn(),
    checkInGuest: vi.fn(),
    undoCheckIn: vi.fn(),
    provisionStaffAccount: vi.fn(),
    assignStaff: vi.fn(),
    revokeAssignment: vi.fn(),
    getEventAssignments: vi.fn(),
    lookupBookings: vi.fn(),
    directory: vi.fn(),
  },
}));
vi.mock('../../services/staff-workspace.service', () => ({
  staffWorkspaceService: { events: vi.fn(), read: vi.fn(), configure: vi.fn() },
}));

const bookingId = '11111111-1111-4111-8111-111111111111';
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const assignedEvent: StaffEvent = {
  bookingId,
  bookingCode: 'HY-000018',
  alias: 'Tiệc Lan và Minh',
  eventDate: '2026-11-15',
  hallName: 'Sảnh Ánh Dương',
  shiftCode: 'DINNER',
  phase: 'CONFIRMED',
};
function workspace(
  isManager: boolean,
  mode: 'BY_GUEST_NAME' | 'NONE' = 'BY_GUEST_NAME',
): StaffWorkspace {
  return {
    bookingId,
    bookingCode: assignedEvent.bookingCode,
    alias: assignedEvent.alias,
    isManager,
    settings: { bookingId, checkInMode: mode, revision: 1, locked: false },
    attendance: {
      measurementStatus: mode === 'NONE' ? 'NOT_RECORDED' : 'LISTED_GUESTS_ONLY',
      checkedInGuestCount: mode === 'NONE' ? null : 0,
      ledgerRevision: 0,
    },
    listedGuestCount: 1,
    planningHeadcount: 150,
    windowOpen: true,
    windowOpensAt: '2026-11-15T09:00:00Z',
    windowClosesAt: '2026-11-15T16:00:00Z',
    timeline: {
      eventDate: assignedEvent.eventDate,
      hallName: assignedEvent.hallName,
      revisionNumber: 1,
      shiftStartTime: '17:00',
      shiftEndTime: '22:00',
      items: [],
    },
    seating: { status: 'CONFIRMED', renderSnapshot: [] },
    members: [],
  };
}
function guest(overrides: Partial<GuestSearchResultItem> = {}): GuestSearchResultItem {
  return {
    guestId: '20000000-0000-4000-8000-000000000001',
    name: 'Nguyễn Văn Khách',
    phoneLast4: '1234',
    groupName: 'Groom Side',
    groupColor: '#10b981',
    tableLabels: ['Bàn 01'],
    checkedIn: false,
    guestGroupId: '30000000-0000-4000-8000-000000000001',
    ledgerRevision: 1,
    warning: null,
    ...overrides,
  };
}
function createMockSession(isManager = true): ManagementIdentitySession {
  const snapshot = {
    status: 'authenticated',
    denial: null,
    presentation: isManager ? 'manager' : 'staff',
    actor: {
      accountId: '10000000-0000-4000-8000-000000000001',
      displayEmail: isManager ? 'manager@example.com' : 'staff@example.com',
      roles: isManager ? ['MANAGER'] : ['STAFF'],
    },
  };
  return {
    restore: vi.fn().mockResolvedValue(snapshot),
    snapshot: vi.fn().mockReturnValue(snapshot),
    logout: vi.fn().mockResolvedValue(undefined),
  } as unknown as ManagementIdentitySession;
}
function renderPage(isManager: boolean) {
  render(<StaffOperationsPage session={createMockSession(isManager)} />, {
    wrapper: NotificationProvider,
  });
}
async function openCheckin(isManager: boolean, fromUrl = false) {
  vi.mocked(staffWorkspaceService.read).mockResolvedValue(workspace(isManager));
  if (fromUrl) window.history.replaceState({}, '', `/?bookingId=${bookingId}`);
  renderPage(isManager);
  if (isManager) expect(await screen.findByRole('tab', { name: 'Nhân sự' })).toBeVisible();
  if (!fromUrl)
    fireEvent.click(await screen.findByRole('button', { name: /HY-000018 · Tiệc Lan và Minh/ }));
  fireEvent.click(await screen.findByRole('tab', { name: 'Đón khách & Check-in' }));
  await waitFor(() => expect(staffWorkspaceService.read).toHaveBeenCalledWith(bookingId));
  await waitFor(() => expect(screen.getByLabelText('Họ tên hoặc SĐT khách')).toBeEnabled());
}
function searchGuests(query = 'Nguyễn') {
  fireEvent.change(screen.getByLabelText('Họ tên hoặc SĐT khách'), { target: { value: query } });
  fireEvent.click(screen.getByRole('button', { name: 'Tra cứu khách' }));
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
  vi.mocked(staffWorkspaceService.events).mockResolvedValue({
    items: [assignedEvent],
    nextAfterId: null,
  });
  vi.mocked(staffService.getEventAssignments).mockResolvedValue([]);
  vi.mocked(staffService.directory).mockResolvedValue({ items: [], nextAfterId: null });
  vi.mocked(staffService.searchGuests).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(staffService.checkInGuest).mockResolvedValue(undefined);
  vi.mocked(staffService.undoCheckIn).mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('StaffOperationsPage (M6, S1, S2)', () => {
  it('loads the UUID-linked event workspace before allowing guest search', async () => {
    vi.mocked(staffService.searchGuests).mockResolvedValue({ items: [guest()], nextCursor: null });
    await openCheckin(true, true);
    searchGuests();
    expect(await screen.findByText('Nguyễn Văn Khách')).toBeVisible();
    expect(staffService.searchGuests).toHaveBeenCalledWith(bookingId, 'Nguyễn');
    expect(screen.getByText('…1234')).toBeVisible();
    expect(screen.getByText('Nhà trai')).toBeVisible();
    expect(screen.getByText('Bàn 01')).toBeVisible();
  });

  it('finds an accessible event by HY code before searching its guests', async () => {
    vi.mocked(staffWorkspaceService.read).mockResolvedValue(workspace(true));
    renderPage(true);
    await screen.findByRole('tab', { name: 'Nhân sự' });
    fireEvent.change(screen.getByLabelText('Tìm mã HY hoặc tên tiệc'), {
      target: { value: 'hy-000018' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm tiệc' }));
    await waitFor(() =>
      expect(staffWorkspaceService.events).toHaveBeenCalledWith(
        'hy-000018',
        undefined,
        'CONFIRMED',
      ),
    );
    fireEvent.click(await screen.findByRole('button', { name: /HY-000018 · Tiệc Lan và Minh/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Đón khách & Check-in' }));
    await waitFor(() => expect(screen.getByLabelText('Họ tên hoặc SĐT khách')).toBeEnabled());
    searchGuests();
    await waitFor(() =>
      expect(staffService.searchGuests).toHaveBeenCalledWith(bookingId, 'Nguyễn'),
    );
    expect(staffWorkspaceService.read).toHaveBeenCalledWith(bookingId);
    expect(staffService.lookupBookings).not.toHaveBeenCalled();
  });

  it('lets assigned staff check in a listed guest with an idempotency key', async () => {
    const person = guest({ name: 'Trần Thị Khách' });
    vi.mocked(staffService.searchGuests).mockResolvedValue({ items: [person], nextCursor: null });
    await openCheckin(false);
    expect(screen.queryByRole('tab', { name: 'Nhân sự' })).not.toBeInTheDocument();
    searchGuests('Trần');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Check-in cho khách Trần Thị Khách' }),
    );
    await waitFor(() =>
      expect(staffService.checkInGuest).toHaveBeenCalledWith(
        bookingId,
        person.guestId,
        undefined,
        expect.stringMatching(uuidPattern),
      ),
    );
  });

  it('requires a manager to confirm a valid override reason before check-in', async () => {
    const person = guest({ name: 'Trần Thị Khách', phoneLast4: null, tableLabels: [] });
    vi.mocked(staffService.searchGuests).mockResolvedValue({ items: [person], nextCursor: null });
    await openCheckin(true);
    searchGuests('Trần');
    expect(await screen.findByText('Nhà trai')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Check-in cho khách Trần Thị Khách' }));
    const dialog = await screen.findByRole('dialog', { name: 'Check-in cho Trần Thị Khách?' });
    const confirm = within(dialog).getByRole('button', { name: 'Xác nhận' });
    expect(confirm).toBeDisabled();
    expect(staffService.checkInGuest).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), {
      target: { value: 'Khách đến sớm, quản lý đón trực tiếp' },
    });
    fireEvent.click(confirm);
    await waitFor(() =>
      expect(staffService.checkInGuest).toHaveBeenCalledWith(
        bookingId,
        person.guestId,
        'Khách đến sớm, quản lý đón trực tiếp',
        expect.stringMatching(uuidPattern),
      ),
    );
  });

  it('confirms the undo reason and sends the displayed ledger revision and record ID', async () => {
    const person = guest({
      name: 'Lê Văn An',
      checkedIn: true,
      ledgerRevision: 2,
      checkInRecordId: '40000000-0000-4000-8000-000000000001',
    });
    vi.mocked(staffService.searchGuests).mockResolvedValue({ items: [person], nextCursor: null });
    await openCheckin(false);
    searchGuests('Lê');
    expect(await screen.findByText('Đã check-in')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác check-in cho khách Lê Văn An' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hoàn tác check-in của Lê Văn An?' });
    expect(staffService.undoCheckIn).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('button', { name: 'Xác nhận' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Lý do/), {
      target: { value: 'Khách báo nhầm người, hoàn tác' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }));
    await waitFor(() =>
      expect(staffService.undoCheckIn).toHaveBeenCalledWith(
        bookingId,
        person.guestId,
        2,
        'Khách báo nhầm người, hoàn tác',
        undefined,
        expect.stringMatching(uuidPattern),
        person.checkInRecordId,
      ),
    );
  });

  it('keeps check-in unavailable and attendance unknown when name-based check-in is disabled', async () => {
    vi.mocked(staffWorkspaceService.read).mockResolvedValue(workspace(false, 'NONE'));
    renderPage(false);
    fireEvent.click(await screen.findByRole('button', { name: /HY-000018 · Tiệc Lan và Minh/ }));
    expect(
      await screen.findByText(
        'Check-in chưa được bật cho tiệc này. Manager có thể bật tại phần Điều kiện đón khách.',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText('Họ tên hoặc SĐT khách')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tra cứu khách' })).toBeDisabled();
    expect(screen.getByText('Chưa ghi nhận')).toBeVisible();
    expect(staffService.searchGuests).not.toHaveBeenCalled();
    expect(staffService.checkInGuest).not.toHaveBeenCalled();
    expect(staffService.undoCheckIn).not.toHaveBeenCalled();
    expect(staffWorkspaceService.configure).not.toHaveBeenCalled();
  });
});
