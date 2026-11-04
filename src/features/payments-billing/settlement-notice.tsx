import { settlementLabels, settlementStatus } from './settlement-status';

type Billing = NonNullable<Parameters<typeof settlementStatus>[0]> &
  Readonly<{ bookingId: string }>;
type Invoices = Readonly<{
  bookingId: string;
  currentRevisionId: string | null;
  revisions: readonly Readonly<{
    invoiceRevisionId: string;
    document: Readonly<{ totalVnd: number }>;
  }>[];
}>;

export function SettlementNotice({
  billing,
  invoices,
}: Readonly<{ billing: Billing | null; invoices: Invoices | null }>) {
  if (!billing || !invoices || billing.bookingId !== invoices.bookingId) return null;
  const current = invoices.revisions.find(
    (invoice) => invoice.invoiceRevisionId === invoices.currentRevisionId,
  );
  if (invoices.currentRevisionId && !current) return null;
  const status = settlementStatus(billing, current?.document.totalVnd ?? null);
  if (status === 'unknown') return null;
  return (
    <p role="status" className="rounded-lg border border-border bg-card p-4 text-sm">
      <strong>{settlementLabels[status]}</strong>
      {status === 'settled' ? ' · Hoá đơn cuối đã chốt, đã thu đủ và không còn công nợ.' : ''}
    </p>
  );
}
