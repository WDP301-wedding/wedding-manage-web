import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import type { BillingView, ManagementBillingGateway } from './billing-api';
import { ManagementBillingWorkspace } from './billing-page';

const view: BillingView = {
  bookingId: 'booking',
  billingRevision: 4,
  totals: {
    acceptedChargesVnd: 10000000,
    paidVnd: 3000000,
    refundedVnd: 100000,
    netPaidVnd: 2900000,
    outstandingVnd: 7100000,
    creditVnd: 0,
  },
  history: [],
  nextCursor: 'page2',
};
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('token');
function gateway(): ManagementBillingGateway {
  return {
    load: vi.fn().mockResolvedValue(view),
    loadAttempt: vi
      .fn()
      .mockResolvedValue({
        paymentAttemptId: 'attempt',
        status: 'UNKNOWN',
        purpose: 'BALANCE',
        amountVnd: 7100000,
        applicationStatus: null,
        expiresAt: '2026-10-09T10:00:00Z',
      }),
    recordManual: vi.fn(),
    refund: vi.fn(),
  };
}
async function load() {
  fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), { target: { value: 'booking' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xem billing' }));
  await screen.findByText('Còn phải thu');
}
describe('management billing workspace', () => {
  it('shows backend totals, empty history, then appends fixed-revision history', async () => {
    const api = gateway();
    vi.mocked(api.load)
      .mockResolvedValueOnce(view)
      .mockResolvedValueOnce({
        ...view,
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
            revision: 4,
          },
        ],
        nextCursor: null,
      });
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />);
    expect(screen.queryByText('Chưa có bút toán')).not.toBeInTheDocument();
    await load();
    expect(screen.getByText('Chưa có bút toán')).toBeInTheDocument();
    expect(screen.getByText(/7\.100\.000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm lịch sử' }));
    await waitFor(() =>
      expect(api.load).toHaveBeenLastCalledWith('token', 'booking', {
        cursor: 'page2',
        throughBillingRevision: 4,
      }),
    );
    expect(await screen.findByText('payment')).toBeInTheDocument();
  });
  it('keeps a background failure visible and hides private data after denial', async () => {
    const api = gateway();
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />);
    await load();
    vi.mocked(api.load).mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới số dư' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Còn phải thu')).toBeInTheDocument();
    vi.mocked(api.load).mockRejectedValueOnce(
      new ApiClientError({
        kind: 'api',
        code: 'BILLING_ACCESS_DENIED',
        status: 403,
        message: 'denied',
        requestId: 'request',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới số dư' }));
    await waitFor(() => expect(screen.queryByText('Còn phải thu')).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('quyền');
  });
  it('reads UNKNOWN without guessing failure or offering another charge', async () => {
    const api = gateway();
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />);
    await load();
    fireEvent.change(screen.getByLabelText('Mã lần thanh toán'), { target: { value: 'attempt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra thanh toán' }));
    expect(await screen.findByText(/Chưa rõ kết quả/)).toBeInTheDocument();
    expect(api.loadAttempt).toHaveBeenCalledWith('token', 'booking', 'attempt');
    expect(screen.queryByRole('button', { name: /Tạo lại thanh toán/ })).not.toBeInTheDocument();
  });
  it('rejects a different pagination fence before displaying its history', async () => {
    const api = gateway();
    vi.mocked(api.load)
      .mockResolvedValueOnce(view)
      .mockResolvedValueOnce({ ...view, billingRevision: 5 });
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />);
    await load();
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm lịch sử' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('lịch sử');
  });
});
