'use client';

import { cn } from 'cn';
import { Skeleton } from '../../components/ui/skeleton';
import type { StatusFilter } from './use-consultation-requests';

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
    <div
      aria-busy="true"
      aria-label="Đang tải số liệu yêu cầu tư vấn"
      className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 sm:gap-4"
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3 py-2.5 sm:px-5 sm:py-4 shadow-hy-1"
        >
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
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
    valueClass?: string;
  }[] = [
    { filter: 'ALL', label: 'Tổng yêu cầu', value: stats.total },
    { filter: 'NEW', label: 'Chờ tiếp nhận', value: stats.newCount, valueClass: 'text-primary' },
    {
      filter: 'CONVERTED',
      label: 'Đã mở tư vấn',
      value: stats.convertedCount,
      valueClass: 'text-hy-success',
    },
    { filter: 'CLOSED', label: 'Đã kết thúc', value: stats.closedCount },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 sm:gap-4">
      {cards.map((card) => {
        const isSelected = statusFilter === card.filter;
        return (
          <button
            key={card.filter}
            type="button"
            onClick={() => {
              if (isSelected && card.filter !== 'ALL') {
                onFilterChange('ALL');
              } else {
                onFilterChange(card.filter);
              }
            }}
            aria-pressed={isSelected}
            aria-label={`Thẻ thống kê: ${card.label} (${card.value})`}
            className="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2.5 text-left sm:px-5 sm:py-4 transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-accent cursor-pointer"
          >
            <span className="text-xs text-muted-foreground">{card.label}</span>
            <span className={cn('text-xl font-bold tabular-nums', card.valueClass)}>
              {card.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}
