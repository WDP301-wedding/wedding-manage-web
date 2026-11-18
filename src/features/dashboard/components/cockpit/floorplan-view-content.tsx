'use client';

import { cn } from 'cn';
import { Skeleton } from '@/src/components/ui/skeleton';
import type { TableItem } from './cockpit-types';
import type { useFloorplanViewState } from '@/src/features/dashboard/hooks/use-floorplan-view-state';

function isDarkHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // Relative luminance threshold for crisp text contrast
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

export function RealFloorplanViewContent({
  model,
}: Readonly<{ model: ReturnType<typeof useFloorplanViewState> }>) {
  const {
    booking,
    loading,
    tables,
    seatingStatus,
    selectedTableId,
    setSelectedTableId,
    groupFilter,
    searchTableQuery,
    rawMinLeft,
    rawMinTop,
    offsetX,
    offsetY,
    uniformScale,
    selectedTable,
    hallTitle,
  } = model;

  if (loading) {
    return (
      <div className="floorplan-render-canvas p-6" aria-busy="true">
        <Skeleton className="h-[460px] w-full max-w-[880px] rounded-xl" />
      </div>
    );
  }

  if (tables.length === 0) {
    const isUnconfirmed = booking.phase !== 'CONFIRMED' && booking.phase !== 'COMPLETED';
    return (
      <div className="floorplan-render-canvas flex min-h-[380px] flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm font-semibold text-foreground">
          {isUnconfirmed
            ? 'Sơ đồ bàn chỉ khả dụng sau khi tiệc được xác nhận'
            : seatingStatus === 'ABSENT'
              ? 'Khách hàng chưa lập sơ đồ bàn cho tiệc này'
              : 'Chưa có dữ liệu vị trí bàn từ máy chủ'}
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          {isUnconfirmed
            ? `Hồ sơ hiện đang ở trạng thái ${booking.phase === 'DRAFT' ? 'Bản nháp' : booking.phase === 'AWAITING_DEPOSIT' ? 'Chờ đặt cọc' : booking.phase}. Sau khi xác nhận đặt cọc và khách lập sơ đồ trên ứng dụng, sơ đồ thật sẽ tự động đồng bộ tại đây.`
            : 'Khi khách hàng chọn mẫu bố trí và gán nhóm khách cho từng bàn trên trang khách, sơ đồ thật sẽ hiển thị đồng nhất tại đây.'}
        </p>
      </div>
    );
  }

  return (
    <div className="floorplan-render-canvas">
      <svg
        width="100%"
        height="540"
        viewBox="0 0 880 540"
        style={{ maxWidth: '880px', display: 'block' }}
        role="img"
        aria-label={`Sơ đồ bố trí ${tables.length} bàn tại ${hallTitle}`}
      >
        {/* Hall Architectural Boundary */}
        <rect
          x={8}
          y={8}
          width={864}
          height={524}
          rx={10}
          fill="#FFFFFF"
          stroke="#E0E0DC"
          strokeWidth={1.5}
        />

        {/* Stage Header Banner (Real Hall Name) */}
        <rect
          x={250}
          y={22}
          width={380}
          height={48}
          rx={8}
          fill="#631321"
          stroke="#4F0E1A"
          strokeWidth={1.5}
        />
        <text
          x={440}
          y={44}
          fill="#FFFFFF"
          fontSize={12.5}
          fontWeight={700}
          textAnchor="middle"
          letterSpacing={1}
        >
          KHU VỰC SÂN KHẤU CHÍNH
        </text>
        <text x={440} y={60} fill="#E8C9CE" fontSize={10.5} fontWeight={500} textAnchor="middle">
          {hallTitle} · {tables.length} bàn trong sơ đồ
        </text>

        {/* Entrance Marker */}
        <rect
          x={375}
          y={492}
          width={130}
          height={24}
          rx={4}
          fill="#FFFFFF"
          stroke="#631321"
          strokeWidth={1.25}
        />
        <text x={440} y={508} fill="#631321" fontSize={10.5} fontWeight={600} textAnchor="middle">
          CỬA ĐÓN KHÁCH
        </text>

        {/* 100% Real Customer Seating Tables (Exact Shape, Position, Rotation, Color & Group) */}
        {tables.map((t: TableItem) => {
          const isSelected =
            t.layoutTableId === (selectedTable?.layoutTableId ?? selectedTableId);

          const cx = offsetX + (t.x + t.width / 2 - rawMinLeft) * uniformScale;
          const cy = offsetY + (t.y + t.height / 2 - rawMinTop) * uniformScale;
          const w = Math.max(28, t.width * uniformScale);
          const h = Math.max(28, t.height * uniformScale);

          const hasColor = Boolean(t.color);
          const fill = t.color ?? '#FFFFFF';
          const textColor = hasColor ? (isDarkHex(fill) ? '#FFFFFF' : '#18181B') : '#18181B';
          const stroke = isSelected ? '#631321' : hasColor ? 'rgba(24,24,27,0.28)' : '#D4D4D8';
          const strokeWidth = isSelected ? 3 : 1.5;

          const q = searchTableQuery.toLowerCase().trim();
          const isDimmed =
            (groupFilter !== 'ALL' &&
              (groupFilter === '__UNASSIGNED__'
                ? Boolean(t.guestGroupName)
                : t.guestGroupName !== groupFilter)) ||
            (q !== '' &&
              !t.tableLabel.toLowerCase().includes(q) &&
              !(t.guestGroupName ?? '').toLowerCase().includes(q));

          const displayLabel = t.tableLabel.replace(/^Bàn\s+/iu, '').trim();
          const minDim = Math.min(w, h);
          const labelFontSize = Math.max(9.5, Math.min(13, minDim / (displayLabel.length > 3 ? 3.8 : 2.8)));

          return (
            <g
              key={t.layoutTableId}
              transform={`translate(${cx} ${cy}) rotate(${t.rotationDegrees})`}
              className={cn('table-marker', isSelected && 'is-selected')}
              onClick={() => setSelectedTableId(t.layoutTableId)}
              opacity={isDimmed ? 0.2 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s ease' }}
            >
              <title>
                {`${/^bàn\s/iu.test(t.tableLabel) ? t.tableLabel : `Bàn ${t.tableLabel}`} · ${t.guestGroupName ?? 'Chưa gán nhóm'}`}
              </title>

              {isSelected ? (
                t.shape === 'ROUND' ? (
                  <ellipse
                    rx={w / 2 + 4}
                    ry={h / 2 + 4}
                    fill="none"
                    stroke="#631321"
                    strokeWidth={1.5}
                    strokeOpacity={0.35}
                  />
                ) : (
                  <rect
                    x={-w / 2 - 4}
                    y={-h / 2 - 4}
                    width={w + 8}
                    height={h + 8}
                    rx={8}
                    fill="none"
                    stroke="#631321"
                    strokeWidth={1.5}
                    strokeOpacity={0.35}
                  />
                )
              ) : null}

              {t.shape === 'ROUND' ? (
                <ellipse
                  rx={w / 2}
                  ry={h / 2}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  className="ring"
                />
              ) : (
                <rect
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  rx={6}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  className="ring"
                />
              )}

              <text
                transform={`rotate(${-t.rotationDegrees})`}
                x={0}
                y={labelFontSize * 0.36}
                fill={textColor}
                fontSize={labelFontSize}
                fontWeight={700}
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                {displayLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
