'use client';

import { cn } from 'cn';
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
      {cards.map((card) => (
        <button
          key={card.filter}
          type="button"
          onClick={() => onFilterChange(card.filter)}
          aria-pressed={statusFilter === card.filter}
          aria-label={`Thẻ thống kê: ${card.label} (${card.value})`}
          className="flex flex-col gap-1 rounded-xl border border-border bg-card px-3 py-2.5 text-left sm:px-5 sm:py-4 transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-accent"
        >
          <span className="text-xs text-muted-foreground">{card.label}</span>
          <span className={cn('text-xl font-bold tabular-nums', card.valueClass)}>
            {card.value}
          </span>
        </button>
      ))}
    </div>
  );
}
