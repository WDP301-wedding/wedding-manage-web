'use client';

import type React from 'react';
import { useRef } from 'react';
import { useFocusTrap } from './focus-trap';
import { XIcon } from './icons';
import { printOrderStyles } from './print-orders.styles';
import { formatVietnameseDateTime, formatVnd, type PrintOrderView } from './print-orders-types';

export { HandoverModal, type HandoverModalProps } from './print-order-handover-modal';
export { CancelOrderModal, type CancelOrderModalProps } from './print-order-cancel-modal';

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
