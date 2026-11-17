'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChartNoAxesCombined, CreditCard } from 'lucide-react';
import { Button, buttonVariants } from '@/src/components/ui/button';
import { notify } from '@/src/design-system/notifications/index';
import { CompletedEventsDashboard } from '@/src/features/finance/revenue/components/completed-events-dashboard';
import { OperationsShell } from '@/src/components/layout/operations-shell';
import { sharedManagementSession } from '@/src/features/identity-access/session/session';
import { useManagementSession } from '@/src/features/identity-access/session/use-management-session';
import { createManagementBillingGateway } from '@/src/features/payments-billing/api/billing-api';
import {
  ManagementBillingWorkspace,
  type BillingWorkspaceState,
} from '@/src/features/payments-billing/pages/billing-page';

type FinanceTab = 'revenue' | 'payments';
type Selection = { tab: FinanceTab; bookingId: string | null };
const gateway = createManagementBillingGateway();
const authorize: Parameters<typeof ManagementBillingWorkspace>[0]['authorize'] = (operation) =>
  sharedManagementSession.authorize(operation);
const tabs = [
  { id: 'revenue', label: 'Doanh thu', Icon: ChartNoAxesCombined },
  { id: 'payments', label: 'Thanh toán', Icon: CreditCard },
] as const;

function readSelection(initialTab: FinanceTab): Selection {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const id = params.get('paymentBookingId') ?? params.get('bookingId');
  return {
    tab: tab === 'revenue' || tab === 'payments' ? tab : initialTab,
    bookingId:
      id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null,
  };
}

function writeSelection(selection: Selection, replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', selection.tab);
  // The finance workspace owns selection; changing it must not remount the global
  // booking boundary and discard report filters or an unrelated payment draft.
  url.searchParams.delete('bookingId');
  if (selection.bookingId) url.searchParams.set('paymentBookingId', selection.bookingId);
  else url.searchParams.delete('paymentBookingId');
  if (url.href !== window.location.href) {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  }
}

function FinanceWorkspace({
  accountId,
  initialTab,
}: Readonly<{ accountId: string; initialTab: FinanceTab }>) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const current = useRef<Selection | null>(null);
  const billingState = useRef<BillingWorkspaceState>({ bookingId: null, blocked: false });
  const [blocked, setBlocked] = useState(false);
  const [visited, setVisited] = useState({ revenue: false, payments: false });
  const [paymentEpoch, setPaymentEpoch] = useState(0);
  const [reportRefresh, setReportRefresh] = useState(0);

  const select = useCallback((next: Selection, fromHistory = false) => {
    const previous = current.current;
    const differentBooking = next.bookingId !== previous?.bookingId;
    const reopenEmptyWorkspace =
      previous !== null &&
      next.tab === 'payments' &&
      next.bookingId !== null &&
      billingState.current.bookingId === null &&
      !billingState.current.blocked;
    if (differentBooking && billingState.current.blocked) {
      notify.warning('Hoàn tất hoặc bỏ thao tác thanh toán đang mở trước khi đổi sang tiệc khác.');
      if (previous) writeSelection(previous, true);
      return;
    }
    if (next.tab === 'revenue' && previous?.tab === 'payments')
      setReportRefresh((value) => value + 1);
    if ((differentBooking || reopenEmptyWorkspace) && previous) {
      billingState.current = { bookingId: null, blocked: false };
      setBlocked(false);
      setPaymentEpoch((value) => value + 1);
    }
    current.current = next;
    writeSelection(next, fromHistory);
    setSelection(next);
    setVisited((value) => ({ ...value, [next.tab]: true }));
  }, []);

  useEffect(() => {
    select(readSelection(initialTab), true);
    const onPopState = () => select(readSelection(initialTab), true);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [initialTab, select]);

  const onWorkspaceStateChange = useCallback((state: BillingWorkspaceState) => {
    billingState.current = state;
    setBlocked(state.blocked);
    const previous = current.current;
    if (previous && state.bookingId && previous.bookingId !== state.bookingId) {
      const next = { ...previous, bookingId: state.bookingId };
      current.current = next;
      setSelection(next);
      writeSelection(next, true);
    }
  }, []);

  if (!selection) return <p role="status">Đang mở không gian tài chính…</p>;
  return (
    <>
      <div
        role="tablist"
        aria-label="Tài chính"
        className="flex w-fit max-w-full gap-1 rounded-xl border border-border bg-card p-1"
      >
        {tabs.map(({ id, label, Icon }, index) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`finance-tab-${id}`}
            aria-controls={`finance-panel-${id}`}
            aria-selected={selection.tab === id}
            tabIndex={selection.tab === id ? 0 : -1}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${selection.tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
            onClick={() => select({ ...selection, tab: id })}
            onKeyDown={(event) => {
              const target =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : event.key === 'ArrowRight'
                      ? (index + 1) % tabs.length
                      : event.key === 'ArrowLeft'
                        ? (index + tabs.length - 1) % tabs.length
                        : null;
              if (target === null) return;
              const targetTab = tabs[target];
              if (!targetTab) return;
              event.preventDefault();
              document.getElementById(`finance-tab-${targetTab.id}`)?.focus();
              select({ ...selection, tab: targetTab.id });
            }}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
      {blocked && selection.tab === 'revenue' && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm"
        >
          <p>Thao tác thanh toán đang được giữ. Hoàn tất hoặc bỏ thao tác trước khi đổi tiệc.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => select({ ...selection, tab: 'payments' })}
          >
            Trở lại thanh toán
          </Button>
        </div>
      )}
      <section
        role="tabpanel"
        id="finance-panel-revenue"
        aria-labelledby="finance-tab-revenue"
        hidden={selection.tab !== 'revenue'}
        inert={selection.tab !== 'revenue'}
        tabIndex={0}
      >
        {visited.revenue && (
          <CompletedEventsDashboard
            refreshToken={reportRefresh}
            onOpenBilling={(bookingId) => select({ tab: 'payments', bookingId })}
          />
        )}
      </section>
      <section
        role="tabpanel"
        id="finance-panel-payments"
        aria-labelledby="finance-tab-payments"
        hidden={selection.tab !== 'payments'}
        inert={selection.tab !== 'payments'}
        tabIndex={0}
      >
        {visited.payments && (
          <ManagementBillingWorkspace
            key={paymentEpoch}
            accountId={accountId}
            authorize={authorize}
            gateway={gateway}
            embedded
            onWorkspaceStateChange={onWorkspaceStateChange}
          />
        )}
      </section>
    </>
  );
}

export function ManagementFinancePage({
  initialTab = 'revenue',
}: Readonly<{ initialTab?: FinanceTab }>) {
  const { snapshot, loggingOut, logoutError, logout } = useManagementSession();
  useEffect(() => {
    if (logoutError) notify.error(logoutError);
  }, [logoutError]);
  return (
    <OperationsShell
      activePage="finance"
      contentId="finance-content"
      snapshot={snapshot}
      onLogout={logout}
      pending={loggingOut}
    >
      <main
        data-ui-v3
        id="finance-content"
        className="flex min-h-screen min-w-0 flex-col gap-6 bg-background p-[clamp(1rem,3vw,3.25rem)]"
      >
        <header>
          <h1 className="text-2xl font-bold leading-snug">Tài chính</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi doanh thu và xử lý thanh toán theo từng tiệc.
          </p>
        </header>
        {snapshot === null ? (
          <p role="status">Đang kiểm tra phiên đăng nhập.</p>
        ) : snapshot.status === 'authenticated' && snapshot.presentation === 'manager' ? (
          <FinanceWorkspace
            key={snapshot.actor.accountId}
            accountId={snapshot.actor.accountId}
            initialTab={initialTab}
          />
        ) : (
          <section className="flex flex-col items-start gap-3">
            <h2 className="text-lg font-semibold">
              {snapshot.status === 'anonymous' ? 'Cần đăng nhập' : 'Không có quyền xem tài chính'}
            </h2>
            <p>Khu vực này dành cho tài khoản Quản lý.</p>
            <Link className={buttonVariants()} href="/">
              Về trang đăng nhập
            </Link>
          </section>
        )}
      </main>
    </OperationsShell>
  );
}
