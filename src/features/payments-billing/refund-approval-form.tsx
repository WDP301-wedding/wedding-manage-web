'use client';

import { useRef, useState, type FormEvent } from 'react';
import type { BillingView, RefundApprovalBody } from './billing-api';
import { money } from './billing-display';
import type { CommandOutcome } from './payment-forms';
import { notify } from '../../design-system/notifications';

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
  const [invalid, setInvalid] = useState(false);
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
    <section className="billing-panel">
      <h2>Phê duyệt hoàn tiền</h2>
      <p>
        Quản lý duyệt hạn mức dựa trên điều chỉnh giảm hoặc quyết định hủy tiệc đã chốt. Hệ thống
        kiểm tra căn cứ và số tiền còn được hoàn.
      </p>
      <form ref={form} onSubmit={review}>
        <fieldset disabled={disabled || draft !== null || booking.billingRevision === 0}>
          <label>
            Căn cứ phê duyệt
            <select name="basis" required defaultValue="">
              <option value="">Chọn căn cứ</option>
              <option value="CANCELLATION">Quyết định hủy tiệc đã chốt</option>
              {credits.map((entry) => (
                <option key={entry.ledgerEntryId} value={entry.ledgerEntryId}>
                  Điều chỉnh giảm · {money(entry.amountVnd)} · {entry.ledgerEntryId}
                </option>
              ))}
            </select>
          </label>
          <label>
            Hạn mức hoàn được duyệt (VND)
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
            Mã chứng từ phê duyệt
            <input name="evidence" required maxLength={120} autoComplete="off" />
          </label>
          <label>
            Lý do phê duyệt
            <textarea name="reason" required maxLength={500} rows={3} />
          </label>
          <button type="submit">Kiểm tra phê duyệt</button>
        </fieldset>
      </form>
      {credits.length === 0 && (
        <p>
          Chưa có điều chỉnh giảm trong các trang đã tải. Tải thêm lịch sử nếu cần chọn căn cứ này.
        </p>
      )}
      {draft !== null && (
        <section className="billing-confirm" aria-label="Xác nhận phê duyệt hoàn tiền">
          <h3>Kiểm tra quyết định hoàn tiền</h3>
          <strong>{money(draft.approvedRefundableVnd)}</strong>
          <p>
            Căn cứ:{' '}
            {draft.basis.kind === 'CANCELLATION'
              ? 'Quyết định hủy tiệc đã chốt'
              : `Điều chỉnh giảm ${draft.basis.sourceEntryId}`}
          </p>
          <p>{draft.reason}</p>
          <p>Chứng từ: {draft.evidenceReference}</p>
          <p>
            Phê duyệt cho phép ghi nhận khoản hoàn theo hạn mức. Thao tác này không chuyển tiền tự
            động.
          </p>
          {retry && (
            <p role="status">Chưa rõ kết quả. Thử lại cùng quyết định để kiểm tra kết quả.</p>
          )}
          <div className="billing-actions">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                void confirm();
              }}
            >
              {retry ? 'Thử lại phê duyệt này' : 'Xác nhận phê duyệt hoàn tiền'}
            </button>
            <button
              type="button"
              className="billing-secondary"
              disabled={disabled || retry}
              onClick={() => setDraft(null)}
            >
              Quay lại chỉnh sửa
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
