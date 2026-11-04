import { describe, expect, it } from 'vitest';
import { settlementStatus } from './settlement-status';

const billing = (outstandingVnd = 0, creditVnd = 0) => ({
  billingRevision: 5,
  totals: {
    acceptedChargesVnd: 68_900_000,
    netPaidVnd: 68_900_000 - outstandingVnd + creditVnd,
    outstandingVnd,
    creditVnd,
  },
  balancePaymentEligibility: { billingRevision: 5, reasonCode: 'BILLING_BALANCE_LIMIT_EXCEEDED' },
});

describe('settlement evidence', () => {
  it('recognizes the finalized and fully paid Hoang/Huy invoice independently of event phase', () => {
    expect(settlementStatus(billing(), 68_900_000)).toBe('settled');
  });
  it('does not treat zero debt without a finalized invoice as settled', () => {
    expect(settlementStatus(billing(), null)).toBe('awaiting-invoice');
  });
  it('keeps remaining debt and overpayment visible after event completion', () => {
    expect(settlementStatus(billing(10_000), 68_900_000)).toBe('outstanding');
    expect(settlementStatus(billing(0, 10_000), 68_900_000)).toBe('credit');
  });
  it('does not certify stale ledger pages or mismatched invoice totals', () => {
    expect(settlementStatus({ ...billing(), billingRevision: 4 }, 68_900_000)).toBe('unknown');
    expect(settlementStatus(billing(), 69_000_000)).toBe('unknown');
    expect(settlementStatus(null, 68_900_000)).toBe('unknown');
  });
  it.each(['PAYMENT_ATTEMPT_ACTIVE', 'FINANCIAL_SOURCE_CONFLICT'])(
    'keeps %s unconfirmed',
    (reasonCode) => {
      expect(
        settlementStatus(
          { ...billing(), balancePaymentEligibility: { billingRevision: 5, reasonCode } },
          68_900_000,
        ),
      ).toBe('unknown');
    },
  );
});
