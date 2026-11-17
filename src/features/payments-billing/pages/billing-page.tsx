'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import {
  type ManagementIdentitySession,
  sharedManagementSession,
} from '@/src/features/identity-access/session/session';
import { OperationsShell } from '@/src/components/layout/operations-shell';
import { useManagementSession } from '@/src/features/identity-access/session/use-management-session';
import { notify } from '@/src/design-system/notifications/index';
import { createManagementBillingGateway, type ManagementBillingGateway } from '@/src/features/payments-billing/api/billing-api';
import type { BillingIntents } from '@/src/features/payments-billing/state/billing-intents';
import { BillingHistory, BillingSummary } from '@/src/features/payments-billing/components/overview/billing-display';
import { BillingFinancialOverview } from '@/src/features/payments-billing/components/overview/billing-financial-overview';
import { BillingMutationsSection } from '@/src/features/payments-billing/components/recording/billing-mutations-section';
import { IncidentalsPanel } from '@/src/features/payments-billing/components/settlement/incidentals-panel';
import { BillingRecoveryPanel } from '@/src/features/payments-billing/components/recording/billing-recovery-panel';
import { BillingBookingLookup } from '@/src/features/payments-billing/components/recording/billing-booking-lookup';
import { cardClass, pageStateClass } from '@/src/features/payments-billing/styles/billing-form-classes';
import { type Authorize, useBillingWorkspace } from '@/src/features/payments-billing/hooks/use-billing-workspace';

const identity = sharedManagementSession;
const billing = createManagementBillingGateway();

export type BillingWorkspaceState = Readonly<{ bookingId: string | null; blocked: boolean }>;

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
  archiveMode = false,
  embedded = false,
  onWorkspaceStateChange,
}: Readonly<{
  accountId: string;
  authorize: Authorize;
  gateway: ManagementBillingGateway;
  intents?: BillingIntents;
  archiveMode?: boolean;
  embedded?: boolean;
  onWorkspaceStateChange?: (state: BillingWorkspaceState) => void;
}>) {
  const billing = useBillingWorkspace({ accountId, authorize, gateway, intents });
  const { view, pending, uncertain } = billing;

  const blocked = pending || uncertain !== null || billing.editing || billing.refreshingAfterWrite;
  const selectedBookingId = view?.bookingId ?? null;
  useEffect(() => {
    onWorkspaceStateChange?.({ bookingId: selectedBookingId, blocked });
  }, [onWorkspaceStateChange, selectedBookingId, blocked]);

  const Container = archiveMode || embedded ? 'section' : 'main';
  const Heading = embedded ? 'h2' : 'h1';
  return (
    <Container
      data-ui-v3
      className={
        archiveMode || embedded
          ? 'flex flex-col gap-5'
          : 'flex min-h-screen flex-col gap-6 bg-background p-[clamp(1rem,3vw,3.25rem)]'
      }
      id={embedded ? 'finance-payment-workspace' : 'billing-content'}
    >
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex max-w-xl min-w-0 flex-[1_1_360px] flex-col gap-1">
          {view !== null && !archiveMode && (
            <Link
              className="inline-flex items-center gap-1 self-start text-xs font-semibold text-primary hover:underline"
              href={`/bookings?bookingId=${encodeURIComponent(view.bookingId)}`}
            >
              <ArrowLeft aria-hidden className="size-3.5" />
              Về hồ sơ tiệc
            </Link>
          )}
          <Heading className="text-2xl font-bold">Quản lý thanh toán</Heading>
          <p className="text-muted-foreground">
            Theo dõi tiền đặt tiệc, ghi nhận khoản thu và hoàn tiền.
          </p>
        </div>
        {!archiveMode && (
          <BillingBookingLookup
            value={billing.bookingId}
            disabled={
              pending || uncertain !== null || billing.editing || billing.refreshingAfterWrite
            }
            matches={billing.searchMatches}
            open={billing.showDropdown}
            onChange={billing.handleBookingInputChange}
            onFocus={() => {
              if (billing.searchMatches.length > 0) billing.setShowDropdown(true);
            }}
            onSelect={billing.selectLookupBooking}
            onSubmit={billing.submitLookup}
            onClose={() => billing.setShowDropdown(false)}
          />
        )}
      </header>

      {billing.lookupError ? (
        <p role="alert" className="text-sm text-hy-error">
          {billing.lookupError}
        </p>
      ) : null}
      {billing.waiting ? (
        <p role="status" className="text-sm text-muted-foreground">
          Có cập nhật mới. Dữ liệu sẽ đồng bộ khi bạn hoàn tất hoặc bỏ nội dung đang nhập.
        </p>
      ) : null}
      {billing.refreshingAfterWrite ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang cập nhật số liệu sau ghi nhận. Chỉ mở thao tác mới khi sổ đã đồng bộ.
        </p>
      ) : null}
      {billing.editing ? (
        <p className="text-xs text-muted-foreground">
          Đang giữ nội dung bạn nhập. Bỏ hoặc hoàn tất thao tác để nhận cập nhật mới; dữ liệu gửi
          vẫn được máy chủ kiểm tra lại.
        </p>
      ) : null}
      {/* empty:sr-only giữ vùng thông báo trong cây trợ năng nhưng không chiếm chỗ khi trống. */}
      <div className="empty:sr-only" aria-live="polite">
        {pending && (
          <p role="status" className="sr-only">
            Đang xử lý yêu cầu…
          </p>
        )}
      </div>

      {view === null && !billing.lookupError && (
        <div className="flex flex-col gap-6" aria-busy="true">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      )}

      {view !== null && (
        <>
          {billing.identity ? (
            <p className="rounded-lg bg-muted p-3 text-sm">
              <strong>
                {billing.identity.bookingCode} · {billing.identity.customerName}
              </strong>{' '}
              · {billing.identity.hallName} ·{' '}
              {billing.identity.eventDate.split('-').reverse().join('/')} ·{' '}
              {billing.identity.shiftCode === 'LUNCH' ? 'Trưa' : 'Tối'}
            </p>
          ) : null}
          {billing.recordingError ? (
            <p role="alert" className="text-sm text-hy-error">
              {billing.recordingError}
            </p>
          ) : null}
          {billing.recovery ? (
            <BillingRecoveryPanel
              recovery={billing.recovery}
              pending={pending}
              onRetry={() => void billing.retryRecovery()}
            />
          ) : null}
          {!archiveMode && (
            <BillingFinancialOverview
              bookingId={view.bookingId}
              overview={view.financialOverview}
            />
          )}

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              disabled={pending || billing.editing}
              onClick={() => void billing.refresh()}
            >
              Cập nhật thông tin
            </Button>
          </div>
          {archiveMode && <BillingSummary view={view} />}

          <div className="flex flex-wrap items-start gap-6">
            <div className={billing.recovery?.body ? 'hidden' : 'contents'}>
              <BillingMutationsSection
                view={view}
                archiveMode={archiveMode}
                pending={
                  pending ||
                  billing.refreshingAfterWrite ||
                  billing.settlementEditing ||
                  !billing.recording
                }
                uncertain={uncertain}
                refundRevision={billing.refundRevision}
                approvalRevision={billing.approvalRevision}
                recording={billing.recording}
                formEpoch={billing.formEpoch}
                onEditingChange={billing.setPaymentEditing}
                onLoadMoreSources={billing.loadRefundSources}
                onMutate={billing.mutate}
              />
            </div>

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

          {!archiveMode && billing.recording?.bookingPhase !== 'COMPLETED' ? (
            <p role="status" className="rounded-lg bg-secondary p-3 text-sm">
              Chỉ được quyết toán và thu phần còn lại sau khi đánh dấu tiệc đã tổ chức xong.{' '}
              <a
                className="font-semibold text-primary underline"
                href={`/bookings?bookingId=${view.bookingId}`}
              >
                Mở hồ sơ tiệc
              </a>
            </p>
          ) : null}
          {!archiveMode && (
            <IncidentalsPanel
              bookingId={view.bookingId}
              billing={view}
              billingRevision={view.billingRevision}
              disabled={
                pending ||
                billing.refreshingAfterWrite ||
                billing.paymentEditing ||
                billing.recording?.bookingPhase !== 'COMPLETED' ||
                billing.recovery !== null
              }
              onEditingChange={billing.setSettlementEditing}
              onRefresh={billing.scheduleRefresh}
            />
          )}
        </>
      )}
    </Container>
  );
}
