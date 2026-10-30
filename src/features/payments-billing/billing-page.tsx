'use client';

import Link from 'next/link';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { useEffect, useRef, useState } from 'react';
import { ApiClientError } from '../../lib/api/client';
import { sanitizeSearchId } from '../../lib/input-sanitizers';
import {
  type ManagementIdentitySession,
  sharedManagementSession,
} from '../identity-access/session';
import { OperationsShell } from '../identity-access/operations-shell';
import {
  createManagementBillingGateway,
  type AttemptView,
  type BillingView,
  type ManagementBillingGateway,
  type ManualPaymentBody,
  type RefundBody,
  type RefundApprovalBody,
} from './billing-api';
import { BillingIntentMismatchError, createBillingIntents } from './billing-intents';
import {
  BillingHistory,
  BillingSummary,
  billingMessage,
  denied,
  unresolved,
} from './billing-display';
import type { CommandOutcome } from './payment-forms';
import { AttemptLookupPanel } from './attempt-lookup-panel';
import { BillingMutationsSection } from './billing-mutations-section';
import { IncidentalsPanel } from './incidentals-panel';

import { useManagementSession } from '../identity-access/use-management-session';
import { notify } from '../../design-system/notifications';
import { axiosApiClient } from '../../lib/api/axios-client';
import type { BookingIdentity } from '../booking-lifecycle/use-booking-lookup';

type Authorize = <T>(operation: (token: string) => Promise<T>) => Promise<T>;
type MutationResult =
  | Awaited<ReturnType<ManagementBillingGateway['recordManual']>>
  | Awaited<ReturnType<ManagementBillingGateway['refund']>>
  | Awaited<ReturnType<ManagementBillingGateway['approveRefund']>>;

const identity = sharedManagementSession;
const billing = createManagementBillingGateway();

export function ManagementBillingPage({
  session = identity,
  gateway = billing,
}: Readonly<{ session?: ManagementIdentitySession; gateway?: ManagementBillingGateway }>) {
  const {
    snapshot,
    loggingOut,
    logoutError,
    logout: handleLogout,
  } = useManagementSession({
    session,
  });

  useEffect(() => {
    if (logoutError) {
      notify.error(logoutError);
    }
  }, [logoutError]);

  let content;
  if (snapshot === null) {
    content = (
      <main className="billing-shell" id="billing-content">
        <h1>Đang xác minh quyền quản lý…</h1>
        <p role="status">Đang kiểm tra phiên đăng nhập.</p>
      </main>
    );
  } else if (snapshot.status !== 'authenticated' || snapshot.presentation !== 'manager') {
    content = (
      <main className="billing-shell" id="billing-content">
        <h1>
          {snapshot.status === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền xem thanh toán'}
        </h1>
        <p>Khu vực này dành cho tài khoản Quản lý.</p>
        <Link className="billing-primary-link" href="/">
          Về trang đăng nhập
        </Link>
      </main>
    );
  } else {
    content = (
      <ManagementBillingWorkspace
        key={snapshot.actor.accountId}
        accountId={snapshot.actor.accountId}
        authorize={(operation) => session.authorize(operation)}
        gateway={gateway}
      />
    );
  }

  return (
    <OperationsShell
      activePage="billing"
      contentId="billing-content"
      snapshot={snapshot}
      onLogout={handleLogout}
      pending={loggingOut}
    >
      {content}
    </OperationsShell>
  );
}

export function ManagementBillingWorkspace({
  accountId,
  authorize,
  gateway,
  intents: provided,
}: Readonly<{
  accountId: string;
  authorize: Authorize;
  gateway: ManagementBillingGateway;
  intents?: ReturnType<typeof createBillingIntents>;
}>) {
  const [intents] = useState(() => provided ?? createBillingIntents(accountId));
  const [bookingId, setBookingId] = useState('');
  const [view, setView] = useState<BillingView | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const [uncertain, setUncertain] = useState<'manual' | 'refund' | 'approval' | null>(null);
  const [refundRevision, setRefundRevision] = useState<number | null>(null);
  const [approvalRevision, setApprovalRevision] = useState<number | null>(null);
  const [searchMatches, setSearchMatches] = useState<BookingIdentity[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLookups = async (term: string): Promise<BookingIdentity[]> => {
    return authorize(async (token) => {
      const res = await axiosApiClient.get<{ data: BookingIdentity[] }>(
        '/management/booking-lookups',
        {
          params: { q: term },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return res.data?.data ?? [];
    });
  };

  const handleBookingInputChange = (value: string) => {
    if (pending || uncertain !== null) return;
    setBookingId(value);
    setView(null);
    setAttempt(null);
    setAttemptId('');
    setRefundRevision(null);
    setApprovalRevision(null);

    if (searchTimer.current) clearTimeout(searchTimer.current);

    const trimmed = value.trim();
    if (trimmed.length < 2 || /^[a-f0-9-]{36}$/iu.test(trimmed)) {
      setSearchMatches([]);
      setShowDropdown(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      try {
        const matches = await fetchLookups(trimmed);
        setSearchMatches(matches);
        setShowDropdown(matches.length > 0);
      } catch {
        setSearchMatches([]);
        setShowDropdown(false);
      }
    }, 250);
  };

  const selectLookupBooking = (item: BookingIdentity) => {
    setBookingId(item.bookingId);
    setShowDropdown(false);
    setSearchMatches([]);
    setView(null);
    setAttempt(null);
    setAttemptId('');
    setRefundRevision(null);
    setApprovalRevision(null);
    void run(() => load(item.bookingId));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawId = params.get('bookingId');
    const id = sanitizeSearchId(rawId);
    if (id !== '' && /^[a-f0-9-]{36}$/iu.test(id)) {
      setBookingId(id);
      void run(() => load(id));
    }
  }, []);

  const clearDenied = (caught: unknown) => {
    if (denied(caught)) {
      setView(null);
      setAttempt(null);
    }
    const msg = billingMessage(caught);
    notify.error(caught, { fallbackMessage: msg });
  };

  const run = async (operation: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      await operation();
    } catch (caught) {
      clearDenied(caught);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const load = async (id: string, more = false) => {
    const query =
      more && view !== null && view.nextCursor !== null
        ? { cursor: view.nextCursor, throughBillingRevision: view.billingRevision }
        : {};
    const value = await authorize((token) => gateway.load(token, id, query));
    if (
      value.bookingId !== id ||
      (more && view !== null && value.billingRevision !== view.billingRevision)
    )
      throw new Error('Billing history fence mismatch');
    if (!more) {
      const manual = await intents.pending(`manual:${id}`);
      const refund = await intents.pending(`refund:${id}`);
      const approval = await intents.pending(`approval:${id}`);
      setRefundRevision(refund?.expectedBillingRevision ?? null);
      setApprovalRevision(approval?.expectedBillingRevision ?? null);
      setUncertain(
        manual !== null
          ? 'manual'
          : refund !== null
            ? 'refund'
            : approval !== null
              ? 'approval'
              : null,
      );
      if (manual !== null || refund !== null || approval !== null) {
        notify.warning(
          'Yêu cầu trước chưa rõ kết quả. Nhập lại đúng nội dung chứng từ và thử lại yêu cầu đó.',
        );
      }
    }
    setView(
      more && view !== null ? { ...value, history: [...view.history, ...value.history] } : value,
    );
  };

  useLiveRefresh(
    async (isCurrent) => {
      if (!view) return;
      await run(async () => {
        await load(view.bookingId);
        if (attempt) {
          const fresh = await authorize((token) =>
            gateway.loadAttempt(token, view.bookingId, attempt.paymentAttemptId),
          );
          if (isCurrent()) setAttempt(fresh);
        }
      });
    },
    {
      scope: view?.bookingId ?? 'no-billing',
      bookingId: view?.bookingId,
      enabled: view !== null,
      blocked: pending,
      types: ['billing.updated', 'deposit.received', 'contract.updated', 'booking.updated'],
    },
  );

  const mutate = async (
    kind: 'manual' | 'refund' | 'approval',
    body: ManualPaymentBody | RefundBody | RefundApprovalBody,
  ): Promise<CommandOutcome> => {
    if (busy.current || view === null) return 'retry';
    busy.current = true;
    setPending(true);
    try {
      const result = await intents.run<MutationResult>(
        `${kind}:${view.bookingId}`,
        body,
        (key, stableBody) =>
          authorize<MutationResult>((token) =>
            kind === 'manual'
              ? gateway.recordManual(token, stableBody as ManualPaymentBody, key)
              : kind === 'refund'
                ? gateway.refund(token, stableBody as RefundBody, key)
                : gateway.approveRefund(token, stableBody as RefundApprovalBody, key),
          ),
      );
      setUncertain(null);
      setRefundRevision(null);
      setApprovalRevision(null);
      const okMsg =
        'paymentId' in result
          ? `Đã ghi nhận khoản thu. Mã thanh toán: ${result.paymentId}`
          : 'refundId' in result
            ? `Đã ghi nhận khoản hoàn. Mã hoàn: ${result.refundId}`
            : `Đã phê duyệt hoàn tiền. Mã phê duyệt: ${result.refundApprovalId}`;
      notify.success(okMsg);
      try {
        await load(view.bookingId);
      } catch (caught) {
        clearDenied(caught);
      }
      return 'succeeded';
    } catch (caught) {
      clearDenied(caught);
      if (caught instanceof BillingIntentMismatchError) {
        setUncertain(kind);
        return 'failed';
      }
      const retry = unresolved(caught);
      setUncertain(retry ? kind : null);
      return retry ? 'retry' : 'failed';
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  return (
    <main className="billing-shell" id="billing-content">
      <header className="billing-header">
        <div className="billing-header-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span className="section-kicker" style={{ margin: 0 }}>Wedding Estate · Operations</span>
            {view !== null && (
              <Link className="billing-back-link" href={`/bookings/${encodeURIComponent(view.bookingId)}`}>
                ← Về hồ sơ tiệc
              </Link>
            )}
          </div>
          <h1>Quản lý thanh toán</h1>
          <p>Theo dõi tiền đặt tiệc, ghi nhận khoản thu và hoàn tiền.</p>
        </div>
        <form
          className="billing-lookup"
          onSubmit={(event) => {
            event.preventDefault();
            setShowDropdown(false);
            const raw = bookingId.trim();
            if (!raw) return;

            if (/^[a-f0-9-]{36}$/iu.test(raw)) {
              setAttempt(null);
              setView(null);
              void run(() => load(raw));
              return;
            }

            if (searchMatches.length === 1 && searchMatches[0]) {
              selectLookupBooking(searchMatches[0]);
              return;
            }

            void run(async () => {
              try {
                const matches = await fetchLookups(raw);
                if (matches.length === 1 && matches[0]) {
                  selectLookupBooking(matches[0]);
                } else if (matches.length > 1) {
                  setSearchMatches(matches);
                  setShowDropdown(true);
                  notify.info(
                    `Tìm thấy ${matches.length} hồ sơ tiệc phù hợp. Hãy chọn tiệc cần xem từ danh sách gợi ý.`,
                  );
                } else {
                  setAttempt(null);
                  setView(null);
                  await load(raw);
                }
              } catch {
                setAttempt(null);
                setView(null);
                await load(raw);
              }
            });
          }}
        >
          <div className="billing-lookup-field">
            <label>
              Mã hồ sơ đặt tiệc
              <input
                value={bookingId}
                onChange={(event) => handleBookingInputChange(event.target.value)}
                onFocus={() => {
                  if (searchMatches.length > 0) setShowDropdown(true);
                }}
                placeholder="Mã HY, tên cô dâu chú rể, người đặt, SĐT, email…"
                required
                disabled={pending || uncertain !== null}
              />
            </label>
            {showDropdown && searchMatches.length > 0 && (
              <div className="billing-lookup-dropdown" role="listbox">
                {searchMatches.map((item) => {
                  const couple = [item.groomName, item.brideName].filter(Boolean).join(' & ');
                  const contactInfo = [item.phone ? `SĐT: ${item.phone}` : null, item.email]
                    .filter(Boolean)
                    .join(' · ');
                  const dateStr = item.eventDate.split('-').reverse().join('/');
                  return (
                    <button
                      key={item.bookingId}
                      type="button"
                      className="billing-lookup-item"
                      onClick={() => selectLookupBooking(item)}
                    >
                      <strong style={{ fontSize: '13.5px' }}>
                        {item.bookingCode} · {item.customerName}
                      </strong>
                      {couple && couple !== item.customerName && (
                        <span style={{ fontSize: '12.5px', color: 'var(--burgundy)', fontWeight: 500 }}>
                          👰🤵 {couple}
                        </span>
                      )}
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {[dateStr, item.hallName, item.shiftCode === 'LUNCH' ? 'Ca trưa' : 'Ca tối']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {contactInfo && (
                        <small style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                          {contactInfo}
                        </small>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button disabled={pending || uncertain !== null}>Xem thanh toán</button>
        </form>
      </header>

      <div className="billing-live" aria-live="polite">
        {pending && <p role="status">Đang xử lý yêu cầu…</p>}
      </div>

      <div className="billing-workspace-body">
        {view !== null && (
          <>
            <div className="billing-section-heading">
              <h2>Tổng hợp tiền đặt tiệc</h2>
              <button
                className="billing-secondary"
                disabled={pending}
                onClick={() => {
                  void run(() => load(view.bookingId));
                }}
              >
                Cập nhật thông tin
              </button>
            </div>

            {/* ROW 1: TỔNG HỢP TÀI CHÍNH (6 CHỈ SỐ) & TRA CỨU GIAO DỊCH */}
            <div className="billing-two-col-top">
              <BillingSummary view={view} />
              <AttemptLookupPanel
                disabled={pending}
                attemptId={attemptId}
                setAttemptId={setAttemptId}
                attempt={attempt}
                onLookup={() => {
                  void run(async () => {
                    setAttempt(
                      await authorize((token) =>
                        gateway.loadAttempt(token, view.bookingId, attemptId.trim()),
                      ),
                    );
                  });
                }}
              />
            </div>

            {/* ROW 2: THAO TÁC NGHIỆP VỤ (TABBED) & LỊCH SỬ GIAO DỊCH */}
            <div className="billing-two-col-main">
              <BillingMutationsSection
                view={view}
                pending={pending}
                uncertain={uncertain}
                refundRevision={refundRevision}
                approvalRevision={approvalRevision}
                onMutate={mutate}
              />

              <div className="billing-history-col">
                <BillingHistory view={view} />
                {view.nextCursor !== null && (
                  <button
                    className="billing-secondary"
                    style={{ marginTop: '12px' }}
                    disabled={pending}
                    onClick={() => {
                      void run(() => load(view.bookingId, true));
                    }}
                  >
                    Tải thêm lịch sử
                  </button>
                )}
              </div>
            </div>

            {/* ROW 3: PHÁT SINH & HOÁ ĐƠN QUYẾT TOÁN CUỐI */}
            <IncidentalsPanel
              bookingId={view.bookingId}
              billingRevision={view.billingRevision}
              disabled={pending}
              onRefresh={() => {
                void run(() => load(view.bookingId));
              }}
            />
          </>
        )}
      </div>
    </main>
  );
}
