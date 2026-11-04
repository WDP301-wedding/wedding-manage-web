import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { sanitizeSearchId } from '../../lib/input-sanitizers';
import { notify } from '../../design-system/notifications';
import { describeApiError } from '../../lib/api/api-errors';
import type { BookingIdentity } from '../booking-lifecycle/use-booking-lookup';
import type {
  BillingView,
  ManagementBillingGateway,
  ManualPaymentBody,
  RefundBody,
  RefundApprovalBody,
  RecordingContext,
} from './billing-api';
import {
  BillingIntentMismatchError,
  createBillingIntents,
  type RecoveryBody,
  type BillingIntents,
} from './billing-intents';
import { billingMessage, denied, unresolved } from './billing-display';
import { useBillingLookup } from './use-billing-lookup';
import type { CommandOutcome } from './payment-forms';

export type Authorize = <T>(operation: (token: string) => Promise<T>) => Promise<T>;
type MutationResult =
  | Awaited<ReturnType<ManagementBillingGateway['recordManual']>>
  | Awaited<ReturnType<ManagementBillingGateway['refund']>>
  | Awaited<ReturnType<ManagementBillingGateway['approveRefund']>>;
export type BillingRecovery = { kind: 'manual' | 'refund'; body: RecoveryBody | null };
const isId = (value: string) =>
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(value);
export function useBillingWorkspace({
  accountId,
  authorize,
  gateway,
  intents: provided,
}: Readonly<{
  accountId: string;
  authorize: Authorize;
  gateway: ManagementBillingGateway;
  intents?: BillingIntents | undefined;
}>) {
  const [intents] = useState(() => provided ?? createBillingIntents(accountId));
  const lookup = useBillingLookup(authorize);
  const [view, setView] = useState<BillingView | null>(null);
  const [identity, setIdentity] = useState<BookingIdentity | null>(null);
  const [recording, setRecording] = useState<RecordingContext | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [refreshingAfterWrite, setRefreshingAfterWrite] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editorState, setEditorState] = useState({ payment: false, settlement: false });
  const editingRef = useRef(false),
    busy = useRef(false),
    mounted = useRef(true),
    epoch = useRef(0);
  const [recovery, setRecovery] = useState<BillingRecovery | null>(null);
  const [refundRevision, setRefundRevision] = useState<number | null>(null);
  const [formEpoch, setFormEpoch] = useState(0);
  const editors = useRef({ payment: false, settlement: false });
  const workEpoch = useRef(0);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      epoch.current++;
      workEpoch.current++;
      busy.current = false;
    };
  }, []);
  const uncertain = recovery?.kind ?? null;
  const setEditor = useCallback((kind: 'payment' | 'settlement', value: boolean) => {
    if (editors.current[kind] === value) return;
    editors.current[kind] = value;
    setEditorState({ ...editors.current });
    const next = editors.current.payment || editors.current.settlement;
    if (next && !editingRef.current) epoch.current++;
    editingRef.current = next;
    setEditing(next);
  }, []);
  const setPaymentEditing = useCallback(
    (value: boolean) => setEditor('payment', value),
    [setEditor],
  );
  const setSettlementEditing = useCallback(
    (value: boolean) => setEditor('settlement', value),
    [setEditor],
  );
  const inspectIntent = async (scope: string) => {
    if (intents.inspect) return intents.inspect(scope);
    const metadata = await intents.pending(scope);
    return metadata ? { metadata, body: null } : null;
  };
  const clearDenied = (cause: unknown) => {
    if (denied(cause)) {
      setView(null);
      setRecording(null);
    }
    notify.error(cause, { fallbackMessage: billingMessage(cause) });
  };
  const run = async (operation: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    const owner = ++workEpoch.current;
    setPending(true);
    try {
      await operation();
    } catch (cause) {
      clearDenied(cause);
    } finally {
      if (owner === workEpoch.current) {
        busy.current = false;
        if (mounted.current) setPending(false);
      }
    }
  };
  const load = async (id: string, more = false, isCurrent = () => true) => {
    const version = epoch.current;
    const prior = viewRef.current;
    const query =
      more && prior?.nextCursor
        ? { cursor: prior.nextCursor, throughBillingRevision: prior.billingRevision }
        : {};
    const [value, nextRecording] = await Promise.all([
      authorize((token) => gateway.load(token, id, query)),
      more || !gateway.recording
        ? Promise.resolve(null)
        : authorize((token) => gateway.recording!(token, id)).catch((cause: unknown) => ({
            error: describeApiError(cause).message,
          })),
    ]);
    if (!mounted.current || version !== epoch.current || !isCurrent()) return;
    if (
      value.bookingId !== id ||
      (more && prior && value.billingRevision !== prior.billingRevision)
    )
      throw new Error('Lịch sử vừa thay đổi. Hãy cập nhật lại thông tin.');
    if (!more) {
      const [manual, refund] = await Promise.all([
        inspectIntent('manual:' + id),
        inspectIntent('refund:' + id),
      ]);
      if (!mounted.current || version !== epoch.current || !isCurrent()) return;
      setRecovery(
        manual
          ? { kind: 'manual', body: manual.body }
          : refund
            ? { kind: 'refund', body: refund.body }
            : null,
      );
      setRefundRevision(refund?.metadata.expectedBillingRevision ?? null);
      if (
        nextRecording &&
        !('error' in nextRecording) &&
        nextRecording.billingRevision === value.billingRevision &&
        (!value.financialOverview ||
          nextRecording.bookingRevision === value.financialOverview.bookingRevision)
      ) {
        setRecording(nextRecording);
        setRecordingError(null);
      } else {
        setRecording(null);
        setRecordingError(
          nextRecording && 'error' in nextRecording
            ? nextRecording.error
            : nextRecording
              ? 'Công nợ đang thay đổi. Cập nhật thông tin để nhận cùng phiên bản trước khi ghi nhận.'
              : 'Chưa có dữ liệu điều kiện thu/hoàn. Cần cập nhật BE trước khi ghi nhận.',
        );
      }
    }
    if (!more) setRefreshingAfterWrite(false);
    setView(
      more && prior
        ? { ...prior, history: [...prior.history, ...value.history], nextCursor: value.nextCursor }
        : value,
    );
  };
  const selectLookupBooking = (item: BookingIdentity) => {
    if (busy.current || editingRef.current || recovery) return;
    lookup.choose(item);
    epoch.current++;
    setIdentity(item);
    setView(null);
    setRecording(null);
    void run(() => load(item.bookingId));
  };
  const handleBookingInputChange = (value: string) => {
    if (busy.current || editingRef.current || recovery) return;
    epoch.current++;
    lookup.change(value);
    setView(null);
    setRecording(null);
    setIdentity(null);
  };
  const submitLookup = () => {
    if (busy.current || editingRef.current || recovery) return;
    const raw = lookup.query.trim();
    if (!raw) return;
    lookup.cancel();
    lookup.setOpen(false);
    epoch.current++;
    setView(null);
    setRecording(null);
    void run(async () => {
      if (isId(raw)) {
        await load(raw);
        return;
      }
      const matches = await lookup.resolve(raw);
      if (!matches) return;
      if (matches.length === 1 && matches[0]) {
        lookup.choose(matches[0]);
        setIdentity(matches[0]);
        await load(matches[0].bookingId);
      } else {
        lookup.setMatches(matches);
        lookup.setOpen(matches.length > 0);
        notify.info(
          matches.length
            ? 'Chọn hồ sơ tiệc cần xem trong danh sách.'
            : 'Không tìm thấy hồ sơ phù hợp. Kiểm tra lại mã HY hoặc thông tin khách.',
        );
      }
    });
  };
  useEffect(() => {
    let active = true;
    const id = sanitizeSearchId(new URLSearchParams(window.location.search).get('bookingId'));
    if (isId(id)) {
      lookup.setQuery('');
      void run(async () => {
        await load(id);
        if (!active) return;
        const rows = await lookup.resolve(id, true);
        if (active && mounted.current && rows?.[0]) {
          setIdentity(rows[0]);
          lookup.choose(rows[0]);
        }
      });
    }
    return () => {
      active = false;
    };
  }, []);

  const live = useLiveRefresh(
    async (isCurrent) => {
      const current = viewRef.current;
      if (!current) return;
      try {
        await load(current.bookingId, false, isCurrent);
      } catch (cause) {
        if (isCurrent()) clearDenied(cause);
      }
    },
    {
      scope: view?.bookingId ?? 'no-billing',
      bookingId: view?.bookingId,
      enabled: view !== null,
      blocked: pending || editing || recovery !== null,
      invalidateOnBlock: true,
      types: ['billing.updated', 'deposit.received', 'contract.updated', 'booking.updated'],
    },
  );
  const loadRefundSources = () => {
    const current = recording;
    if (!current || current.nextAfterRevision === null || !gateway.recording) return;
    void run(async () => {
      const next = await authorize((token) =>
        gateway.recording!(token, current.bookingId, current.nextAfterRevision!),
      );
      if (
        next.billingRevision !== current.billingRevision ||
        next.bookingRevision !== current.bookingRevision
      ) {
        notify.warning(
          'Công nợ đã thay đổi. Bỏ bản đang nhập và cập nhật thông tin trước khi hoàn tiền.',
        );
        return;
      }
      if (mounted.current && viewRef.current?.bookingId === current.bookingId)
        setRecording({
          ...next,
          refundablePayments: [...current.refundablePayments, ...next.refundablePayments],
        });
    });
  };
  const mutate = async (
    kind: 'manual' | 'refund' | 'approval',
    body: ManualPaymentBody | RefundBody | RefundApprovalBody,
  ): Promise<CommandOutcome> => {
    const current = viewRef.current;
    if (busy.current || !current) return 'retry';
    busy.current = true;
    setPending(true);
    try {
      const result = await intents.run<MutationResult>(
        kind + ':' + current.bookingId,
        body,
        (key, stable) =>
          authorize<MutationResult>((token) =>
            kind === 'manual'
              ? gateway.recordManual(token, stable as ManualPaymentBody, key)
              : kind === 'refund'
                ? gateway.refund(token, stable as RefundBody, key)
                : gateway.approveRefund(token, stable as RefundApprovalBody, key),
          ),
      );
      setRecovery(null);
      setRefundRevision(null);
      setEditor('payment', false);
      setFormEpoch((value) => value + 1);
      notify.success(
        'paymentId' in result
          ? 'Đã ghi nhận khoản thu.'
          : 'refundId' in result
            ? 'Đã ghi nhận khoản hoàn.'
            : 'Đã xác nhận quyết định hoàn tiền.',
      );
      setRefreshingAfterWrite(true);
      live.schedule();
      return 'succeeded';
    } catch (cause) {
      clearDenied(cause);
      const retry = cause instanceof BillingIntentMismatchError || unresolved(cause);
      if (retry) {
        const saved = await inspectIntent(kind + ':' + current.bookingId).catch(() => null);
        if (kind !== 'approval') setRecovery({ kind, body: saved?.body ?? null });
      } else {
        setRecovery(null);
        setEditor('payment', false);
        setFormEpoch((value) => value + 1);
        setRefreshingAfterWrite(true);
        live.schedule();
      }
      return retry ? 'retry' : 'failed';
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const retryRecovery = async () => {
    if (!recovery?.body) return;
    const body = recovery.body;
    if (
      (recovery.kind === 'manual') !== 'bookingId' in body ||
      ('bookingId' in body && body.bookingId !== viewRef.current?.bookingId)
    ) {
      notify.error('Nội dung khôi phục không khớp hồ sơ. Không gửi lại yêu cầu này.');
      return;
    }
    if ('bookingId' in body) {
      await mutate('manual', {
        bookingId: body.bookingId,
        purpose: body.purpose,
        amountVnd: body.amountVnd,
        settledAt: body.settledAt,
        ...(body.expectedBillingRevision === undefined
          ? {}
          : { expectedBillingRevision: body.expectedBillingRevision }),
        ...(body.timelineRevisionId ? { timelineRevisionId: body.timelineRevisionId } : {}),
        ...(body.contractRevisionId ? { contractRevisionId: body.contractRevisionId } : {}),
        ...(body.documentDigest ? { documentDigest: body.documentDigest } : {}),
      });
    } else
      await mutate('refund', {
        sourcePaymentId: body.sourcePaymentId,
        amountVnd: body.amountVnd,
        expectedBillingRevision: body.expectedBillingRevision,
      });
  };
  const refresh = async () => {
    const current = viewRef.current;
    if (current && !editingRef.current) await run(() => load(current.bookingId));
  };
  return {
    bookingId: lookup.query,
    view,
    identity,
    recording,
    recordingError,
    pending,
    uncertain,
    recovery,
    refundRevision,
    approvalRevision: null,
    searchMatches: lookup.matches,
    showDropdown: lookup.open,
    setShowDropdown: lookup.setOpen,
    lookupError: lookup.error,
    handleBookingInputChange,
    selectLookupBooking,
    submitLookup,
    run,
    load,
    mutate,
    editing,
    setPaymentEditing,
    setSettlementEditing,
    paymentEditing: editorState.payment,
    settlementEditing: editorState.settlement,
    waiting: live.waiting,
    retryRecovery,
    loadRefundSources,
    formEpoch,
    refresh,
    refreshingAfterWrite,
    scheduleRefresh: () => {
      setRefreshingAfterWrite(true);
      live.schedule();
    },
  };
}
