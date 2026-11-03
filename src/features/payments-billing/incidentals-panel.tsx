'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import {
  billingService,
  type IncidentalExpensesResponse,
  type FinalInvoicesResponse,
} from '../../services/billing.service';
import { contractService, type AppendixListData } from '../../services/contract.service';
import { describeApiError } from '../../lib/api/api-errors';
import { formatVnd } from '../../lib/formatters';
import { IncidentalCreateForm, type IncidentalFormData } from './incidental-create-form';
import { IncidentalTable } from './incidental-table';
import { FinalInvoicesList } from './final-invoices-list';
import { notify } from '../../design-system/notifications';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export function IncidentalsPanel({
  bookingId,
  disabled,
  billingRevision,
  onRefresh,
}: Readonly<{
  bookingId: string;
  disabled: boolean;
  billingRevision: number;
  onRefresh: () => void;
}>) {
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [incidentals, setIncidentals] = useState<IncidentalExpensesResponse | null>(null);
  const [finalInvoices, setFinalInvoices] = useState<FinalInvoicesResponse | null>(null);
  const [appendices, setAppendices] = useState<AppendixListData | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const activeBookingIdRef = useRef(bookingId);
  const loadSequence = useRef(0);
  const invoiceIntent = useRef<{ fingerprint: string; key: string } | null>(null);
  const busy = disabled || finalizing || showAddForm || showFinalizeConfirm;

  const loadData = async (targetId = bookingId) => {
    if (!targetId) return;
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError(null);
    try {
      const [incRes, finRes, appRes] = await Promise.allSettled([
        billingService.getIncidentals(targetId),
        billingService.getFinalInvoices(targetId),
        contractService.getAppendices(targetId),
      ]);
      if (activeBookingIdRef.current !== targetId || loadSequence.current !== sequence) return;

      const errors: string[] = [];
      if (incRes.status === 'fulfilled') {
        setIncidentals(incRes.value);
      } else {
        const friendly = describeApiError(incRes.reason);
        errors.push(`Phát sinh: ${friendly.message}`);
      }

      if (finRes.status === 'fulfilled') {
        setFinalInvoices(finRes.value);
      } else {
        const friendly = describeApiError(finRes.reason);
        errors.push(`Hoá đơn: ${friendly.message}`);
      }

      if (appRes.status === 'fulfilled') {
        setAppendices(appRes.value);
      } else {
        setAppendices(null);
        errors.push('Phụ lục: ' + describeApiError(appRes.reason).message);
      }

      if (errors.length > 0) {
        setLoadError(errors.join(' '));
      }
    } catch (err) {
      if (activeBookingIdRef.current !== targetId || loadSequence.current !== sequence) return;
      setLoadError(describeApiError(err).message);
    } finally {
      if (activeBookingIdRef.current === targetId && loadSequence.current === sequence) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    activeBookingIdRef.current = bookingId;
    setIncidentals(null);
    setFinalInvoices(null);
    setAppendices(null);
    setShowFinalizeConfirm(false);
    invoiceIntent.current = null;
    loadSequence.current++;
  }, [bookingId]);

  useLiveRefresh(
    async () => {
      await loadData(bookingId);
    },
    {
      scope: 'settlement:' + bookingId + ':' + billingRevision,
      bookingId,
      initial: true,
      blocked: busy,
      types: ['billing.updated', 'contract.updated', 'booking.updated', 'deposit.received'],
    },
  );

  const handleCreateIncidental = async (formData: IncidentalFormData) => {
    setLoading(true);
    try {
      await billingService.createIncidental(bookingId, {
        ...formData,
        expectedRevision: incidentals?.revision ?? 1,
      });
      const msg = 'Đã thêm chi phí phát sinh thành công.';
      notify.success(msg);
      setShowAddForm(false);
      await loadData();
      onRefresh();
    } catch (err) {
      const friendly = describeApiError(err, {
        EVENT_NOT_ENDED: 'Chỉ có thể ghi nhận phát sinh sau khi tiệc kết thúc.',
      });
      notify.error(err, { message: friendly.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    setLoading(true);
    try {
      await billingService.deleteIncidental(bookingId, lineId, incidentals?.revision ?? 1);
      const msg = 'Đã xoá dòng phát sinh.';
      notify.success(msg);
      await loadData();
      onRefresh();
    } catch (err) {
      const friendly = describeApiError(err);
      notify.error(err, { message: friendly.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeInvoice = async () => {
    if (!appendices?.effectiveRevisionId || !incidentals || loadError || loading) {
      const msg =
        'Chưa thể chốt hoá đơn: không tìm thấy thoả thuận thương mại hiệu lực của booking.';
      notify.error(msg);
      return;
    }
    setFinalizing(true);
    try {
      const body = {
        expectedBillingRevision: billingRevision,
        expectedCommercialRevisionId: appendices.effectiveRevisionId,
        expectedDraftRevision: incidentals?.revision ?? 0,
      };
      const fingerprint = JSON.stringify([bookingId, body]);
      if (invoiceIntent.current?.fingerprint !== fingerprint)
        invoiceIntent.current = { fingerprint, key: crypto.randomUUID() };
      await billingService.finalizeInvoice(bookingId, body, invoiceIntent.current.key);
      invoiceIntent.current = null;
      const msg = 'Đã chốt hoá đơn quyết toán cuối thành công. Sổ cái công nợ đã được khoá sổ.';
      notify.success(msg);
      setShowFinalizeConfirm(false);
      await loadData();
      onRefresh();
    } catch (err) {
      const friendly = describeApiError(err, {
        EVENT_NOT_ENDED:
          'Tiệc chưa kết thúc; chỉ được chốt chi phí phát sinh và hoá đơn sau khi tan tiệc.',
        INVOICE_FINALIZED: 'Hoá đơn quyết toán cuối đã được chốt và khoá sổ từ trước.',
        COMMERCIAL_PREDECESSOR_STALE: 'Thoả thuận thương mại vừa thay đổi. Vui lòng làm mới trang.',
        EXPENSE_REVISION_STALE: 'Dữ liệu phát sinh vừa thay đổi. Vui lòng làm mới trang.',
        STALE_BILLING_REVISION:
          'Số tiền vừa thay đổi. Đóng xác nhận và làm mới trước khi chốt lại.',
        FINANCIAL_SOURCE_CONFLICT:
          'Hồ sơ tài chính chưa khớp. Không chốt lại cho đến khi đối chiếu xong.',
        PAYMENT_ATTEMPT_ACTIVE:
          'Có giao dịch chưa rõ kết quả. Đối soát giao dịch trước khi chốt hóa đơn.',
        INVOICE_STORAGE_NOT_READY:
          'Máy chủ chưa cập nhật đủ cấu trúc hóa đơn. Cần hoàn tất migration BE trước khi chốt.',
      });
      if (friendly.status === 409) {
        setShowFinalizeConfirm(false);
        invoiceIntent.current = null;
        await loadData();
        onRefresh();
      }
      notify.error(err, { message: friendly.message });
    } finally {
      setFinalizing(false);
    }
  };

  const hasFinalizedInvoice = Boolean(finalInvoices && finalInvoices.revisions.length > 0);
  const commercialTotal = appendices?.effectiveTotalVnd ?? null;
  const incidentalTotal = incidentals?.totalVnd ?? null;
  const projectedTotal =
    commercialTotal === null || incidentalTotal === null ? null : commercialTotal + incidentalTotal;

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
          disabled={disabled || loading || finalizing}
          onClick={() => void loadData()}
        >
          {loading ? 'Đang tải…' : 'Làm mới'}
        </Button>
      </div>

      {/* Lỗi tải hiện ngay trong khung (không dùng toast) để người dùng biết vì sao bảng trống. */}
      {loadError && (
        <p className="rounded-lg bg-hy-error-bg px-4 py-3 text-xs text-hy-error">
          Chưa tải được dữ liệu. {loadError}
        </p>
      )}

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
                    !appendices?.effectiveRevisionId
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
          <FinalInvoicesList finalInvoices={finalInvoices} />
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
                disabled={disabled || loading || finalizing}
                onClick={() => setShowAddForm(true)}
              >
                <Plus aria-hidden />
                Thêm chi phí phát sinh
              </Button>
            ) : null}
          </div>

          {showAddForm && !hasFinalizedInvoice ? (
            <IncidentalCreateForm
              disabled={disabled}
              loading={loading}
              onSubmit={handleCreateIncidental}
              onCancel={() => setShowAddForm(false)}
            />
          ) : null}

          <IncidentalTable
            incidentals={incidentals}
            disabled={disabled || hasFinalizedInvoice}
            loading={loading}
            onDeleteLine={handleDeleteLine}
          />
        </div>
      </div>
    </section>
  );
}
