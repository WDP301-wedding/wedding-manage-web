import { cn } from 'cn';
import { Skeleton } from '../../components/ui/skeleton';
import type { AnalyticsOverviewData } from '../../services/analytics.service';
import type { PublicHall, PublicRestaurant } from '../../services/catalog.service';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import { formatVndNullable } from '../../lib/formatters';

function Metric({
  label,
  value,
  detail,
  attention = false,
  loading = false,
}: Readonly<{
  label: string;
  value: React.ReactNode;
  detail: string;
  attention?: boolean;
  loading?: boolean;
}>) {
  return (
    <div className="flex min-w-0 flex-[1_1_13rem] flex-col gap-1.5 bg-card px-6 py-5 transition-colors hover:bg-muted/20">
      <dt className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          'text-2xl font-bold tracking-tight text-foreground tabular-nums [overflow-wrap:anywhere]',
          attention && 'text-primary',
        )}
      >
        {loading ? <Skeleton className="h-7 w-20" /> : value}
      </dd>
      <dd className={cn('text-xs text-muted-foreground', attention && 'font-medium text-primary')}>
        {loading ? <Skeleton className="h-3.5 w-32 mt-0.5" /> : detail}
      </dd>
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
        value={String(halls.length).padStart(2, '0')}
        detail={`${halls.length} sảnh tiệc trong danh mục`}
        loading={isLoading}
      />
      <Metric
        label="Yêu cầu tư vấn"
        value={consultationTotal === null ? '00' : String(consultationTotal).padStart(2, '0')}
        detail={
          pending > 0
            ? `${pending} yêu cầu chờ xử lý`
            : 'Đã hoàn tất xử lý'
        }
        attention={pending > 0}
        loading={isLoading || consultationTotal === null}
      />
      {isManager ? (
        <>
          <Metric
            label="Tiền thực nhận tháng này"
            value={!analytics ? 'Chưa có' : formatVndNullable(analytics.netCashRevenueVnd)}
            detail="Thực thu tiền mặt & chuyển khoản (VND)"
            loading={isLoading}
          />
          <Metric
            label="Tiền thu vào tháng này"
            value={!analytics ? 'Chưa có' : formatVndNullable(analytics.grossCashReceivedVnd)}
            detail={
              analytics?.meta.refreshedAt
                ? `Cập nhật lúc ${new Date(analytics.meta.refreshedAt).toLocaleTimeString('vi-VN')}`
                : 'Sổ cái đã chốt'
            }
            loading={isLoading}
          />
        </>
      ) : (
        <Metric
          label="Ca phục vụ"
          value={String(restaurant?.shifts?.length || 2).padStart(2, '0')}
          detail="Ca trưa và ca tối cố định"
          loading={isLoading}
        />
      )}
    </dl>
  );
}
