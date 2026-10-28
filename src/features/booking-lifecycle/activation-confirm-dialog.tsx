'use client';

import { type RefObject } from 'react';

export interface ActivationConfirmDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  recipientEmail?: string | undefined;
  onSend: () => void;
  onClose: () => void;
}

export function ActivationConfirmDialog({
  dialogRef,
  recipientEmail,
  onSend,
  onClose,
}: Readonly<ActivationConfirmDialogProps>) {
  return (
    <dialog
      ref={dialogRef}
      className="hy-modal-dialog"
      aria-labelledby="activation-confirm-title"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="hy-modal-content">
        <div className="hy-modal-header">
          <div className="hy-modal-header-left">
            <div>
              <h3 id="activation-confirm-title" className="hy-modal-title">
                Phát hành lời mời kích hoạt?
              </h3>
              <span className="hy-modal-subtitle">
                Gửi thư mời điện tử truy cập cổng tiệc cưới
              </span>
            </div>
          </div>
          <button
            type="button"
            className="hy-modal-close-btn"
            aria-label="Đóng"
            onClick={onClose}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="hy-modal-body">
          <div className="hy-modal-info-box">
            <span className="hy-modal-info-label">Email người nhận</span>
            <span className="hy-modal-info-value">{recipientEmail}</span>
          </div>

          <div className="hy-modal-warning-box">
            <p className="hy-modal-note">
              Gửi tới {recipientEmail}. Nếu đang có lời mời còn hiệu lực, liên kết cũ sẽ
              hết hiệu lực. Không tạo mật khẩu hoặc thay đổi quyền sau đặt cọc.
            </p>
          </div>
        </div>

        <div className="hy-modal-footer">
          <button
            type="button"
            className="hy-action-btn-secondary"
            onClick={onClose}
          >
            Quay lại
          </button>
          <button
            type="button"
            className="hy-action-btn-primary"
            onClick={onSend}
          >
            <span>Xác nhận gửi</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
