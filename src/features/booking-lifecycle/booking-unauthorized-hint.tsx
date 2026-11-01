'use client';

import Link from 'next/link';
import { buttonVariants } from '../../components/ui/button';

export interface BookingUnauthorizedHintProps {
  bookingId: string;
}

export function BookingUnauthorizedHint({ bookingId }: Readonly<BookingUnauthorizedHintProps>) {
  if (!bookingId) return null;

  return (
    <div className="mt-2 flex max-w-[640px] flex-col gap-2 rounded-lg bg-hy-error-bg px-4 py-3 text-left">
      <div className="text-xs font-semibold text-hy-error">
        Gợi ý xử lý khi không có quyền xem hồ sơ đề xuất &amp; kịch bản:
      </div>
      <p className="text-xs">
        Hồ sơ tiệc đang mở được tạo bởi Quản lý khác (hoặc là dữ liệu mẫu nhà hàng). Theo quy định
        của hệ thống, chỉ Quản lý trực tiếp tạo hồ sơ tư vấn ban đầu mới có quyền duyệt &amp; chỉnh
        sửa kịch bản tiệc này. Bạn vẫn có thể thực hiện các thao tác vận hành khác:
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          href={`/billing?bookingId=${bookingId}`}
        >
          Xem thanh toán &amp; Tiền cọc
        </Link>
        <Link
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
          href={`/staff?bookingId=${bookingId}`}
        >
          Phân công Staff tiệc này
        </Link>
      </div>
    </div>
  );
}
