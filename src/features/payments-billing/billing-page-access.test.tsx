import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import type { BillingView, ManagementBillingGateway } from './billing-api';
import { ManagementBillingPage, ManagementBillingWorkspace } from './billing-page';
import { createIdentityApi, ManagementIdentitySession } from '../identity-access/session';

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

describe('management billing access and recovery', () => {
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
    expect(api.load).toHaveBeenCalledTimes(1);
    finish(view);
    await screen.findByText('Còn phải thu');
  });

  it('keeps the previous ledger when a reload fails', async () => {
    const api = gateway();
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />);
    await load();
    vi.mocked(api.load).mockRejectedValueOnce(new Error('fail'));
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Còn phải thu')).toBeInTheDocument();
  });

  it('clears stale errors when reloading succeeds', async () => {
    const api = gateway();
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />);
    await load();
    vi.mocked(api.load).mockRejectedValueOnce(new Error('temporary failure'));
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    await screen.findByRole('alert');
    vi.mocked(api.load).mockResolvedValueOnce(view);
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('loads paginated payment history using the current billing revision fence', async () => {
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
