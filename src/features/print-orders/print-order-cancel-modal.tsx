'use client';

import type React from 'react';
import { useRef, useState } from 'react';
import { useFocusTrap } from './focus-trap';
import { XIcon } from './icons';
import { printOrderStyles } from './print-orders.styles';
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

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelBackBtnRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: dialogRef,
    initialFocusRef: cancelBackBtnRef,
    onClose,
  });

  const isReasonValid = !isApproved || reason.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !isReasonValid) return;
    onConfirm(reason);
  };

  return (
    <>
      <div className="v0-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="v0-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận hủy đơn in"
      >
        <div className="v0-modal-head">
          <h3 style={printOrderStyles.cancelHeaderTitle}>Xác nhận hủy đơn in · {order.orderId}</h3>
          <button
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="v0-modal-body">
          {isApproved ? (
            <div
              className="v0-alert-box v0-alert-danger"
              style={printOrderStyles.alertBoxWithMargin}
            >
              <strong>Quy tắc đối soát hủy đơn đã duyệt:</strong>
              <p style={printOrderStyles.alertBoxNoticeText}>
                Đơn in này đã được Couple chấp thuận. Theo quy định backend:
              </p>
              <ul style={printOrderStyles.alertBoxNoticeList}>
                <li>
                  Máy chủ yêu cầu xác nhận ý định hủy từ Cặp đôi (Couple Cancellation Intent) trên
                  ứng dụng khớp với phiên bản đơn hiện tại.
                </li>
                <li>
                  Hệ thống sẽ ghi nhận bút toán tín dụng (Credit Adjustment / Credit Note) vào sổ
                  cái thanh toán tiệc cưới theo hợp đồng, không hoàn tiền mặt tự do tại đây.
                </li>
              </ul>
            </div>
          ) : (
            <p>
              Đơn in đang ở trạng thái {order.status}. Hủy đơn in sẽ chuyển trạng thái sang ĐÃ HỦY
              và không thể tiếp tục sản xuất.
            </p>
          )}

          <div className="v0-form-group">
            <label className="v0-label">Phiên bản xác thực (Expected Revision)</label>
            <input
              type="text"
              readOnly
              value={`Revision: ${order.revision}`}
              className="v0-input v0-input-readonly"
            />
          </div>

          <div className="v0-form-group">
            <label className="v0-label" htmlFor="cancel-reason-input">
              Lý do hủy đơn {isApproved ? '(Bắt buộc đối với đơn đã duyệt):' : '(Tùy chọn):'}
            </label>
            <textarea
              id="cancel-reason-input"
              className="v0-textarea"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi rõ lý do hủy hoặc căn cứ thỏa thuận với Couple…"
              maxLength={500}
              required={isApproved}
            />
            {isApproved && reason.trim().length === 0 ? (
              <p className="text-danger" style={printOrderStyles.dangerSubText}>
                * Lý do hủy là bắt buộc đối với đơn in đã được phê duyệt.
              </p>
            ) : null}
          </div>

          <div className="v0-modal-actions">
            <button
              ref={cancelBackBtnRef}
              type="button"
              className="v0-button v0-button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Quay lại
            </button>
            <button
              type="submit"
              className="v0-button v0-button-danger"
              disabled={isSubmitting || !isReasonValid}
            >
              {isSubmitting ? 'Đang hủy…' : 'Xác nhận hủy đơn in'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
