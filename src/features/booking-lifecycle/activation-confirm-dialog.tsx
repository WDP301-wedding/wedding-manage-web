'use client';

import { type RefObject } from 'react';
import type { Activation } from './activation-status.types';

export interface ActivationConfirmDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  recipientEmail?: string | undefined;
  accountState?: Activation['accountState'];
  onSend: () => void;
  onClose: () => void;
}

export function ActivationConfirmDialog({
  dialogRef,
  recipientEmail,
  accountState,
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
                {accountState === 'ACTIVE'
                  ? 'Mời khách truy cập tiệc này?'
                  : accountState === 'NOT_REGISTERED'
                    ? 'Mời kích hoạt tài khoản và truy cập tiệc?'
                    : 'Gửi lời mời truy cập hồ sơ tiệc?'}
              </h3>
              <span className="hy-modal-subtitle">Gửi thư mời điện tử truy cập cổng tiệc cưới</span>
            </div>
          </div>
          <button type="button" className="hy-modal-close-btn" aria-label="Đóng" onClick={onClose}>
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
              Gửi tới {recipientEmail}.{' '}
              {accountState === 'ACTIVE'
                ? 'Khách dùng tài khoản và mật khẩu hiện tại để nhận quyền vào tiệc mới; không cần kích hoạt lại tài khoản.'
                : accountState === 'NOT_REGISTERED'
                  ? 'Khách thiết lập mật khẩu khi nhận lời mời.'
                  : 'Khách đã có tài khoản xác nhận bằng mật khẩu hiện tại; khách mới thiết lập mật khẩu khi nhận lời mời.'}{' '}
              Nếu gửi lại lời mời còn hiệu lực, liên kết trước sẽ hết hiệu lực. Quyền sau đặt cọc
              không thay đổi.
            </p>
          </div>
        </div>

        <div className="hy-modal-footer">
          <button type="button" className="hy-action-btn-secondary" onClick={onClose}>
            Quay lại
          </button>
          <button type="button" className="hy-action-btn-primary" onClick={onSend}>
            <span>Xác nhận gửi</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
