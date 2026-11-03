import Link from 'next/link';
import type { FinancialOverview } from './billing-financial-overview.contract';
import { money } from './billing-display';
const stateLabels: Record<FinancialOverview['state'], string> = {
  NOT_CREATED: 'Chưa có hợp đồng',
  DRAFT: 'Bản nháp · Giá trị dự kiến',
  AWAITING_APPROVAL: 'Chờ hai bên phê duyệt',
  APPROVED: 'Hai bên đã phê duyệt',
  SUPERSEDED: 'Phiên bản đã được thay thế',
};
export function BillingFinancialOverview({
  bookingId,
  overview,
}: Readonly<{ bookingId: string; overview: FinancialOverview | undefined }>) {
  const summary = overview?.settlementSummary;
  const values = [
    ['Tổng hợp đồng', summary?.effectiveContractVnd ?? overview?.totalVnd ?? null],
    [
      overview?.state === 'APPROVED' ? 'Tiền cọc cam kết' : 'Tiền cọc dự kiến',
      overview?.requiredDepositVnd ?? null,
    ],
    ['Tổng thu sau hoàn', summary?.netReceivedVnd ?? null],
    ['Còn phải thu', summary?.outstandingVnd ?? null],
  ] as const;
  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6"
      aria-labelledby="contract-deposit-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="contract-deposit-title" className="text-lg font-semibold">
            Hợp đồng và tiền cọc
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {overview ? stateLabels[overview.state] : 'Chưa có dữ liệu hợp đồng'}
            {overview?.phase === 'CANCELLED' ? ' · Tiệc đã hủy' : ''}
          </p>
        </div>
        <Link
          className="text-sm font-semibold text-primary hover:underline"
          href={
            overview?.phase === 'CANCELLED'
              ? '/cancelled-bookings?bookingId=' + encodeURIComponent(bookingId)
              : '/bookings?bookingId=' + encodeURIComponent(bookingId)
          }
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
        Tổng hợp đồng gồm các phụ lục đã được hai bên phê duyệt. Tổng thu là số tiền đã nhận trừ
        khoản hoàn thành công. Phát sinh nháp chưa được tính vào số còn phải thu.
      </p>
      {summary?.payableVnd != null && (
        <p className="text-sm">
          Tổng nghĩa vụ đã xác định, gồm phát sinh đã chốt:{' '}
          <strong>{money(summary.payableVnd)}</strong>
          {summary.creditVnd > 0 ? ' · Thu thừa: ' + money(summary.creditVnd) : ''}
        </p>
      )}
      {overview?.state !== 'APPROVED' && (
        <p className="text-xs text-muted-foreground">
          Hoàn tất phê duyệt hợp đồng để xác định nghĩa vụ cần thu; giá trị nháp không phải khoản
          phải thu.
        </p>
      )}
      {!summary && (
        <p role="status" className="text-xs text-muted-foreground">
          Máy chủ chưa cung cấp số tổng hợp thu và công nợ hiện hành. Không coi dữ liệu chưa có là
          số tiền bằng 0.
        </p>
      )}
    </section>
  );
}
