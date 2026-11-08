import { cn } from 'cn';
import type { AnalyticsOverviewData } from '../../services/analytics.service';
import type { PublicHall, PublicRestaurant } from '../../services/catalog.service';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import { formatVndNullable } from '../../lib/formatters';

function Metric({
  label,
  value,
  detail,
  attention = false,
}: Readonly<{ label: string; value: string; detail: string; attention?: boolean }>) {
  return (
    <div className="flex min-w-0 flex-[1_1_13rem] flex-col gap-0.5 bg-card px-6 py-5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'text-xl font-bold tabular-nums [overflow-wrap:anywhere]',
          attention && 'text-primary',
        )}
      >
        {value}
      </dd>
      <dd className={cn('text-xs text-muted-foreground', attention && 'text-primary')}>{detail}</dd>
    </div>
  );
}

export function DashboardKpiStrip({
  isManager = false,
  isLoading = false,
  halls,
  consultations,
  consultationSummary,
  analytics,
  restaurant,
}: Readonly<{
  isManager?: boolean;
  isLoading?: boolean;
  halls: readonly PublicHall[];
  consultations: readonly ConsultationRequestItem[];
  consultationSummary?: { total: number; pending: number } | null;
  analytics: AnalyticsOverviewData | null;
  restaurant: PublicRestaurant | null;
}>) {
  const pending =
    consultationSummary === undefined
      ? consultations.filter((c) => c.status === 'NEW').length
      : (consultationSummary?.pending ?? 0);
  const consultationTotal =
    consultationSummary === undefined ? consultations.length : (consultationSummary?.total ?? null);
  const syncing = 'Đang đồng bộ…';

  return (
    <dl
      aria-label="Chỉ số vận hành"
      className="flex flex-wrap gap-px overflow-hidden rounded-xl border border-border bg-border shadow-hy-1"
    >
      <Metric
        label="Không gian sẵn sàng"
        value={isLoading ? '…' : String(halls.length).padStart(2, '0')}
        detail={isLoading ? syncing : `${halls.length} sảnh tiệc trong danh mục`}
      />
      <Metric
        label="Yêu cầu tư vấn"
        value={
          isLoading
            ? '…'
            : consultationTotal === null
              ? '…'
              : String(consultationTotal).padStart(2, '0')
        }
        detail={
          isLoading || consultationTotal === null
            ? syncing
            : pending > 0
              ? `${pending} yêu cầu chờ xử lý`
              : 'Đã hoàn tất xử lý'
        }
        attention={pending > 0}
      />
      {isManager ? (
        <>
          <Metric
            label="Tiền thực nhận tháng này"
            value={
              isLoading
                ? '…'
                : !analytics
                  ? 'Chưa có'
                  : formatVndNullable(analytics.netCashRevenueVnd)
            }
            detail={isLoading ? 'Đang tổng hợp sổ cái…' : 'Thực thu tiền mặt/chuyển khoản (VND)'}
          />
          <Metric
            label="Tiền thu vào tháng này"
            value={
              isLoading
                ? '…'
                : !analytics
                  ? 'Chưa có'
                  : formatVndNullable(analytics.grossCashReceivedVnd)
            }
            detail={
              isLoading
                ? 'Đang tính toán…'
                : analytics?.meta.refreshedAt
                  ? `Cập nhật lúc ${new Date(analytics.meta.refreshedAt).toLocaleTimeString('vi-VN')}`
                  : 'Sổ cái đã chốt'
            }
          />
        </>
      ) : (
        <Metric
          label="Ca phục vụ"
          value={isLoading ? '…' : String(restaurant?.shifts?.length || 2).padStart(2, '0')}
          detail="Ca trưa và ca tối cố định"
        />
      )}
    </dl>
  );
}
