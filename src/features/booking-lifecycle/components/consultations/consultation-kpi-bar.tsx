'use client';

import { StatCard, StatCardGroup, StatCardSkeleton } from '@/src/components/ui/stat-card';
import type { StatusFilter } from '@/src/features/booking-lifecycle/hooks/use-consultation-requests';

export interface ConsultationKpiBarProps {
  statusFilter: StatusFilter;
  onFilterChange: (status: StatusFilter) => void;
  stats: {
    total: number;
    newCount: number;
    convertedCount: number;
    closedCount: number;
  };
}

export function ConsultationKpiBarSkeleton() {
  return (
    <StatCardGroup loading label="Đang tải số liệu yêu cầu tư vấn">
      {[1, 2, 3, 4].map((i) => (
        <StatCardSkeleton key={i} />
      ))}
    </StatCardGroup>
  );
}

export function ConsultationKpiBar({
  statusFilter,
  onFilterChange,
  stats,
}: Readonly<ConsultationKpiBarProps>) {
  const cards: readonly {
    filter: StatusFilter;
    label: string;
    value: number;
    tone?: 'brand' | 'success';
  }[] = [
    { filter: 'ALL', label: 'Tổng yêu cầu', value: stats.total },
    { filter: 'NEW', label: 'Chờ tiếp nhận', value: stats.newCount, tone: 'brand' },
    {
      filter: 'CONVERTED',
      label: 'Đã mở tư vấn',
      value: stats.convertedCount,
      tone: 'success',
    },
    { filter: 'CLOSED', label: 'Đã kết thúc', value: stats.closedCount },
  ];

  return (
    <StatCardGroup label="Thống kê yêu cầu tư vấn">
      {cards.map((card) => {
        const isSelected = statusFilter === card.filter;
        return (
          <StatCard
            key={card.filter}
            label={card.label}
            value={card.value}
            tone={card.tone ?? 'neutral'}
            selected={isSelected}
            onClick={() => {
              if (isSelected && card.filter !== 'ALL') {
                onFilterChange('ALL');
              } else {
                onFilterChange(card.filter);
              }
            }}
            ariaLabel={`Thẻ thống kê: ${card.label} (${card.value})`}
          />
        );
      })}
    </StatCardGroup>
  );
}
