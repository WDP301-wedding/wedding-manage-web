import { createHash } from 'node:crypto';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../design-system/notifications';
import { selectOption } from '../../test/select-option';
import type { BillingView, ManagementBillingGateway, RecordingContext } from './billing-api';
import { ManagementBillingWorkspace } from './billing-page';
import { createBillingIntents } from './billing-intents';
import { useBillingWorkspace } from './use-billing-workspace';

const bookingId = '00000000-0000-4000-8000-000000000101';
const paymentId = '00000000-0000-4000-8000-000000000102';
const recording: RecordingContext = {
  bookingId,
  billingRevision: 4,
  bookingRevision: 3,
  deposit: {
    canRecord: true,
    amountVnd: 3000000,
    reasonCode: null,
    timelineRevisionId: '00000000-0000-4000-8000-000000000103',
    contractRevisionId: '00000000-0000-4000-8000-000000000104',
    documentDigest: 'a'.repeat(64),
  },
  balance: { canRecord: false, maxAmountVnd: 0, reasonCode: 'BALANCE_NOT_ELIGIBLE' },
  refundablePayments: [],
  nextAfterRevision: null,
};
const view: BillingView = {
  bookingId,
  billingRevision: 4,
  balancePaymentEligibility: {
    billingRevision: 4,
    canPay: false,
    nextAction: 'NONE',
    reasonCode: 'BALANCE_NOT_ELIGIBLE',
  },
  totals: {
    acceptedChargesVnd: 10000000,
    paidVnd: 0,
    refundedVnd: 0,
    netPaidVnd: 0,
    outstandingVnd: 10000000,
    creditVnd: 0,
  },
  history: [],
  nextCursor: null,
};
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('token');
const manualBody = {
  bookingId,
  purpose: 'DEPOSIT' as const,
  amountVnd: 3000000,
  settledAt: new Date('2026-10-09T10:00').toISOString(),
  timelineRevisionId: recording.deposit.timelineRevisionId!,
  contractRevisionId: recording.deposit.contractRevisionId!,
  documentDigest: recording.deposit.documentDigest!,
};

function journal() {
  const records = new Map<string, string>();
  const intents = createBillingIntents(
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
  return { records, intents };
}
function gateway(): ManagementBillingGateway {
  return {
    load: vi.fn().mockResolvedValue(view),
    recording: vi.fn().mockResolvedValue(recording),
    loadAttempt: vi.fn(),
    recordManual: vi.fn(),
    refund: vi.fn(),
    approveRefund: vi.fn(),
  };
}
function open(api: ManagementBillingGateway, intents = journal().intents) {
  render(
    <ManagementBillingWorkspace
      accountId="actor"
      authorize={authorize}
      gateway={api}
      intents={intents}
    />,
    { wrapper: NotificationProvider },
  );
}
async function load() {
  fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), { target: { value: bookingId } });
  fireEvent.click(screen.getByRole('button', { name: 'Xem thanh toán' }));
  await screen.findByText('Còn phải thu');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Cập nhật thông tin' })).toBeEnabled(),
  );
}
function reviewManual() {
  fireEvent.change(screen.getByLabelText('Số tiền thực nhận (VND)'), {
    target: { value: '3000000' },
  });
  fireEvent.change(screen.getByLabelText('Thời điểm nhận tiền'), {
    target: { value: '2026-10-09T10:00' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản thu' }));
}

afterEach(() => vi.restoreAllMocks());

describe('management billing workspace', () => {
  it('replays a retained approval command with its original body and idempotency key', async () => {
    const api = gateway();
    vi.mocked(api.approveRefund)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ refundApprovalId: 'approval' });
    const { records, intents } = journal();
    const { result } = renderHook(
      () => useBillingWorkspace({ accountId: 'actor', authorize, gateway: api, intents }),
      { wrapper: NotificationProvider },
    );
    await act(() => result.current.load(bookingId));
    const body = {
      bookingId,
      expectedBillingRevision: 4,
      approvedRefundableVnd: 100000,
      basis: { kind: 'CANCELLATION' as const },
      reason: 'Theo quyết định đã duyệt',
      evidenceReference: 'approval-1',
    };
    await act(async () => {
      expect(await result.current.mutate('approval', body)).toBe('retry');
    });
    expect(records.size).toBe(1);
    await act(async () => {
      expect(await result.current.mutate('approval', body)).toBe('succeeded');
    });
    expect(api.approveRefund).toHaveBeenCalledTimes(2);
    expect(api.approveRefund).toHaveBeenCalledWith('token', body, expect.any(String));
    expect(vi.mocked(api.approveRefund).mock.calls[1]).toEqual(
      vi.mocked(api.approveRefund).mock.calls[0],
    );
    expect(records.size).toBe(0);
    expect(api.recordManual).not.toHaveBeenCalled();
    expect(api.refund).not.toHaveBeenCalled();
  });
  it('clears the loaded booking and monetary forms when the lookup identifier changes', async () => {
    const api = gateway();
    open(api);
    await load();
    expect(screen.getByRole('heading', { name: 'Ghi nhận tiền đã nhận' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Mã hồ sơ đặt tiệc'), {
      target: { value: '00000000-0000-4000-8000-000000000105' },
    });
    expect(screen.queryByText('Còn phải thu')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Ghi nhận tiền đã nhận' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ghi nhận hoàn tiền' })).not.toBeInTheDocument();
    expect(api.load).toHaveBeenCalledTimes(1);
    expect(api.recordManual).not.toHaveBeenCalled();
    expect(api.refund).not.toHaveBeenCalled();
    expect(api.approveRefund).not.toHaveBeenCalled();
  });

  it('requires explicit confirmation and replays an uncertain receipt without changing its key or contract basis', async () => {
    const api = gateway();
    vi.mocked(api.recordManual)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ paymentId, paymentAttemptId: 'attempt' });
    const { records, intents } = journal();
    open(api, intents);
    await load();
    reviewManual();
    expect(api.recordManual).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ghi nhận' }));
    const retry = await screen.findByRole('button', { name: 'Khôi phục và kiểm tra yêu cầu cũ' });
    expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Hoàn tiền' })).toBeDisabled();
    expect(api.refund).not.toHaveBeenCalled();
    expect(api.approveRefund).not.toHaveBeenCalled();
    fireEvent.click(retry);
    await screen.findByText('Đã ghi nhận khoản thu.');
    expect(api.recordManual).toHaveBeenCalledTimes(2);
    expect(api.recordManual).toHaveBeenCalledWith('token', manualBody, expect.any(String));
    expect(vi.mocked(api.recordManual).mock.calls[1]).toEqual(
      vi.mocked(api.recordManual).mock.calls[0],
    );
    expect(records.size).toBe(0);
  });

  it('retains an old receipt key and blocks unrelated commands when legacy evidence cannot be reentered', async () => {
    const { records, intents } = journal();
    const legacyBody = {
      ...manualBody,
      reason: 'Đã đối soát',
      evidenceReference: 'legacy-receipt',
    };
    let originalKey = '';
    await expect(
      intents.run('manual:' + bookingId, legacyBody, (key) => {
        originalKey = key;
        return Promise.reject(new Error('offline'));
      }),
    ).rejects.toThrow('offline');
    const api = gateway();
    open(api, intents);
    await load();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Yêu cầu cũ không có đủ dữ liệu khôi phục tự động',
    );
    reviewManual();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ghi nhận' }));
    await screen.findByText(/Nội dung nhập lại khác yêu cầu trước/);
    expect(api.recordManual).not.toHaveBeenCalled();
    expect(api.refund).not.toHaveBeenCalled();
    expect(api.approveRefund).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Hoàn tiền' })).toBeDisabled();
    expect(JSON.parse([...records.values()][0]!).key).toBe(originalKey);
  });

  it('recovers the original refund revision and key when the newly loaded ledger is newer', async () => {
    const { records, intents } = journal();
    const refundBody = {
      sourcePaymentId: paymentId,
      amountVnd: 100000,
      expectedBillingRevision: 4,
    };
    let originalKey = '';
    await expect(
      intents.run('refund:' + bookingId, refundBody, (key) => {
        originalKey = key;
        return Promise.reject(new Error('offline'));
      }),
    ).rejects.toThrow('offline');
    const api = gateway();
    vi.mocked(api.load).mockResolvedValue({ ...view, billingRevision: 5 });
    vi.mocked(api.recording!).mockResolvedValue({ ...recording, billingRevision: 5 });
    vi.mocked(api.refund).mockResolvedValue({ refundId: 'refund' });
    open(api, intents);
    await load();
    expect(screen.getByLabelText('Mã hồ sơ đặt tiệc')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kiểm tra khoản thu' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Khôi phục và kiểm tra yêu cầu cũ' }));
    await waitFor(() => expect(api.refund).toHaveBeenCalledWith('token', refundBody, originalKey));
    expect(api.recordManual).not.toHaveBeenCalled();
    expect(records.size).toBe(0);
  });

  it('restores legacy refund metadata instead of sending the newer recording revision', async () => {
    const { records, intents } = journal();
    const refundBody = {
      sourcePaymentId: paymentId,
      amountVnd: 100000,
      expectedBillingRevision: 4,
    };
    let originalKey = '';
    await expect(
      intents.run('refund:' + bookingId, refundBody, (key) => {
        originalKey = key;
        return Promise.reject(new Error('offline'));
      }),
    ).rejects.toThrow('offline');
    // Old records retained metadata and a fingerprint, before full recovery bodies existed.
    for (const [key, value] of records) {
      const saved = JSON.parse(value);
      delete saved.body;
      records.set(key, JSON.stringify(saved));
    }
    const api = gateway();
    vi.mocked(api.load).mockResolvedValue({ ...view, billingRevision: 5 });
    vi.mocked(api.recording!).mockResolvedValue({
      ...recording,
      billingRevision: 5,
      refundablePayments: [
        {
          paymentId,
          amountVnd: 3000000,
          refundedVnd: 0,
          maxRefundVnd: 3000000,
          occurredAt: '2026-10-09T10:00:00Z',
          provider: 'MANUAL',
          purpose: 'DEPOSIT',
          revision: 4,
        },
      ],
    });
    vi.mocked(api.refund).mockResolvedValue({ refundId: 'refund' });
    open(api, intents);
    await load();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Yêu cầu cũ không có đủ dữ liệu khôi phục tự động',
    );
    await selectOption('Khoản thanh toán gốc', /Cọc · Ngoài hệ thống/);
    fireEvent.change(screen.getByLabelText('Số tiền hoàn (VND)'), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra khoản hoàn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tiền' }));
    await waitFor(() => expect(api.refund).toHaveBeenCalledWith('token', refundBody, originalKey));
    expect(api.recordManual).not.toHaveBeenCalled();
  });

  it('disables money commands when current recording eligibility cannot be verified', async () => {
    const api = gateway();
    vi.mocked(api.recording!).mockRejectedValue(new Error('offline'));
    open(api);
    await load();
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByLabelText('Số tiền thực nhận (VND)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Kiểm tra khoản thu' })).toBeDisabled();
    expect(api.recordManual).not.toHaveBeenCalled();
    expect(api.refund).not.toHaveBeenCalled();
    expect(api.approveRefund).not.toHaveBeenCalled();
  });
});
