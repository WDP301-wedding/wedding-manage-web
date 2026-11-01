'use client';

import { ArrowDown, CircleCheck, X } from 'lucide-react';
import { Button } from '../../components/ui/button';

export interface CreatedBookingNoticeBannerProps {
  notice: {
    bookingId: string;
    consultationId: string;
    email?: string | undefined;
  };
  onDismiss: () => void;
  onNavigateToAccount: () => void;
}

export function CreatedBookingNoticeBanner({
  notice,
  onDismiss,
  onNavigateToAccount,
}: Readonly<CreatedBookingNoticeBannerProps>) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-hy-success-bg p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-hy-success">
            <CircleCheck aria-hidden className="size-4" />
            Khởi tạo tiệc cưới nháp thành công
          </span>
          <h3 className="text-base font-semibold">Hồ sơ tiệc mới đã sẵn sàng</h3>
          <p>
            Bản nháp tiệc đã sẵn sàng! Bạn có thể mời cặp đôi truy cập hồ sơ tiệc
            {notice.email ? (
              <>
                {' '}
                (<strong className="[overflow-wrap:anywhere]">{notice.email}</strong>)
              </>
            ) : null}{' '}
            để họ đăng nhập vào xem đề xuất &amp; duyệt kịch bản.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-hy-success hover:bg-white/60"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
        >
          <X aria-hidden />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="h-auto min-h-11 bg-hy-success py-2 whitespace-normal text-white hover:bg-hy-success/90"
          onClick={onNavigateToAccount}
        >
          <span>Xem mục quản lý tài khoản cặp đôi bên dưới</span>
          <ArrowDown aria-hidden />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-hy-success bg-transparent text-hy-success hover:bg-white/60"
          onClick={onDismiss}
        >
          Đóng thông báo
        </Button>
      </div>
    </div>
  );
}
