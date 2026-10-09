import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ManualPaymentForm, RefundForm } from './payment-forms';

describe('manager monetary confirmations', () => {
  it('requires evidence and review, then retains the exact draft for an unknown retry', async () => {
    const confirm = vi.fn().mockResolvedValueOnce('retry').mockResolvedValueOnce('succeeded');
    render(<ManualPaymentForm bookingId="booking" disabled={false} onConfirm={confirm} />);
    fireEvent.change(screen.getByLabelText('Số tiền thực nhận (VND)'), {
      target: { value: '1500000' },
    });
    fireEvent.change(screen.getByLabelText('Thời điểm nhận tiền'), {
      target: { value: '2026-10-09T10:00' },
    });
    fireEvent.change(screen.getByLabelText('Mã chứng từ'), { target: { value: 'receipt-1' } });
    fireEvent.change(screen.getByLabelText('Lý do ghi nhận'), { target: { value: 'Đã đối soát' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản thu' }));
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ghi nhận' }));
    await screen.findByRole('button', { name: 'Thử lại yêu cầu này' });
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Quay lại chỉnh sửa' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại yêu cầu này' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
    expect(confirm.mock.calls[1]![0]).toEqual(confirm.mock.calls[0]![0]);
    expect(confirm.mock.calls[0]![0]).toMatchObject({
      bookingId: 'booking',
      purpose: 'DEPOSIT',
      amountVnd: 1500000,
      evidenceReference: 'receipt-1',
      reason: 'Đã đối soát',
    });
  });
  it('refund chooses the original payment, uses the loaded revision and requires explicit confirmation', async () => {
    const confirm = vi.fn().mockResolvedValue('failed');
    render(
      <RefundForm
        disabled={false}
        booking={{
          bookingId: 'booking',
          billingRevision: 7,
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
              revision: 7,
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
    );
    fireEvent.change(screen.getByLabelText('Khoản thanh toán gốc'), {
      target: { value: 'payment' },
    });
    fireEvent.change(screen.getByLabelText('Số tiền hoàn (VND)'), { target: { value: '1000000' } });
    fireEvent.change(screen.getByLabelText('Mã chứng từ hoàn'), { target: { value: 'refund-1' } });
    fireEvent.change(screen.getByLabelText('Lý do hoàn tiền'), {
      target: { value: 'Theo quyết định đã duyệt' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản hoàn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tiền' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
    expect(confirm.mock.calls[0]![0]).toEqual({
      sourcePaymentId: 'payment',
      amountVnd: 1000000,
      expectedBillingRevision: 7,
      evidenceReference: 'refund-1',
      reason: 'Theo quyết định đã duyệt',
    });
    await waitFor(() => expect(screen.getByLabelText('Số tiền hoàn (VND)')).toBeEnabled());
  });
  it('allows cancelling review before any money is recorded', () => {
    const confirm = vi.fn();
    render(<ManualPaymentForm bookingId="booking" disabled={false} onConfirm={confirm} />);
    fireEvent.change(screen.getByLabelText('Số tiền thực nhận (VND)'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Thời điểm nhận tiền'), {
      target: { value: '2026-10-09T10:00' },
    });
    fireEvent.change(screen.getByLabelText('Mã chứng từ'), { target: { value: 'receipt' } });
    fireEvent.change(screen.getByLabelText('Lý do ghi nhận'), { target: { value: 'Reason' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản thu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại chỉnh sửa' }));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toHaveValue(10);
  });
});
