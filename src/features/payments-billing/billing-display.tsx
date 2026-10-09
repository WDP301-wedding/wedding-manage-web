import { ApiClientError } from '../../lib/api/client';
import type { AttemptView, BillingView } from './billing-api';

export const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export function unresolved(error: unknown): boolean {
  return (
    !(error instanceof ApiClientError) ||
    error.kind !== 'api' ||
    (error.status ?? 500) >= 500 ||
    error.code === 'REQUEST_IN_PROGRESS'
  );
}
export function denied(error: unknown): boolean {
  return error instanceof ApiClientError && [401, 403, 404].includes(error.status ?? 0);
}
export function billingMessage(error: unknown): string {
  if (denied(error))
    return 'Phiên đăng nhập hoặc quyền xem hồ sơ không còn hợp lệ. Hãy đăng nhập và kiểm tra quyền truy cập.';
  if (!(error instanceof ApiClientError))
    return 'Chưa hoàn tất yêu cầu. Kiểm tra kết nối và giữ nguyên nội dung để thử lại; nếu lịch sử đã thay đổi, hãy tải lại.';
  const messages: Record<string, string> = {
    STALE_BILLING_REVISION: 'Số dư đã thay đổi. Hãy làm mới và kiểm tra lại trước khi xác nhận.',
    BILLING_REFUND_LIMIT_EXCEEDED: 'Khoản hoàn vượt hạn mức đã duyệt hoặc số tiền còn được hoàn.',
    BILLING_REFUND_NOT_APPROVED: 'Chưa có quyết định hoàn tiền hợp lệ cho khoản thanh toán này.',
    DEPOSIT_NOT_ELIGIBLE:
      'Hồ sơ chưa đủ điều kiện nhận cọc. Hãy kiểm tra lịch giữ chỗ và kịch bản đã duyệt.',
    PAYMENT_OUTCOME_UNKNOWN:
      'Giao dịch chưa rõ kết quả. Hãy kiểm tra trạng thái, không tạo lần thanh toán mới.',
    REQUEST_IN_PROGRESS: 'Yêu cầu đang được xử lý. Hãy đợi rồi thử lại cùng nội dung.',
    IDEMPOTENCY_KEY_REUSED: 'Nội dung khác với yêu cầu trước. Hãy kiểm tra lại chứng từ.',
  };
  return (
    messages[error.code] ??
    (unresolved(error)
      ? 'Chưa rõ kết quả. Giữ nguyên nội dung để thử lại và đối soát.'
      : 'Yêu cầu bị từ chối. Kiểm tra dữ liệu, số dư và quyết định được duyệt trước khi tiếp tục.')
  );
}
const totalLabels: Record<keyof BillingView['totals'], string> = {
  acceptedChargesVnd: 'Giá trị đã chấp nhận',
  paidVnd: 'Đã thanh toán',
  refundedVnd: 'Đã hoàn',
  netPaidVnd: 'Thanh toán ròng',
  outstandingVnd: 'Còn phải thu',
  creditVnd: 'Dư có cần đối soát',
};
const kinds = {
  CHARGE: 'Khoản phải thu',
  PAYMENT: 'Thanh toán',
  REFUND: 'Hoàn tiền',
  CREDIT_ADJUSTMENT: 'Điều chỉnh giảm',
};
const sources = {
  BASE_BOOKING: 'Tiệc cưới',
  PRINT_ORDER: 'Đơn in',
  PAYMENT_ATTEMPT: 'Khoản thanh toán',
  PRINT_CREDIT: 'Điều chỉnh đơn in',
  MANUAL_REFUND: 'Hoàn theo chứng từ',
};
export function BillingSummary({ view }: Readonly<{ view: BillingView }>) {
  return (
    <section aria-label="Tổng tiền từ máy chủ" className="billing-summary">
      <dl>
        {Object.entries(view.totals).map(([key, value]) => (
          <div key={key}>
            <dt>{totalLabels[key as keyof typeof totalLabels]}</dt>
            <dd>{money(value)}</dd>
          </div>
        ))}
      </dl>
      <p>Số dư tại phiên bản {view.billingRevision}. Dư có không tự động tạo hoàn tiền.</p>
    </section>
  );
}
export function BillingHistory({ view }: Readonly<{ view: BillingView }>) {
  return (
    <section className="billing-panel">
      <h2>Lịch sử bất biến</h2>
      {view.history.length === 0 ? (
        <p>Chưa có bút toán</p>
      ) : (
        <div className="billing-table-scroll">
          <table>
            <caption>Các bút toán đến phiên bản {view.billingRevision}</caption>
            <thead>
              <tr>
                <th>Thời điểm</th>
                <th>Loại / nguồn</th>
                <th>Số tiền</th>
                <th>Mã bút toán</th>
              </tr>
            </thead>
            <tbody>
              {view.history.map((entry) => (
                <tr key={entry.ledgerEntryId}>
                  <td>{new Date(entry.occurredAt).toLocaleString('vi-VN')}</td>
                  <td>
                    {kinds[entry.kind]}
                    <small>{sources[entry.sourceType]}</small>
                  </td>
                  <td>{money(entry.amountVnd)}</td>
                  <td>
                    <code>{entry.ledgerEntryId}</code>
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
export function AttemptStatus({ attempt }: Readonly<{ attempt: AttemptView }>) {
  const labels = {
    CREATED: 'Đã tạo · chờ thanh toán',
    PENDING: 'Đang chờ xác minh',
    FAILED: 'Thanh toán không thành công',
    UNKNOWN: 'Chưa rõ kết quả · đang đối soát',
    SUCCEEDED: 'Đã xác minh nhận tiền',
  };
  return (
    <section className="billing-attempt" aria-label="Trạng thái thanh toán">
      <h3>{labels[attempt.status]}</h3>
      <p>
        {attempt.purpose === 'DEPOSIT' ? 'Đặt cọc' : 'Thanh toán còn lại'} ·{' '}
        {money(attempt.amountVnd)}
      </p>
      <p>
        Mã lần thanh toán: <code>{attempt.paymentAttemptId}</code>
      </p>
      {attempt.status === 'SUCCEEDED' && (
        <p>
          {attempt.applicationStatus === 'SUCCEEDED'
            ? 'Đã hoàn tất cập nhật hồ sơ.'
            : 'Tiền đã được xác minh; hồ sơ đang chờ cập nhật.'}
        </p>
      )}
      {attempt.status !== 'FAILED' && attempt.status !== 'SUCCEEDED' && (
        <p>
          Không tạo lần thanh toán khác khi chưa xác minh kết quả. Hết hạn đường dẫn không chứng
          minh thanh toán thất bại.
        </p>
      )}
    </section>
  );
}
