import { type FormEvent, useEffect, useState } from 'react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import {
  staffService,
  type EventAssignmentItem,
  type GuestSearchResultItem,
} from '../../services/staff.service';
import { notify } from '../../design-system/notifications';

export type StaffTab = 'checkin' | 'management';

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
  const [staffAccountId, setStaffAccountId] = useState('');

  useEffect(() => {
    const bId = new URLSearchParams(window.location.search).get('bookingId');
    if (bId !== null && /^[a-f0-9-]{36}$/iu.test(bId)) {
      setBookingId(bId);
    }
  }, []);

  const handleSearchGuests = async (event?: FormEvent) => {
    if (event) event.preventDefault();
    if (!bookingId.trim()) {
      notify.warning('Vui lòng nhập mã tiệc (bookingId) để tìm khách.');
      return;
    }
    setSearching(true);
    try {
      const res = await staffService.searchGuests(bookingId.trim(), searchQuery.trim());
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
    setPending(true);
    try {
      await staffService.checkInGuest(bookingId.trim(), guestId);
      notify.success('Đã check-in thành công cho khách mời.');
      await handleSearchGuests();
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Thao tác check-in thất bại.' });
    } finally {
      setPending(false);
    }
  };

  const handleUndoCheckIn = async (guestId: string) => {
    setPending(true);
    try {
      await staffService.undoCheckIn(bookingId.trim(), guestId);
      notify.success('Đã hoàn tác check-in.');
      await handleSearchGuests();
    } catch (err) {
      notify.error(err, { fallbackMessage: 'Thao tác hoàn tác thất bại.' });
    } finally {
      setPending(false);
    }
  };

  const handleLoadAssignments = async () => {
    if (!bookingId.trim()) return;
    setLoadingAssignments(true);
    try {
      setAssignments(await staffService.getEventAssignments(bookingId.trim()));
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
          const res = await staffService.searchGuests(bookingId.trim(), searchQuery.trim());
          if (isCurrent()) setGuests(res.items);
        } else if (activeTab === 'management' && isManager) {
          const res = await staffService.getEventAssignments(bookingId.trim());
          if (isCurrent()) setAssignments(res);
        }
      } catch (err) {
        if (isCurrent()) notify.error(err);
      }
    },
    {
      scope: bookingId + ':' + activeTab + ':' + searchQuery,
      bookingId: bookingId.trim(),
      enabled: Boolean(bookingId.trim()) && authenticated,
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
    const roleCode = data.get('roleCode') as 'CHECK_IN' | 'COORDINATOR' | 'GENERAL_SUPPORT';

    if (!bookingId.trim()) {
      notify.warning('Vui lòng nhập mã tiệc trước khi phân công.');
      return;
    }

    setPending(true);
    try {
      await staffService.assignStaff({
        bookingId: bookingId.trim(),
        staffAccountId: staffId,
        roleCode,
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
    if (!bookingId.trim()) return;
    setPending(true);
    try {
      await staffService.revokeAssignment(bookingId.trim(), assignmentId);
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
    if (tab === 'management' && bookingId.trim()) void handleLoadAssignments();
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
    handleSearchGuests,
    handleCheckIn,
    handleUndoCheckIn,
    handleLoadAssignments,
    handleProvisionStaff,
    handleAssignStaff,
    handleRevokeAssignment,
  };
}
