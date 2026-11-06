import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../design-system/notifications';
import { selectOption } from '../../test/select-option';
import type { RecordingContext } from './billing-api';
import { ManualPaymentForm, RefundForm } from './payment-forms';

const bookingId = '00000000-0000-4000-8000-000000000001';
const paymentId = '00000000-0000-4000-8000-000000000002';
const recording: RecordingContext = {
  bookingId,
  bookingRevision: 4,
  billingRevision: 7,
  deposit: {
    canRecord: true,
    amountVnd: 1500000,
    reasonCode: null,
    timelineRevisionId: '00000000-0000-4000-8000-000000000003',
    contractRevisionId: '00000000-0000-4000-8000-000000000004',
    documentDigest: 'a'.repeat(64),
  },
  balance: { canRecord: false, maxAmountVnd: 0, reasonCode: 'BALANCE_NOT_ELIGIBLE' },
  refundablePayments: [
    {
      paymentId,
      amountVnd: 3000000,
      maxRefundVnd: 3000000,
      refundedVnd: 0,
      occurredAt: '2026-10-09T10:00:00Z',
      purpose: 'DEPOSIT',
      provider: 'MANUAL',
      revision: 7,
    },
  ],
  nextAfterRevision: null,
};

describe('manager monetary confirmations', () => {
  it('requires server eligibility and review, then retains the exact draft for an unknown retry', async () => {
    const confirm = vi.fn().mockResolvedValueOnce('retry').mockResolvedValueOnce('succeeded');
    render(
      <ManualPaymentForm
        bookingId={bookingId}
        recording={recording}
        disabled={false}
        onConfirm={confirm}
      />,
    );
    fireEvent.change(screen.getByLabelText('Số tiền thực nhận (VND)'), {
      target: { value: '1500000' },
    });
    fireEvent.change(screen.getByLabelText('Thời điểm nhận tiền'), {
      target: { value: '2026-10-09T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản thu' }));
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ghi nhận' }));
    await screen.findByRole('button', { name: 'Thử lại yêu cầu này' });
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Quay lại chỉnh sửa' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại yêu cầu này' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
    expect(confirm.mock.calls[1]![0]).toEqual(confirm.mock.calls[0]![0]);
    expect(confirm.mock.calls[0]![0]).toEqual({
      bookingId,
      purpose: 'DEPOSIT',
      amountVnd: 1500000,
      settledAt: new Date('2026-10-09T10:00').toISOString(),
      timelineRevisionId: recording.deposit.timelineRevisionId,
      contractRevisionId: recording.deposit.contractRevisionId,
      documentDigest: recording.deposit.documentDigest,
    });
  });
  it('refund chooses the original payment, uses the loaded revision and requires explicit confirmation', async () => {
    const confirm = vi.fn().mockResolvedValue('failed');
    render(
      <RefundForm
        disabled={false}
        recording={recording}
        booking={{
          balancePaymentEligibility: {
            billingRevision: 6,
            canPay: false,
            nextAction: 'NONE',
            reasonCode: 'BALANCE_NOT_ELIGIBLE',
          },
          bookingId,
          billingRevision: 6,
          history: [
            {
              ledgerEntryId: 'payment',
              kind: 'PAYMENT',
              amountVnd: 3000000,
              occurredAt: '2026-10-09T10:00:00Z',
              sourceType: 'PAYMENT_ATTEMPT',
              sourceRevisionId: 'attempt',
              sourceEntryId: null,
              paymentAttemptId: 'attempt',
              revision: 6,
            },
          ],
          nextCursor: null,
          totals: {
            acceptedChargesVnd: 0,
            paidVnd: 3000000,
            refundedVnd: 0,
            netPaidVnd: 3000000,
            outstandingVnd: 0,
            creditVnd: 3000000,
          },
        }}
        onConfirm={confirm}
      />,
      { wrapper: NotificationProvider },
    );
    await selectOption('Khoản thanh toán gốc', /Cọc.*Ngoài hệ thống/);
    fireEvent.change(screen.getByLabelText('Số tiền hoàn (VND)'), { target: { value: '3000001' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Kiểm tra khoản hoàn' }).closest('form')!);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xác nhận hoàn tiền' })).not.toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Số tiền hoàn (VND)'), { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản hoàn' }));
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tiền' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(confirm.mock.calls[0]![0]).toEqual({
      sourcePaymentId: paymentId,
      amountVnd: 1000000,
      expectedBillingRevision: 7,
    });
    await waitFor(() => expect(screen.getByLabelText('Số tiền hoàn (VND)')).toBeEnabled());
  });
  it('allows cancelling review before any money is recorded', () => {
    const confirm = vi.fn();
    render(
      <ManualPaymentForm
        bookingId={bookingId}
        recording={recording}
        disabled={false}
        onConfirm={confirm}
      />,
    );
    fireEvent.change(screen.getByLabelText('Số tiền thực nhận (VND)'), {
      target: { value: '1500000' },
    });
    fireEvent.change(screen.getByLabelText('Thời điểm nhận tiền'), {
      target: { value: '2026-10-09T10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản thu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại chỉnh sửa' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toHaveValue(1500000);
  });

  it('keeps recording disabled before the server confirms eligibility', () => {
    const confirm = vi.fn();
    render(<ManualPaymentForm bookingId={bookingId} disabled={false} onConfirm={confirm} />);
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toBeDisabled();
    expect(screen.getByLabelText('Thời điểm nhận tiền')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kiểm tra khoản thu' })).toBeDisabled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it.each(['0', '1500001', '9007199254740992'])(
    'refuses an unsafe or inexact deposit amount %s before confirmation',
    (amount) => {
      const confirm = vi.fn();
      render(
        <ManualPaymentForm
          bookingId={bookingId}
          recording={recording}
          disabled={false}
          onConfirm={confirm}
        />,
        { wrapper: NotificationProvider },
      );
      fireEvent.change(screen.getByLabelText('Số tiền thực nhận (VND)'), {
        target: { value: amount },
      });
      fireEvent.change(screen.getByLabelText('Thời điểm nhận tiền'), {
        target: { value: '2026-10-09T10:00' },
      });
      fireEvent.submit(screen.getByRole('button', { name: 'Kiểm tra khoản thu' }).closest('form')!);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Xác nhận ghi nhận' })).not.toBeInTheDocument();
      expect(confirm).not.toHaveBeenCalled();
    },
  );
});
