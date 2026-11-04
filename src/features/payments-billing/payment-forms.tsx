'use client';
import { HySelect } from '../../components/ui/select-field';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { BillingView, ManualPaymentBody, RefundBody, RecordingContext } from './billing-api';
import { Info } from 'lucide-react';
import { notify } from '../../design-system/notifications';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatDateTime } from '../booking-lifecycle/booking-helpers';

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
function ConfirmPayment({
  amount,
  refund,
  retry,
  disabled,
  onConfirm,
  onCancel,
}: Readonly<{
  amount: number;
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
        {refund ? 'Kiểm tra trước khi ghi nhận hoàn tiền' : 'Kiểm tra khoản thu'}
      </h3>
      <strong className="text-xl font-bold tabular-nums">{money(amount)}</strong>
      <p className="rounded-lg bg-hy-warning-bg px-3 py-2 text-xs">
        {refund
          ? 'Chỉ xác nhận khi đã thực sự hoàn tiền bên ngoài hệ thống. Thao tác này ghi vào lịch sử và không chuyển tiền tự động.'
          : 'Chỉ xác nhận khi nhà hàng đã thực nhận tiền bên ngoài hệ thống. Khoản thu sẽ được lưu trong lịch sử giao dịch.'}
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
  recording,
  onEditingChange,
  onConfirm,
}: Readonly<{
  bookingId: string;
  disabled: boolean;
  recording?: RecordingContext | null | undefined;
  onEditingChange?: (value: boolean) => void;
  onConfirm: (body: ManualPaymentBody) => Promise<CommandOutcome>;
}>) {
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<ManualPaymentBody | null>(null);
  const [retry, setRetry] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [purpose, setPurpose] = useState<'DEPOSIT' | 'BALANCE'>(() =>
    recording?.deposit.canRecord ? 'DEPOSIT' : recording?.balance.canRecord ? 'BALANCE' : 'DEPOSIT',
  );
  useEffect(() => {
    if (dirty || draft !== null || !recording) return;
    if (purpose === 'DEPOSIT' && !recording.deposit.canRecord && recording.balance.canRecord)
      setPurpose('BALANCE');
    else if (purpose === 'BALANCE' && !recording.balance.canRecord && recording.deposit.canRecord)
      setPurpose('DEPOSIT');
  }, [recording, purpose, dirty, draft]);
  const eligibility = purpose === 'DEPOSIT' ? recording?.deposit : recording?.balance;
  const maximum =
    purpose === 'DEPOSIT' ? recording?.deposit.amountVnd : recording?.balance.maxAmountVnd;
  useEffect(() => {
    onEditingChange?.(dirty || draft !== null);
  }, [dirty, draft, onEditingChange]);
  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);
  const discard = () => {
    form.current?.reset();
    setDraft(null);
    setRetry(false);
    setDirty(false);
  };
  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountVnd = Number(data.get('amount'));
    const date = new Date(field(data, 'settledAt'));
    if (!Number.isSafeInteger(amountVnd) || amountVnd <= 0 || !Number.isFinite(date.getTime())) {
      notify.warning('Nhập số tiền nguyên dương và thời điểm nhận tiền hợp lệ.');
      return;
    }
    if (
      !eligibility?.canRecord ||
      maximum === undefined ||
      (purpose === 'DEPOSIT' ? amountVnd !== maximum : amountVnd > maximum)
    ) {
      notify.warning('Số tiền không phù hợp với điều kiện thu hiện tại. Kiểm tra số tiền cần thu.');
      return;
    }
    setDirty(true);
    setDraft({
      bookingId,
      purpose,
      ...(purpose === 'BALANCE' && recording
        ? { expectedBillingRevision: recording.billingRevision }
        : {}),
      ...(purpose === 'DEPOSIT' && recording?.deposit.timelineRevisionId
        ? { timelineRevisionId: recording.deposit.timelineRevisionId }
        : {}),
      ...(purpose === 'DEPOSIT' && recording?.deposit.contractRevisionId
        ? {
            contractRevisionId: recording.deposit.contractRevisionId,
            ...(recording.deposit.documentDigest
              ? { documentDigest: recording.deposit.documentDigest }
              : {}),
          }
        : {}),
      amountVnd,
      settledAt: date.toISOString(),
    });
  };
  const confirm = async () => {
    if (draft === null) return;
    const result = await onConfirm(draft);
    if (result === 'succeeded') {
      form.current?.reset();
      setDirty(false);
    }
    setRetry(result === 'retry');
    if (result !== 'retry') setDraft(null);
  };
  return (
    <section className={panelClass}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">Ghi nhận tiền đã nhận</h2>
        <p className="text-xs text-muted-foreground">
          Ghi nhận tiền mặt hoặc chuyển khoản đã nhận bên ngoài hệ thống.
        </p>
      </div>
      <form ref={form} onSubmit={review} onChangeCapture={() => setDirty(true)}>
        <fieldset disabled={disabled || draft !== null} className={fieldsetClass}>
          <div className={rowClass}>
            <label className={labelClass}>
              Loại khoản thu
              <HySelect
                name="purpose"
                className={selectClass}
                value={purpose}
                onChange={(event) => {
                  setPurpose(event.target.value === 'BALANCE' ? 'BALANCE' : 'DEPOSIT');
                  setDirty(true);
                }}
              >
                <option value="DEPOSIT" disabled={!recording?.deposit.canRecord}>
                  Đặt cọc{!recording?.deposit.canRecord ? ' · Chưa đủ điều kiện' : ''}
                </option>
                <option value="BALANCE" disabled={!recording?.balance.canRecord}>
                  Thanh toán còn lại{!recording?.balance.canRecord ? ' · Chưa đủ điều kiện' : ''}
                </option>
              </HySelect>
            </label>
            <label className={labelClass}>
              Số tiền thực nhận (VND)
              <Input
                className={inputClass}
                name="amount"
                disabled={!eligibility?.canRecord}
                key={purpose + ':' + recording?.billingRevision + ':' + recording?.bookingRevision}
                defaultValue={maximum}
                onFocus={(event) => event.currentTarget.select()}
                type="number"
                min={1}
                max={maximum ?? 0}
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
              <Input
                className={inputClass}
                name="settledAt"
                type="datetime-local"
                required
                disabled={!eligibility?.canRecord}
              />
            </label>
          </div>
          <p className="text-xs" role="status">
            {eligibility?.canRecord
              ? (purpose === 'DEPOSIT' ? 'Tiền cọc cần ghi nhận: ' : 'Có thể thu tối đa: ') +
                money(maximum ?? 0)
              : recordingReason(eligibility?.reasonCode)}
          </p>
          <Button type="submit" className="self-start" disabled={!eligibility?.canRecord}>
            Kiểm tra khoản thu
          </Button>
        </fieldset>
      </form>
      {dirty && !retry && draft === null ? (
        <Button type="button" variant="ghost" disabled={disabled} onClick={discard}>
          Bỏ nội dung đang nhập
        </Button>
      ) : null}
      {draft !== null && (
        <>
          <p className="text-xs">
            Khoản thu: {draft.purpose === 'DEPOSIT' ? 'Đặt cọc' : 'Thanh toán còn lại'} ·{' '}
            {formatDateTime(draft.settledAt)}
          </p>
          <ConfirmPayment
            amount={draft.amountVnd}
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
  recording,
  onLoadMore,
  onEditingChange,
  onConfirm,
}: Readonly<{
  booking: BillingView;
  disabled: boolean;
  recording?: RecordingContext | null | undefined;
  onLoadMore?: (() => void) | undefined;
  onEditingChange?: (value: boolean) => void;
  onConfirm: (body: RefundBody) => Promise<CommandOutcome>;
}>) {
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<RefundBody | null>(null);
  const [retry, setRetry] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const payments = recording?.refundablePayments.filter((entry) => entry.maxRefundVnd > 0) ?? [];
  const selected = payments.find((entry) => entry.paymentId === sourceId);
  useEffect(() => {
    onEditingChange?.(dirty || draft !== null);
  }, [dirty, draft, onEditingChange]);
  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);
  const discard = () => {
    form.current?.reset();
    setDraft(null);
    setRetry(false);
    setDirty(false);
    setSourceId('');
  };
  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountVnd = Number(data.get('amount'));
    const sourcePaymentId = field(data, 'source');
    if (
      !Number.isSafeInteger(amountVnd) ||
      amountVnd <= 0 ||
      !payments.some(
        (payment) => payment.paymentId === sourcePaymentId && amountVnd <= payment.maxRefundVnd,
      )
    ) {
      notify.warning('Chọn khoản thanh toán gốc và nhập số tiền nguyên dương hợp lệ.');
      return;
    }
    setDirty(true);
    setDraft({
      sourcePaymentId,
      amountVnd,
      expectedBillingRevision: recording?.billingRevision ?? booking.billingRevision,
    });
  };
  const confirm = async () => {
    if (draft === null) return;
    const result = await onConfirm(draft);
    if (result === 'succeeded') {
      form.current?.reset();
      setDirty(false);
      setSourceId('');
    }
    setRetry(result === 'retry');
    if (result !== 'retry') setDraft(null);
  };
  return (
    <section className={panelClass}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">Ghi nhận hoàn tiền</h2>
        <p className="text-xs text-muted-foreground">
          Ghi nhận khoản đã hoàn bên ngoài hệ thống. Chọn giao dịch gốc; hệ thống kiểm tra hạn mức
          hoàn và lưu xác nhận trong cùng thao tác.
        </p>
      </div>
      <form ref={form} onSubmit={review} onChangeCapture={() => setDirty(true)}>
        <fieldset
          className={fieldsetClass}
          disabled={
            disabled || draft !== null || payments.length === 0 || booking.billingRevision === 0
          }
        >
          <div className={rowClass}>
            <label className={labelClass}>
              Khoản thanh toán gốc
              <HySelect
                name="source"
                required
                value={sourceId}
                onChange={(event) => {
                  setSourceId(event.target.value);
                  setDirty(true);
                }}
                className={selectClass}
              >
                <option value="">Chọn khoản thanh toán</option>
                {payments.map((entry) => (
                  <option key={entry.paymentId} value={entry.paymentId}>
                    {entry.purpose === 'DEPOSIT'
                      ? 'Cọc'
                      : entry.purpose === 'BALANCE'
                        ? 'Thu số dư'
                        : 'Khoản thu'}{' '}
                    ·{' '}
                    {entry.provider === 'VNPAY'
                      ? 'VNPay'
                      : entry.provider === 'MANUAL'
                        ? 'Ngoài hệ thống'
                        : 'Chưa có phương thức'}{' '}
                    · {formatDateTime(entry.occurredAt)} · Còn hoàn {money(entry.maxRefundVnd)}
                  </option>
                ))}
              </HySelect>
            </label>
            <label className={labelClass}>
              Số tiền hoàn (VND)
              <Input
                className={inputClass}
                name="amount"
                disabled={!selected}
                type="number"
                min={1}
                max={selected?.maxRefundVnd ?? 0}
                step={1}
                required
              />
            </label>
          </div>
          <p className="text-xs" role="status">
            {selected
              ? 'Số tiền còn được hoàn cho giao dịch này: ' + money(selected.maxRefundVnd)
              : 'Chọn giao dịch gốc để xem số tiền được hoàn.'}
          </p>
          <Button type="submit" className="self-start" disabled={!selected}>
            Kiểm tra khoản hoàn
          </Button>
        </fieldset>
      </form>
      {payments.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Chưa có giao dịch được phép hoàn trong danh sách hiện tại. Hệ thống chỉ cho hoàn trong hạn
          mức có căn cứ.
        </p>
      )}
      {recording?.nextAfterRevision != null ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled || draft !== null}
          onClick={onLoadMore}
        >
          Tải thêm giao dịch có thể hoàn
        </Button>
      ) : null}
      {dirty && !retry && draft === null ? (
        <Button type="button" variant="ghost" disabled={disabled} onClick={discard}>
          Bỏ nội dung đang nhập
        </Button>
      ) : null}
      {draft !== null && (
        <>
          <p className="text-xs">
            Khoản gốc:{' '}
            {selected
              ? formatDateTime(selected.occurredAt) + ' · Đã thu ' + money(selected.amountVnd)
              : 'Giao dịch đã chọn'}
          </p>
          <ConfirmPayment
            amount={draft.amountVnd}
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

export function recordingReason(code: string | null | undefined): string {
  const reasons: Record<string, string> = {
    BOOKING_NOT_PAYABLE: 'Tiệc không còn ở giai đoạn nhận cọc.',
    PAYMENT_ATTEMPT_ACTIVE: 'Có giao dịch chưa rõ kết quả. Đối chiếu giao dịch trước khi ghi nhận.',
    TIMELINE_NOT_MUTUALLY_APPROVED: 'Kịch bản cần được hai bên duyệt cùng phiên bản.',
    CONTRACT_APPROVAL_REQUIRED: 'Hợp đồng hiện tại cần được hai bên phê duyệt.',
    BALANCE_NOT_ELIGIBLE: 'Hồ sơ chưa đủ điều kiện thu số dư.',
    INVOICE_FINALIZATION_REQUIRED: 'Cần chốt hóa đơn cuối trước khi thu số dư.',
    BILLING_BALANCE_LIMIT_EXCEEDED: 'Không còn số dư cần thu.',
    FINANCIAL_SOURCE_CONFLICT: 'Dữ liệu tài chính cần được đối chiếu trước khi thu tiền.',
    STALE_BILLING_REVISION: 'Công nợ đã thay đổi. Bỏ nội dung đang nhập và cập nhật lại.',
  };
  return code
    ? (reasons[code] ?? 'Chưa đủ điều kiện ghi nhận. Kiểm tra lại hồ sơ và công nợ.')
    : 'Đang chờ dữ liệu điều kiện thu/hoàn từ máy chủ.';
}
