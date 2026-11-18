import { settlementLabels, settlementStatus } from '@/src/features/payments-billing/utils/settlement-status';

type Billing = Parameters<typeof settlementStatus>[0];
type Invoices = Parameters<typeof settlementStatus>[1];

export function SettlementNotice({
  billing,
  invoices,
}: Readonly<{ billing: Billing; invoices: Invoices }>) {
  const status = settlementStatus(billing, invoices);
  if (status === 'unknown') return null;
  return (
    <p role="status" className="rounded-lg border border-border bg-card p-4 text-sm">
      <strong>{settlementLabels[status]}</strong>
      {status === 'settled' ? ' · Hoá đơn cuối đã chốt, đã thu đủ và không còn công nợ.' : ''}
    </p>
  );
}
