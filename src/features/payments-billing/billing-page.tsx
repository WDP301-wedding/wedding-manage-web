'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  createIdentityApi,
  ManagementIdentitySession,
  sharedManagementSession,
  type ManagementSessionSnapshot,
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
  AttemptStatus,
  BillingHistory,
  BillingSummary,
  billingMessage,
  denied,
  unresolved,
} from './billing-display';
import { ManualPaymentForm, RefundForm, type CommandOutcome } from './payment-forms';
import { RefundApprovalForm } from './refund-approval-form';
import { IncidentalsPanel } from './incidentals-panel';

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
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void session.restore().then((value) => {
      if (active) setSnapshot(value);
    });
    return () => {
      active = false;
    };
  }, [session]);

  const handleLogout = () => {
    setLoggingOut(true);
    setLogoutError(null);
    void session
      .logout()
      .catch(() =>
        setLogoutError('Không thể kết nối máy chủ để đăng xuất. Hãy tải lại trang rồi thử lại.'),
      )
      .finally(() => {
        setSnapshot(session.snapshot());
        setLoggingOut(false);
      });
  };

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
        <p role="alert">Khu vực này dành cho tài khoản Quản lý.</p>
        {logoutError ? <p role="alert">{logoutError}</p> : null}
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
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('bookingId');
    if (id !== null && /^[a-f0-9-]{36}$/iu.test(id)) {
      setBookingId(id);
      void run(() => load(id));
    }
  }, []);
  const clearDenied = (caught: unknown) => {
    if (denied(caught)) {
      setView(null);
      setAttempt(null);
    }
    setError(billingMessage(caught));
  };
  const run = async (operation: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
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
      if (manual !== null || refund !== null || approval !== null)
        setError(
          'Yêu cầu trước chưa rõ kết quả. Nhập lại đúng nội dung chứng từ và thử lại yêu cầu đó.',
        );
    }
    setView(
      more && view !== null ? { ...value, history: [...view.history, ...value.history] } : value,
    );
  };
  const mutate = async (
    kind: 'manual' | 'refund' | 'approval',
    body: ManualPaymentBody | RefundBody | RefundApprovalBody,
  ): Promise<CommandOutcome> => {
    if (busy.current || view === null) return 'retry';
    busy.current = true;
    setPending(true);
    setError(null);
    setMessage(null);
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
      setMessage(
        'paymentId' in result
          ? `Đã ghi nhận khoản thu. Mã thanh toán: ${result.paymentId}`
          : 'refundId' in result
            ? `Đã ghi nhận khoản hoàn. Mã hoàn: ${result.refundId}`
            : `Đã phê duyệt hoàn tiền. Mã phê duyệt: ${result.refundApprovalId}`,
      );
      try {
        await load(view.bookingId);
      } catch (caught) {
        clearDenied(caught);
      }
      return 'succeeded';
    } catch (caught) {
      clearDenied(caught);
      if (caught instanceof BillingIntentMismatchError) {
        // Nothing was sent; unlock only this draft while retaining its durable intent.
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
        <div>
          <p className="section-kicker">Wedding Estate · Operations</p>
          <h1>Quản lý thanh toán</h1>
          <p>Theo dõi tiền đặt tiệc, ghi nhận khoản thu và hoàn tiền.</p>
        </div>
      </header>
      <form
        className="billing-lookup"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          setAttempt(null);
          setView(null);
          void run(() => load(bookingId.trim()));
        }}
      >
        <label>
          Mã hồ sơ đặt tiệc
          <input
            value={bookingId}
            onChange={(event) => {
              if (pending || uncertain !== null) return;
              setBookingId(event.target.value);
              setView(null);
              setAttempt(null);
              setAttemptId('');
              setRefundRevision(null);
              setApprovalRevision(null);
              setError(null);
              setMessage(null);
            }}
            required
            disabled={pending || uncertain !== null}
          />
        </label>
        <button disabled={pending || uncertain !== null}>Xem thanh toán</button>
      </form>
      <div className="billing-live" aria-live="polite">
        {pending && <p role="status">Đang xử lý yêu cầu…</p>}
        {message !== null && <p role="status">{message}</p>}
        {error !== null && <p role="alert">{error}</p>}
      </div>
      <div id="billing-content">
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
            <BillingSummary view={view} />
            <BillingHistory view={view} />
            {view.nextCursor !== null && (
              <button
                className="billing-secondary"
                disabled={pending}
                onClick={() => {
                  void run(() => load(view.bookingId, true));
                }}
              >
                Tải thêm lịch sử
              </button>
            )}
            <section className="billing-panel">
              <h2>Tra cứu trạng thái giao dịch</h2>
              <p>Nhập mã giao dịch thanh toán để xem kết quả và tình trạng cập nhật hồ sơ.</p>
              <form
                className="billing-lookup"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(async () => {
                    setAttempt(
                      await authorize((token) =>
                        gateway.loadAttempt(token, view.bookingId, attemptId.trim()),
                      ),
                    );
                  });
                }}
              >
                <label>
                  Mã giao dịch thanh toán
                  <input
                    value={attemptId}
                    onChange={(event) => setAttemptId(event.target.value)}
                    required
                    disabled={pending}
                  />
                </label>
                <button disabled={pending}>Tra cứu giao dịch</button>
              </form>
              {attempt !== null && <AttemptStatus attempt={attempt} />}
            </section>
            <div className="billing-forms">
              <ManualPaymentForm
                key={`manual:${view.bookingId}`}
                bookingId={view.bookingId}
                disabled={pending || (uncertain !== null && uncertain !== 'manual')}
                onConfirm={(body) => mutate('manual', body)}
              />
              <RefundForm
                key={`refund:${view.bookingId}`}
                booking={
                  refundRevision === null ? view : { ...view, billingRevision: refundRevision }
                }
                disabled={pending || (uncertain !== null && uncertain !== 'refund')}
                onConfirm={(body) => mutate('refund', body)}
              />
              <RefundApprovalForm
                key={`approval:${view.bookingId}`}
                booking={
                  approvalRevision === null ? view : { ...view, billingRevision: approvalRevision }
                }
                disabled={pending || (uncertain !== null && uncertain !== 'approval')}
                onConfirm={(body) => mutate('approval', body)}
              />
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
      </div>
    </main>
  );
}
