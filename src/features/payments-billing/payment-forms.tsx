'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { BillingView, ManualPaymentBody, RefundBody } from './billing-api';
import { Info } from 'lucide-react';
import { notify } from '../../design-system/notifications';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

import {
  confirmClass,
  fieldsetClass,
  inputClass,
  labelClass,
  panelClass,
  rowClass,
  selectClass,
} from './billing-form-classes';

export type CommandOutcome = 'succeeded' | 'retry' | 'failed';
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

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
      className={confirmClass}
      aria-label={refund ? 'Xác nhận khoản hoàn' : 'Xác nhận khoản thu'}
    >
      <h3 className="font-semibold text-primary">
        {refund ? 'Kiểm tra trước khi ghi nhận hoàn tiền' : 'Kiểm tra chứng từ nhận tiền'}
      </h3>
      <strong className="text-xl font-bold tabular-nums">{money(amount)}</strong>
      <p>{reason}</p>
      <p className="text-xs text-muted-foreground">Chứng từ: {evidence}</p>
      <p className="rounded-lg bg-hy-warning-bg px-3 py-2 text-xs">
        {refund
          ? 'Chỉ ghi nhận khoản hoàn đã thực hiện theo quyết định được duyệt. Thao tác này không chuyển tiền tự động.'
          : 'Chỉ xác nhận khi nhà hàng đã thực nhận và kiểm tra chứng từ.'}
      </p>
      {retry && (
        <p role="status" className="rounded-lg bg-hy-info-bg px-3 py-2 text-xs text-hy-info">
          Chưa rõ kết quả. Giữ nguyên nội dung và thử lại yêu cầu này để kiểm tra kết quả.
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" disabled={disabled} onClick={onConfirm}>
          {retry ? 'Thử lại yêu cầu này' : refund ? 'Xác nhận hoàn tiền' : 'Xác nhận ghi nhận'}
        </Button>
        <Button variant="outline" type="button" disabled={disabled || retry} onClick={onCancel}>
          Quay lại chỉnh sửa
        </Button>
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
      notify.warning('Nhập số tiền nguyên dương, thời điểm và chứng từ hợp lệ.');
      return;
    }
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
    <section className={panelClass}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">Ghi nhận tiền đã nhận</h2>
        <p className="text-xs text-muted-foreground">
          Ghi nhận tiền mặt hoặc chuyển khoản mà nhà hàng đã nhận và kiểm tra chứng từ.
        </p>
      </div>
      <form ref={form} onSubmit={review}>
        <fieldset disabled={disabled || draft !== null} className={fieldsetClass}>
          <div className={rowClass}>
            <label className={labelClass}>
              Loại khoản thu
              <select name="purpose" className={selectClass}>
                <option value="DEPOSIT">Đặt cọc</option>
                <option value="BALANCE">Thanh toán còn lại</option>
              </select>
            </label>
            <label className={labelClass}>
              Số tiền thực nhận (VND)
              <Input
                className={inputClass}
                name="amount"
                type="number"
                min={1}
                max={Number.MAX_SAFE_INTEGER}
                step={1}
                required
              />
            </label>
          </div>
          <small className="flex items-start gap-2 rounded-lg bg-hy-info-bg px-3 py-2 text-xs text-hy-info">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Lưu ý:</strong> Đối với loại &quot;Đặt cọc&quot;, số tiền thực nhận bắt buộc
              phải khớp chính xác số tiền cọc quy định trên hồ sơ tiệc (xem tại mục &quot;Tiền
              cọc&quot;).
            </span>
          </small>
          <div className={rowClass}>
            <label className={labelClass}>
              Thời điểm nhận tiền
              <Input className={inputClass} name="settledAt" type="datetime-local" required />
            </label>
            <label className={labelClass}>
              Mã chứng từ
              <Input
                className={inputClass}
                name="evidence"
                required
                maxLength={120}
                autoComplete="off"
              />
            </label>
          </div>
          <label className={labelClass}>
            Lý do ghi nhận
            <Textarea className={inputClass} name="reason" required maxLength={500} rows={2} />
          </label>
          <Button type="submit" className="self-start">
            Kiểm tra khoản thu
          </Button>
        </fieldset>
      </form>
      {draft !== null && (
        <>
          <p className="text-xs">
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
      notify.warning('Chọn khoản gốc và nhập số tiền nguyên dương, lý do, chứng từ hợp lệ.');
      return;
    }
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
    <section className={panelClass}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">Ghi nhận hoàn tiền</h2>
        <p className="text-xs text-muted-foreground">
          Chọn khoản thanh toán gốc. Hệ thống kiểm tra quyết định đã duyệt và hạn mức còn được hoàn.
        </p>
      </div>
      <form ref={form} onSubmit={review}>
        <fieldset
          className={fieldsetClass}
          disabled={
            disabled || draft !== null || payments.length === 0 || booking.billingRevision === 0
          }
        >
          <div className={rowClass}>
            <label className={labelClass}>
              Khoản thanh toán gốc
              <select name="source" required defaultValue="" className={selectClass}>
                <option value="">Chọn khoản thanh toán</option>
                {payments.map((entry) => (
                  <option key={entry.ledgerEntryId} value={entry.ledgerEntryId}>
                    {money(entry.amountVnd)} ·{' '}
                    {new Date(entry.occurredAt).toLocaleDateString('vi-VN')} · {entry.ledgerEntryId}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Số tiền hoàn (VND)
              <Input
                className={inputClass}
                name="amount"
                type="number"
                min={1}
                max={Number.MAX_SAFE_INTEGER}
                step={1}
                required
              />
            </label>
          </div>
          <label className={labelClass}>
            Mã chứng từ hoàn
            <Input
              className={inputClass}
              name="evidence"
              required
              maxLength={120}
              autoComplete="off"
            />
          </label>
          <label className={labelClass}>
            Lý do hoàn tiền
            <Textarea className={inputClass} name="reason" required maxLength={500} rows={2} />
          </label>
          <Button type="submit" className="self-start">
            Kiểm tra khoản hoàn
          </Button>
        </fieldset>
      </form>
      {payments.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Chưa có khoản thanh toán trong các trang đã tải. Tải thêm lịch sử để tìm khoản gốc.
        </p>
      )}
      {draft !== null && (
        <>
          <p className="text-xs">
            Khoản gốc:{' '}
            <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono break-all">
              {draft.sourcePaymentId}
            </code>
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
