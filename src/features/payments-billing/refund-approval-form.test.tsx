import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BillingView } from './billing-api';
import { RefundApprovalForm } from './refund-approval-form';

const booking: BillingView = {
  balancePaymentEligibility: {
    billingRevision: 7,
    canPay: false,
    nextAction: 'NONE',
    reasonCode: 'BALANCE_NOT_ELIGIBLE',
  },
  bookingId: 'booking',
  billingRevision: 7,
  nextCursor: null,
  totals: {
    acceptedChargesVnd: 1000000,
    paidVnd: 1000000,
    refundedVnd: 0,
    netPaidVnd: 1000000,
    outstandingVnd: 0,
    creditVnd: 0,
  },
  history: [
    {
      ledgerEntryId: 'credit',
      kind: 'CREDIT_ADJUSTMENT',
      amountVnd: 100000,
      occurredAt: '2026-10-09T10:00:00Z',
      sourceType: 'PRINT_CREDIT',
      sourceRevisionId: 'revision',
      sourceEntryId: 'charge',
      paymentAttemptId: null,
      revision: 7,
    },
  ],
};
function fill() {
  fireEvent.change(screen.getByLabelText('Căn cứ phê duyệt'), { target: { value: 'credit' } });
  fireEvent.change(screen.getByLabelText('Hạn mức hoàn được duyệt (VND)'), {
    target: { value: '100000' },
  });
  fireEvent.change(screen.getByLabelText('Mã chứng từ phê duyệt'), {
    target: { value: 'approval-1' },
  });
  fireEvent.change(screen.getByLabelText('Lý do phê duyệt'), {
    target: { value: 'Theo quyết định' },
  });
}
describe('Manager refund approval', () => {
  it('selects the immutable credit ledger entry, permits cancelling, then explicitly approves without recording a refund', async () => {
    const confirm = vi.fn().mockResolvedValue('succeeded');
    render(<RefundApprovalForm booking={booking} disabled={false} onConfirm={confirm} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra phê duyệt' }));
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại chỉnh sửa' }));
    expect(screen.getByLabelText('Hạn mức hoàn được duyệt (VND)')).toHaveValue(100000);
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra phê duyệt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận phê duyệt hoàn tiền' }));
    await waitFor(() =>
      expect(confirm).toHaveBeenCalledWith({
        bookingId: 'booking',
        expectedBillingRevision: 7,
        approvedRefundableVnd: 100000,
        basis: { kind: 'CREDIT', sourceEntryId: 'credit' },
        reason: 'Theo quyết định',
        evidenceReference: 'approval-1',
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText('Hạn mức hoàn được duyệt (VND)')).toHaveValue(null),
    );
  });
  it('refuses blank evidence and unsafe amounts, and retains editable fields after a definitive refusal', async () => {
    const confirm = vi.fn().mockResolvedValue('failed');
    render(<RefundApprovalForm booking={booking} disabled={false} onConfirm={confirm} />);
    fill();
    fireEvent.change(screen.getByLabelText('Mã chứng từ phê duyệt'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra phê duyệt' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    fill();
    fireEvent.change(screen.getByLabelText('Hạn mức hoàn được duyệt (VND)'), {
      target: { value: '9007199254740992' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Kiểm tra phê duyệt' }).closest('form')!);
    expect(confirm).not.toHaveBeenCalled();
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra phê duyệt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận phê duyệt hoàn tiền' }));
    await waitFor(() => expect(screen.getByLabelText('Mã chứng từ phê duyệt')).toBeEnabled());
    expect(screen.getByLabelText('Mã chứng từ phê duyệt')).toHaveValue('approval-1');
  });
});
