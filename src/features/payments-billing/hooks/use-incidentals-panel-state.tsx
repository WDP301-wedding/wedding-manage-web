'use client';
import { useEffect, useRef, useState } from 'react';
import { useLiveRefresh } from '@/src/features/realtime/hooks/use-live-refresh';
import {
  billingService,
  type IncidentalExpensesResponse,
  type FinalInvoicesResponse,
} from '@/src/services/billing/billing.service';
import { contractService, type AppendixListData } from '@/src/services/bookings/contract.service';
import { describeApiError } from '@/src/lib/api/api-errors';
import { type IncidentalFormData } from '@/src/features/payments-billing/components/settlement/incidental-create-form';
import { notify } from '@/src/design-system/notifications/index';
import type { BillingView } from '@/src/features/payments-billing/api/billing-api';

export type IncidentalsPanelProps = Readonly<{
  bookingId: string;
  disabled: boolean;
  billingRevision: number;
  billing: BillingView;
  onRefresh: () => void;
  onEditingChange?: (value: boolean) => void;
}>;
export function useIncidentalsPanelState({
  bookingId,
  disabled,
  billingRevision,
  billing,
  onRefresh,
  onEditingChange,
}: IncidentalsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [incidentals, setIncidentals] = useState<IncidentalExpensesResponse | null>(null);
  const [finalInvoices, setFinalInvoices] = useState<FinalInvoicesResponse | null>(null);
  const [appendices, setAppendices] = useState<AppendixListData | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [invoicePageLoading, setInvoicePageLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const activeBookingIdRef = useRef(bookingId);
  const loadSequence = useRef(0);
  const deleteIntent = useRef<{ fingerprint: string; key: string } | null>(null);
  const invoiceIntent = useRef<{ fingerprint: string; key: string } | null>(null);
  const busy =
    disabled ||
    finalizing ||
    showAddForm ||
    showFinalizeConfirm ||
    showAdjustment ||
    loading ||
    invoicePageLoading;
  useEffect(() => {
    onEditingChange?.(showAddForm || showFinalizeConfirm || showAdjustment || finalizing);
  }, [showAddForm, showFinalizeConfirm, showAdjustment, finalizing, onEditingChange]);
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
    setShowAddForm(false);
    setShowAdjustment(false);
    deleteIntent.current = null;
    invoiceIntent.current = null;
    loadSequence.current++;
  }, [bookingId]);
  const live = useLiveRefresh(
    async () => {
      await loadData(bookingId);
    },
    {
      scope: 'settlement:' + bookingId,
      bookingId,
      initial: true,
      blocked: busy,
      types: ['billing.updated', 'contract.updated', 'booking.updated', 'deposit.received'],
    },
  );
  const handleCreateIncidental = async (formData: IncidentalFormData) => {
    if (!incidentals || loadError) return;
    setLoading(true);
    try {
      await billingService.createIncidental(bookingId, {
        ...formData,
        expectedRevision: incidentals.revision,
      });
      const msg = 'Đã thêm chi phí phát sinh thành công.';
      notify.success(msg);
      setShowAddForm(false);
      live.schedule();
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
    if (!incidentals || loadError || loading || finalizing) return;
    const { revision } = incidentals;
    setLoading(true);
    try {
      const fingerprint = JSON.stringify([bookingId, lineId, revision]);
      if (deleteIntent.current?.fingerprint !== fingerprint)
        deleteIntent.current = { fingerprint, key: crypto.randomUUID() };
      const intent = deleteIntent.current;
      await billingService.deleteIncidental(bookingId, lineId, revision, intent.key);
      if (deleteIntent.current === intent) deleteIntent.current = null;
      const msg = 'Đã xoá dòng phát sinh.';
      notify.success(msg);
      live.schedule();
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
      live.schedule();
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
        live.schedule();
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
  return {
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
  };
}
