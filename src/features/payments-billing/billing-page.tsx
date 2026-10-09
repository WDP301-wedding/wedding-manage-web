'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  createIdentityApi,
  ManagementIdentitySession,
  type ManagementSessionSnapshot,
} from '../identity-access/session';
import {
  createManagementBillingGateway,
  type AttemptView,
  type BillingView,
  type ManagementBillingGateway,
  type ManualPaymentBody,
  type RefundBody,
} from './billing-api';
import { createBillingIntents } from './billing-intents';
import {
  AttemptStatus,
  BillingHistory,
  BillingSummary,
  billingMessage,
  denied,
  unresolved,
} from './billing-display';
import { ManualPaymentForm, RefundForm, type CommandOutcome } from './payment-forms';

type Authorize = <T>(operation: (token: string) => Promise<T>) => Promise<T>;
type MutationResult =
  | Awaited<ReturnType<ManagementBillingGateway['recordManual']>>
  | Awaited<ReturnType<ManagementBillingGateway['refund']>>;
const identity = new ManagementIdentitySession(createIdentityApi());
const billing = createManagementBillingGateway();
export function ManagementBillingPage({
  session = identity,
  gateway = billing,
}: Readonly<{ session?: ManagementIdentitySession; gateway?: ManagementBillingGateway }>) {
  const [snapshot, setSnapshot] = useState<ManagementSessionSnapshot | null>(null);
  useEffect(() => {
    let active = true;
    void session.restore().then((value) => {
      if (active) setSnapshot(value);
    });
    return () => {
      active = false;
    };
  }, [session]);
  if (snapshot === null)
    return (
      <main className="billing-shell">
        <h1>Đang xác minh quyền quản lý…</h1>
        <p role="status">Đang kiểm tra phiên đăng nhập.</p>
      </main>
    );
  if (snapshot.status !== 'authenticated' || snapshot.presentation !== 'manager')
    return (
      <main className="billing-shell">
        <h1>
          {snapshot.status === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền truy cập billing'}
        </h1>
        <p role="alert">Khu vực này dành cho tài khoản Quản lý.</p>
        <Link href="/">Về trang đăng nhập</Link>
      </main>
    );
  return (
    <ManagementBillingWorkspace
      key={snapshot.actor.accountId}
      accountId={snapshot.actor.accountId}
      authorize={(operation) => session.authorize(operation)}
      gateway={gateway}
    />
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
  const [uncertain, setUncertain] = useState<'manual' | 'refund' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
    setView(
      more && view !== null ? { ...value, history: [...view.history, ...value.history] } : value,
    );
  };
  const mutate = async (
    kind: 'manual' | 'refund',
    body: ManualPaymentBody | RefundBody,
  ): Promise<CommandOutcome> => {
    if (busy.current || view === null) return 'retry';
    busy.current = true;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await intents.run<MutationResult>(`${kind}:${view.bookingId}`, body, (key) =>
        authorize<MutationResult>((token) =>
          kind === 'manual'
            ? gateway.recordManual(token, body as ManualPaymentBody, key)
            : gateway.refund(token, body as RefundBody, key),
        ),
      );
      setUncertain(null);
      setMessage(
        'paymentId' in result
          ? `Đã ghi nhận khoản thu. Mã thanh toán: ${result.paymentId}`
          : `Đã ghi nhận khoản hoàn. Mã hoàn: ${result.refundId}`,
      );
      try {
        await load(view.bookingId);
      } catch (caught) {
        clearDenied(caught);
      }
      return 'succeeded';
    } catch (caught) {
      clearDenied(caught);
      const retry = unresolved(caught);
      setUncertain(retry ? kind : null);
      return retry ? 'retry' : 'failed';
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <main className="billing-shell">
      <a className="skip-link" href="#billing-content">
        Đi đến số dư
      </a>
      <header className="billing-header">
        <div>
          <p>Wedding Estate · Operations</p>
          <h1>Thanh toán và đối soát</h1>
          <p>Kiểm tra số dư, chứng từ và lịch sử của từng hồ sơ.</p>
        </div>
        <nav aria-label="Điều hướng quản lý">
          <Link href="/bookings">Đặt tiệc</Link>
          <Link href="/catalog">Danh mục</Link>
          <Link href="/billing" aria-current="page">
            Billing
          </Link>
        </nav>
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
            onChange={(event) => setBookingId(event.target.value)}
            required
            disabled={pending || uncertain !== null}
          />
        </label>
        <button disabled={pending || uncertain !== null}>Xem billing</button>
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
              <h2>Số dư hồ sơ</h2>
              <button
                className="billing-secondary"
                disabled={pending}
                onClick={() => {
                  void run(() => load(view.bookingId));
                }}
              >
                Làm mới số dư
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
              <h2>Kiểm tra một lần thanh toán</h2>
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
                  Mã lần thanh toán
                  <input
                    value={attemptId}
                    onChange={(event) => setAttemptId(event.target.value)}
                    required
                    disabled={pending}
                  />
                </label>
                <button disabled={pending}>Kiểm tra thanh toán</button>
              </form>
              {attempt !== null && <AttemptStatus attempt={attempt} />}
            </section>
            <div className="billing-forms">
              <ManualPaymentForm
                key={`manual:${view.bookingId}`}
                bookingId={view.bookingId}
                disabled={pending || uncertain === 'refund'}
                onConfirm={(body) => mutate('manual', body)}
              />
              <RefundForm
                key={`refund:${view.bookingId}`}
                booking={view}
                disabled={pending || uncertain === 'manual'}
                onConfirm={(body) => mutate('refund', body)}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
