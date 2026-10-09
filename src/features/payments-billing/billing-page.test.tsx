import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import type { BillingView, ManagementBillingGateway } from './billing-api';
import { ManagementBillingPage, ManagementBillingWorkspace } from './billing-page';
import { createIdentityApi, ManagementIdentitySession } from '../identity-access/session';
import { createBillingIntents } from './billing-intents';
import { createHash } from 'node:crypto';

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
  it.each(['anonymous', 'staff', 'manager'] as const)(
    'restores the %s presentation without exposing Manager controls to Staff',
    async (role) => {
      const session = new ManagementIdentitySession(createIdentityApi());
      vi.spyOn(session, 'restore').mockResolvedValue(
        role === 'anonymous'
          ? { status: 'anonymous', denial: null }
          : {
              status: 'authenticated',
              presentation: role,
              denial: null,
              actor: {
                accountId: 'actor',
                sessionId: 'session',
                displayEmail: 'fixture@example.invalid',
                roles: [role === 'manager' ? 'MANAGER' : 'STAFF'],
              },
            },
      );
      render(<ManagementBillingPage session={session} gateway={gateway()} />);
      await screen.findByRole('heading', {
        name:
          role === 'manager'
            ? 'Quản lý thanh toán'
            : role === 'staff'
              ? 'Không có quyền xem thanh toán'
              : 'Cần đăng nhập',
      });
    },
  );
  it('blocks a double load while the first response is pending', async () => {
    const api = gateway();
    let finish!: (value: BillingView) => void;
    vi.mocked(api.load).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />);
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), { target: { value: 'booking' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem thanh toán' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem thanh toán' }));
    expect(api.load).toHaveBeenCalledOnce();
    finish(view);
    await screen.findByText('Còn phải thu');
  });
  it('retains an uncertain manual intent, replays it, and reports success even when refresh fails', async () => {
    const api = gateway();
    vi.mocked(api.recordManual)
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'api',
          code: 'INTERNAL_ERROR',
          status: 503,
          message: 'unavailable',
          requestId: 'request',
        }),
      )
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'api',
          code: 'RATE_LIMITED',
          status: 429,
          message: 'too many',
          requestId: 'request',
        }),
      )
      .mockResolvedValueOnce({ paymentId: 'payment', paymentAttemptId: 'attempt' });
    render(
      <ManagementBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
    );
    await load();
    fireEvent.change(screen.getByLabelText('Số tiền thực nhận (VND)'), {
      target: { value: '100000' },
    });
    fireEvent.change(screen.getByLabelText('Thời điểm nhận tiền'), {
      target: { value: '2026-10-09T10:00' },
    });
    fireEvent.change(screen.getByLabelText('Mã chứng từ'), { target: { value: 'receipt' } });
    fireEvent.change(screen.getByLabelText('Lý do ghi nhận'), { target: { value: 'Đã đối soát' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản thu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ghi nhận' }));
    await screen.findByRole('button', { name: 'Thử lại yêu cầu này' });
    expect(screen.getByLabelText('Số tiền hoàn (VND)')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại yêu cầu này' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('đợi'));
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toBeDisabled();
    expect(screen.getByLabelText('Số tiền hoàn (VND)')).toBeDisabled();
    vi.mocked(api.load).mockRejectedValueOnce(new Error('refresh offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại yêu cầu này' }));
    expect(await screen.findByText(/Đã ghi nhận khoản thu/)).toBeInTheDocument();
    expect(api.recordManual).toHaveBeenCalledTimes(3);
    expect(vi.mocked(api.recordManual).mock.calls[1]).toEqual(
      vi.mocked(api.recordManual).mock.calls[0],
    );
    expect(vi.mocked(api.recordManual).mock.calls[2]).toEqual(
      vi.mocked(api.recordManual).mock.calls[0],
    );
    await waitFor(() => expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toHaveValue(null));
  });
  it('records an approved refund and handles stale refusal without hiding the editable draft', async () => {
    const api = gateway();
    vi.mocked(api.load).mockResolvedValue({
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
    });
    vi.mocked(api.refund)
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'api',
          code: 'STALE_BILLING_REVISION',
          status: 409,
          message: 'stale',
          requestId: 'request',
        }),
      )
      .mockResolvedValueOnce({ refundId: 'refund' });
    render(
      <ManagementBillingWorkspace
        accountId="actor"
        authorize={authorize}
        gateway={api}
        intents={intents}
      />,
    );
    await load();
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
    expect(await screen.findByRole('alert')).toHaveTextContent('Số dư đã thay đổi');
    await waitFor(() => expect(screen.getByLabelText('Số tiền hoàn (VND)')).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản hoàn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tiền' }));
    expect(await screen.findByText(/Đã ghi nhận khoản hoàn/)).toBeInTheDocument();
  });
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
    expect(screen.queryByText('Chưa có giao dịch')).not.toBeInTheDocument();
    await load();
    expect(screen.getByText('Chưa có giao dịch')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    await waitFor(() => expect(screen.queryByText('Còn phải thu')).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('quyền');
  });
  it('reads UNKNOWN without guessing failure or offering another charge', async () => {
    const api = gateway();
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />);
    await load();
    fireEvent.change(screen.getByLabelText('Mã giao dịch thanh toán'), {
      target: { value: 'attempt' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tra cứu giao dịch' }));
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
