import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManualPaymentForm, RefundForm } from './payment-forms';
import type { BillingView, RecordingContext } from './billing-api';

const paymentId = '00000000-0000-4000-8000-000000000002';
const booking = {
  bookingId: '00000000-0000-4000-8000-000000000001',
  billingRevision: 7,
} as BillingView;
function recording(cancelled: boolean): RecordingContext {
  return {
    bookingId: booking.bookingId,
    bookingRevision: 4,
    billingRevision: 7,
    bookingPhase: cancelled ? 'CANCELLED' : 'CONFIRMED',
    deposit: {
      canRecord: false,
      isSettled: true,
      settledAmountVnd: 10000000,
      settledAt: '2026-11-01T00:00:00Z',
      amountVnd: 10000000,
      reasonCode: 'BOOKING_NOT_PAYABLE',
      contractRevisionId: null,
      documentDigest: null,
      timelineRevisionId: null,
    },
    balance: { canRecord: false, maxAmountVnd: 0, reasonCode: 'BALANCE_NOT_ELIGIBLE' },
    refundablePayments: [
      {
        paymentId,
        revision: 7,
        occurredAt: '2026-11-01T00:00:00Z',
        purpose: 'DEPOSIT',
        provider: 'MANUAL',
        amountVnd: 10000000,
        refundedVnd: 0,
        maxRefundVnd: cancelled ? 5000000 : 0,
      },
    ],
    nextAfterRevision: null,
    cancellationRefund: {
      version: 'CANCELLATION_REFUND_V1',
      initiator: 'COUPLE',
      requestedAt: '2026-11-08T00:00:00Z',
      eventStartsAt: '2026-11-20T03:00:00Z',
      contractRevisionId: 'contract',
      contractTermsVersion: 'WEDDING_STANDARD_V1',
      depositPaymentId: paymentId,
      depositReceivedVnd: 10000000,
      ratePercent: 50,
      entitledVnd: 5000000,
      alreadyRefundedVnd: 0,
      remainingVnd: 5000000,
      canRecord: cancelled,
      options: [
        { percent: 100, amountVnd: 10000000 },
        { percent: 50, amountVnd: 5000000 },
        { percent: 0, amountVnd: 0 },
      ],
    },
  };
}
describe('deposit and cancellation refund presentation', () => {
  it('explains the verified deposit was already received', () => {
    render(
      <ManualPaymentForm
        bookingId={booking.bookingId}
        recording={recording(false)}
        disabled={false}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('Đặt cọc · Đã thu tiền cọc', { selector: 'option' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Đã thu tiền cọc');
  });
  it('keeps all percentage options visible but disabled before cancellation', () => {
    const confirm = vi.fn();
    render(
      <RefundForm
        booking={booking}
        recording={recording(false)}
        disabled={false}
        onConfirm={confirm}
      />,
    );
    const options = [...document.querySelectorAll('select[name="source"] option')].filter((o) =>
      o.textContent?.includes('%'),
    );
    expect(options).toHaveLength(3);
    options.forEach((option) => expect(option).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Kiểm tra khoản hoàn' })).toBeDisabled();
    expect(screen.getByText(/Chỉ ghi nhận hoàn khi tiệc đã được xác nhận hủy/)).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
  });
  it('selects the eligible source and prefills the server-calculated amount after cancellation', () => {
    render(
      <RefundForm
        booking={booking}
        recording={recording(true)}
        disabled={false}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Số tiền hoàn (VND)')).toHaveValue(5000000);
    expect(screen.getByRole('button', { name: 'Kiểm tra khoản hoàn' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản hoàn' }));
    expect(screen.getByRole('button', { name: 'Xác nhận hoàn tiền' })).toBeInTheDocument();
  });
});
