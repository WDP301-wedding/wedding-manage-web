export type SettlementStatus =
  'unknown' | 'awaiting-invoice' | 'outstanding' | 'credit' | 'settled';

type BillingEvidence = Readonly<{
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

/** Display only: payment admission remains owned by the backend. */
export function settlementStatus(
  billing: BillingEvidence | null,
  invoiceTotalVnd: number | null,
): SettlementStatus {
  if (!billing || billing.balancePaymentEligibility?.billingRevision !== billing.billingRevision)
    return 'unknown';
  const reason = billing.balancePaymentEligibility.reasonCode;
  if (reason === 'PAYMENT_ATTEMPT_ACTIVE' || reason === 'FINANCIAL_SOURCE_CONFLICT')
    return 'unknown';
  if (invoiceTotalVnd === null) return 'awaiting-invoice';
  const totals = billing.totals;
  if (invoiceTotalVnd !== totals.acceptedChargesVnd) return 'unknown';
  if (totals.outstandingVnd > 0) return 'outstanding';
  if (totals.creditVnd > 0) return 'credit';
  return totals.netPaidVnd === totals.acceptedChargesVnd ? 'settled' : 'unknown';
}

export const settlementLabels: Record<SettlementStatus, string> = {
  unknown: 'Kiểm tra quyết toán',
  'awaiting-invoice': 'Chờ nhà hàng chốt hoá đơn',
  outstanding: 'Còn công nợ',
  credit: 'Còn tiền thanh toán thừa',
  settled: 'Đã tất toán',
};
