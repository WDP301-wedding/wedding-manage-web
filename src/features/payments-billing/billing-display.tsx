import { CircleCheck, CircleX, Clock } from 'lucide-react';
import { cn } from 'cn';
import { ApiClientError } from '../../lib/api/client';
import { ApiServiceError } from '../../lib/api/axios-client';
import type { AttemptView, BillingView } from './billing-api';
import { formatDateTime } from '../booking-lifecycle/booking-helpers';
import { BillingIntentMismatchError } from './billing-intents';

export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const isApiError = (error: unknown): error is ApiClientError | ApiServiceError =>
  error instanceof ApiClientError || error instanceof ApiServiceError;

export function unresolved(error: unknown): boolean {
  if (error instanceof BillingIntentMismatchError) return false;
  if (!isApiError(error)) return true;
  if (error instanceof ApiClientError && error.kind !== 'api') return true;
  return (
    error.status === 429 || (error.status ?? 500) >= 500 || error.code === 'REQUEST_IN_PROGRESS'
  );
}
export function denied(error: unknown): boolean {
  return isApiError(error) && [401, 403, 404].includes(error.status ?? 0);
}
export function billingMessage(error: unknown): string {
  if (error instanceof BillingIntentMismatchError) return error.message;
  if (denied(error))
    return 'Phiên đăng nhập hoặc quyền xem hồ sơ không còn hợp lệ. Hãy đăng nhập và kiểm tra quyền truy cập.';
  if (!isApiError(error))
    return 'Chưa hoàn tất yêu cầu. Kiểm tra kết nối và giữ nguyên nội dung để thử lại; nếu lịch sử đã thay đổi, hãy tải lại.';
  if (error.status === 429) return 'Có quá nhiều yêu cầu. Hãy đợi rồi thử lại cùng nội dung.';
  const messages: Record<string, string> = {
    STALE_BILLING_REVISION: 'Số dư đã thay đổi. Hãy làm mới và kiểm tra lại trước khi xác nhận.',
    BILLING_REFUND_LIMIT_EXCEEDED:
      'Khoản hoàn vượt số tiền còn được hoàn hoặc chưa có căn cứ điều chỉnh/hủy tiệc hợp lệ.',
    BILLING_REFUND_NOT_APPROVED: 'Chưa có quyết định hoàn tiền hợp lệ cho khoản thanh toán này.',
    DEPOSIT_NOT_ELIGIBLE:
      'Hồ sơ chưa đủ điều kiện nhận cọc. Hãy kiểm tra lịch giữ chỗ và kịch bản đã duyệt.',
    PAYMENT_EVIDENCE_CONFLICT:
      'Số tiền hoặc chứng từ không khớp với thỏa thuận cọc của hồ sơ tiệc. Hãy nhập chính xác số tiền cọc quy định.',
    CONTRACT_REVISION_STALE:
      'Hợp đồng tiệc chưa hoàn tất phê duyệt hoặc đã có phiên bản mới. Hãy tải lại trang.',
    PAYMENT_OUTCOME_UNKNOWN:
      'Giao dịch chưa rõ kết quả. Hãy kiểm tra trạng thái, không tạo lần thanh toán mới.',
    REQUEST_IN_PROGRESS: 'Yêu cầu đang được xử lý. Hãy đợi rồi thử lại cùng nội dung.',
    IDEMPOTENCY_KEY_REUSED: 'Nội dung khác với yêu cầu trước. Hãy kiểm tra lại chứng từ.',
  };
  return (
    messages[error.code] ??
    (unresolved(error)
      ? 'Chưa rõ kết quả. Giữ nguyên nội dung để thử lại và kiểm tra kết quả.'
      : 'Yêu cầu bị từ chối. Kiểm tra dữ liệu, số dư và quyết định được duyệt trước khi tiếp tục.')
  );
}
const totalLabels: Record<keyof BillingView['totals'], string> = {
  acceptedChargesVnd: 'Tổng tiền phải thu',
  paidVnd: 'Đã thu',
  refundedVnd: 'Đã hoàn tiền',
  netPaidVnd: 'Thực thu sau hoàn tiền',
  outstandingVnd: 'Còn phải thu',
  creditVnd: 'Tiền thu thừa',
};
const kinds = {
  CHARGE: 'Khoản phải thu',
  PAYMENT: 'Thanh toán',
  REFUND: 'Hoàn tiền',
  CREDIT_ADJUSTMENT: 'Điều chỉnh giảm',
};
const sources: Record<BillingView['history'][number]['sourceType'], string> = {
  CONTRACT: 'Hợp đồng tiệc',
  CONTRACT_APPENDIX: 'Phụ lục hợp đồng',
  INCIDENTAL_FINALIZATION: 'Quyết toán phát sinh',
  INVOICE_ADJUSTMENT: 'Điều chỉnh hóa đơn',
  BASE_BOOKING: 'Tiệc cưới',
  PRINT_ORDER: 'Đơn in',
  PAYMENT_ATTEMPT: 'Khoản thanh toán',
  PRINT_CREDIT: 'Điều chỉnh đơn in',
  MANUAL_REFUND: 'Hoàn theo chứng từ',
};
const kindDot: Record<keyof typeof kinds, string> = {
  CHARGE: 'bg-hy-warning',
  PAYMENT: 'bg-hy-success',
  REFUND: 'bg-hy-error',
  CREDIT_ADJUSTMENT: 'bg-hy-info',
};
export function BillingSummary({ view }: Readonly<{ view: BillingView }>) {
  return (
    <section aria-label="Tổng hợp tiền đặt tiệc" className="min-w-0 w-full">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(view.totals).map(([key, value]) => (
          <div
            key={key}
            className={cn(
              'flex flex-col gap-1 rounded-xl border px-4 py-3 sm:px-5 sm:py-4',
              key === 'outstandingVnd' ? 'border-primary bg-accent' : 'border-border bg-card',
            )}
          >
            <dt className="text-xs text-muted-foreground">
              {totalLabels[key as keyof typeof totalLabels]}
            </dt>
            <dd
              className={cn(
                'font-bold tabular-nums sm:text-lg',
                key === 'outstandingVnd' ? 'text-primary' : undefined,
              )}
            >
              {money(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
export function BillingHistory({ view }: Readonly<{ view: BillingView }>) {
  const transactions = view.history.filter(
    (entry) =>
      entry.kind === 'PAYMENT' ||
      entry.kind === 'REFUND' ||
      entry.sourceType === 'CONTRACT_APPENDIX' ||
      entry.sourceType === 'INCIDENTAL_FINALIZATION' ||
      entry.sourceType === 'INVOICE_ADJUSTMENT',
  );
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Lịch sử giao dịch</h2>
      <p className="text-xs text-muted-foreground">
        Các khoản thu, hoàn và biến động nghĩa vụ từ phụ lục, phát sinh đã chốt hoặc điều chỉnh hóa
        đơn. Điều chỉnh nghĩa vụ không phải giao dịch thu tiền.
      </p>
      {transactions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input p-4 text-center text-xs text-muted-foreground">
          {view.nextCursor
            ? 'Chưa có biến động trong các trang đã tải. Tải thêm lịch sử để xem giao dịch trước.'
            : 'Chưa có biến động đã ghi nhận.'}
        </p>
      ) : (
        <div
          className="overflow-x-auto rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          tabIndex={0}
          role="region"
          aria-label="Chi tiết giao dịch"
        >
          <table className="w-full min-w-[520px] border-collapse text-left">
            <caption className="sr-only">Chi tiết giao dịch</caption>
            <thead className="bg-muted text-xs">
              <tr>
                <th className="px-3 py-2 font-semibold">Thời điểm</th>
                <th className="px-3 py-2 font-semibold">Loại / nguồn</th>
                <th className="px-3 py-2 text-right font-semibold">Số tiền</th>
                <th className="px-3 py-2 font-semibold">Mã tham chiếu</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((entry) => (
                <tr key={entry.ledgerEntryId} className="border-t border-border align-top">
                  <td className="px-3 py-2 text-xs whitespace-nowrap tabular-nums">
                    {formatDateTime(entry.occurredAt)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <span
                        aria-hidden
                        className={cn('size-1.5 rounded-full', kindDot[entry.kind])}
                      />
                      {kinds[entry.kind]}
                    </span>
                    <small className="block text-2xs text-muted-foreground">
                      {sources[entry.sourceType]}
                    </small>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums">
                    {money(entry.amountVnd)}
                  </td>
                  <td className="px-3 py-2">
                    <code
                      title={entry.ledgerEntryId}
                      className="block max-w-40 truncate rounded-md bg-secondary px-1.5 py-0.5 font-mono text-2xs text-muted-foreground"
                    >
                      {entry.ledgerEntryId}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
const attemptTone = {
  SUCCEEDED: { box: 'bg-hy-success-bg', title: 'text-hy-success', Icon: CircleCheck },
  FAILED: { box: 'bg-hy-error-bg', title: 'text-hy-error', Icon: CircleX },
  CREATED: { box: 'bg-hy-warning-bg', title: 'text-hy-warning', Icon: Clock },
  PENDING: { box: 'bg-hy-warning-bg', title: 'text-hy-warning', Icon: Clock },
  UNKNOWN: { box: 'bg-hy-warning-bg', title: 'text-hy-warning', Icon: Clock },
} as const;
export function AttemptStatus({ attempt }: Readonly<{ attempt: AttemptView }>) {
  const labels = {
    CREATED: 'Đã tạo · chờ thanh toán',
    PENDING: 'Đang chờ xác minh',
    FAILED: 'Thanh toán không thành công',
    UNKNOWN: 'Chưa rõ kết quả · đang kiểm tra',
    SUCCEEDED: 'Đã xác minh nhận tiền',
  };
  const tone = attemptTone[attempt.status];
  return (
    <section
      className={cn('flex flex-col gap-1.5 rounded-lg p-4', tone.box)}
      aria-label="Trạng thái thanh toán"
    >
      <h3 className={cn('flex items-center gap-1.5 font-semibold', tone.title)}>
        <tone.Icon aria-hidden className="size-[18px]" />
        {labels[attempt.status]}
      </h3>
      <p className="tabular-nums">
        {attempt.purpose === 'DEPOSIT' ? 'Đặt cọc' : 'Thanh toán còn lại'} ·{' '}
        {money(attempt.amountVnd)}
      </p>
      <p className="text-xs">
        Mã giao dịch thanh toán:{' '}
        <code className="font-mono break-all">{attempt.paymentAttemptId}</code>
      </p>
      {attempt.status === 'SUCCEEDED' && (
        <p className="text-xs">
          {attempt.applicationStatus === 'SUCCEEDED'
            ? 'Đã hoàn tất cập nhật hồ sơ.'
            : 'Tiền đã được xác minh; hồ sơ đang chờ cập nhật.'}
        </p>
      )}
      {attempt.status !== 'FAILED' && attempt.status !== 'SUCCEEDED' && (
        <p className="text-xs">
          Không tạo lần thanh toán khác khi chưa xác minh kết quả. Hết hạn đường dẫn không chứng
          minh thanh toán thất bại.
        </p>
      )}
    </section>
  );
}
