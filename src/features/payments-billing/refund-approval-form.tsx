'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { BillingView, RefundApprovalBody } from './billing-api';
import { money } from './billing-display';
import type { CommandOutcome } from './payment-forms';
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

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

export function RefundApprovalForm({
  booking,
  disabled,
  onConfirm,
}: Readonly<{
  booking: BillingView;
  disabled: boolean;
  onConfirm: (body: RefundApprovalBody) => Promise<CommandOutcome>;
}>) {
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<RefundApprovalBody | null>(null);
  const [retry, setRetry] = useState(false);
  const credits = booking.history.filter((entry) => entry.kind === 'CREDIT_ADJUSTMENT');
  const review = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const approvedRefundableVnd = Number(data.get('amount'));
    const basis = field(data, 'basis');
    const reason = field(data, 'reason').trim();
    const evidenceReference = field(data, 'evidence').trim();
    if (
      !Number.isSafeInteger(approvedRefundableVnd) ||
      approvedRefundableVnd <= 0 ||
      !reason ||
      reason.length > 500 ||
      !evidenceReference ||
      evidenceReference.length > 120 ||
      (basis !== 'CANCELLATION' && !credits.some((entry) => entry.ledgerEntryId === basis))
    ) {
      notify.warning('Chọn căn cứ và nhập hạn mức nguyên dương, lý do, chứng từ hợp lệ.');
      return;
    }
    setDraft({
      bookingId: booking.bookingId,
      expectedBillingRevision: booking.billingRevision,
      approvedRefundableVnd,
      basis:
        basis === 'CANCELLATION'
          ? { kind: 'CANCELLATION' }
          : { kind: 'CREDIT', sourceEntryId: basis },
      reason,
      evidenceReference,
    });
  };
  const confirm = async () => {
    if (draft === null) return;
    const outcome = await onConfirm(draft);
    if (outcome === 'succeeded') form.current?.reset();
    setRetry(outcome === 'retry');
    if (outcome !== 'retry') setDraft(null);
  };
  return (
    <section className={panelClass}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">Phê duyệt hoàn tiền</h2>
        <p className="text-xs text-muted-foreground">
          Quản lý duyệt hạn mức dựa trên điều chỉnh giảm hoặc quyết định hủy tiệc đã chốt. Hệ thống
          kiểm tra căn cứ và số tiền còn được hoàn.
        </p>
      </div>
      <form ref={form} onSubmit={review}>
        <fieldset
          className={fieldsetClass}
          disabled={disabled || draft !== null || booking.billingRevision === 0}
        >
          <div className={rowClass}>
            <label className={labelClass}>
              Căn cứ phê duyệt
              <select name="basis" required defaultValue="" className={selectClass}>
                <option value="">Chọn căn cứ</option>
                <option value="CANCELLATION">Quyết định hủy tiệc đã chốt</option>
                {credits.map((entry) => (
                  <option key={entry.ledgerEntryId} value={entry.ledgerEntryId}>
                    Điều chỉnh giảm · {money(entry.amountVnd)} · {entry.ledgerEntryId}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Hạn mức hoàn được duyệt (VND)
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
            Mã chứng từ phê duyệt
            <Input
              className={inputClass}
              name="evidence"
              required
              maxLength={120}
              autoComplete="off"
            />
          </label>
          <label className={labelClass}>
            Lý do phê duyệt
            <Textarea className={inputClass} name="reason" required maxLength={500} rows={2} />
          </label>
          <Button type="submit" className="self-start">
            Kiểm tra phê duyệt
          </Button>
        </fieldset>
      </form>
      {credits.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Chưa có điều chỉnh giảm trong các trang đã tải. Tải thêm lịch sử nếu cần chọn căn cứ này.
        </p>
      )}
      {draft !== null && (
        <section className={confirmClass} aria-label="Xác nhận phê duyệt hoàn tiền">
          <h3 className="font-semibold text-primary">Kiểm tra quyết định hoàn tiền</h3>
          <strong className="text-xl font-bold tabular-nums">
            {money(draft.approvedRefundableVnd)}
          </strong>
          <p className="text-xs">
            Căn cứ:{' '}
            {draft.basis.kind === 'CANCELLATION'
              ? 'Quyết định hủy tiệc đã chốt'
              : `Điều chỉnh giảm ${draft.basis.sourceEntryId}`}
          </p>
          <p>{draft.reason}</p>
          <p className="text-xs text-muted-foreground">Chứng từ: {draft.evidenceReference}</p>
          <p className="rounded-lg bg-hy-warning-bg px-3 py-2 text-xs">
            Phê duyệt cho phép ghi nhận khoản hoàn theo hạn mức. Thao tác này không chuyển tiền tự
            động.
          </p>
          {retry && (
            <p role="status" className="rounded-lg bg-hy-info-bg px-3 py-2 text-xs text-hy-info">
              Chưa rõ kết quả. Thử lại cùng quyết định để kiểm tra kết quả.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              disabled={disabled}
              onClick={() => {
                void confirm();
              }}
            >
              {retry ? 'Thử lại phê duyệt này' : 'Xác nhận phê duyệt hoàn tiền'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled || retry}
              onClick={() => setDraft(null)}
            >
              Quay lại chỉnh sửa
            </Button>
          </div>
        </section>
      )}
    </section>
  );
}
