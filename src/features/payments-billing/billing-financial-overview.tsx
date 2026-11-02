import Link from 'next/link';
import type { FinancialOverview } from './billing-financial-overview.contract';
import { money } from './billing-display';

const stateLabels: Record<FinancialOverview['state'], string> = {
  NOT_CREATED: 'Chưa có hợp đồng',
  DRAFT: 'Bản nháp — số tiền dự kiến',
  AWAITING_APPROVAL: 'Chờ hai bên phê duyệt',
  APPROVED: 'Hai bên đã phê duyệt',
  SUPERSEDED: 'Phiên bản đã được thay thế',
};

export function BillingFinancialOverview({
  bookingId,
  overview,
}: Readonly<{
  bookingId: string;
  overview: FinancialOverview | undefined;
}>) {
  if (overview === undefined)
    return (
      <section
        className="rounded-xl border border-border bg-card p-5"
        aria-label="Hợp đồng và tiền cọc"
      >
        <h2 className="text-lg font-semibold">Hợp đồng và tiền cọc</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Máy chủ chưa cung cấp thông tin hợp đồng tại trang này. Mở hồ sơ tiệc để xem tổng giá trị
          và tiền cọc; không dùng số công nợ bằng 0 để kết luận chưa có khoản cần thu.
        </p>
        <Link
          className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
          href={`/bookings?bookingId=${encodeURIComponent(bookingId)}`}
        >
          Xem hợp đồng trong hồ sơ tiệc
        </Link>
      </section>
    );
  const approved = overview.state === 'APPROVED';
  const cancelled = overview.phase === 'CANCELLED';
  const values = [
    [
      overview.source === 'LEGACY_PROPOSAL' ? 'Tổng giá trị đề xuất cũ' : 'Tổng hợp đồng ban đầu',
      overview.totalVnd,
    ],
    [approved ? 'Tiền cọc cam kết' : 'Tiền cọc dự kiến', overview.requiredDepositVnd],
    ['Cọc đã ghi nhận', overview.depositReceivedVnd],
    [approved ? 'Cọc chưa thu' : 'Cọc còn thiếu dự kiến', overview.depositRemainingVnd],
  ] as const;
  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
      aria-labelledby="contract-deposit-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="contract-deposit-title" className="text-lg font-semibold">
            Hợp đồng và tiền cọc
          </h2>
          <p className="text-sm text-muted-foreground">
            {cancelled ? 'Hồ sơ đã hủy · ' : ''}
            {stateLabels[overview.state]}
            {overview.revisionNumber !== null ? ` · Phiên bản ${overview.revisionNumber}` : ''}
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-primary hover:underline"
          href={`/bookings?bookingId=${encodeURIComponent(bookingId)}`}
        >
          Xem hồ sơ tiệc
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {values.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg bg-muted p-3 sm:p-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words font-bold tabular-nums sm:text-lg">
              {value === null ? 'Chưa xác định' : money(value)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        {cancelled
          ? 'Các số tiền trên được giữ để đối chiếu lịch sử, không phải yêu cầu thu cọc mới. Khoản hoàn theo dõi ở phần giao dịch bên dưới.'
          : overview.source === 'NONE'
            ? 'Chưa có hợp đồng. Lập và hoàn tất phê duyệt hợp đồng trong hồ sơ tiệc để xác định số tiền cần cọc.'
            : !approved
              ? 'Số tiền đang dự kiến; chưa phải căn cứ thu cọc. Hoàn tất phê duyệt của cả hai bên và các điều kiện giữ sảnh, kịch bản trước khi thu.'
              : overview.depositApplied
                ? 'Đã áp dụng khoản cọc vào hồ sơ tiệc. Tổng trên là hợp đồng ban đầu; phụ lục và các điều chỉnh đã có hiệu lực được theo dõi trong công nợ bên dưới.'
                : overview.depositReceivedVnd > 0
                  ? 'Đã ghi nhận tiền cọc; việc xác nhận hồ sơ tiệc còn được đối chiếu. Kiểm tra trạng thái trước khi tạo thêm giao dịch.'
                  : 'Đã xác định tiền cọc theo hợp đồng. Khi ghi nhận thu, máy chủ vẫn kiểm tra lại phiên bản hợp đồng và điều kiện nhận cọc.'}
      </p>
      <p className="text-xs text-muted-foreground">
        Thông tin hợp đồng hiện hành, tách biệt với sổ công nợ. Cọc đã ghi nhận là khoản thu cọc
        thực tế trước hoàn tiền; các khoản hoàn nằm trong lịch sử giao dịch.
      </p>
    </section>
  );
}
