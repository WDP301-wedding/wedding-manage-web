import { type FormEvent, useEffect, useState } from 'react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import {
  staffService,
  type EventAssignmentItem,
  type GuestSearchResultItem,
} from '../../services/staff.service';
import { notify } from '../../design-system/notifications';
import { describeApiError } from '../../lib/api/api-errors';

export type StaffTab = 'checkin' | 'management';

// BE ghi lý do vào nhật ký: hoàn tác, thu hồi phân công và mọi thao tác của quản lý cần ≥ 10 ký tự.
const minReasonLength = 10;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function useStaffOperations({
  authenticated,
  isManager,
}: Readonly<{ authenticated: boolean; isManager: boolean }>) {
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<StaffTab>('checkin');

  const [bookingId, setBookingId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [guests, setGuests] = useState<readonly GuestSearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [assignments, setAssignments] = useState<readonly EventAssignmentItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const reason = actionReason.trim();
  const requireReason = (message: string) => {
    if (reason.length >= minReasonLength) return true;
    notify.warning(message);
    return false;
  };
  const [staffAccountId, setStaffAccountId] = useState('');

  // Ô "Mã tiệc" nhận mã HY (quản lý tra cứu được) hoặc mã UUID; API tác nghiệp chỉ nhận UUID.
  const [resolved, setResolved] = useState<{ input: string; id: string } | null>(null);
  const input = bookingId.trim();
  const eventId = uuidPattern.test(input) ? input : resolved?.input === input ? resolved.id : '';

  const resolveEventId = async (): Promise<string | null> => {
    if (eventId) return eventId;
    if (!input) {
      notify.warning('Vui lòng nhập mã tiệc (ví dụ HY-000018).');
      return null;
    }
    if (!isManager) {
      notify.warning(
        'Tài khoản nhân viên chưa tra cứu được mã HY. Hãy mở bàn đón khách bằng liên kết tiệc do quản lý gửi.',
      );
      return null;
    }
    const matches = await staffService.lookupBookings(input);
    const exact = matches.filter((item) => item.bookingCode === input.toUpperCase());
    const pick = exact.length === 1 ? exact : matches;
    if (pick.length === 1 && pick[0]) {
      setResolved({ input, id: pick[0].bookingId });
      return pick[0].bookingId;
    }
    notify.warning(
      pick.length === 0
        ? `Không tìm thấy tiệc khớp “${input}”.`
        : `Có ${pick.length} tiệc khớp “${input}”. Hãy nhập đủ mã HY.`,
    );
    return null;
  };

  useEffect(() => {
    const bId = new URLSearchParams(window.location.search).get('bookingId');
    if (bId !== null && /^[a-f0-9-]{36}$/iu.test(bId)) {
      setBookingId(bId);
    }
  }, []);

  const handleSearchGuests = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    // API tìm khách cần ít nhất 2 ký tự tên hoặc số điện thoại.
    if (searchQuery.trim().length < 2) {
      notify.warning('Nhập ít nhất 2 ký tự họ tên hoặc số điện thoại của khách.');
      return;
    }
    setSearching(true);
    try {
      const id = await resolveEventId();
      if (!id) return;
      const res = await staffService.searchGuests(id, searchQuery.trim());
      setGuests(res.items);
      setSearched(true);
      if (res.items.length === 0) {
        notify.info('Không tìm thấy khách mời nào phù hợp.');
      }
    } catch (err) {
      notify.error(err, {
        fallbackMessage: 'Không thể tra cứu khách mời. Vui lòng kiểm tra lại mã tiệc.',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async (guestId: string) => {
    if (
      isManager &&
      !requireReason('Tài khoản quản lý cần ghi lý do (ít nhất 10 ký tự) trước khi check-in.')
    )
      return;
    setPending(true);
    try {
      await staffService.checkInGuest(eventId, guestId, isManager ? reason : undefined);
      notify.success('Đã check-in thành công cho khách mời.');
      await handleSearchGuests();
    } catch (err) {
      notify.error(err, { fallbackMessage: describeApiError(err).message });
    } finally {
      setPending(false);
    }
  };

  const handleUndoCheckIn = async (guestId: string) => {
    if (!requireReason('Ghi lý do hoàn tác (ít nhất 10 ký tự) trước khi hoàn tác check-in.'))
      return;
    setPending(true);
    try {
      const guest = guests.find((item) => item.guestId === guestId);
      if (!guest) return;
      await staffService.undoCheckIn(
        eventId,
        guestId,
        guest.ledgerRevision,
        reason,
        isManager ? reason : undefined,
      );
      notify.success('Đã hoàn tác check-in.');
      await handleSearchGuests();
    } catch (err) {
      notify.error(err, { fallbackMessage: describeApiError(err).message });
    } finally {
      setPending(false);
    }
  };

  const handleLoadAssignments = async () => {
    setLoadingAssignments(true);
    try {
      const id = await resolveEventId();
      if (!id) return;
      setAssignments(await staffService.getEventAssignments(id));
    } catch (err) {
      notify.error(err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  useLiveRefresh(
    async (isCurrent) => {
      try {
        if (activeTab === 'checkin' && searched) {
          const res = await staffService.searchGuests(eventId, searchQuery.trim());
          if (isCurrent()) setGuests(res.items);
        } else if (activeTab === 'management' && isManager) {
          const res = await staffService.getEventAssignments(eventId);
          if (isCurrent()) setAssignments(res);
        }
      } catch (err) {
        if (isCurrent()) notify.error(err);
      }
    },
    {
      scope: eventId + ':' + activeTab + ':' + searchQuery,
      bookingId: eventId,
      enabled: Boolean(eventId) && authenticated,
      blocked: pending || searching || loadingAssignments,
      types: ['guest.updated', 'booking.updated'],
    },
  );

  const handleProvisionStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get('email') as string;

    setPending(true);
    try {
      const res = await staffService.provisionStaffAccount({ email });
      notify.success(
        `Đã tạo/tìm thấy tài khoản nhân viên ${email} (ID: ${res.accountId}). Bạn có thể phân công ngay bên dưới.`,
      );
      setStaffAccountId(res.accountId);
      form.reset();
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Không thể cấp tài khoản nhân viên.' });
    } finally {
      setPending(false);
    }
  };

  const handleAssignStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const staffId = data.get('staffAccountId') as string;

    setPending(true);
    try {
      const id = await resolveEventId();
      if (!id) return;
      // Cấp lại cho người đã từng được phân công thì gửi revision hiện tại; phân công mới là 0.
      const previous = assignments.find((item) => item.staffAccountId === staffId.trim());
      await staffService.assignStaff({
        bookingId: id,
        staffAccountId: staffId.trim(),
        expectedRevision: previous?.revision ?? 0,
      });
      notify.success('Phân công nhân sự vào tiệc thành công!');
      await handleLoadAssignments();
      form.reset();
      setStaffAccountId('');
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Phân công nhân sự thất bại.' });
    } finally {
      setPending(false);
    }
  };

  const handleRevokeAssignment = async (assignmentId: string) => {
    const assignment = assignments.find((item) => item.assignmentId === assignmentId);
    if (!eventId || !assignment) return;
    if (!requireReason('Ghi lý do thu hồi (ít nhất 10 ký tự) trước khi thu hồi phân công.')) return;
    setPending(true);
    try {
      await staffService.revokeAssignment(eventId, assignmentId, assignment.revision, reason);
      notify.success('Đã thu hồi phân công nhân sự.');
      await handleLoadAssignments();
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Thu hồi phân công thất bại.' });
    } finally {
      setPending(false);
    }
  };

  const openTab = (tab: StaffTab) => {
    setActiveTab(tab);
    if (tab === 'management' && input) void handleLoadAssignments();
  };

  return {
    pending,
    activeTab,
    openTab,
    bookingId,
    setBookingId,
    searchQuery,
    setSearchQuery,
    guests,
    searching,
    assignments,
    loadingAssignments,
    staffAccountId,
    setStaffAccountId,
    actionReason,
    setActionReason,
    handleSearchGuests,
    handleCheckIn,
    handleUndoCheckIn,
    handleLoadAssignments,
    handleProvisionStaff,
    handleAssignStaff,
    handleRevokeAssignment,
  };
}
