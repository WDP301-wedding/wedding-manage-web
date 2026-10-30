import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { NotificationProvider } from '../../design-system/notifications';
import type { BillingView, ManagementBillingGateway } from './billing-api';
import { ManagementBillingPage, ManagementBillingWorkspace } from './billing-page';
import { createIdentityApi, ManagementIdentitySession } from '../identity-access/session';
import { createBillingIntents } from './billing-intents';
import { createHash } from 'node:crypto';

const view: BillingView = {
  balancePaymentEligibility: {
    billingRevision: 4,
    canPay: false,
    nextAction: 'NONE',
    reasonCode: 'BALANCE_NOT_ELIGIBLE',
  },
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
const intents = {
  pending: () => Promise.resolve(null),
  run: <T,>(_scope: string, _body: object, operation: (key: string, body: object) => Promise<T>) =>
    operation('stable-key', _body),
};
afterEach(() => vi.restoreAllMocks());
function gateway(): ManagementBillingGateway {
  return {
    load: vi.fn().mockResolvedValue(view),
    loadAttempt: vi.fn().mockResolvedValue({
      paymentAttemptId: 'attempt',
      status: 'UNKNOWN',
      purpose: 'BALANCE',
      amountVnd: 7100000,
      applicationStatus: null,
      expiresAt: '2026-10-09T10:00:00Z',
    }),
    recordManual: vi.fn(),
    refund: vi.fn(),
    approveRefund: vi.fn(),
  };
}
async function load() {
  fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), { target: { value: 'booking' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xem thanh toán' }));
  await screen.findByText('Còn phải thu');
}
describe('management billing workspace', () => {
  it('clears the loaded booking, monetary forms and attempt when the lookup identifier changes', async () => {
    const api = gateway();
    render(
      <ManagementBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
      { wrapper: NotificationProvider },
    );
    await load();
    fireEvent.change(screen.getByLabelText('Mã giao dịch thanh toán'), {
      target: { value: 'attempt' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tra cứu giao dịch' }));
    await screen.findByLabelText('Trạng thái thanh toán');
    expect(screen.getByRole('heading', { name: 'Phê duyệt hoàn tiền' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
      target: { value: 'booking-B' },
    });
    expect(screen.queryByText('Còn phải thu')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Trạng thái thanh toán')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Ghi nhận tiền đã nhận' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ghi nhận hoàn tiền' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Phê duyệt hoàn tiền' })).not.toBeInTheDocument();
    expect(api.load).toHaveBeenCalledTimes(1);
    expect(api.recordManual).not.toHaveBeenCalled();
    expect(api.refund).not.toHaveBeenCalled();
    expect(api.approveRefund).not.toHaveBeenCalled();
  });
  it('requires explicit Manager approval before submitting and replays an uncertain approval unchanged', async () => {
    const api = gateway();
    vi.mocked(api.approveRefund)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ refundApprovalId: 'approval' });
    render(
      <ManagementBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
      { wrapper: NotificationProvider },
    );
    await load();
    fireEvent.change(screen.getByLabelText('Căn cứ phê duyệt'), {
      target: { value: 'CANCELLATION' },
    });
    fireEvent.change(screen.getByLabelText('Hạn mức hoàn được duyệt (VND)'), {
      target: { value: '100000' },
    });
    fireEvent.change(screen.getByLabelText('Mã chứng từ phê duyệt'), {
      target: { value: 'approval-1' },
    });
    fireEvent.change(screen.getByLabelText('Lý do phê duyệt'), {
      target: { value: 'Theo quyết định' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra phê duyệt' }));
    expect(api.approveRefund).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận phê duyệt hoàn tiền' }));
    await screen.findByRole('button', { name: 'Thử lại phê duyệt này' });
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toBeDisabled();
    expect(screen.getByLabelText('Số tiền hoàn (VND)')).toBeDisabled();
    expect(api.refund).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại phê duyệt này' }));
    await screen.findByText(/Đã phê duyệt hoàn tiền/);
    expect(api.approveRefund).toHaveBeenCalledWith(
      'token',
      {
        bookingId: 'booking',
        expectedBillingRevision: 4,
        approvedRefundableVnd: 100000,
        basis: { kind: 'CANCELLATION' },
        reason: 'Theo quyết định',
        evidenceReference: 'approval-1',
      },
      'stable-key',
    );
    expect(vi.mocked(api.approveRefund).mock.calls[1]).toEqual(
      vi.mocked(api.approveRefund).mock.calls[0],
    );
  });
  it('allows correcting a reentered mismatching receipt while preserving the pending key and blocking other commands', async () => {
    const records = new Map<string, string>();
    const journal = createBillingIntents(
      'actor',
      {
        read: (key) => Promise.resolve(records.get(key) ?? null),
        write: (key, value) => {
          records.set(key, value);
          return Promise.resolve();
        },
        remove: (key) => {
          records.delete(key);
          return Promise.resolve();
        },
      },
      (value) => Promise.resolve(createHash('sha256').update(value).digest('hex')),
    );
    let originalKey = '';
    const body = {
      bookingId: 'booking',
      purpose: 'DEPOSIT',
      amountVnd: 100000,
      settledAt: new Date('2026-10-09T10:00').toISOString(),
      reason: 'Đã đối soát',
      evidenceReference: 'correct',
    };
    await journal
      .run('manual:booking', body, (key) => {
        originalKey = key;
        return Promise.reject(new Error('offline'));
      })
      .catch(() => undefined);
    const api = gateway();
    vi.mocked(api.recordManual).mockResolvedValue({
      paymentId: 'payment',
      paymentAttemptId: 'attempt',
    });
    render(
      <ManagementBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={journal}
      />,
      { wrapper: NotificationProvider },
    );
    await load();
    fireEvent.change(screen.getByLabelText('Số tiền thực nhận (VND)'), {
      target: { value: '100000' },
    });
    fireEvent.change(screen.getByLabelText('Thời điểm nhận tiền'), {
      target: { value: '2026-10-09T10:00' },
    });
    fireEvent.change(screen.getByLabelText('Mã chứng từ'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByLabelText('Lý do ghi nhận'), { target: { value: 'Đã đối soát' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản thu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ghi nhận' }));
    await waitFor(() => expect(screen.getByLabelText('Mã chứng từ')).toBeEnabled());
    expect(api.recordManual).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Số tiền hoàn (VND)')).toBeDisabled();
    expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
      target: { value: 'booking-B' },
    });
    expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toHaveValue('booking');
    fireEvent.change(screen.getByLabelText('Mã chứng từ'), { target: { value: 'correct' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản thu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ghi nhận' }));
    await screen.findByText(/Đã ghi nhận khoản thu/);
    expect(api.recordManual).toHaveBeenCalledWith('token', body, originalKey);
    expect(records.size).toBe(0);
  });
  it('restores the original refund revision and blocks unrelated money while recovering a saved command', async () => {
    const api = gateway();
    vi.mocked(api.load).mockResolvedValue({
      ...view,
      billingRevision: 5,
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
    });
    vi.mocked(api.refund).mockResolvedValue({ refundId: 'refund' });
    const journal = {
      ...intents,
      pending: (scope: string) =>
        Promise.resolve(scope.startsWith('refund:') ? { expectedBillingRevision: 4 } : null),
    };
    render(
      <ManagementBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={journal}
      />,
      { wrapper: NotificationProvider },
    );
    await load();
    expect(screen.getByRole('alert')).toHaveTextContent('Nhập lại đúng nội dung');
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Khoản thanh toán gốc'), {
      target: { value: 'payment' },
    });
    fireEvent.change(screen.getByLabelText('Số tiền hoàn (VND)'), { target: { value: '100000' } });
    fireEvent.change(screen.getByLabelText('Mã chứng từ hoàn'), {
      target: { value: 'refund-receipt' },
    });
    fireEvent.change(screen.getByLabelText('Lý do hoàn tiền'), {
      target: { value: 'Theo quyết định' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản hoàn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tiền' }));
    await waitFor(() =>
      expect(api.refund).toHaveBeenCalledWith(
        'token',
        {
          sourcePaymentId: 'payment',
          amountVnd: 100000,
          expectedBillingRevision: 4,
          evidenceReference: 'refund-receipt',
          reason: 'Theo quyết định',
        },
        'stable-key',
      ),
    );
  });
});
