import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettlementNotice } from './settlement-notice';

const billing = {
  bookingId: 'b1',
  billingRevision: 5,
  totals: {
    acceptedChargesVnd: 68_900_000,
    netPaidVnd: 68_900_000,
    outstandingVnd: 0,
    creditVnd: 0,
  },
  balancePaymentEligibility: { billingRevision: 5, reasonCode: 'BILLING_BALANCE_LIMIT_EXCEEDED' },
};
const invoices = {
  bookingId: 'b1',
  currentRevisionId: 'i1',
  revisions: [{ invoiceRevisionId: 'i1', document: { totalVnd: 68_900_000 } }],
};

describe('Manager settlement notice', () => {
  it('identifies the finalized fully paid invoice', () => {
    render(<SettlementNotice billing={billing} invoices={invoices} />);
    expect(screen.getByRole('status')).toHaveTextContent('Đã tất toán');
  });
  it('does not infer settlement from zero debt without an invoice', () => {
    render(
      <SettlementNotice
        billing={billing}
        invoices={{ ...invoices, currentRevisionId: null, revisions: [] }}
      />,
    );
    expect(screen.queryByText('Đã tất toán')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Chờ nhà hàng chốt hoá đơn');
  });
  it('keeps credit visible rather than certifying settlement', () => {
    render(
      <SettlementNotice
        billing={{
          ...billing,
          totals: { ...billing.totals, netPaidVnd: 69_000_000, creditVnd: 100_000 },
        }}
        invoices={invoices}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Còn tiền thanh toán thừa');
  });
  it('does not mix another booking or a historical ledger page with the current invoice', () => {
    const { rerender } = render(
      <SettlementNotice billing={{ ...billing, bookingId: 'b2' }} invoices={invoices} />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(<SettlementNotice billing={{ ...billing, billingRevision: 4 }} invoices={invoices} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
