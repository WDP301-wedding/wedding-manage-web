'use client';

import { type FormEvent, useRef, useState } from 'react';
import { Button } from '../../components/ui/button';
import {
  dialogActionsClass,
  errorTextClass,
  labelClass,
  textareaClass,
} from './print-order-classes';
import { PrintOrderDialog } from './print-order-dialog';
import type { PrintOrderView } from './print-orders-types';

export interface CancelOrderModalProps {
  order: PrintOrderView;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
}

export function CancelOrderModal({
  order,
  isSubmitting,
  onClose,
  onConfirm,
}: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  const isApproved = order.status === 'APPROVED';
  const backButtonRef = useRef<HTMLButtonElement | null>(null);
  const isReasonValid = !isApproved || reason.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isReasonValid) return;
    onConfirm(reason);
  };

  return (
    <PrintOrderDialog
      label="Xác nhận hủy đơn in"
      title={`Xác nhận hủy đơn in ${order.orderId}`}
      description={`Phiên bản xác thực: ${order.revision}`}
      onClose={onClose}
      initialFocusRef={backButtonRef}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isApproved ? (
          <div className="flex flex-col gap-2 rounded-lg bg-hy-error-bg px-4 py-3 text-xs text-hy-error">
            <strong className="font-semibold">Quy tắc đối soát hủy đơn đã duyệt</strong>
            <p>Đơn in này đã được Couple chấp thuận. Theo quy định backend:</p>
            <ul className="flex list-disc flex-col gap-1 pl-5">
              <li>
                Máy chủ yêu cầu xác nhận ý định hủy từ Cặp đôi (Couple Cancellation Intent) trên ứng
                dụng khớp với phiên bản đơn hiện tại.
              </li>
              <li>
                Hệ thống sẽ ghi nhận bút toán tín dụng (Credit Adjustment / Credit Note) vào sổ cái
                thanh toán tiệc cưới theo hợp đồng, không hoàn tiền mặt tự do tại đây.
              </li>
            </ul>
          </div>
        ) : (
          <p>Hủy đơn in sẽ chuyển đơn sang trạng thái Đã hủy và không thể tiếp tục sản xuất.</p>
        )}

        <label className={labelClass} htmlFor="cancel-reason-input">
          Lý do hủy đơn {isApproved ? '(Bắt buộc đối với đơn đã duyệt)' : '(Tùy chọn)'}
          <textarea
            id="cancel-reason-input"
            className={textareaClass}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ghi rõ lý do hủy hoặc căn cứ thỏa thuận với Couple…"
            maxLength={500}
            required={isApproved}
          />
        </label>
        {isApproved && reason.trim().length === 0 ? (
          <p className={errorTextClass}>Lý do hủy là bắt buộc đối với đơn in đã được phê duyệt.</p>
        ) : null}

        <div className={dialogActionsClass}>
          <Button
            ref={backButtonRef}
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Quay lại
          </Button>
          <Button type="submit" variant="destructive" disabled={isSubmitting || !isReasonValid}>
            {isSubmitting ? 'Đang hủy…' : 'Xác nhận hủy đơn in'}
          </Button>
        </div>
      </form>
    </PrintOrderDialog>
  );
}
