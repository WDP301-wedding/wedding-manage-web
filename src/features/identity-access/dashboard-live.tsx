'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { consultationService, type ConsultationRequestItem } from '../../services/consultation.service';
import { catalogService, type PublicHall, type PublicRestaurant } from '../../services/catalog.service';
import { analyticsService, type AnalyticsOverviewData, type AnalyticsBookingsData } from '../../services/analytics.service';
import { ApiServiceError } from '../../lib/api/axios-client';

export type DashboardState = 'loading' | 'error' | 'success';
export type DashboardBookingItem = AnalyticsBookingsData['items'][number];

export interface DashboardData {
  readonly restaurant: PublicRestaurant | null;
  readonly halls: readonly PublicHall[];
  readonly consultations: readonly ConsultationRequestItem[];
  readonly bookings: readonly DashboardBookingItem[];
  readonly analytics: AnalyticsOverviewData | null;
}

function formatVnd(amount: number | null): string {
  if (amount === null || amount === undefined) return 'Chưa ghi nhận';
  return `${amount.toLocaleString('vi-VN')} đ`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Sao chép mã UUID"
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '4px',
        background: '#ffffff',
        cursor: 'pointer',
        fontSize: '0.72rem',
        color: copied ? '#15803d' : '#4b5563',
        padding: '1px 6px',
        marginLeft: '4px',
        lineHeight: '1.2',
      }}
      onClick={() => {
        void navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? '✓ Đã chép' : 'Sao chép'}
    </button>
  );
}

export interface BookingAssignment {
  readonly bookingId: string;
  readonly assignedAccountId: string;
  readonly assignedEmail: string;
  readonly assignedAt: string;
}

export type BookingAssignmentsRegistry = Record<string, BookingAssignment>;

export const BOOKING_ASSIGNMENTS_REGISTRY_KEY = 'wedding_booking_assignments_registry';

export function resolveCurrentAccountId(providedId?: string): string {
  if (providedId && providedId.trim()) return providedId.trim();
  if (typeof window === 'undefined') return 'default';
  try {
    const raw = window.localStorage.getItem('wedding_ops_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.actor?.accountId) return String(parsed.actor.accountId);
    }
  } catch {}
  return 'default';
}

export function resolveCurrentAccountEmail(providedEmail?: string): string {
  if (providedEmail && providedEmail.trim()) return providedEmail.trim();
  if (typeof window === 'undefined') return 'Quản lý';
  try {
    const raw = window.localStorage.getItem('wedding_ops_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.actor?.displayEmail) return String(parsed.actor.displayEmail);
    }
  } catch {}
  return 'Quản lý';
}

export function getBookingAssignments(): BookingAssignmentsRegistry {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(BOOKING_ASSIGNMENTS_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBookingAssignments(registry: BookingAssignmentsRegistry): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(BOOKING_ASSIGNMENTS_REGISTRY_KEY, JSON.stringify(registry));
    window.dispatchEvent(new CustomEvent('wedding_assignments_updated', { detail: registry }));
  } catch {}
}

export function claimBookingAssignment(
  bookingId: string,
  accountId?: string,
  email?: string
): { success: boolean; existingAssignment?: BookingAssignment } {
  const currentId = resolveCurrentAccountId(accountId);
  const currentEmail = resolveCurrentAccountEmail(email);
  const assignments = getBookingAssignments();
  const existing = assignments[bookingId];

  // If already claimed by another manager, block!
  if (existing && existing.assignedAccountId !== currentId) {
    return { success: false, existingAssignment: existing };
  }

  const updated: BookingAssignmentsRegistry = {
    ...assignments,
    [bookingId]: {
      bookingId,
      assignedAccountId: currentId,
      assignedEmail: currentEmail,
      assignedAt: existing?.assignedAt || new Date().toISOString(),
    },
  };
  saveBookingAssignments(updated);
  return { success: true };
}

export function releaseBookingAssignment(
  bookingId: string,
  accountId?: string
): { success: boolean } {
  const currentId = resolveCurrentAccountId(accountId);
  const assignments = getBookingAssignments();
  const existing = assignments[bookingId];

  if (!existing) {
    return { success: true };
  }

  // Only the assigned manager can release the booking
  if (existing.assignedAccountId !== currentId) {
    return { success: false };
  }

  const updated = { ...assignments };
  delete updated[bookingId];
  saveBookingAssignments(updated);
  return { success: true };
}

export function getMyManagedBookingsKey(accountId?: string): string {
  const id = resolveCurrentAccountId(accountId);
  return `wedding_my_managed_bookings_${id}`;
}

export function getMyManagedBookingIds(accountId?: string): string[] {
  if (typeof window === 'undefined') return [];
  const currentId = resolveCurrentAccountId(accountId);
  const assignments = getBookingAssignments();

  // Backward compatibility: migrate legacy array into registry if present
  try {
    window.localStorage.removeItem('wedding_my_managed_booking_ids');
    const legacyKey = getMyManagedBookingsKey(accountId);
    const raw = window.localStorage.getItem(legacyKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        let changed = false;
        const currentEmail = resolveCurrentAccountEmail();
        for (const id of parsed) {
          if (typeof id === 'string' && !assignments[id]) {
            assignments[id] = {
              bookingId: id,
              assignedAccountId: currentId,
              assignedEmail: currentEmail,
              assignedAt: new Date().toISOString(),
            };
            changed = true;
          }
        }
        if (changed) {
          saveBookingAssignments(assignments);
        }
      }
    }
  } catch {}

  return Object.values(assignments)
    .filter((a) => a.assignedAccountId === currentId)
    .map((a) => a.bookingId);
}

export function saveMyManagedBookingIds(ids: string[], accountId?: string): void {
  const currentId = resolveCurrentAccountId(accountId);
  const currentEmail = resolveCurrentAccountEmail();
  const assignments = getBookingAssignments();
  const updated: BookingAssignmentsRegistry = { ...assignments };

  for (const [bId, item] of Object.entries(updated)) {
    if (item.assignedAccountId === currentId && !ids.includes(bId)) {
      delete updated[bId];
    }
  }
  for (const id of ids) {
    if (!updated[id]) {
      updated[id] = {
        bookingId: id,
        assignedAccountId: currentId,
        assignedEmail: currentEmail,
        assignedAt: new Date().toISOString(),
      };
    }
  }
  saveBookingAssignments(updated);
}

export function addMyManagedBookingId(id: string, accountId?: string, email?: string): void {
  claimBookingAssignment(id, accountId, email);
}

export function removeMyManagedBookingId(id: string, accountId?: string): void {
  releaseBookingAssignment(id, accountId);
}

export function DashboardLiveView({
  isManager,
  currentAccountId,
  currentEmail,
}: Readonly<{
  isManager: boolean;
  currentAccountId?: string;
  currentEmail?: string;
}>) {
  const [state, setState] = useState<DashboardState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    restaurant: null,
    halls: [],
    consultations: [],
    bookings: [],
    analytics: null,
  });
  const [userSelectedTab, setUserSelectedTab] = useState<'mine' | 'all' | null>(null);
  const [assignments, setAssignments] = useState<BookingAssignmentsRegistry>(() => getBookingAssignments());
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lockNotice, setLockNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    message: string;
  } | null>(null);

  const resolvedAccountId = resolveCurrentAccountId(currentAccountId);
  const resolvedEmail = resolveCurrentAccountEmail(currentEmail);

  useEffect(() => {
    const handleSync = () => {
      setAssignments(getBookingAssignments());
    };
    handleSync();

    window.addEventListener('storage', handleSync);
    window.addEventListener('wedding_assignments_updated', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('wedding_assignments_updated', handleSync);
    };
  }, [currentAccountId]);

  const handleClaim = (bookingId: string, hallName?: string) => {
    const result = claimBookingAssignment(bookingId, resolvedAccountId, resolvedEmail);
    if (result.success) {
      setLockNotice({
        type: 'success',
        message: `✓ Bạn đã tiếp nhận tiệc ${hallName || ''} (${bookingId.slice(0, 8)}…). Tiệc này đã được khóa cho tài khoản của bạn.`,
      });
      setAssignments(getBookingAssignments());
    } else {
      setLockNotice({
        type: 'warning',
        message: `🔒 Tiệc này đã được ${result.existingAssignment?.assignedEmail || 'quản lý khác'} tiếp nhận và khóa. Bạn không thể nhận trùng tiệc.`,
      });
      setAssignments(getBookingAssignments());
    }
  };

  const handleRelease = (bookingId: string, hallName?: string) => {
    const result = releaseBookingAssignment(bookingId, resolvedAccountId);
    if (result.success) {
      setLockNotice({
        type: 'info',
        message: `ℹ Đã hủy nhận tiệc ${hallName || ''} (${bookingId.slice(0, 8)}…). Tiệc đã được mở khóa để các quản lý khác có thể tiếp nhận.`,
      });
      setAssignments(getBookingAssignments());
    } else {
      setLockNotice({
        type: 'warning',
        message: `⚠ Bạn không thể hủy tiệc do tài khoản khác đang phụ trách.`,
      });
    }
  };

  const fetchData = useCallback(async () => {
    setState('loading');
    setErrorMessage(null);

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
      const dateFrom = `${currentYear}-${currentMonth}-01`;
      const dateTo = `${currentYear}-${currentMonth}-31`;

      const bookingStart = new Date(now);
      bookingStart.setDate(bookingStart.getDate() - 7);
      const bookingEnd = new Date(now);
      bookingEnd.setDate(bookingEnd.getDate() + 350);
      const bookingDateFrom = bookingStart.toISOString().slice(0, 10);
      const bookingDateTo = bookingEnd.toISOString().slice(0, 10);

      const [restaurantRes, hallsRes, consultationsRes, analyticsRes, bookingsRes] = await Promise.allSettled([
        catalogService.getRestaurant(),
        catalogService.getPublicHalls(),
        isManager ? consultationService.getConsultationRequests({ limit: 10 }) : Promise.resolve(null),
        isManager ? analyticsService.getOverview({ dateFrom, dateTo }) : Promise.resolve(null),
        isManager
          ? analyticsService.getBookings({ dateFrom: bookingDateFrom, dateTo: bookingDateTo, pageSize: 50 })
          : Promise.resolve(null),
      ]);

      const restaurant =
        restaurantRes.status === 'fulfilled' ? restaurantRes.value : null;
      const halls = hallsRes.status === 'fulfilled' ? hallsRes.value : [];
      const consultations =
        consultationsRes.status === 'fulfilled' && consultationsRes.value
          ? consultationsRes.value.data
          : [];
      const analytics =
        analyticsRes.status === 'fulfilled' && analyticsRes.value
          ? analyticsRes.value
          : null;
      const bookings =
        bookingsRes.status === 'fulfilled' && bookingsRes.value
          ? bookingsRes.value.items
          : [];

      setData({ restaurant, halls, consultations, bookings, analytics });
      setState('success');
    } catch (error) {
      if (error instanceof ApiServiceError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể tải dữ liệu tổng quan. Vui lòng thử lại.');
      }
      setState('error');
    }
  }, [isManager]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const pendingConsultations = data.consultations.filter(
    (c) => c.status === 'NEW',
  );

  const isMine = useCallback(
    (bId: string) => assignments[bId]?.assignedAccountId === resolvedAccountId,
    [assignments, resolvedAccountId]
  );

  const myBookings = data.bookings.filter((b) => isMine(b.bookingId));
  const myBookingsCount = myBookings.length;
  const bookingTab = userSelectedTab ?? (myBookingsCount > 0 ? 'mine' : 'all');
  const setBookingTab = (tab: 'mine' | 'all') => setUserSelectedTab(tab);

  const currentTabBookings = bookingTab === 'mine' ? myBookings : data.bookings;

  const filteredBookings = currentTabBookings.filter((b) => {
    if (phaseFilter !== 'ALL' && b.phase !== phaseFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const hallMatch = (b.hallNameSnapshot || '').toLowerCase().includes(q);
      const idMatch = b.bookingId.toLowerCase().includes(q);
      const emailMatch = (assignments[b.bookingId]?.assignedEmail || '').toLowerCase().includes(q);
      return hallMatch || idMatch || emailMatch;
    }
    return true;
  });

  const PHASE_LABELS: Record<string, string> = {
    DRAFT: 'Bản nháp',
    AWAITING_DEPOSIT: 'Chờ cọc',
    CONFIRMED: 'Đã xác nhận',
    COMPLETED: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
  };

  return (
    <div className="dashboard-live-container">
      {/* State: Error with Retry */}
      {state === 'error' && errorMessage ? (
        <div className="booking-error" role="alert" style={{ margin: '1rem 0' }}>
          <strong>Lỗi kết nối máy chủ</strong>
          <p>{errorMessage}</p>
          <button type="button" onClick={() => void fetchData()} className="text-button">
            Thử tải lại
          </button>
        </div>
      ) : null}

      {/* Hero Showcase của Nhà Hàng */}
      <section className="estate-showcase" aria-labelledby="estate-showcase-title">
        <div className="estate-showcase-content">
          <span className="estate-badge">Trung tâm tiệc cưới &amp; Sự kiện</span>
          <h2 id="estate-showcase-title">
            {data.restaurant?.displayName || 'Wedding Estate'}
          </h2>
          <p className="estate-tagline">
            {data.restaurant?.description ||
              'Nơi khởi đầu cho hạnh phúc vẹn tròn · Vận hành tiêu chuẩn cao cấp'}
          </p>
          <div className="estate-meta">
            <span>
              <strong>Địa chỉ:</strong>{' '}
              {data.restaurant?.address || 'Khu đô thị công nghệ cao, TP. Hồ Chí Minh'}
            </span>
            <span>
              <strong>Liên hệ:</strong>{' '}
              {data.restaurant?.publicEmail || 'contact@example.com'}
            </span>
          </div>
        </div>
        <div
          className="estate-showcase-photo"
          role="img"
          aria-label="Bàn tiệc cưới với hoa trắng"
        />
      </section>

      {/* Dải chỉ số KPI */}
      <section className="metrics-strip" aria-label="Chỉ số vận hành">
        <Metric
          label="Không gian sẵn sàng"
          value={state === 'loading' ? '—' : String(data.halls.length).padStart(2, '0')}
          detail={state === 'loading' ? 'Đang đồng bộ…' : `${data.halls.length} sảnh tiệc trong danh mục`}
        />
        <Metric
          label="Yêu cầu tư vấn"
          value={state === 'loading' ? '—' : String(data.consultations.length).padStart(2, '0')}
          detail={
            state === 'loading'
              ? 'Đang đồng bộ…'
              : pendingConsultations.length > 0
                ? `${pendingConsultations.length} yêu cầu chờ xử lý`
                : 'Đã hoàn tất xử lý'
          }
          attention={pendingConsultations.length > 0}
        />
        {isManager ? (
          <>
            <Metric
              label="Tiền thực nhận tháng này"
              value={state === 'loading' || !data.analytics ? '—' : formatVnd(data.analytics.netCashRevenueVnd)}
              detail={state === 'loading' ? 'Đang tổng hợp sổ cái…' : 'Thực thu tiền mặt/chuyển khoản (VND)'}
            />
            <Metric
              label="Tổng cọc đã thu"
              value={state === 'loading' || !data.analytics ? '—' : formatVnd(data.analytics.grossCashReceivedVnd)}
              detail={
                state === 'loading'
                  ? 'Đang tính toán…'
                  : data.analytics?.meta.refreshedAt
                    ? `Độ mới: ${new Date(data.analytics.meta.refreshedAt).toLocaleTimeString('vi-VN')}`
                    : 'Sổ cái đã chốt'
              }
            />
          </>
        ) : (
          <Metric
            label="Ca phục vụ"
            value={state === 'loading' ? '—' : String(data.restaurant?.shifts?.length || 2).padStart(2, '0')}
            detail="Ca trưa & ca tối cố định"
          />
        )}
      </section>

      {/* Lịch tiệc & Sự kiện đã đặt */}
      {isManager ? (
        <section className="schedule-panel dashboard-schedule" id="booked-events" style={{ marginBottom: '2.5rem' }}>
          <div className="section-heading" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
            <div>
              <p className="section-kicker">Vận hành tiệc cưới</p>
              <h2>
                Lịch tiệc &amp; Sự kiện đã đặt ({state === 'loading' ? '…' : bookingTab === 'mine' ? myBookingsCount : data.bookings.length})
              </h2>
            </div>
            <Link className="text-button" href="/bookings">
              + Tạo đặt tiệc mới
            </Link>
          </div>

          {/* Thông báo tiếp nhận & khóa tiệc */}
          {lockNotice ? (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                borderRadius: '6px',
                margin: '0.75rem 0',
                fontSize: '0.85rem',
                lineHeight: 1.4,
                background:
                  lockNotice.type === 'success'
                    ? '#f0fdf4'
                    : lockNotice.type === 'warning'
                      ? '#fffbeb'
                      : '#f8fafc',
                border: `1px solid ${
                  lockNotice.type === 'success'
                    ? '#86efac'
                    : lockNotice.type === 'warning'
                      ? '#fcd34d'
                      : '#cbd5e1'
                }`,
                color:
                  lockNotice.type === 'success'
                    ? '#166534'
                    : lockNotice.type === 'warning'
                      ? '#92400e'
                      : '#334155',
              }}
            >
              <span>{lockNotice.message}</span>
              <button
                type="button"
                onClick={() => setLockNotice(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'inherit',
                  marginLeft: '8px',
                }}
              >
                ✕
              </button>
            </div>
          ) : null}

          {/* Bộ lọc chuyển tab & tìm kiếm */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              margin: '1.25rem 0 1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {/* Tab Switcher */}
            <div
              role="tablist"
              aria-label="Phân loại lịch tiệc"
              style={{
                display: 'inline-flex',
                gap: '0.375rem',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                role="tab"
                id="tab-my-bookings"
                aria-selected={bookingTab === 'mine'}
                onClick={() => setBookingTab('mine')}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  fontWeight: bookingTab === 'mine' ? 600 : 500,
                  cursor: 'pointer',
                  background: bookingTab === 'mine' ? '#ffffff' : 'transparent',
                  color: bookingTab === 'mine' ? '#1e293b' : '#64748b',
                  boxShadow: bookingTab === 'mine' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Tiệc của tôi</span>
                <span
                  style={{
                    background: bookingTab === 'mine' ? '#15803d' : '#cbd5e1',
                    color: bookingTab === 'mine' ? '#ffffff' : '#475569',
                    borderRadius: '999px',
                    padding: '1px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  {myBookingsCount}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                id="tab-all-bookings"
                aria-selected={bookingTab === 'all'}
                onClick={() => setBookingTab('all')}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.85rem',
                  fontWeight: bookingTab === 'all' ? 600 : 500,
                  cursor: 'pointer',
                  background: bookingTab === 'all' ? '#ffffff' : 'transparent',
                  color: bookingTab === 'all' ? '#1e293b' : '#64748b',
                  boxShadow: bookingTab === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Tất cả tiệc nhà hàng</span>
                <span
                  style={{
                    background: bookingTab === 'all' ? '#334537' : '#cbd5e1',
                    color: bookingTab === 'all' ? '#ffffff' : '#475569',
                    borderRadius: '999px',
                    padding: '1px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  {state === 'loading' ? '…' : data.bookings.length}
                </span>
              </button>
            </div>

            {/* Quick Filter: Search + Status */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="search"
                placeholder="Tìm sảnh tiệc, UUID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Tìm kiếm tiệc cưới"
                style={{
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  minWidth: '170px',
                  background: '#ffffff',
                }}
              />
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                aria-label="Lọc theo trạng thái tiệc"
                style={{
                  padding: '5px 8px',
                  fontSize: '0.8rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  background: '#ffffff',
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="AWAITING_DEPOSIT">Chờ cọc</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          </div>

          {state === 'loading' ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#5d665f' }}>
              <p>Đang đồng bộ danh sách tiệc cưới từ máy chủ…</p>
            </div>
          ) : currentTabBookings.length === 0 ? (
            bookingTab === 'mine' ? (
              <div className="booking-empty" style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <strong style={{ fontSize: '1.05rem', color: '#243b2a', display: 'block', marginBottom: '0.35rem' }}>
                  Chưa có buổi tiệc nào trong &quot;Tiệc của tôi&quot;
                </strong>
                <p style={{ color: '#5d665f', maxWidth: '520px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                  Bạn chưa nhận phụ trách hoặc tạo tiệc cưới nào. Hãy bấm &quot;Tạo đặt tiệc mới&quot; hoặc chuyển sang tab <strong>Tất cả tiệc nhà hàng</strong> để theo dõi lịch và nhận tiệc.
                </p>
                <div style={{ display: 'inline-flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Link className="primary-button" href="/bookings" style={{ padding: '6px 14px', fontSize: '0.85rem', textDecoration: 'none' }}>
                    + Tạo đặt tiệc mới
                  </Link>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setBookingTab('all')}
                    style={{ padding: '6px 14px', fontSize: '0.85rem', cursor: 'pointer', background: '#ffffff', border: '1px solid #d1d5db' }}
                  >
                    Xem tất cả tiệc nhà hàng ({data.bookings.length}) →
                  </button>
                </div>
              </div>
            ) : (
              <div className="booking-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <strong>Chưa có buổi tiệc nào trong lịch</strong>
                <p>Bấm &quot;Tạo đặt tiệc mới&quot; hoặc chọn từ danh sách yêu cầu tư vấn để tạo hồ sơ tiệc cưới.</p>
              </div>
            )
          ) : filteredBookings.length === 0 ? (
            <div className="booking-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
              <strong>Không tìm thấy tiệc cưới phù hợp</strong>
              <p>Không có buổi tiệc nào khớp với từ khóa tìm kiếm hoặc trạng thái lọc đã chọn.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table aria-label="Lịch tiệc và sự kiện đã đặt">
                <thead>
                  <tr>
                    <th scope="col">Ngày tổ chức</th>
                    <th scope="col">Sảnh tiệc</th>
                    <th scope="col">Ca</th>
                    <th scope="col">Quy mô</th>
                    <th scope="col">Mã booking (UUID)</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => {
                    const assignment = assignments[booking.bookingId];
                    const mine = assignment?.assignedAccountId === resolvedAccountId;
                    const assignedToOther = Boolean(
                      assignment && assignment.assignedAccountId !== resolvedAccountId
                    );
                    const assignedEmail = assignment?.assignedEmail ?? 'Quản lý khác';

                    return (
                      <tr key={booking.bookingId}>
                        <td>
                          <strong>{new Date(booking.eventDate).toLocaleDateString('vi-VN')}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <strong>{booking.hallNameSnapshot || 'Sảnh tiệc'}</strong>
                            {mine ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  background: '#dcfce7',
                                  color: '#166534',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: '4px',
                                  padding: '1px 5px',
                                  fontWeight: 600,
                                }}
                                title="Bạn đang phụ trách tiệc này"
                              >
                                Của bạn
                              </span>
                            ) : assignedToOther ? (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  background: '#fee2e2',
                                  color: '#991b1b',
                                  border: '1px solid #fecaca',
                                  borderRadius: '4px',
                                  padding: '1px 5px',
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                                title={`Tiệc đã được tiếp nhận và khóa bởi: ${assignedEmail}`}
                              >
                                🔒 {assignedEmail}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span className="shift-badge">
                            {booking.shiftCode === 'LUNCH' ? 'Trưa' : 'Tối'}
                          </span>
                        </td>
                        <td>{booking.tableCount} bàn</td>
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <code
                              style={{
                                fontSize: '0.75rem',
                                fontFamily: 'monospace',
                                background: '#f1f5f9',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                maxWidth: '170px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                              }}
                              title={booking.bookingId}
                            >
                              {booking.bookingId}
                            </code>
                            <CopyButton text={booking.bookingId} />
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status ${
                              booking.phase === 'CONFIRMED'
                                ? 'status-ready'
                                : booking.phase === 'CANCELLED'
                                  ? 'status-closed'
                                  : booking.phase === 'COMPLETED'
                                    ? 'status-ready'
                                    : 'status-review'
                            }`}
                          >
                            {PHASE_LABELS[booking.phase] ?? booking.phase}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Link
                              className="booking-primary-link"
                              href={`/bookings?bookingId=${booking.bookingId}`}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                textDecoration: 'none',
                              }}
                            >
                              Xem hồ sơ →
                            </Link>
                            <Link
                              className="booking-secondary"
                              href={`/billing?bookingId=${booking.bookingId}`}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                textDecoration: 'none',
                              }}
                            >
                              Thanh toán
                            </Link>
                            <Link
                              className="booking-secondary"
                              href={`/staff?bookingId=${booking.bookingId}`}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                textDecoration: 'none',
                              }}
                            >
                              Nhân sự
                            </Link>
                            {mine ? (
                              <button
                                type="button"
                                title="Bỏ phụ trách tiệc này để quản lý khác có thể tiếp nhận"
                                onClick={() => handleRelease(booking.bookingId, booking.hallNameSnapshot || undefined)}
                                style={{
                                  border: '1px solid #f59e0b',
                                  borderRadius: '4px',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  whiteSpace: 'nowrap',
                                  lineHeight: '1.2',
                                }}
                              >
                                ★ Bỏ nhận
                              </button>
                            ) : assignedToOther ? (
                              <button
                                type="button"
                                disabled
                                title={`Tiệc này đã được ${assignedEmail} tiếp nhận và đang khóa`}
                                style={{
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  background: '#f1f5f9',
                                  color: '#94a3b8',
                                  cursor: 'not-allowed',
                                  fontSize: '0.75rem',
                                  fontWeight: 500,
                                  padding: '3px 8px',
                                  whiteSpace: 'nowrap',
                                  lineHeight: '1.2',
                                }}
                              >
                                🔒 Đã có người nhận
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Tiếp nhận phụ trách tiệc này và khóa với các quản lý khác"
                                onClick={() => handleClaim(booking.bookingId, booking.hallNameSnapshot || undefined)}
                                style={{
                                  border: '1px solid #86efac',
                                  borderRadius: '4px',
                                  background: '#f0fdf4',
                                  color: '#166534',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  whiteSpace: 'nowrap',
                                  lineHeight: '1.2',
                                }}
                              >
                                ☆ Nhận tiệc
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <section
          className="schedule-panel dashboard-schedule"
          id="staff-checkin-banner"
          style={{
            marginBottom: '2.5rem',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            border: '1px solid #bbf7d0',
            padding: '2rem',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div>
              <p className="section-kicker" style={{ color: '#16a34a', fontWeight: 600 }}>Tác nghiệp Lễ tân · Check-in</p>
              <h2 style={{ margin: '0.25rem 0', fontSize: '1.5rem', color: '#166534' }}>Bàn đón tiếp &amp; Điểm danh khách mời</h2>
              <p style={{ color: '#374151', margin: '0.5rem 0 0', maxWidth: '640px', lineHeight: 1.5 }}>
                Bạn đang đăng nhập với vai trò <strong>Nhân viên vận hành (Staff)</strong>. Truy cập Bàn đón khách để nhập mã tiệc cưới, tra cứu tên khách và hướng dẫn vị trí bàn tiệc.
              </p>
            </div>
            <Link
              href="/staff"
              className="text-button"
              style={{
                background: '#16a34a',
                color: '#ffffff',
                padding: '0.875rem 1.75rem',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                whiteSpace: 'nowrap',
              }}
            >
              Vào bàn đón khách &amp; Check-in →
            </Link>
          </div>
        </section>
      )}

      {/* Danh sách Yêu cầu tư vấn & Sự kiện */}
      <section className="schedule-panel dashboard-schedule" id="upcoming-events">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Hồ sơ tiếp nhận</p>
            <h2>Yêu cầu tư vấn gần đây</h2>
          </div>
          {isManager ? (
            <Link className="text-button" href="/consultation-requests">
              Xem toàn bộ ({state === 'loading' ? '…' : data.consultations.length})
            </Link>
          ) : null}
        </div>

        {/* State: Empty or Loading */}
        {state === 'loading' ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#5d665f' }}>
            <p>Đang đồng bộ hồ sơ tư vấn từ máy chủ…</p>
          </div>
        ) : state === 'success' && data.consultations.length === 0 ? (
          <div className="booking-empty" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <strong>Chưa có yêu cầu tư vấn nào</strong>
            <p>Hệ thống hiện chưa ghi nhận yêu cầu tư vấn mới từ khách hàng trực tuyến.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table aria-label="Yêu cầu tư vấn gần đây">
              <thead>
                <tr>
                  <th scope="col">Ngày tạo</th>
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Mã hồ sơ tư vấn</th>
                  <th scope="col">Liên hệ</th>
                  <th scope="col">Ngày dự kiến</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.consultations.slice(0, 5).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString('vi-VN')
                          : 'Hôm nay'}
                      </strong>
                    </td>
                    <td>
                      <strong>{item.displayName || 'Khách vãng lai'}</strong>
                      <span>{item.email}</span>
                    </td>
                    <td>
                      {item.consultationId ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <code
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                              background: '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              maxWidth: '180px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                            title={item.consultationId}
                          >
                            {item.consultationId}
                          </code>
                          <CopyButton text={item.consultationId} />
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Chưa cấp mã</span>
                      )}
                    </td>
                    <td>{item.phone || '—'}</td>
                    <td>{item.preferredDate || 'Chưa định ngày'}</td>
                    <td>
                      <span
                        className={`status ${
                          item.status === 'CONVERTED'
                            ? 'status-ready'
                            : item.status === 'CLOSED'
                              ? 'status-closed'
                              : 'status-review'
                        }`}
                      >
                        {item.status === 'CONVERTED'
                          ? 'Đã chuyển đổi'
                          : item.status === 'CLOSED'
                            ? 'Đã đóng'
                            : 'Chờ xử lý'}
                      </span>
                    </td>
                    <td>
                      {item.status === 'CONVERTED' && item.consultationId ? (
                        <Link
                          className="booking-primary-link"
                          href={`/bookings?consultationId=${item.consultationId}&consultationRevision=${item.consultationRevision ?? 1}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            textDecoration: 'none',
                          }}
                        >
                          Đặt tiệc →
                        </Link>
                      ) : item.status === 'NEW' ? (
                        <Link
                          href="/consultation-requests"
                          style={{
                            fontSize: '0.8rem',
                            color: '#047857',
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                          }}
                        >
                          Xử lý →
                        </Link>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  attention = false,
  detail,
  label,
  value,
}: Readonly<{ attention?: boolean; detail: string; label: string; value: string }>) {
  return (
    <article>
      <span className="metric-label">{label}</span>
      <strong className={attention ? 'attention-value' : undefined}>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
