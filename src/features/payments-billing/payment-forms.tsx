'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { BillingView, ManualPaymentBody, RefundBody } from './billing-api';

export type CommandOutcome = 'succeeded' | 'retry' | 'failed';
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

function EvidenceFields({ refund = false }: Readonly<{ refund?: boolean }>) {
  return (
    <>
      <label>
        {refund ? 'Mã chứng từ hoàn' : 'Mã chứng từ'}
        <input name="evidence" required maxLength={120} autoComplete="off" />
      </label>
      <label>
        {refund ? 'Lý do hoàn tiền' : 'Lý do ghi nhận'}
        <textarea name="reason" required maxLength={500} rows={3} />
      </label>
    </>
  );
}
function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}
function readEvidence(data: FormData) {
  return {
    evidenceReference: field(data, 'evidence').trim(),
    reason: field(data, 'reason').trim(),
  };
}
function ConfirmPayment({
  amount,
  reason,
  evidence,
  refund,
  retry,
  disabled,
  onConfirm,
  onCancel,
}: Readonly<{
  amount: number;
  reason: string;
  evidence: string;
  refund: boolean;
  retry: boolean;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  return (
    <section
      className="billing-confirm"
      aria-label={refund ? 'Xác nhận khoản hoàn' : 'Xác nhận khoản thu'}
    >
      <h3>{refund ? 'Kiểm tra trước khi ghi nhận hoàn tiền' : 'Kiểm tra chứng từ nhận tiền'}</h3>
      <strong>{money(amount)}</strong>
      <p>{reason}</p>
      <p>Chứng từ: {evidence}</p>
      <p>
        {refund
          ? 'Chỉ ghi nhận khoản hoàn đã thực hiện theo quyết định được duyệt. Thao tác này không chuyển tiền tự động.'
          : 'Chỉ xác nhận khi nhà hàng đã thực nhận và kiểm tra chứng từ.'}
      </p>
      {retry && <p role="status">Chưa rõ kết quả. Giữ nguyên nội dung để đối soát cùng yêu cầu.</p>}
      <div className="billing-actions">
        <button type="button" disabled={disabled} onClick={onConfirm}>
          {retry ? 'Thử lại yêu cầu này' : refund ? 'Xác nhận hoàn tiền' : 'Xác nhận ghi nhận'}
        </button>
        <button
          className="billing-secondary"
          type="button"
          disabled={disabled || retry}
          onClick={onCancel}
        >
          Quay lại chỉnh sửa
        </button>
      </div>
    </section>
  );
}

export function ManualPaymentForm({
  bookingId,
  disabled,
  onConfirm,
}: Readonly<{
  bookingId: string;
  disabled: boolean;
  onConfirm: (body: ManualPaymentBody) => Promise<CommandOutcome>;
}>) {
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<ManualPaymentBody | null>(null);
  const [retry, setRetry] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountVnd = Number(data.get('amount'));
    const date = new Date(field(data, 'settledAt'));
    const evidence = readEvidence(data);
    if (
      !Number.isSafeInteger(amountVnd) ||
      amountVnd <= 0 ||
      !Number.isFinite(date.getTime()) ||
      !evidence.reason ||
      !evidence.evidenceReference
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft({
      bookingId,
      purpose: data.get('purpose') === 'BALANCE' ? 'BALANCE' : 'DEPOSIT',
      amountVnd,
      settledAt: date.toISOString(),
      ...evidence,
    });
  };
  const confirm = async () => {
    if (draft === null) return;
    const result = await onConfirm(draft);
    if (result === 'succeeded') form.current?.reset();
    setRetry(result === 'retry');
    if (result !== 'retry') setDraft(null);
  };
  return (
    <section className="billing-panel">
      <h2>Ghi nhận tiền đã nhận</h2>
      <p>
        Tiền mặt hoặc chuyển khoản đã đối soát. Hệ thống kiểm tra điều kiện cọc và số dư còn phải
        thu.
      </p>
      <form ref={form} onSubmit={review}>
        <fieldset disabled={disabled || draft !== null}>
          <label>
            Loại khoản thu
            <select name="purpose">
              <option value="DEPOSIT">Đặt cọc</option>
              <option value="BALANCE">Thanh toán còn lại</option>
            </select>
          </label>
          <label>
            Số tiền thực nhận (VND)
            <input
              name="amount"
              type="number"
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              step={1}
              required
            />
          </label>
          <label>
            Thời điểm nhận tiền
            <input name="settledAt" type="datetime-local" required />
          </label>
          <EvidenceFields />
          <button type="submit">Kiểm tra khoản thu</button>
        </fieldset>
      </form>
      {invalid && <p role="alert">Nhập số tiền nguyên dương, thời điểm và chứng từ hợp lệ.</p>}
      {draft !== null && (
        <>
          <p>
            Khoản thu: {draft.purpose === 'DEPOSIT' ? 'Đặt cọc' : 'Thanh toán còn lại'} ·{' '}
            {new Date(draft.settledAt).toLocaleString('vi-VN')}
          </p>
          <ConfirmPayment
            amount={draft.amountVnd}
            reason={draft.reason}
            evidence={draft.evidenceReference}
            refund={false}
            retry={retry}
            disabled={disabled}
            onConfirm={() => {
              void confirm();
            }}
            onCancel={() => setDraft(null)}
          />
        </>
      )}
    </section>
  );
}

export function RefundForm({
  booking,
  disabled,
  onConfirm,
}: Readonly<{
  booking: BillingView;
  disabled: boolean;
  onConfirm: (body: RefundBody) => Promise<CommandOutcome>;
}>) {
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<RefundBody | null>(null);
  const [retry, setRetry] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const payments = booking.history.filter((entry) => entry.kind === 'PAYMENT');
  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountVnd = Number(data.get('amount'));
    const sourcePaymentId = field(data, 'source');
    const evidence = readEvidence(data);
    if (
      !Number.isSafeInteger(amountVnd) ||
      amountVnd <= 0 ||
      !payments.some((payment) => payment.ledgerEntryId === sourcePaymentId) ||
      !evidence.reason ||
      !evidence.evidenceReference
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setDraft({
      sourcePaymentId,
      amountVnd,
      expectedBillingRevision: booking.billingRevision,
      ...evidence,
    });
  };
  const confirm = async () => {
    if (draft === null) return;
    const result = await onConfirm(draft);
    if (result === 'succeeded') form.current?.reset();
    setRetry(result === 'retry');
    if (result !== 'retry') setDraft(null);
  };
  return (
    <section className="billing-panel">
      <h2>Ghi nhận hoàn tiền</h2>
      <p>
        Chọn khoản thanh toán gốc. Hệ thống kiểm tra quyết định đã duyệt và hạn mức còn được hoàn.
      </p>
      <form ref={form} onSubmit={review}>
        <fieldset
          disabled={
            disabled || draft !== null || payments.length === 0 || booking.billingRevision === 0
          }
        >
          <label>
            Khoản thanh toán gốc
            <select name="source" required defaultValue="">
              <option value="">Chọn khoản thanh toán</option>
              {payments.map((entry) => (
                <option key={entry.ledgerEntryId} value={entry.ledgerEntryId}>
                  {money(entry.amountVnd)} ·{' '}
                  {new Date(entry.occurredAt).toLocaleDateString('vi-VN')} · {entry.ledgerEntryId}
                </option>
              ))}
            </select>
          </label>
          <label>
            Số tiền hoàn (VND)
            <input
              name="amount"
              type="number"
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              step={1}
              required
            />
          </label>
          <EvidenceFields refund />
          <button type="submit">Kiểm tra khoản hoàn</button>
        </fieldset>
      </form>
      {payments.length === 0 && (
        <p>Chưa có khoản thanh toán trong các trang đã tải. Tải thêm lịch sử để tìm khoản gốc.</p>
      )}
      {invalid && (
        <p role="alert">Chọn khoản gốc và nhập số tiền nguyên dương, lý do, chứng từ hợp lệ.</p>
      )}
      {draft !== null && (
        <>
          <p>
            Khoản gốc: <code>{draft.sourcePaymentId}</code> · Phiên bản số dư{' '}
            {draft.expectedBillingRevision}
          </p>
          <ConfirmPayment
            amount={draft.amountVnd}
            reason={draft.reason}
            evidence={draft.evidenceReference}
            refund
            retry={retry}
            disabled={disabled}
            onConfirm={() => {
              void confirm();
            }}
            onCancel={() => setDraft(null)}
          />
        </>
      )}
    </section>
  );
}
