'use client';

import Link from 'next/link';
import { ArrowLeft, Heart, LoaderCircle } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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

const stateClass = 'flex min-h-[60vh] flex-col items-start gap-3 bg-background p-6 sm:p-10';
const panelClass =
  'flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-hy-1';

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
      <main data-ui-v3 className={stateClass} id="billing-content">
        <h1 className="text-2xl font-bold">Đang xác minh quyền quản lý…</h1>
        <p role="status" className="text-muted-foreground">
          Đang kiểm tra phiên đăng nhập.
        </p>
      </main>
    );
  } else if (snapshot.status !== 'authenticated' || snapshot.presentation !== 'manager') {
    content = (
      <main data-ui-v3 className={stateClass} id="billing-content">
        <h1 className="text-2xl font-bold">
          {snapshot.status === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền xem thanh toán'}
        </h1>
        <p className="text-muted-foreground">Khu vực này dành cho tài khoản Quản lý.</p>
        <Link className={buttonVariants()} href="/">
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
    <main
      data-ui-v3
      className="flex min-h-screen flex-col gap-6 bg-background p-[clamp(1rem,3vw,3.25rem)]"
      id="billing-content"
    >
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex max-w-xl min-w-0 flex-[1_1_360px] flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-semibold text-primary">Hỷ Yến · Quản trị nhà hàng</span>
            {view !== null && (
              <Link
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                href={`/bookings?bookingId=${encodeURIComponent(view.bookingId)}`}
              >
                <ArrowLeft aria-hidden className="size-3.5" />
                Về hồ sơ tiệc
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-bold">Quản lý thanh toán</h1>
          <p className="text-muted-foreground">
            Theo dõi tiền đặt tiệc, ghi nhận khoản thu và hoàn tiền.
          </p>
        </div>
        <form
          className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[480px] sm:max-w-full"
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
          <div className="flex items-end gap-2">
            <div className="relative min-w-0 flex-1">
              <label className="flex flex-col gap-1 text-xs font-semibold">
                Mã hồ sơ đặt tiệc
                <Input
                  className="font-normal"
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
                <div
                  className="absolute inset-x-0 top-full z-20 mt-1 flex max-h-80 flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-hy-2"
                  role="listbox"
                >
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
                        className="flex w-full flex-col items-start gap-0.5 rounded-lg p-3 text-left [overflow-wrap:anywhere] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() => selectLookupBooking(item)}
                      >
                        <strong className="font-semibold">
                          {item.bookingCode} · {item.customerName}
                        </strong>
                        {couple && couple !== item.customerName && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                            <Heart aria-hidden className="size-3.5" />
                            {couple}
                          </span>
                        )}
                        <span className="text-xs">
                          {[
                            dateStr,
                            item.hallName,
                            item.shiftCode === 'LUNCH' ? 'Ca trưa' : 'Ca tối',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {contactInfo && (
                          <small className="text-2xs text-muted-foreground">{contactInfo}</small>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <Button type="submit" disabled={pending || uncertain !== null}>
              Xem thanh toán
            </Button>
          </div>
        </form>
      </header>

      {/* empty:sr-only giữ vùng thông báo trong cây trợ năng nhưng không chiếm chỗ khi trống. */}
      <div className="empty:sr-only" aria-live="polite">
        {pending && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-3 text-muted-foreground"
          >
            <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
            Đang xử lý yêu cầu…
          </p>
        )}
      </div>

      {view !== null && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Tổng hợp tiền đặt tiệc</h2>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                void run(() => load(view.bookingId));
              }}
            >
              Cập nhật thông tin
            </Button>
          </div>

          <div className="flex flex-wrap items-stretch gap-6">
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

          <div className="flex flex-wrap items-start gap-6">
            <BillingMutationsSection
              view={view}
              pending={pending}
              uncertain={uncertain}
              refundRevision={refundRevision}
              approvalRevision={approvalRevision}
              onMutate={mutate}
            />

            <div className={`${panelClass} flex-[1_1_440px]`}>
              <BillingHistory view={view} />
              {view.nextCursor !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={pending}
                  onClick={() => {
                    void run(() => load(view.bookingId, true));
                  }}
                >
                  Tải thêm lịch sử
                </Button>
              )}
            </div>
          </div>

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
    </main>
  );
}
