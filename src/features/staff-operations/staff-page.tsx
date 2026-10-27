'use client';
import { useLiveRefresh } from '../realtime/use-live-refresh';

import { type FormEvent, useEffect, useState } from 'react';
import { OperationsShell } from '../identity-access/operations-shell';
import {
  type ManagementIdentitySession,
  sharedManagementSession,
} from '../identity-access/session';
import {
  staffService,
  type EventAssignmentItem,
  type GuestSearchResultItem,
} from '../../services/staff.service';
import { ApiServiceError } from '../../lib/api/axios-client';
import { staffStyles } from './staff.styles';
import { CheckinDeskSection } from './checkin-desk-section';
import { StaffManagementSection } from './staff-management-section';
import { notify } from '../../design-system/notifications';

import { useManagementSession } from '../identity-access/use-management-session';

export function StaffOperationsPage({
  session = sharedManagementSession,
}: Readonly<{
  session?: ManagementIdentitySession;
}>) {
  const { snapshot, logout: handleLogout } = useManagementSession({ session });
  const [pending, setPending] = useState(false);

  // Tab: 'checkin' | 'management'
  const [activeTab, setActiveTab] = useState<'checkin' | 'management'>('checkin');

  // Booking & Check-in state
  const [bookingId, setBookingId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [guests, setGuests] = useState<readonly GuestSearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Manager: Assignments & Provision
  const [assignments, setAssignments] = useState<readonly EventAssignmentItem[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [staffAccountId, setStaffAccountId] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const bId = params.get('bookingId');
      if (bId !== null && /^[a-f0-9-]{36}$/iu.test(bId)) {
        setBookingId(bId);
      }
    }
  }, []);

  const isManager = snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';

  // Search guests for check-in
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

  // Check-in
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

  // Undo Check-in
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

  // Load assignments (M6)
  const handleLoadAssignments = async () => {
    if (!bookingId.trim()) return;
    setLoadingAssignments(true);
    try {
      const res = await staffService.getEventAssignments(bookingId.trim());
      setAssignments(res);
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
      enabled: Boolean(bookingId.trim()) && snapshot?.status === 'authenticated',
      blocked: pending || searching || loadingAssignments,
      types: ['guest.updated', 'booking.updated'],
    },
  );

  // Provision Staff
  const handleProvisionStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get('email') as string;

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

  // Assign Staff
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

  // Revoke Assignment
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

  return (
    <OperationsShell
      activePage="staff"
      contentId="staff-content"
      snapshot={snapshot}
      onLogout={handleLogout}
      pending={pending}
    >
      <main
        className="staff-shell"
        id="staff-content"
        style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}
      >
        <header style={{ marginBottom: '2rem' }}>
          <p className="section-kicker">Operations &amp; Hospitality</p>
          <h1>Nhân sự &amp; Tác nghiệp</h1>
          <p>
            Đón tiếp và xác nhận khách mời tại sảnh cưới (Check-in), phân công nhân sự và điều phối
            vận hành.
          </p>
        </header>

        {/* Tab Switcher cho Manager */}
        {isManager ? (
          <div role="tablist" aria-label="Phân hệ nhân sự" style={staffStyles.tabContainer}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'checkin'}
              className={`catalog-tab-button ${activeTab === 'checkin' ? 'active' : ''}`}
              style={staffStyles.tabButton(activeTab === 'checkin')}
              onClick={() => setActiveTab('checkin')}
            >
              Đón khách &amp; Check-in (S1 · S2)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'management'}
              className={`catalog-tab-button ${activeTab === 'management' ? 'active' : ''}`}
              style={staffStyles.tabButton(activeTab === 'management')}
              onClick={() => {
                setActiveTab('management');
                if (bookingId.trim()) void handleLoadAssignments();
              }}
            >
              Quản lý tài khoản &amp; Phân công (M6)
            </button>
          </div>
        ) : null}

        {/* SECTION 1: Check-in Desk (S1 & S2) */}
        {activeTab === 'checkin' ? (
          <CheckinDeskSection
            bookingId={bookingId}
            setBookingId={setBookingId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searching={searching}
            pending={pending}
            guests={guests}
            onSearchGuests={handleSearchGuests}
            onCheckIn={handleCheckIn}
            onUndoCheckIn={handleUndoCheckIn}
          />
        ) : null}

        {/* SECTION 2: Manager Admin (M6) */}
        {isManager && activeTab === 'management' ? (
          <StaffManagementSection
            bookingId={bookingId}
            staffAccountId={staffAccountId}
            setStaffAccountId={setStaffAccountId}
            pending={pending}
            assignments={assignments}
            loadingAssignments={loadingAssignments}
            onLoadAssignments={handleLoadAssignments}
            onProvisionStaff={handleProvisionStaff}
            onAssignStaff={handleAssignStaff}
            onRevokeAssignment={handleRevokeAssignment}
          />
        ) : null}
      </main>
    </OperationsShell>
  );
}
