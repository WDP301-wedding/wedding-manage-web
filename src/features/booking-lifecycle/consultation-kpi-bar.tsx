'use client';

import { intakeStyles } from './intake.styles';
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
  return (
    <div style={intakeStyles.kpiGrid}>
      <div
        style={intakeStyles.kpiCard(statusFilter === 'ALL')}
        onClick={() => onFilterChange('ALL')}
        role="button"
        tabIndex={0}
        aria-label={`Thẻ thống kê: Tổng yêu cầu (${stats.total})`}
      >
        <span style={intakeStyles.kpiLabel}>TỔNG YÊU CẦU</span>
        <span style={intakeStyles.kpiValue}>{stats.total}</span>
      </div>

      <div
        style={intakeStyles.kpiCard(statusFilter === 'NEW', '#7a1f3d')}
        onClick={() => onFilterChange('NEW')}
        role="button"
        tabIndex={0}
        aria-label={`Thẻ thống kê: Chờ tiếp nhận (${stats.newCount})`}
      >
        <span style={intakeStyles.kpiLabel}>CHỜ TIẾP NHẬN</span>
        <span style={{ ...intakeStyles.kpiValue, color: '#7a1f3d' }}>{stats.newCount}</span>
      </div>

      <div
        style={intakeStyles.kpiCard(statusFilter === 'CONVERTED', '#2f6b4f')}
        onClick={() => onFilterChange('CONVERTED')}
        role="button"
        tabIndex={0}
        aria-label={`Thẻ thống kê: Đã mở tư vấn (${stats.convertedCount})`}
      >
        <span style={intakeStyles.kpiLabel}>ĐÃ MỞ TƯ VẤN</span>
        <span style={{ ...intakeStyles.kpiValue, color: '#2f6b4f' }}>{stats.convertedCount}</span>
      </div>

      <div
        style={intakeStyles.kpiCard(statusFilter === 'CLOSED', '#94a3b8')}
        onClick={() => onFilterChange('CLOSED')}
        role="button"
        tabIndex={0}
        aria-label={`Thẻ thống kê: Đã kết thúc (${stats.closedCount})`}
      >
        <span style={intakeStyles.kpiLabel}>ĐÃ KẾT THÚC</span>
        <span style={{ ...intakeStyles.kpiValue, color: '#64748b' }}>{stats.closedCount}</span>
      </div>
    </div>
  );
}
