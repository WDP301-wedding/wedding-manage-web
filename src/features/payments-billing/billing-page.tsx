'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/button';
import {
  type ManagementIdentitySession,
  sharedManagementSession,
} from '../identity-access/session';
import { OperationsShell } from '../identity-access/operations-shell';
import { useManagementSession } from '../identity-access/use-management-session';
import { notify } from '../../design-system/notifications';
import { createManagementBillingGateway, type ManagementBillingGateway } from './billing-api';
import type { createBillingIntents } from './billing-intents';
import { BillingHistory, BillingSummary } from './billing-display';
import { BillingMutationsSection } from './billing-mutations-section';
import { IncidentalsPanel } from './incidentals-panel';
import { BillingBookingLookup } from './billing-booking-lookup';
import { cardClass, pageStateClass } from './billing-form-classes';
import { type Authorize, useBillingWorkspace } from './use-billing-workspace';

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
      <main data-ui-v3 className={pageStateClass} id="billing-content">
        <h1 className="text-2xl font-bold">Đang xác minh quyền quản lý…</h1>
        <p role="status" className="text-muted-foreground">
          Đang kiểm tra phiên đăng nhập.
        </p>
      </main>
    );
  } else if (snapshot.status !== 'authenticated' || snapshot.presentation !== 'manager') {
    content = (
      <main data-ui-v3 className={pageStateClass} id="billing-content">
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
  intents,
}: Readonly<{
  accountId: string;
  authorize: Authorize;
  gateway: ManagementBillingGateway;
  intents?: ReturnType<typeof createBillingIntents>;
}>) {
  const billing = useBillingWorkspace({ accountId, authorize, gateway, intents });
  const { view, pending, uncertain } = billing;

  return (
    <main
      data-ui-v3
      className="flex min-h-screen flex-col gap-6 bg-background p-[clamp(1rem,3vw,3.25rem)]"
      id="billing-content"
    >
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex max-w-xl min-w-0 flex-[1_1_360px] flex-col gap-1">
          {view !== null && (
            <Link
              className="inline-flex items-center gap-1 self-start text-xs font-semibold text-primary hover:underline"
              href={`/bookings?bookingId=${encodeURIComponent(view.bookingId)}`}
            >
              <ArrowLeft aria-hidden className="size-3.5" />
              Về hồ sơ tiệc
            </Link>
          )}
          <h1 className="text-2xl font-bold">Quản lý thanh toán</h1>
          <p className="text-muted-foreground">
            Theo dõi tiền đặt tiệc, ghi nhận khoản thu và hoàn tiền.
          </p>
        </div>
        <BillingBookingLookup
          value={billing.bookingId}
          disabled={pending || uncertain !== null}
          matches={billing.searchMatches}
          open={billing.showDropdown}
          onChange={billing.handleBookingInputChange}
          onFocus={() => {
            if (billing.searchMatches.length > 0) billing.setShowDropdown(true);
          }}
          onSelect={billing.selectLookupBooking}
          onSubmit={billing.submitLookup}
        />
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
                void billing.run(() => billing.load(view.bookingId));
              }}
            >
              Cập nhật thông tin
            </Button>
          </div>

          <BillingSummary view={view} />

          <div className="flex flex-wrap items-start gap-6">
            <BillingMutationsSection
              view={view}
              pending={pending}
              uncertain={uncertain}
              refundRevision={billing.refundRevision}
              approvalRevision={billing.approvalRevision}
              onMutate={billing.mutate}
            />

            <div className={`${cardClass} flex-[1_1_440px]`}>
              <BillingHistory view={view} />
              {view.nextCursor !== null && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={pending}
                  onClick={() => {
                    void billing.run(() => billing.load(view.bookingId, true));
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
              void billing.run(() => billing.load(view.bookingId));
            }}
          />
        </>
      )}
    </main>
  );
}
