'use client';
import type { BillingRecovery } from './use-billing-workspace';
import { money } from './billing-display';
import { formatDateTime } from '../booking-lifecycle/booking-helpers';
import { Button } from '../../components/ui/button';
export function BillingRecoveryPanel({
  recovery,
  pending,
  onRetry,
}: Readonly<{ recovery: BillingRecovery; pending: boolean; onRetry: () => void }>) {
  const body = recovery.body;
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-hy-warning bg-hy-warning-bg p-5"
      aria-label="Khôi phục yêu cầu thanh toán"
    >
      <h2 className="font-semibold">
        Yêu cầu {recovery.kind === 'manual' ? 'ghi nhận khoản thu' : 'hoàn tiền'} chưa rõ kết quả
      </h2>
      <p className="text-sm">
        Không tạo khoản mới. Thử lại bên dưới sẽ gửi đúng nội dung và mã yêu cầu cũ; hệ thống trả
        kết quả đã ghi nhận hoặc tiếp tục xử lý an toàn.
      </p>
      {body ? (
        <>
          <p className="font-semibold">
            {money(body.amountVnd)}
            {'settledAt' in body
              ? ' · ' +
                (body.purpose === 'DEPOSIT' ? 'Đặt cọc' : 'Thu số dư') +
                ' · ' +
                formatDateTime(body.settledAt)
              : ' · Hoàn vào giao dịch đã chọn trước đó'}
          </p>
          <Button type="button" disabled={pending} onClick={onRetry}>
            {pending ? 'Đang đối chiếu…' : 'Khôi phục và kiểm tra yêu cầu cũ'}
          </Button>
        </>
      ) : (
        <p role="alert" className="text-sm">
          Yêu cầu cũ không có đủ dữ liệu khôi phục tự động. Hãy đối chiếu lịch sử trước; chỉ nhập
          lại khi biết chính xác nội dung ban đầu. Không xóa mã yêu cầu để gửi khoản mới.
        </p>
      )}
    </section>
  );
}
