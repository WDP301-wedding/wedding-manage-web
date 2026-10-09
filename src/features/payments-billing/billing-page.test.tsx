import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import type { BillingView, ManagementBillingGateway } from './billing-api';
import { ManagementBillingPage, ManagementBillingWorkspace } from './billing-page';
import { createIdentityApi, ManagementIdentitySession } from '../identity-access/session';

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
  };
}
async function load() {
  fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), { target: { value: 'booking' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xem billing' }));
  await screen.findByText('Còn phải thu');
}
describe('management billing workspace', () => {
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
            ? 'Thanh toán và đối soát'
            : role === 'staff'
              ? 'Không có quyền truy cập billing'
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
    fireEvent.click(screen.getByRole('button', { name: 'Xem billing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem billing' }));
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
    vi.mocked(api.load).mockRejectedValueOnce(new Error('refresh offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại yêu cầu này' }));
    expect(await screen.findByText(/Đã ghi nhận khoản thu/)).toBeInTheDocument();
    expect(api.recordManual).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.recordManual).mock.calls[1]).toEqual(
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
