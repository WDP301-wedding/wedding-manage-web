'use client';

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

import { useManagementSession } from '../identity-access/use-management-session';

export function StaffOperationsPage({
  session = sharedManagementSession,
}: Readonly<{
  session?: ManagementIdentitySession;
}>) {
  const { snapshot, logout: handleLogout } = useManagementSession({ session });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tab: 'checkin' | 'management'
  const [activeTab, setActiveTab] = useState<'checkin' | 'management'>('checkin');

  // Booking & Check-in state
  const [bookingId, setBookingId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [guests, setGuests] = useState<readonly GuestSearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);

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
      setError('Vui lòng nhập mã tiệc (bookingId) để tìm khách.');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await staffService.searchGuests(bookingId.trim(), searchQuery.trim());
      setGuests(res.items);
      if (res.items.length === 0) {
        setMessage('Không tìm thấy khách mời nào phù hợp.');
      } else {
        setMessage(null);
      }
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể tra cứu khách mời. Vui lòng kiểm tra lại mã tiệc.');
      }
    } finally {
      setSearching(false);
    }
  };

  // Check-in
  const handleCheckIn = async (guestId: string) => {
    setPending(true);
    setError(null);
    try {
      await staffService.checkInGuest(bookingId.trim(), guestId);
      setMessage('Đã check-in thành công cho khách mời.');
      await handleSearchGuests();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Thao tác check-in thất bại.');
      }
    } finally {
      setPending(false);
    }
  };

  // Undo Check-in
  const handleUndoCheckIn = async (guestId: string) => {
    setPending(true);
    setError(null);
    try {
      await staffService.undoCheckIn(bookingId.trim(), guestId);
      setMessage('Đã hoàn tác check-in.');
      await handleSearchGuests();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Thao tác hoàn tác thất bại.');
      }
    } finally {
      setPending(false);
    }
  };

  // Load assignments (M6)
  const handleLoadAssignments = async () => {
    if (!bookingId.trim()) return;
    setLoadingAssignments(true);
    setError(null);
    try {
      const res = await staffService.getEventAssignments(bookingId.trim());
      setAssignments(res);
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      }
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Provision Staff
  const handleProvisionStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = data.get('email') as string;

    setPending(true);
    setError(null);
    try {
      const res = await staffService.provisionStaffAccount({ email });
      setMessage(
        `Đã tạo/tìm thấy tài khoản nhân viên ${email} (ID: ${res.accountId}). Bạn có thể phân công ngay bên dưới.`,
      );
      setStaffAccountId(res.accountId);
      form.reset();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể cấp tài khoản nhân viên.');
      }
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
      setError('Vui lòng nhập mã tiệc trước khi phân công.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      await staffService.assignStaff({
        bookingId: bookingId.trim(),
        staffAccountId: staffId,
        roleCode,
      });
      setMessage('Phân công nhân sự vào tiệc thành công!');
      await handleLoadAssignments();
      form.reset();
      setStaffAccountId('');
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Phân công nhân sự thất bại.');
      }
    } finally {
      setPending(false);
    }
  };

  // Revoke Assignment
  const handleRevokeAssignment = async (assignmentId: string) => {
    if (!bookingId.trim()) return;
    setPending(true);
    setError(null);
    try {
      await staffService.revokeAssignment(bookingId.trim(), assignmentId);
      setMessage('Đã thu hồi phân công nhân sự.');
      await handleLoadAssignments();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Thu hồi phân công thất bại.');
      }
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

        {/* Thông báo Alert */}
        {message ? (
          <div role="status" style={staffStyles.successBox}>
            {message}
          </div>
        ) : null}
        {error ? (
          <div role="alert" style={staffStyles.errorBox}>
            {error}
          </div>
        ) : null}

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
