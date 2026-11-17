'use client';

import { Button } from '@/src/components/ui/button';
import { confirmClass } from '@/src/features/payments-billing/styles/billing-form-classes';

export type CommandOutcome = 'succeeded' | 'retry' | 'failed';

export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value : '';
}

export function ConfirmPayment({
  amount,
  refund,
  retry,
  disabled,
  onConfirm,
  onCancel,
}: Readonly<{
  amount: number;
  refund: boolean;
  retry: boolean;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  return (
    <section
      className={confirmClass}
      aria-label={refund ? 'Xác nhận khoản hoàn' : 'Xác nhận khoản thu'}
    >
      <h3 className="font-semibold text-primary">
        {refund ? 'Kiểm tra trước khi ghi nhận hoàn tiền' : 'Kiểm tra khoản thu'}
      </h3>
      <strong className="text-xl font-bold tabular-nums">{money(amount)}</strong>
      <p className="rounded-lg bg-hy-warning-bg px-3 py-2 text-xs">
        {refund
          ? 'Chỉ xác nhận khi đã thực sự hoàn tiền bên ngoài hệ thống. Thao tác này ghi vào lịch sử và không chuyển tiền tự động.'
          : 'Chỉ xác nhận khi nhà hàng đã thực nhận tiền bên ngoài hệ thống. Khoản thu sẽ được lưu trong lịch sử giao dịch.'}
      </p>
      {retry && (
        <p role="status" className="rounded-lg bg-hy-info-bg px-3 py-2 text-xs text-hy-info">
          Chưa rõ kết quả. Giữ nguyên nội dung và thử lại yêu cầu này để kiểm tra kết quả.
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" disabled={disabled} onClick={onConfirm}>
          {retry ? 'Thử lại yêu cầu này' : refund ? 'Xác nhận hoàn tiền' : 'Xác nhận ghi nhận'}
        </Button>
        <Button variant="outline" type="button" disabled={disabled || retry} onClick={onCancel}>
          Quay lại chỉnh sửa
        </Button>
      </div>
    </section>
  );
}

export function recordingReason(code: string | null | undefined): string {
  const reasons: Record<string, string> = {
    BOOKING_NOT_PAYABLE: 'Tiệc không còn ở giai đoạn nhận cọc.',
    PAYMENT_ATTEMPT_ACTIVE: 'Có giao dịch chưa rõ kết quả. Đối chiếu giao dịch trước khi ghi nhận.',
    TIMELINE_NOT_MUTUALLY_APPROVED: 'Kịch bản cần được hai bên duyệt cùng phiên bản.',
    CONTRACT_APPROVAL_REQUIRED: 'Hợp đồng hiện tại cần được hai bên phê duyệt.',
    BALANCE_NOT_ELIGIBLE: 'Hồ sơ chưa đủ điều kiện thu số dư.',
    INVOICE_FINALIZATION_REQUIRED: 'Cần chốt hóa đơn cuối trước khi thu số dư.',
    BILLING_BALANCE_LIMIT_EXCEEDED: 'Không còn số dư cần thu.',
    FINANCIAL_SOURCE_CONFLICT: 'Dữ liệu tài chính cần được đối chiếu trước khi thu tiền.',
    STALE_BILLING_REVISION: 'Công nợ đã thay đổi. Bỏ nội dung đang nhập và cập nhật lại.',
  };
  return code
    ? (reasons[code] ?? 'Chưa đủ điều kiện ghi nhận. Kiểm tra lại hồ sơ và công nợ.')
    : 'Đang chờ dữ liệu điều kiện thu/hoàn từ máy chủ.';
}
