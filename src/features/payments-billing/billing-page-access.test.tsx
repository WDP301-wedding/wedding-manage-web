import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { NotificationProvider } from '../../design-system/notifications';
import type { BillingView, ManagementBillingGateway } from './billing-api';
import { ManagementBillingPage, ManagementBillingWorkspace } from './billing-page';
import { createIdentityApi, ManagementIdentitySession } from '../identity-access/session';
import { AttemptStatus } from './billing-display';

const view: BillingView = {
  balancePaymentEligibility: {
    billingRevision: 4,
    canPay: false,
    nextAction: 'NONE',
    reasonCode: 'BALANCE_NOT_ELIGIBLE',
  },
  bookingId: '00000000-0000-4000-8000-000000000101',
  billingRevision: 4,
  financialOverview: {
    bookingRevision: 3,
    phase: 'CONFIRMED',
    source: 'CONTRACT',
    state: 'APPROVED',
    revisionId: '00000000-0000-4000-8000-000000000103',
    revisionNumber: 1,
    totalVnd: 10000000,
    requiredDepositVnd: 3000000,
    depositReceivedVnd: 3000000,
    depositRemainingVnd: 0,
    depositApplied: true,
    settlementSummary: {
      effectiveContractVnd: 10000000,
      payableVnd: 10000000,
      netReceivedVnd: 2900000,
      outstandingVnd: 7100000,
      creditVnd: 0,
    },
  },
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
    recording: vi.fn().mockResolvedValue({
      bookingId: view.bookingId,
      bookingRevision: 3,
      billingRevision: 4,
      deposit: {
        canRecord: false,
        amountVnd: 3000000,
        reasonCode: 'DEPOSIT_ALREADY_RECEIVED',
        timelineRevisionId: null,
        contractRevisionId: null,
        documentDigest: null,
      },
      bookingPhase: 'COMPLETED',
      balance: { canRecord: true, maxAmountVnd: 7100000, reasonCode: null },
      refundablePayments: [],
      nextAfterRevision: null,
    }),
    loadAttempt: vi.fn().mockResolvedValue({
      paymentAttemptId: '00000000-0000-4000-8000-000000000102',
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
  fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
    target: { value: '00000000-0000-4000-8000-000000000101' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Xem thanh toán' }));
  await screen.findByText('Còn phải thu');
}

describe('management billing access and recovery', () => {
  it('keeps history readable but locks remaining-balance collection on direct navigation before completion', async () => {
    const api = gateway();
    const current = await api.recording!('token', view.bookingId);
    vi.mocked(api.recording!).mockResolvedValue({ ...current, bookingPhase: 'CONFIRMED' });
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />, {
      wrapper: NotificationProvider,
    });
    await load();
    expect(
      screen.getByText(
        'Chỉ được quyết toán và thu phần còn lại sau khi đánh dấu tiệc đã tổ chức xong.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kiểm tra khoản thu' })).toBeDisabled();
    expect(screen.getByText('Còn phải thu')).toBeInTheDocument();
    expect(api.recordManual).not.toHaveBeenCalled();
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
      render(<ManagementBillingPage session={session} gateway={gateway()} />, {
        wrapper: NotificationProvider,
      });
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
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />, {
      wrapper: NotificationProvider,
    });
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
      target: { value: '00000000-0000-4000-8000-000000000101' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Xem thanh toán' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xem thanh toán' }));
    expect(api.load).toHaveBeenCalledTimes(1);
    finish(view);
    await screen.findByText('Còn phải thu');
  });

  it('keeps the previous ledger when a reload fails', async () => {
    const api = gateway();
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />, {
      wrapper: NotificationProvider,
    });
    await load();
    vi.mocked(api.load).mockRejectedValueOnce(new Error('fail'));
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    await screen.findByRole('alert');
    expect(screen.getByText('Còn phải thu')).toBeInTheDocument();
  });

  it('clears stale errors when reloading succeeds', async () => {
    const api = gateway();
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />, {
      wrapper: NotificationProvider,
    });
    await load();
    vi.mocked(api.load).mockRejectedValueOnce(new Error('temporary failure'));
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    await screen.findByRole('alert');
    vi.mocked(api.load).mockResolvedValueOnce(view);
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin' }));
    // Lỗi cũ là toast tự tắt sau 8 giây; lần tải lại thành công không phát thêm lỗi.
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('Còn phải thu')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
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
            sourceRevisionId: '00000000-0000-4000-8000-000000000102',
            sourceEntryId: null,
            paymentAttemptId: '00000000-0000-4000-8000-000000000102',
            revision: 4,
          },
        ],
        nextCursor: null,
      });
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />, {
      wrapper: NotificationProvider,
    });
    expect(screen.queryByText(/Chưa có biến động/)).not.toBeInTheDocument();
    await load();
    expect(screen.getByText(/Chưa có biến động trong các trang đã tải/)).toBeInTheDocument();
    expect(screen.getByText('Còn phải thu').parentElement).toHaveTextContent('7.100.000');
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm lịch sử' }));
    await waitFor(() =>
      expect(api.load).toHaveBeenLastCalledWith('token', '00000000-0000-4000-8000-000000000101', {
        cursor: 'page2',
        throughBillingRevision: 4,
      }),
    );
    expect(await screen.findByText('payment')).toBeInTheDocument();
  });

  it('keeps a background failure visible and hides private data after denial', async () => {
    const api = gateway();
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />, {
      wrapper: NotificationProvider,
    });
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
    // Toast lỗi mạng trước đó vẫn còn; toast mới nhất phải nói về quyền truy cập.
    expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent('quyền');
  });

  it('presents an UNKNOWN attempt without guessing failure or offering another charge', async () => {
    const api = gateway();
    // Attempt lookup moved out of the ledger page; retain its read-only status contract.
    const attempt = await api.loadAttempt(
      'token',
      view.bookingId,
      '00000000-0000-4000-8000-000000000102',
    );
    render(<AttemptStatus attempt={attempt} />);
    expect(await screen.findByText(/Chưa rõ kết quả/)).toBeInTheDocument();
    expect(
      screen.getByText(/Không tạo lần thanh toán khác khi chưa xác minh kết quả/),
    ).toBeVisible();
    expect(api.loadAttempt).toHaveBeenCalledWith(
      'token',
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000102',
    );
    expect(screen.queryByRole('button', { name: /Tạo lại thanh toán/ })).not.toBeInTheDocument();
  });

  it('blocks a replacement charge while the server reports an active payment attempt', async () => {
    const api = gateway();
    const current = await api.recording!('token', view.bookingId);
    vi.mocked(api.recording!).mockResolvedValue({
      ...current,
      deposit: { ...current.deposit, canRecord: false, reasonCode: 'PAYMENT_ATTEMPT_ACTIVE' },
      balance: { ...current.balance, canRecord: false, reasonCode: 'PAYMENT_ATTEMPT_ACTIVE' },
    });
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />, {
      wrapper: NotificationProvider,
    });
    await load();
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kiểm tra khoản thu' })).toBeDisabled();
    expect(api.recordManual).not.toHaveBeenCalled();
    expect(api.refund).not.toHaveBeenCalled();
    expect(api.approveRefund).not.toHaveBeenCalled();
  });

  it('rejects a different pagination fence before displaying its history', async () => {
    const api = gateway();
    vi.mocked(api.load)
      .mockResolvedValueOnce(view)
      .mockResolvedValueOnce({
        ...view,
        billingRevision: 5,
        history: [
          {
            ledgerEntryId: 'foreign-page-must-not-render',
            kind: 'PAYMENT',
            amountVnd: 100000,
            occurredAt: '2026-10-09T10:00:00Z',
            sourceType: 'PAYMENT_ATTEMPT',
            sourceRevisionId: 'attempt',
            sourceEntryId: null,
            paymentAttemptId: 'attempt',
            revision: 5,
          },
        ],
      });
    render(<ManagementBillingWorkspace accountId="actor" authorize={authorize} gateway={api} />, {
      wrapper: NotificationProvider,
    });
    await load();
    fireEvent.click(screen.getByRole('button', { name: 'Tải thêm lịch sử' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Lịch sử vừa thay đổi');
    expect(api.load).toHaveBeenLastCalledWith('token', view.bookingId, {
      cursor: 'page2',
      throughBillingRevision: 4,
    });
    expect(screen.getByText('Còn phải thu').parentElement).toHaveTextContent('7.100.000');
    expect(screen.queryByText('foreign-page-must-not-render')).not.toBeInTheDocument();
  });
});
