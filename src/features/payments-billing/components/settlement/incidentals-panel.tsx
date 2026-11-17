'use client';
import { Lock, Plus } from 'lucide-react';
import { billingService } from '@/src/services/billing/billing.service';
import { formatVnd } from '@/src/lib/formatting/formatters';
import { IncidentalCreateForm } from './incidental-create-form';
import { IncidentalTable } from './incidental-table';
import { InvoiceAdjustmentForm } from './invoice-adjustment-form';
import { FinalInvoicesList } from './final-invoices-list';
import { notify } from '@/src/design-system/notifications/index';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { SettlementNotice } from './settlement-notice';
import { ExpenseReviewControls } from './expense-review-controls';
import {
  useIncidentalsPanelState,
  type IncidentalsPanelProps,
} from '@/src/features/payments-billing/hooks/use-incidentals-panel-state';

export function IncidentalsPanel(props: IncidentalsPanelProps) {
  const model = useIncidentalsPanelState(props);
  const {
    bookingId,
    disabled,
    billingRevision,
    billing,
    onRefresh,
    loading,
    finalizing,
    incidentals,
    finalInvoices,
    setFinalInvoices,
    appendices,
    showAdjustment,
    setShowAdjustment,
    invoicePageLoading,
    setInvoicePageLoading,
    showAddForm,
    setShowAddForm,
    showFinalizeConfirm,
    setShowFinalizeConfirm,
    loadError,
    activeBookingIdRef,
    loadSequence,
    busy,
    loadData,
    live,
    handleCreateIncidental,
    handleDeleteLine,
    handleFinalizeInvoice,
    hasFinalizedInvoice,
    commercialTotal,
    incidentalTotal,
    projectedTotal,
  } = model;
  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-hy-1">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">Chi phí phát sinh &amp; Hoá đơn cuối</h2>
          <p className="text-xs text-muted-foreground">
            Ghi nhận các khoản phát sinh sau giờ tiệc và kiểm tra quyết toán hoá đơn.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void loadData()}
        >
          {loading ? 'Đang tải…' : 'Làm mới'}
        </Button>
      </div>

      {!loading && !loadError ? (
        <SettlementNotice billing={billing} invoices={finalInvoices} />
      ) : null}

      {/* Lỗi tải hiện ngay trong khung (không dùng toast) để người dùng biết vì sao bảng trống. */}
      {loadError && (
        <p className="rounded-lg bg-hy-error-bg px-4 py-3 text-xs text-hy-error">
          Chưa tải được dữ liệu. {loadError}
        </p>
      )}

      {incidentals ? (
        <ExpenseReviewControls
          currentInvoiceRevisionId={finalInvoices?.currentRevisionId ?? null}
          bookingId={bookingId}
          data={incidentals}
          disabled={disabled || loading || finalizing || Boolean(loadError)}
          onSaved={() => {
            live.schedule();
            onRefresh();
          }}
        />
      ) : null}
      {/* Bố cục 2 cột: trái là quyết toán và hoá đơn cuối, phải là chi phí phát sinh nháp. */}
      <div className="flex flex-wrap items-start gap-6">
        {/* CỘT TRÁI: Nghiệp vụ tất toán sau tiệc & Hoá đơn cuối */}
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5">
          {!hasFinalizedInvoice ? (
            <div className="flex flex-col gap-4 rounded-lg bg-muted p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Nghiệp vụ tất toán sau tiệc</span>
                  <h3 className="text-base font-semibold">Chốt hoá đơn quyết toán cuối</h3>
                  <p className="text-xs text-muted-foreground">
                    Sau khi tiệc cưới kết thúc và phát sinh được ghi nhận đầy đủ, Quản lý tiến hành
                    chốt hoá đơn để khoá sổ các khoản phát sinh và làm căn cứ thanh toán số dư hoặc
                    hoàn tiền.
                  </p>
                  {!appendices?.effectiveRevisionId ? (
                    <p className="text-xs font-medium text-hy-warning">
                      Cần hoàn tất hợp đồng và đặt cọc để xác định thoả thuận thương mại trước khi
                      chốt hoá đơn.
                    </p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  disabled={
                    disabled ||
                    loading ||
                    finalizing ||
                    Boolean(loadError) ||
                    !incidentals ||
                    !appendices?.effectiveRevisionId ||
                    (incidentals.approvalRequired && !incidentals.canFinalize)
                  }
                  onClick={() => setShowFinalizeConfirm(true)}
                >
                  Chốt hoá đơn quyết toán
                </Button>
              </div>

              {/* Bảng tóm tắt tài chính quyết toán dự kiến */}
              <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 rounded-lg bg-card px-4 py-3">
                <div className="flex flex-col">
                  <dt className="text-2xs text-muted-foreground">
                    Thoả thuận thương mại hiệu lực:
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {commercialTotal === null ? 'Chưa xác định' : formatVnd(commercialTotal)}
                  </dd>
                  {appendices?.effectiveRevisionId ? (
                    <small className="text-2xs text-muted-foreground">
                      Phiên bản: {appendices.effectiveRevisionId.slice(0, 8)}…
                    </small>
                  ) : null}
                </div>

                <div className="flex flex-col">
                  <dt className="text-2xs text-muted-foreground">
                    Tổng phát sinh ({incidentals?.lines?.length ?? 0} khoản):
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {incidentalTotal === null ? 'Chưa xác định' : formatVnd(incidentalTotal)}
                  </dd>
                </div>

                <div className="flex flex-col">
                  <dt className="text-2xs text-muted-foreground">Tổng quyết toán cuối dự kiến:</dt>
                  <dd className="text-lg font-bold text-primary tabular-nums">
                    {projectedTotal === null ? 'Chưa xác định' : formatVnd(projectedTotal)}
                  </dd>
                </div>
              </dl>

              {/* Hộp xác nhận chốt hoá đơn */}
              {showFinalizeConfirm ? (
                <div
                  role="group"
                  aria-labelledby="finalize-invoice-title"
                  className="flex flex-col gap-3 rounded-lg border-2 border-primary bg-card p-4"
                >
                  <h4 id="finalize-invoice-title" className="font-semibold text-primary">
                    Xác nhận chốt hoá đơn quyết toán cuối
                  </h4>
                  <p className="text-xs">
                    Hoá đơn sau khi chốt là <strong>chứng từ pháp lý và kế toán bất biến</strong>.
                    Toàn bộ chi phí phát sinh nháp (Bản {incidentals?.revision ?? 0}) sẽ được đóng
                    sổ và tích hợp chính thức vào công nợ cuối cùng của tiệc với tổng tiền{' '}
                    <strong>
                      {projectedTotal === null ? 'Chưa xác định' : formatVnd(projectedTotal)}
                    </strong>
                    .
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={finalizing}
                      onClick={() => setShowFinalizeConfirm(false)}
                    >
                      Huỷ bỏ
                    </Button>
                    <Button type="button" disabled={finalizing} onClick={handleFinalizeInvoice}>
                      {finalizing ? 'Đang chốt hoá đơn…' : 'Xác nhận chốt hoá đơn'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Danh sách hoá đơn cuối đã chốt */}
          {showAdjustment &&
          finalInvoices?.revisions.find(
            (item) => item.invoiceRevisionId === finalInvoices.currentRevisionId,
          ) ? (
            <InvoiceAdjustmentForm
              pricing={incidentals?.pricing ?? []}
              approvalRequired={incidentals?.approvalRequired ?? false}
              key={finalInvoices.currentRevisionId}
              bookingId={bookingId}
              current={finalInvoices.revisions.find(
                (item) => item.invoiceRevisionId === finalInvoices.currentRevisionId,
              )!}
              billingRevision={billingRevision}
              disabled={disabled || loading}
              onCancel={() => setShowAdjustment(false)}
              onSaved={() => {
                setShowAdjustment(false);
                live.schedule();
                onRefresh();
              }}
            />
          ) : null}
          {!showAdjustment ? (
            <FinalInvoicesList
              finalInvoices={finalInvoices}
              disabled={disabled || loading || busy || Boolean(loadError)}
              onAdjust={() => setShowAdjustment(true)}
            />
          ) : null}
          {finalInvoices?.nextCursor ? (
            <Button
              type="button"
              variant="outline"
              disabled={invoicePageLoading || busy}
              onClick={() => {
                const previous = finalInvoices;
                const sequence = loadSequence.current;
                setInvoicePageLoading(true);
                void billingService
                  .getFinalInvoices(bookingId, previous.nextCursor ?? undefined)
                  .then((page) => {
                    if (
                      activeBookingIdRef.current !== bookingId ||
                      sequence !== loadSequence.current
                    )
                      return;
                    if (page.currentRevisionId !== previous.currentRevisionId) {
                      notify.warning('Có hóa đơn mới. Hãy làm mới trước khi xem tiếp.');
                      return;
                    }
                    setFinalInvoices({
                      ...page,
                      revisions: [...previous.revisions, ...page.revisions],
                    });
                  })
                  .catch((cause: unknown) => notify.error(cause))
                  .finally(() => setInvoicePageLoading(false));
              }}
            >
              Xem phiên bản hóa đơn cũ hơn
            </Button>
          ) : null}
        </div>

        {/* CỘT PHẢI: Chi phí phát sinh nháp & Bảng kê */}
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3 rounded-lg border border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col items-start gap-1">
              <h3 className="text-base font-semibold">
                Chi phí phát sinh nháp ({incidentals?.lines?.length ?? 0}) · Bản{' '}
                {incidentals?.revision ?? 0}
              </h3>
              {hasFinalizedInvoice ? (
                <Badge variant="success">
                  <Lock aria-hidden />
                  Đã khoá sổ chi phí theo hoá đơn cuối
                </Badge>
              ) : null}
            </div>

            {!hasFinalizedInvoice && !showAddForm ? (
              <Button
                type="button"
                size="sm"
                disabled={
                  disabled ||
                  loading ||
                  finalizing ||
                  showFinalizeConfirm ||
                  showAdjustment ||
                  Boolean(loadError) ||
                  !incidentals ||
                  (incidentals.approvalRequired &&
                    Boolean(
                      incidentals.currentReview && incidentals.currentReview.state !== 'WITHDRAWN',
                    ))
                }
                onClick={() => setShowAddForm(true)}
              >
                <Plus aria-hidden />
                Thêm chi phí phát sinh
              </Button>
            ) : null}
          </div>

          {showAddForm && !hasFinalizedInvoice ? (
            <IncidentalCreateForm
              pricing={incidentals?.approvalRequired ? incidentals.pricing : undefined}
              disabled={disabled}
              loading={loading}
              onSubmit={handleCreateIncidental}
              onCancel={() => setShowAddForm(false)}
            />
          ) : null}

          <IncidentalTable
            incidentals={incidentals}
            disabled={
              disabled ||
              hasFinalizedInvoice ||
              finalizing ||
              showFinalizeConfirm ||
              showAdjustment ||
              Boolean(loadError) ||
              Boolean(
                incidentals?.approvalRequired &&
                incidentals.currentReview &&
                incidentals.currentReview.state !== 'WITHDRAWN',
              )
            }
            loading={loading}
            onDeleteLine={handleDeleteLine}
          />
        </div>
      </div>
    </section>
  );
}
