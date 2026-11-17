import { StatCard, StatCardGroup } from '@/src/components/ui/stat-card';
import type { AnalyticsOverviewData } from '@/src/services/analytics/analytics.service';
import type { PublicHall, PublicRestaurant } from '@/src/services/catalog/catalog.service';
import type { ConsultationRequestItem } from '@/src/services/bookings/consultation.service';
import { formatVndNullable } from '@/src/lib/formatting/formatters';

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

  return (
    <StatCardGroup label="Chỉ số vận hành" layout="wide">
      <StatCard
        label="Không gian sẵn sàng"
        value={String(halls.length).padStart(2, '0')}
        description={`${halls.length} sảnh tiệc trong danh mục`}
        loading={isLoading}
      />
      <StatCard
        label="Yêu cầu tư vấn"
        value={consultationTotal === null ? '00' : String(consultationTotal).padStart(2, '0')}
        description={pending > 0 ? `${pending} yêu cầu chờ xử lý` : 'Đã hoàn tất xử lý'}
        tone={pending > 0 ? 'brand' : 'neutral'}
        loading={isLoading || consultationTotal === null}
      />
      {isManager ? (
        <>
          <StatCard
            label="Tiền thực nhận tháng này"
            value={!analytics ? 'Chưa có' : formatVndNullable(analytics.netCashRevenueVnd)}
            description="Thực thu tiền mặt & chuyển khoản (VND)"
            loading={isLoading}
          />
          <StatCard
            label="Tiền thu vào tháng này"
            value={!analytics ? 'Chưa có' : formatVndNullable(analytics.grossCashReceivedVnd)}
            description="Tổng thu tiền mặt & chuyển khoản (VND)"
            loading={isLoading}
          />
        </>
      ) : (
        <StatCard
          label="Ca phục vụ"
          value={String(restaurant?.shifts?.length || 2).padStart(2, '0')}
          description="Ca trưa và ca tối cố định"
          loading={isLoading}
        />
      )}
    </StatCardGroup>
  );
}
