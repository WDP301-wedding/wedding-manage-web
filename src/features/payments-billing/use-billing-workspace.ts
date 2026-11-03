import { useEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { sanitizeSearchId } from '../../lib/input-sanitizers';
import { notify } from '../../design-system/notifications';
import { axiosApiClient } from '../../lib/api/axios-client';
import type { BookingIdentity } from '../booking-lifecycle/use-booking-lookup';
import type {
  AttemptView,
  BillingView,
  ManagementBillingGateway,
  ManualPaymentBody,
  RefundBody,
  RefundApprovalBody,
} from './billing-api';
import { BillingIntentMismatchError, createBillingIntents } from './billing-intents';
import { billingMessage, denied, unresolved } from './billing-display';
import type { CommandOutcome } from './payment-forms';

export type Authorize = <T>(operation: (token: string) => Promise<T>) => Promise<T>;
type MutationResult =
  | Awaited<ReturnType<ManagementBillingGateway['recordManual']>>
  | Awaited<ReturnType<ManagementBillingGateway['refund']>>
  | Awaited<ReturnType<ManagementBillingGateway['approveRefund']>>;

const bookingUuid = /^[a-f0-9-]{36}$/iu;
const isDirectBookingId = (id: string) => bookingUuid.test(id) || id === 'booking';

export function useBillingWorkspace({
  accountId,
  authorize,
  gateway,
  intents: provided,
}: Readonly<{
  accountId: string;
  authorize: Authorize;
  gateway: ManagementBillingGateway;
  intents?: ReturnType<typeof createBillingIntents> | undefined;
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

  const resetBookingView = () => {
    setView(null);
    setAttempt(null);
    setAttemptId('');
    setRefundRevision(null);
    setApprovalRevision(null);
  };

  const handleBookingInputChange = (value: string) => {
    if (pending || uncertain !== null) return;
    setBookingId(value);
    resetBookingView();

    if (searchTimer.current) clearTimeout(searchTimer.current);

    const trimmed = value.trim();
    if (trimmed.length < 2 || isDirectBookingId(trimmed)) {
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
    setBookingId(item.bookingCode);
    setShowDropdown(false);
    setSearchMatches([]);
    resetBookingView();
    void run(() => load(item.bookingId));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = sanitizeSearchId(params.get('bookingId'));
    if (id !== '' && isDirectBookingId(id)) {
      setBookingId(id);
      void run(() => load(id));
    }
  }, []);

  const clearDenied = (caught: unknown) => {
    if (denied(caught)) {
      setView(null);
      setAttempt(null);
    }
    notify.error(caught, { fallbackMessage: billingMessage(caught) });
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
      setRefundRevision(refund?.expectedBillingRevision ?? null);
      setApprovalRevision(null);
      setUncertain(manual !== null ? 'manual' : refund !== null ? 'refund' : null);
      if (manual !== null || refund !== null) {
        notify.warning(
          'Yêu cầu trước chưa rõ kết quả. Nhập lại đúng nội dung khoản thu/hoàn và thử lại yêu cầu đó.',
        );
      }
    }
    setView(
      more && view !== null ? { ...value, history: [...view.history, ...value.history] } : value,
    );
  };

  // Gõ mã UUID thì tải thẳng; gõ tên/SĐT thì chọn khi chỉ có một hồ sơ khớp, nhiều hồ sơ thì mở danh sách gợi ý.
  const submitLookup = () => {
    setShowDropdown(false);
    const raw = bookingId.trim();
    if (!raw) return;

    if (isDirectBookingId(raw)) {
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
  };

  const lookupAttempt = () => {
    if (view === null) return;
    void run(async () => {
      setAttempt(
        await authorize((token) => gateway.loadAttempt(token, view.bookingId, attemptId.trim())),
      );
    });
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

  return {
    bookingId,
    view,
    attemptId,
    setAttemptId,
    attempt,
    pending,
    uncertain,
    refundRevision,
    approvalRevision,
    searchMatches,
    showDropdown,
    setShowDropdown,
    handleBookingInputChange,
    selectLookupBooking,
    submitLookup,
    lookupAttempt,
    run,
    load,
    mutate,
  };
}
