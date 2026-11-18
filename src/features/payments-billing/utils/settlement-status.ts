export type SettlementStatus =
  'unknown' | 'awaiting-invoice' | 'outstanding' | 'credit' | 'settled';

type BillingEvidence = Readonly<{
  bookingId: string;
  billingRevision: number;
  totals: Readonly<{
    acceptedChargesVnd: number;
    netPaidVnd: number;
    outstandingVnd: number;
    creditVnd: number;
  }>;
  balancePaymentEligibility: Readonly<{
    billingRevision: number;
    reasonCode: string | null;
  }> | null;
}>;

type InvoiceEvidence = Readonly<{
  bookingId: string;
  currentRevisionId: string | null;
  revisions: readonly Readonly<{
    invoiceRevisionId: string;
    document: Readonly<{ totalVnd: number }>;
  }>[];
}>;

/** Display only: payment admission remains owned by the backend. */
export function settlementStatus(
  billing: BillingEvidence | null,
  invoices: InvoiceEvidence | null,
): SettlementStatus {
  if (
    !billing ||
    !invoices ||
    billing.bookingId !== invoices.bookingId ||
    billing.balancePaymentEligibility?.billingRevision !== billing.billingRevision
  )
    return 'unknown';
  const reason = billing.balancePaymentEligibility.reasonCode;
  if (reason === 'PAYMENT_ATTEMPT_ACTIVE' || reason === 'FINANCIAL_SOURCE_CONFLICT')
    return 'unknown';
  if (invoices.currentRevisionId === null) return 'awaiting-invoice';
  const current = invoices.revisions.find(
    (invoice) => invoice.invoiceRevisionId === invoices.currentRevisionId,
  );
  const totals = billing.totals;
  if (!current || current.document.totalVnd !== totals.acceptedChargesVnd) return 'unknown';
  if (totals.outstandingVnd > 0) return 'outstanding';
  if (totals.creditVnd > 0) return 'credit';
  return totals.outstandingVnd === 0 &&
    totals.creditVnd === 0 &&
    totals.netPaidVnd === totals.acceptedChargesVnd
    ? 'settled'
    : 'unknown';
}

export const settlementLabels: Record<SettlementStatus, string> = {
  unknown: 'Kiểm tra quyết toán',
  'awaiting-invoice': 'Chờ nhà hàng chốt hoá đơn',
  outstanding: 'Còn công nợ',
  credit: 'Còn tiền thanh toán thừa',
  settled: 'Đã tất toán',
};
