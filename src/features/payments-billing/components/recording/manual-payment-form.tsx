'use client';

import { HySelect } from '@/src/components/ui/select-field';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  ManualPaymentBody,
  RecordingContext,
} from '@/src/features/payments-billing/api/billing-api';
import { Info } from 'lucide-react';
import { notify } from '@/src/design-system/notifications/index';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { formatDateTime } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import {
  fieldsetClass,
  inputClass,
  labelClass,
  panelClass,
  rowClass,
  selectClass,
} from '@/src/features/payments-billing/styles/billing-form-classes';
import {
  type CommandOutcome,
  money,
  field,
  ConfirmPayment,
  recordingReason,
} from './payment-form-shared';

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
                  Đặt cọc
                  {recording?.deposit.isSettled
                    ? ' · Đã thu tiền cọc'
                    : !recording?.deposit.canRecord
                      ? ' · Chưa đủ điều kiện'
                      : ''}
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
            {purpose === 'DEPOSIT' && recording?.deposit.isSettled
              ? 'Đã thu tiền cọc: ' +
                money(recording.deposit.settledAmountVnd ?? 0) +
                (recording.deposit.settledAt
                  ? ' · ' + formatDateTime(recording.deposit.settledAt)
                  : '')
              : eligibility?.canRecord
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
