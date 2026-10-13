'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { OperationsShell } from '../identity-access/operations-shell';
import {
  createIdentityApi,
  ManagementIdentitySession,
  type ManagementSessionSnapshot,
} from '../identity-access/session';
import {
  staffService,
  type EventAssignmentItem,
  type GuestSearchResultItem,
} from '../../services/staff.service';
import { ApiServiceError } from '../../lib/api/axios-client';

const identity = new ManagementIdentitySession(createIdentityApi());

export function StaffOperationsPage({
  session = identity,
}: Readonly<{
  session?: ManagementIdentitySession;
}>) {
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
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

  useEffect(() => {
    let active = true;
    void session.restore().then((snap) => {
      if (active) setSnapshot(snap);
    });
    return () => {
      active = false;
    };
  }, [session]);

  const isManager =
    snapshot?.status === 'authenticated' && snapshot.presentation === 'manager';

  const handleLogout = () => {
    void session.logout().then(() => {
      setSnapshot(session.snapshot());
    });
  };

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
        setError('Không thể tìm kiếm khách mời.');
      }
    } finally {
      setSearching(false);
    }
  };

  // Handle single guest check-in
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
        setError('Không thể thực hiện check-in.');
      }
    } finally {
      setPending(false);
    }
  };

  // Handle undo check-in
  const handleUndoCheckIn = async (guestId: string) => {
    setPending(true);
    setError(null);
    try {
      await staffService.undoCheckIn(bookingId.trim(), guestId);
      setMessage('Đã hoàn tác check-in thành công.');
      await handleSearchGuests();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể hoàn tác check-in.');
      }
    } finally {
      setPending(false);
    }
  };

  // Load assignments for booking (Manager only)
  const handleLoadAssignments = async () => {
    if (!bookingId.trim()) return;
    setLoadingAssignments(true);
    setError(null);
    try {
      const items = await staffService.getEventAssignments(bookingId.trim());
      setAssignments(items);
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể tải danh sách phân công tiệc.');
      }
    } finally {
      setLoadingAssignments(false);
    }
  };

  // Provision Staff Account
  const handleProvisionStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();
    const displayName = String(data.get('displayName') || '').trim();
    const phone = String(data.get('phone') || '').trim();

    setPending(true);
    setError(null);
    try {
      await staffService.provisionStaffAccount({
        email,
        displayName,
        ...(phone ? { phone } : {}),
      });
      setMessage(`Đã cấp tài khoản nhân sự cho ${displayName} (${email}).`);
      form.reset();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể cấp tài khoản nhân sự.');
      }
    } finally {
      setPending(false);
    }
  };

  // Assign staff to event
  const handleAssignStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const staffAccountId = String(data.get('staffAccountId') || '').trim();
    const roleCode = String(data.get('roleCode') || 'CHECK_IN') as
      | 'CHECK_IN'
      | 'COORDINATOR'
      | 'GENERAL_SUPPORT';

    setPending(true);
    setError(null);
    try {
      await staffService.assignStaff({
        bookingId: bookingId.trim(),
        staffAccountId,
        roleCode,
      });
      setMessage('Đã phân công nhân sự vào tiệc.');
      form.reset();
      await handleLoadAssignments();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể phân công nhân sự.');
      }
    } finally {
      setPending(false);
    }
  };

  // Revoke assignment
  const handleRevokeAssignment = async (assignmentId: string) => {
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
        setError('Không thể thu hồi phân công.');
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
      <main className="staff-shell" id="staff-content" style={{ padding: '2rem 1.5rem', maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ marginBottom: '2rem' }}>
          <p className="section-kicker">Operations &amp; Hospitality</p>
          <h1>Nhân sự &amp; Tác nghiệp</h1>
          <p>
            Đón tiếp và xác nhận khách mời tại sảnh cưới (Check-in), phân công nhân sự và điều phối vận hành.
          </p>
        </header>

        {/* Global Feedback Notifications */}
        <div aria-live="polite" style={{ marginBottom: '1.5rem' }}>
          {message ? (
            <div className="booking-live" role="status" style={{ background: '#ecfdf5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem' }}>
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="booking-error" role="alert" style={{ background: '#fef2f2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1rem' }}>
              {error}
            </div>
          ) : null}
        </div>

        {/* Navigation Tabs for Manager */}
        {isManager ? (
          <div className="catalog-tabs" role="tablist" style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'checkin'}
              className={`catalog-tab-button ${activeTab === 'checkin' ? 'active' : ''}`}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: 6,
                fontWeight: 600,
                border: '1px solid #d1d5db',
                background: activeTab === 'checkin' ? '#111827' : '#fff',
                color: activeTab === 'checkin' ? '#fff' : '#374151',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('checkin')}
            >
              Đón khách &amp; Check-in (S1 · S2)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'management'}
              className={`catalog-tab-button ${activeTab === 'management' ? 'active' : ''}`}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: 6,
                fontWeight: 600,
                border: '1px solid #d1d5db',
                background: activeTab === 'management' ? '#111827' : '#fff',
                color: activeTab === 'management' ? '#fff' : '#374151',
                cursor: 'pointer',
              }}
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
          <section aria-labelledby="checkin-desk-title">
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
              <h2 id="checkin-desk-title" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                Bàn đón tiếp &amp; Tra cứu khách mời
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                Nhập mã tiệc (bookingId) để tải dữ liệu khách mời. Tra cứu nhanh theo họ tên hoặc số điện thoại.
              </p>

              <form onSubmit={handleSearchGuests} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr)) auto', gap: '1rem', alignItems: 'flex-end' }}>
                <div>
                  <label htmlFor="staff-booking-id" style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                    Mã tiệc (Booking ID)
                  </label>
                  <input
                    id="staff-booking-id"
                    type="text"
                    required
                    placeholder="VD: cd0b75ab-6256-427e-9b37-777f8b9c2822"
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 6, border: '1px solid #d1d5db' }}
                  />
                </div>

                <div>
                  <label htmlFor="staff-search-query" style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                    Họ tên hoặc SĐT khách
                  </label>
                  <input
                    id="staff-search-query"
                    type="text"
                    placeholder="Nhập tên khách mời hoặc số điện thoại"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem', borderRadius: 6, border: '1px solid #d1d5db' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={searching || !bookingId.trim()}
                  style={{
                    padding: '0.625rem 1.5rem',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: searching ? 'not-allowed' : 'pointer',
                    height: '42px',
                  }}
                >
                  {searching ? 'Đang tìm…' : 'Tra cứu khách'}
                </button>
              </form>
            </div>

            {/* Results Table with Large High-Contrast Buttons (S1/S2 requirement) */}
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>
                Danh sách kết quả tra cứu ({guests.length})
              </h3>

              {guests.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', background: '#fff', border: '1px dashed #d1d5db', borderRadius: 8 }}>
                  <p style={{ color: '#6b7280' }}>
                    Chưa có khách mời nào được hiển thị. Hãy nhập mã tiệc và bấm tra cứu.
                  </p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table aria-label="Danh sách khách mời check-in" style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '0.875rem 1rem' }}>Họ và tên</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Số đuôi SĐT</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Nhóm khách</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Bàn gợi ý</th>
                        <th style={{ padding: '0.875rem 1rem' }}>Trạng thái</th>
                        <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Thao tác tác nghiệp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guests.map((g) => {
                        const isCheckedIn = g.checkedIn;
                        return (
                          <tr key={g.guestId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '1rem', fontWeight: 600 }}>{g.name}</td>
                            <td style={{ padding: '1rem', color: '#4b5563' }}>
                              {g.phoneLast4 ? `…${g.phoneLast4}` : '—'}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{ display: 'inline-block', padding: '0.25rem 0.625rem', borderRadius: 9999, fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3' }}>
                                {g.groupName || 'Chung'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', fontWeight: 600, color: '#1e40af' }}>
                              {g.tableLabels && g.tableLabels.length > 0
                                ? g.tableLabels.join(', ')
                                : 'Chưa xếp bàn'}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.625rem',
                                  borderRadius: 9999,
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: isCheckedIn ? '#d1fae5' : '#fef3c7',
                                  color: isCheckedIn ? '#065f46' : '#92400e',
                                }}
                              >
                                {isCheckedIn ? 'Đã check-in' : 'Chưa đến'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                              {!isCheckedIn ? (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => void handleCheckIn(g.guestId)}
                                  style={{
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 8,
                                    cursor: pending ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  }}
                                  aria-label={`Check-in cho khách ${g.name}`}
                                >
                                  Check-in ngay
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => void handleUndoCheckIn(g.guestId)}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #f87171',
                                    borderRadius: 6,
                                    cursor: pending ? 'not-allowed' : 'pointer',
                                  }}
                                  aria-label={`Hoàn tác check-in cho khách ${g.name}`}
                                >
                                  Hoàn tác
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* SECTION 2: Manager Admin (M6) */}
        {isManager && activeTab === 'management' ? (
          <section aria-labelledby="staff-admin-title">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              {/* Form 1: Cấp tài khoản nhân sự */}
              <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Cấp tài khoản Staff mới</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  Tạo tài khoản nhân viên vận hành sảnh để phân công công việc.
                </p>

                <form onSubmit={handleProvisionStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Email nhân viên
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="staff.name@example.com"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Họ và tên hiển thị
                    </label>
                    <input
                      name="displayName"
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Số điện thoại (tuỳ chọn)
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      placeholder="0901234567"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pending}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.625rem',
                      background: '#111827',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: pending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cấp tài khoản
                  </button>
                </form>
              </div>

              {/* Form 2: Phân công tiệc */}
              <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Phân công nhân sự vào tiệc</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                  Giao quyền đón khách hoặc điều phối tiệc cho nhân viên.
                </p>

                <form onSubmit={handleAssignStaff} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Mã tài khoản nhân sự (staffAccountId)
                    </label>
                    <input
                      name="staffAccountId"
                      type="text"
                      required
                      placeholder="UUID tài khoản nhân viên"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Vai trò phân công
                    </label>
                    <select
                      name="roleCode"
                      defaultValue="CHECK_IN"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db' }}
                    >
                      <option value="CHECK_IN">Đón khách &amp; Check-in (CHECK_IN)</option>
                      <option value="COORDINATOR">Điều phối chương trình (COORDINATOR)</option>
                      <option value="GENERAL_SUPPORT">Hỗ trợ chung (GENERAL_SUPPORT)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={pending || !bookingId.trim()}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.625rem',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: pending || !bookingId.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Phân công vào tiệc hiện tại
                  </button>
                </form>
              </div>
            </div>

            {/* Bảng phân công hiện tại của booking */}
            <div style={{ marginTop: '2rem', background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.125rem' }}>Danh sách phân công của tiệc ({assignments.length})</h3>
                <button
                  type="button"
                  disabled={loadingAssignments || !bookingId.trim()}
                  onClick={() => void handleLoadAssignments()}
                  style={{ padding: '0.375rem 0.75rem', borderRadius: 4, border: '1px solid #d1d5db', cursor: 'pointer', background: '#f9fafb' }}
                >
                  {loadingAssignments ? 'Đang tải…' : 'Làm mới'}
                </button>
              </div>

              {assignments.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  Chưa có nhân sự nào được phân công cho tiệc này.
                </p>
              ) : (
                <div className="table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '0.75rem' }}>Mã nhân viên (Account ID)</th>
                        <th style={{ padding: '0.75rem' }}>Trạng thái</th>
                        <th style={{ padding: '0.75rem' }}>Phiên bản (Revision)</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((item) => (
                        <tr key={item.assignmentId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <code>{item.staffAccountId}</code>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.5rem',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: item.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                                color: item.status === 'ACTIVE' ? '#065f46' : '#991b1b',
                              }}
                            >
                              {item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã thu hồi'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            REV {item.revision}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            {item.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => void handleRevokeAssignment(item.assignmentId)}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  color: '#b91c1c',
                                  border: '1px solid #fca5a5',
                                  background: '#fef2f2',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                }}
                              >
                                Thu hồi
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </OperationsShell>
  );
}
