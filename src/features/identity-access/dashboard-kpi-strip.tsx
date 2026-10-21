'use client';

import type { AnalyticsOverviewData } from '../../services/analytics.service';
import type { PublicHall, PublicRestaurant } from '../../services/catalog.service';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import { formatVndNullable } from '../../lib/formatters';

export function MetricCard({
  attention = false,
  detail,
  label,
  value,
}: Readonly<{
  attention?: boolean;
  detail: string;
  label: string;
  value: string;
}>) {
  return (
    <div
      className={`metric-card${attention ? ' metric-attention' : ''}`}
      style={{
        background: 'var(--hy-surface)',
        border: attention ? '1.5px solid var(--hy-wine)' : '1px solid var(--hy-outline)',
        borderRadius: 'var(--hy-radius-md)',
        padding: '16px 20px',
        boxShadow: 'var(--hy-shadow-1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <span
        className="metric-label"
        style={{
          fontSize: '0.825rem',
          fontWeight: 600,
          color: 'var(--hy-ink-muted)',
        }}
      >
        {label}
      </span>
      <span
        className="metric-value"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          fontWeight: 700,
          color: attention ? 'var(--hy-wine)' : 'var(--hy-ink)',
          fontVariantNumeric: 'tabular-nums lining-nums',
          lineHeight: 1.25,
        }}
      >
        {value}
      </span>
      <span
        className="metric-detail"
        style={{
          fontSize: '0.8rem',
          color: attention ? 'var(--hy-wine)' : 'var(--hy-ink-muted)',
        }}
      >
        {detail}
      </span>
    </div>
  );
}

export function DashboardKpiStrip({
  isManager = false,
  isLoading = false,
  halls,
  consultations,
  analytics,
  restaurant,
}: Readonly<{
  isManager?: boolean;
  isLoading?: boolean;
  halls: readonly PublicHall[];
  consultations: readonly ConsultationRequestItem[];
  analytics: AnalyticsOverviewData | null;
  restaurant: PublicRestaurant | null;
}>) {
  const pendingConsultations = consultations.filter((c) => c.status === 'NEW');

  return (
    <section className="metrics-strip" aria-label="Chỉ số vận hành">
      <MetricCard
        label="Không gian sẵn sàng"
        value={isLoading ? '—' : String(halls.length).padStart(2, '0')}
        detail={isLoading ? 'Đang đồng bộ…' : `${halls.length} sảnh tiệc trong danh mục`}
      />
      <MetricCard
        label="Yêu cầu tư vấn"
        value={isLoading ? '—' : String(consultations.length).padStart(2, '0')}
        detail={
          isLoading
            ? 'Đang đồng bộ…'
            : pendingConsultations.length > 0
              ? `${pendingConsultations.length} yêu cầu chờ xử lý`
              : 'Đã hoàn tất xử lý'
        }
        attention={pendingConsultations.length > 0}
      />
      {isManager ? (
        <>
          <MetricCard
            label="Tiền thực nhận tháng này"
            value={isLoading || !analytics ? '—' : formatVndNullable(analytics.netCashRevenueVnd)}
            detail={isLoading ? 'Đang tổng hợp sổ cái…' : 'Thực thu tiền mặt/chuyển khoản (VND)'}
          />
          <MetricCard
            label="Tổng cọc đã thu"
            value={isLoading || !analytics ? '—' : formatVndNullable(analytics.grossCashReceivedVnd)}
            detail={
              isLoading
                ? 'Đang tính toán…'
                : analytics?.meta.refreshedAt
                  ? `Độ mới: ${new Date(analytics.meta.refreshedAt).toLocaleTimeString('vi-VN')}`
                  : 'Sổ cái đã chốt'
            }
          />
        </>
      ) : (
        <MetricCard
          label="Ca phục vụ"
          value={isLoading ? '—' : String(restaurant?.shifts?.length || 2).padStart(2, '0')}
          detail="Ca trưa & ca tối cố định"
        />
      )}
    </section>
  );
}
