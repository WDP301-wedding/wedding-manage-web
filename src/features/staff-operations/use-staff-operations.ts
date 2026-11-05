import { useStaffEventContext } from './use-staff-event-context';
import { staffCommand } from './staff-command-intents';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import {
  staffService,
  type EventAssignmentItem,
  type GuestSearchResultItem,
} from '../../services/staff.service';
import { notify } from '../../design-system/notifications';
import { describeApiError } from '../../lib/api/api-errors';

export type StaffTab = 'checkin' | 'management' | 'timeline' | 'seating' | 'work';

// BE ghi lý do vào nhật ký: hoàn tác, thu hồi phân công và mọi thao tác của quản lý cần ≥ 10 ký tự.
const minReasonLength = 10;

export function useStaffOperations({
  authenticated,
  isManager,
  accountId = '',
}: Readonly<{ authenticated: boolean; isManager: boolean; accountId?: string }>) {
  const [pending, setPending] = useState(false);
  const [selectedTab, setActiveTab] = useState<StaffTab | null>(null);
  const activeTab = selectedTab ?? (isManager ? 'management' : 'checkin');

  const eventContext = useStaffEventContext(authenticated, accountId, pending);
  const { bookingId, setBookingId, eventId, resolveEventId } = eventContext;
  const input = bookingId.trim();
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<{
    bookingId: string;
    accountId: string;
    query: string;
    items: readonly GuestSearchResultItem[];
    nextCursor: string | null;
  } | null>(null);
  const inputRef = useRef(bookingId);
  useEffect(() => {
    inputRef.current = bookingId;
  }, [bookingId]);
  const currentSearch = useRef('');
  useEffect(() => {
    currentSearch.current = `${eventId}:${searchQuery.trim()}`;
  }, [eventId, searchQuery]);
  const guests =
    result?.bookingId === eventId &&
    result.accountId === accountId &&
    result.query === searchQuery.trim()
      ? result.items
      : [];
  const mutationLock = useRef(false);
  const searchVersion = useRef(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [assignmentResult, setAssignmentResult] = useState<{
    bookingId: string;
    accountId: string;
    items: readonly EventAssignmentItem[];
  } | null>(null);
  const assignments =
    assignmentResult?.bookingId === eventId && assignmentResult.accountId === accountId
      ? assignmentResult.items
      : [];
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [staffAccountId, setStaffAccountId] = useState('');
  const [staffAccountLabel, setStaffAccountLabel] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  const handleSearchGuests = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    // API tìm khách cần ít nhất 2 ký tự tên hoặc số điện thoại.
    if (searchQuery.trim().length < 2) {
      notify.warning('Nhập ít nhất 2 ký tự họ tên hoặc số điện thoại của khách.');
      return;
    }
    const request = ++searchVersion.current;
    setSearching(true);
    try {
      const id = await resolveEventId();
      if (!id) return;
      const res = await staffService.searchGuests(id, searchQuery.trim());
      // A different event/query must never inherit old search results.
      if (
        request === searchVersion.current &&
        (currentSearch.current === `${id}:${searchQuery.trim()}` ||
          (!eventId &&
            inputRef.current.trim() === input &&
            currentSearch.current.endsWith(`:${searchQuery.trim()}`)))
      )
        setResult({ bookingId: id, accountId, query: searchQuery.trim(), ...res });
      setSearched(true);
      if (res.items.length === 0) {
        notify.info('Không tìm thấy khách mời nào phù hợp.');
      }
    } catch (err) {
      notify.error(err, {
        fallbackMessage: 'Không thể tra cứu khách mời. Vui lòng kiểm tra lại mã tiệc.',
      });
    } finally {
      if (request === searchVersion.current) setSearching(false);
    }
  };

  const handleCheckIn = async (guestId: string, reason = '') => {
    if (mutationLock.current || !guests.some((g) => g.guestId === guestId)) return;
    if (isManager && reason.length < minReasonLength) return;
    mutationLock.current = true;
    setPending(true);
    try {
      await staffCommand(
        `${accountId}:${eventId}:check-in:${guestId}:${guests.find((g) => g.guestId === guestId)?.ledgerRevision}`,
        { guestId, ...(isManager ? { overrideReason: reason } : {}) },
        (key) => staffService.checkInGuest(eventId, guestId, isManager ? reason : undefined, key),
      );
      notify.success('Đã check-in thành công cho khách mời.');
      await handleSearchGuests();
    } catch (err) {
      if (isManager) throw err;
      notify.error(err, { fallbackMessage: describeApiError(err).message });
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  };

  const handleUndoCheckIn = async (guestId: string, reason: string) => {
    if (mutationLock.current || !guests.some((g) => g.guestId === guestId)) return;
    if (reason.length < minReasonLength) return;
    mutationLock.current = true;
    setPending(true);
    try {
      const guest = guests.find((item) => item.guestId === guestId);
      if (!guest) return;
      await staffCommand(
        `${accountId}:${eventId}:undo:${guestId}:${guest.ledgerRevision}`,
        { guestId, revision: guest.ledgerRevision, reason, isManager },
        (key) =>
          staffService.undoCheckIn(
            eventId,
            guestId,
            guest.ledgerRevision,
            reason,
            isManager ? reason : undefined,
            key,
            guest.checkInRecordId ?? undefined,
          ),
      );
      notify.success('Đã hoàn tác check-in.');
      await handleSearchGuests();
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  };

  const handleMoreGuests = async () => {
    if (
      !result?.nextCursor ||
      searching ||
      result.bookingId !== eventId ||
      result.query !== searchQuery.trim()
    )
      return;
    const scope = currentSearch.current;
    const request = ++searchVersion.current;
    setSearching(true);
    try {
      const res = await staffService.searchGuests(eventId, result.query, result.nextCursor);
      if (request === searchVersion.current && currentSearch.current === scope)
        setResult({
          bookingId: eventId,
          accountId,
          query: result.query,
          items: [...new Map([...result.items, ...res.items].map((g) => [g.guestId, g])).values()],
          nextCursor: res.nextCursor,
        });
    } catch (err) {
      notify.error(err);
    } finally {
      setSearching(false);
    }
  };
  const handleLoadAssignments = async () => {
    setLoadingAssignments(true);
    setAssignmentError(null);
    try {
      const id = await resolveEventId();
      if (!id) return;
      const items = await staffService.getEventAssignments(id);
      if (inputRef.current.trim() === input)
        setAssignmentResult({ bookingId: id, accountId, items });
    } catch (err) {
      if (inputRef.current.trim() === input) setAssignmentError(describeApiError(err).message);
    } finally {
      if (inputRef.current.trim() === input) setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (authenticated && isManager && activeTab === 'management' && eventId)
      void handleLoadAssignments();
  }, [authenticated, isManager, activeTab, eventId, accountId]);

  useLiveRefresh(
    async (isCurrent) => {
      try {
        if (activeTab === 'checkin' && searched && searchQuery.trim().length >= 2) {
          const request = ++searchVersion.current;
          const res = await staffService.searchGuests(eventId, searchQuery.trim());
          if (isCurrent() && request === searchVersion.current)
            setResult({ bookingId: eventId, accountId, query: searchQuery.trim(), ...res });
        } else if (activeTab === 'management' && isManager) {
          const res = await staffService.getEventAssignments(eventId);
          if (isCurrent()) setAssignmentResult({ bookingId: eventId, accountId, items: res });
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
      invalidateOnBlock: true,
      types: ['guest.updated', 'staff.updated', 'booking.updated'],
    },
  );

  const handleProvisionStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get('email') as string;

    setPending(true);
    try {
      const res = await staffCommand(
        `${accountId}:staff-provision`,
        { email: email.trim().toLowerCase() },
        (key) => staffService.provisionStaffAccount({ email }, key),
      );
      notify.success(
        `Đã chuẩn bị tài khoản ${email}. ${res.credentialSetupRequired ? 'Nhân viên cần thiết lập mật khẩu qua luồng Quên mật khẩu trước khi đăng nhập.' : 'Nhân viên dùng tài khoản hiện có.'}`,
      );
      setStaffAccountId(res.accountId);
      setStaffAccountLabel(email);
      setNeedsPassword(res.credentialSetupRequired);
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
      const latestAssignments = await staffService.getEventAssignments(id);
      const previous = latestAssignments.find((item) => item.staffAccountId === staffId.trim());
      if (previous?.status === 'ACTIVE') {
        notify.info('Nhân viên này đã được phân công cho tiệc.');
        return;
      }
      const body = {
        bookingId: id,
        staffAccountId: staffId.trim(),
        expectedRevision: previous?.revision ?? 0,
      };
      await staffCommand(
        `${accountId}:${id}:assign:${staffId.trim()}:${body.expectedRevision}`,
        body,
        (key) => staffService.assignStaff(body, key),
      );
      notify.success('Phân công nhân sự vào tiệc thành công!');
      await handleLoadAssignments();
      form.reset();
      setStaffAccountId('');
      setStaffAccountLabel('');
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Phân công nhân sự thất bại.' });
    } finally {
      setPending(false);
    }
  };

  const handleRevokeAssignment = async (assignmentId: string, reason: string) => {
    const assignment = assignments.find((item) => item.assignmentId === assignmentId);
    if (!eventId || !assignment) return;
    if (reason.length < minReasonLength) return;
    setPending(true);
    try {
      await staffCommand(
        `${accountId}:${eventId}:revoke:${assignmentId}:${assignment.revision}`,
        { assignmentId, revision: assignment.revision, reason },
        (key) =>
          staffService.revokeAssignment(eventId, assignmentId, assignment.revision, reason, key),
      );
      notify.success('Đã thu hồi phân công nhân sự.');
      await handleLoadAssignments();
    } finally {
      setPending(false);
    }
  };

  const openTab = (tab: StaffTab) => {
    setActiveTab(tab);
  };

  return {
    eventContext,
    handleMoreGuests,
    hasMoreGuests: Boolean(
      result?.bookingId === eventId && result.query === searchQuery.trim() && result.nextCursor,
    ),
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
    staffAccountLabel,
    assignmentError,
    assignmentsReady:
      assignmentResult?.bookingId === eventId && assignmentResult.accountId === accountId,
    needsPassword,
    selectStaff: (id: string, label: string, setup: boolean) => {
      setStaffAccountId(id);
      setStaffAccountLabel(label);
      setNeedsPassword(setup);
    },
    handleSearchGuests,
    handleCheckIn,
    handleUndoCheckIn,
    handleLoadAssignments,
    handleProvisionStaff,
    handleAssignStaff,
    handleRevokeAssignment,
  };
}
