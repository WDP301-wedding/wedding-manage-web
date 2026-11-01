'use client';

import { type RefObject } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../components/ui/button';
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
      data-ui-v3
      className="m-auto w-[calc(100%-2rem)] max-w-[480px] rounded-xl bg-card p-0 text-foreground shadow-hy-2 backdrop:bg-hy-ink/40"
      aria-labelledby="activation-confirm-title"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 id="activation-confirm-title" className="text-lg font-semibold">
              {accountState === 'ACTIVE'
                ? 'Mời khách truy cập tiệc này?'
                : accountState === 'NOT_REGISTERED'
                  ? 'Mời kích hoạt tài khoản và truy cập tiệc?'
                  : 'Gửi lời mời truy cập hồ sơ tiệc?'}
            </h3>
            <span className="text-xs text-muted-foreground">
              Gửi thư mời điện tử truy cập cổng tiệc cưới
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X aria-hidden />
          </Button>
        </div>

        <div className="flex flex-col gap-0.5 rounded-lg bg-muted px-4 py-3">
          <span className="text-xs text-muted-foreground">Email người nhận</span>
          <span className="font-semibold [overflow-wrap:anywhere]">{recipientEmail}</span>
        </div>

        <p className="rounded-lg bg-hy-warning-bg px-4 py-3 text-xs">
          Gửi tới {recipientEmail}.{' '}
          {accountState === 'ACTIVE'
            ? 'Khách dùng tài khoản và mật khẩu hiện tại để nhận quyền vào tiệc mới; không cần kích hoạt lại tài khoản.'
            : accountState === 'NOT_REGISTERED'
              ? 'Khách thiết lập mật khẩu khi nhận lời mời.'
              : 'Khách đã có tài khoản xác nhận bằng mật khẩu hiện tại; khách mới thiết lập mật khẩu khi nhận lời mời.'}{' '}
          Nếu gửi lại lời mời còn hiệu lực, liên kết trước sẽ hết hiệu lực. Quyền sau đặt cọc không
          thay đổi.
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Quay lại
          </Button>
          <Button type="button" onClick={onSend}>
            <span>Xác nhận gửi</span>
          </Button>
        </div>
      </div>
    </dialog>
  );
}
