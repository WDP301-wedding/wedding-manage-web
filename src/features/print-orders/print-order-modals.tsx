'use client';

import type React from 'react';
import { useRef, useState } from 'react';
import { useFocusTrap } from './focus-trap';
import { XIcon } from './icons';
import { printOrderStyles } from './print-orders.styles';
import { formatVietnameseDateTime, formatVnd, type PrintOrderView } from './print-orders-types';

export interface HandoverModalProps {
  order: PrintOrderView;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (evidenceReference: string) => void;
}

export function HandoverModal({ order, isSubmitting, onClose, onConfirm }: HandoverModalProps) {
  const [evidence, setEvidence] = useState(`BBBG-${order.orderId}`);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
    onClose,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidence.trim() || isSubmitting) return;
    onConfirm(evidence.trim());
  };

  return (
    <>
      <div className="v0-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="v0-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận bàn giao"
      >
        <div className="v0-modal-head">
          <h3>Bàn giao đơn in · {order.orderId}</h3>
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
          <p>
            Vui lòng nhập mã biên bản hoặc mã chứng từ giao nhận tại nhà hàng để hoàn tất việc bàn
            giao ấn phẩm cho tiệc cưới:
          </p>
          <div className="v0-form-group">
            <label className="v0-label" htmlFor="evidence-input">
              Mã chứng từ / Biên bản bàn giao:
            </label>
            <input
              ref={inputRef}
              id="evidence-input"
              type="text"
              className="v0-input"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Ví dụ: BG-2408-014-KHO"
              maxLength={120}
              required
            />
          </div>
          <div className="v0-modal-actions">
            <button
              type="button"
              className="v0-button v0-button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="v0-button v0-button-primary"
              disabled={!evidence.trim() || isSubmitting}
            >
              {isSubmitting ? 'Đang xử lý…' : 'Xác nhận bàn giao'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

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

export function CreateOrderNoticeModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const okBtnRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: dialogRef,
    initialFocusRef: okBtnRef,
    onClose,
  });

  return (
    <>
      <div className="v0-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="v0-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Quy trình khởi tạo đơn in"
      >
        <div className="v0-modal-head">
          <h3>Quy tắc khởi tạo đơn in ấn thiệp cưới</h3>
          <button
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <div className="v0-modal-body">
          <p>Theo quy định nghiệp vụ hệ thống, đơn in ấn vật lý do Couple khởi tạo trực tiếp:</p>
          <ul style={printOrderStyles.bulletList}>
            <li>
              Đơn in ấn thiệp cưới được chủ động khởi tạo bởi <strong>Couple</strong> từ ứng dụng
              khách hàng sau khi hoàn tất tùy chỉnh và chốt bản mẫu thiết kế số hóa.
            </li>
            <li>
              <strong>Quản lý vận hành (Manager)</strong> không được phép tự ý tạo đơn in thay thế
              Couple để đảm bảo tính toàn vẹn và bất biến của hợp đồng thiết kế.
            </li>
            <li>
              Khi Couple gửi yêu cầu, đơn in sẽ xuất hiện tại hàng đợi này ở trạng thái{' '}
              <code>REQUESTED</code> để Quản lý tiến hành báo giá.
            </li>
          </ul>
          <div className="v0-modal-actions">
            <button
              ref={okBtnRef}
              type="button"
              className="v0-button v0-button-primary"
              onClick={onClose}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function HistoryModal({
  order,
  onClose,
}: {
  order: PrintOrderView | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: dialogRef,
    initialFocusRef: closeBtnRef,
    onClose,
  });

  return (
    <>
      <div className="v0-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="v0-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Lịch sử đơn in"
        tabIndex={-1}
      >
        <div className="v0-modal-head">
          <h3>Lịch sử đơn in {order ? `· ${order.orderId}` : ''}</h3>
          <button
            ref={closeBtnRef}
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <div className="v0-modal-body">
          <p>
            Nhật ký lưu vết bất biến các lần điều chỉnh trạng thái và báo giá thương mại theo hợp
            đồng:
          </p>
          {order ? (
            <ul style={printOrderStyles.bulletList}>
              <li>
                <strong>Khởi tạo:</strong> {formatVietnameseDateTime(order.createdAt)} bởi Couple.
              </li>
              <li>
                <strong>Phiên bản hiện tại:</strong> Revision {order.revision}.
              </li>
              {order.currentCommercialRevision ? (
                <li>
                  <strong>Báo giá:</strong> Revision{' '}
                  {order.currentCommercialRevision.revisionNumber} (
                  {formatVnd(order.currentCommercialRevision.orderTotalVnd)}).
                </li>
              ) : null}
              {order.readyAt ? (
                <li>
                  <strong>Sẵn sàng:</strong> {formatVietnameseDateTime(order.readyAt)}.
                </li>
              ) : null}
              {order.handedOverAt ? (
                <li>
                  <strong>Đã bàn giao:</strong> {formatVietnameseDateTime(order.handedOverAt)} (Biên
                  bản: {order.evidenceReference ?? 'N/A'}).
                </li>
              ) : null}
            </ul>
          ) : (
            <p>Chưa chọn đơn in nào.</p>
          )}
          <div className="v0-modal-actions">
            <button type="button" className="v0-button v0-button-primary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
