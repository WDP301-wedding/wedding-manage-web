'use client';

import { HySelect } from '@/src/components/ui/select-field';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  BillingView,
  RefundBody,
  RecordingContext,
} from '@/src/features/payments-billing/api/billing-api';
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
import { type CommandOutcome, money, field, ConfirmPayment } from './payment-form-shared';

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
  const policy = recording?.cancellationRefund;
  const payments = (recording?.refundablePayments ?? []).filter(
    (entry) => !policy || entry.paymentId === policy.depositPaymentId,
  );
  const canRecord = policy
    ? policy.canRecord && recording?.bookingPhase === 'CANCELLED'
    : payments.some((entry) => entry.maxRefundVnd > 0);
  const eligible = payments.filter((entry) => canRecord && entry.maxRefundVnd > 0);
  const autoSourceId = policy && eligible.length === 1 ? eligible[0]!.paymentId : '';
  useEffect(() => {
    if (!sourceId && autoSourceId) setSourceId(autoSourceId);
  }, [sourceId, autoSourceId]);
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
      !canRecord ||
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
      {policy && (
        <div className="rounded-lg bg-secondary p-3 text-sm space-y-1">
          <p>
            {recording?.bookingPhase !== 'CANCELLED'
              ? 'Chỉ ghi nhận hoàn khi tiệc đã được xác nhận hủy. Các mức dưới đây để tham khảo.'
              : policy.entitledVnd === null
                ? 'Chưa đủ căn cứ tính tự động. Cần đối soát bên hủy, thời điểm yêu cầu và hợp đồng đã ký.'
                : 'Chính sách áp dụng: ' +
                  (policy.initiator === 'RESTAURANT'
                    ? 'Nhà hàng hủy — hoàn 100% cọc thực nhận.'
                    : 'Khách hủy — hoàn ' + policy.ratePercent + '% cọc thực nhận.')}
          </p>
          {policy.requestedAt && (
            <p>
              Nhận yêu cầu: {formatDateTime(policy.requestedAt)} · Bắt đầu tiệc:{' '}
              {formatDateTime(policy.eventStartsAt)}
            </p>
          )}
          <p>
            Cọc thực nhận: {money(policy.depositReceivedVnd)} · Đã hoàn:{' '}
            {money(policy.alreadyRefundedVnd)}
          </p>
          {policy.entitledVnd !== null && (
            <p>
              {recording?.bookingPhase === 'CANCELLED' ? 'Còn được hoàn: ' : 'Mức hoàn dự kiến: '}
              <strong>{money(policy.remainingVnd)}</strong>
            </p>
          )}
          {policy.ratePercent === 0 && recording?.bookingPhase === 'CANCELLED' && (
            <p>
              {policy.depositReceivedVnd === 0
                ? 'Chưa thu cọc nên không phát sinh hoàn cọc.'
                : 'Yêu cầu hủy dưới 7 ngày trước giờ bắt đầu ca: không hoàn cọc.'}
            </p>
          )}
          <p>
            Khách hủy: từ 30 ngày hoàn 100%; từ 7 đến dưới 30 ngày hoàn 50%; dưới 7 ngày không hoàn
            cọc. Mỗi ngày tính đủ 24 giờ. Nhà hàng hủy: hoàn 100% cọc thực nhận. Khoản bồi thường
            thêm được xử lý bên ngoài hệ thống.
          </p>
        </div>
      )}
      <form ref={form} onSubmit={review} onChangeCapture={() => setDirty(true)}>
        <fieldset className={fieldsetClass} disabled={disabled || draft !== null}>
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
                {policy &&
                  payments.length === 0 &&
                  policy.options.map((option) => (
                    <option key={option.percent} value={'preview:' + option.percent} disabled>
                      Hoàn {option.percent}% cọc · {money(option.amountVnd)} · Chưa có khoản cọc khả
                      dụng
                    </option>
                  ))}
                {payments.flatMap((entry) =>
                  policy
                    ? policy.options.map((option) => {
                        const applicable =
                          option.percent === policy.ratePercent &&
                          entry.paymentId === policy.depositPaymentId;
                        return (
                          <option
                            key={entry.paymentId + ':' + option.percent}
                            value={
                              applicable
                                ? entry.paymentId
                                : entry.paymentId + ':preview:' + option.percent
                            }
                            disabled={!canRecord || !applicable || entry.maxRefundVnd <= 0}
                          >
                            Cọc · {entry.provider === 'VNPAY' ? 'VNPay' : 'Ngoài hệ thống'} ·{' '}
                            {option.percent}% ·{' '}
                            {money(applicable && canRecord ? entry.maxRefundVnd : option.amountVnd)}
                            {!canRecord
                              ? ' · Chưa thể ghi nhận'
                              : !applicable
                                ? ' · Không áp dụng'
                                : ''}
                          </option>
                        );
                      })
                    : [
                        <option
                          key={entry.paymentId}
                          value={entry.paymentId}
                          disabled={!canRecord || entry.maxRefundVnd <= 0}
                        >
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
                          · {formatDateTime(entry.occurredAt)} · Còn hoàn{' '}
                          {money(entry.maxRefundVnd)}
                        </option>,
                      ],
                )}
              </HySelect>
            </label>
            <label className={labelClass}>
              Số tiền hoàn (VND)
              <Input
                className={inputClass}
                name="amount"
                key={sourceId + ':' + selected?.maxRefundVnd}
                defaultValue={selected?.maxRefundVnd ?? undefined}
                disabled={!selected || !canRecord}
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
          <Button
            type="submit"
            className="self-start"
            disabled={!selected || !canRecord || !selected.maxRefundVnd}
          >
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
