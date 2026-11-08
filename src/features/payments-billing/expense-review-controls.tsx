'use client';
import { useRef, useState } from 'react';
import { billingService, type IncidentalExpensesResponse } from '../../services/billing.service';
import { axiosApiClient } from '../../lib/api/axios-client';
import { notify } from '../../design-system/notifications';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const labels = {
  AWAITING_APPROVAL: 'Chờ Couple duyệt',
  APPROVED: 'Đã duyệt',
  CHANGES_REQUESTED: 'Couple yêu cầu sửa',
  WITHDRAWN: 'Đã mở lại để sửa',
};
export function ExpenseReviewControls({
  bookingId,
  data,
  disabled,
  onSaved,
  currentInvoiceRevisionId,
}: {
  bookingId: string;
  data: IncidentalExpensesResponse;
  disabled: boolean;
  onSaved: () => void;
  currentInvoiceRevisionId?: string | null;
}) {
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  if (!data.approvalRequired) return null;
  const review = data.currentReview;
  const pendingAdjustment =
    review?.type === 'ADJUSTMENT' &&
    review.document.adjustment?.expectedInvoiceRevisionId === currentInvoiceRevisionId;
  const action = async (name: 'submit' | 'no-expenses' | 'reopen' | 'apply') => {
    if (lock.current || disabled) return;
    const body =
      name === 'apply'
        ? { ...review!.document.adjustment!, reviewId: review!.id }
        : {
            expectedRevision: data.revision,
            ...(name === 'reopen'
              ? {
                  reviewId: review!.id,
                  documentDigest: review!.documentDigest,
                  reason: reason.trim(),
                }
              : {}),
          };
    const fingerprint = JSON.stringify([bookingId, name, body]);
    if (intent.current?.fingerprint !== fingerprint)
      intent.current = { fingerprint, key: crypto.randomUUID() };
    lock.current = true;
    setPending(true);
    try {
      if (name === 'apply')
        await billingService.adjustInvoice(
          bookingId,
          body as Parameters<typeof billingService.adjustInvoice>[1],
          intent.current.key,
        );
      else
        await axiosApiClient.post(
          `/management/bookings/${bookingId}/incidental-expenses/${name}`,
          body,
          { headers: { 'Idempotency-Key': intent.current.key } },
        );
      intent.current = null;
      setReason('');
      onSaved();
      notify.success('Đã cập nhật xác nhận chi phí phát sinh.');
    } catch (error) {
      notify.error(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-border p-4"
      aria-label="Duyệt chi phí phát sinh"
    >
      <h3 className="font-semibold">Đối soát và duyệt chi phí phát sinh</h3>
      <p role="status">
        {review
          ? review.type === 'NONE' && review.state === 'APPROVED'
            ? 'Manager đã xác nhận không có chi phí phát sinh'
            : `Bản ${review.revisionNumber}: ${labels[review.state]}`
          : 'Chưa gửi bảng phát sinh hoặc xác nhận không phát sinh.'}
      </p>
      {review?.decisionReason ? <p>Lý do: {review.decisionReason}</p> : null}
      {review?.type === 'ADJUSTMENT' && review.document.adjustment ? (
        <p>Đề xuất điều chỉnh: {review.document.adjustment.reason}</p>
      ) : null}
      {!data.finalized && (!review || review.state === 'WITHDRAWN') ? (
        <div className="flex flex-wrap gap-2">
          {data.lines.length ? (
            <Button disabled={disabled || pending} onClick={() => void action('submit')}>
              Duyệt và gửi Couple
            </Button>
          ) : (
            <Button disabled={disabled || pending} onClick={() => void action('no-expenses')}>
              Không có chi phí phát sinh
            </Button>
          )}
        </div>
      ) : null}
      {review && review.state !== 'WITHDRAWN' && (!data.finalized || pendingAdjustment) ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Lý do mở lại
            <Input value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          </label>
          <Button
            variant="outline"
            disabled={disabled || pending || !reason.trim()}
            onClick={() => void action('reopen')}
          >
            Mở lại để sửa
          </Button>
          {review.type === 'ADJUSTMENT' && review.state === 'APPROVED' ? (
            <Button disabled={disabled || pending} onClick={() => void action('apply')}>
              Áp dụng điều chỉnh đã duyệt
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Đơn giá lấy từ bảng giá đã chốt cho booking. Hai bên duyệt cùng phiên bản trước khi chốt hóa
        đơn; sửa nội dung phải gửi duyệt lại.
      </p>
      {data.reviewHistory.length > 0 ? (
        <details>
          <summary>Lịch sử gửi và duyệt</summary>
          <ul>
            {data.reviewHistory.map((r) => (
              <li key={r.id}>
                Bản {r.revisionNumber} · {labels[r.state]} ·{' '}
                {new Date(r.managerApprovedAt).toLocaleString('vi-VN')}
                {r.coupleApprovedAt
                  ? ` · Couple duyệt ${new Date(r.coupleApprovedAt).toLocaleString('vi-VN')}`
                  : ''}
                {r.decisionReason ? ` · ${r.decisionReason}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
