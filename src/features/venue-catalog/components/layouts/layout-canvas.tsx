'use client';

import { useRef } from 'react';
import type { LayoutTableWrite } from '@/src/features/venue-catalog/api/catalog-api';
import { CANVAS_SIZE } from './layout-table-editor';
import { cx } from '@/src/features/venue-catalog/styles/catalog-classes';
import { cn } from 'cn';

export function LayoutCanvas({
  tables,
  selectedTableId,
  onSelectTable,
  onMoveTable,
}: Readonly<{
  tables: readonly LayoutTableWrite[];
  selectedTableId?: string | null;
  onSelectTable?: (id: string) => void;
  onMoveTable?: (id: string, x: number, y: number) => void;
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const handlePointerDown = (
    event: React.PointerEvent<HTMLSpanElement>,
    table: LayoutTableWrite,
  ) => {
    if (!onMoveTable) return;
    event.preventDefault();
    onSelectTable?.(table.tableId);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: table.tableId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startX: table.x,
      startY: table.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!dragRef.current || !containerRef.current || !onMoveTable) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dxPixels = event.clientX - dragRef.current.startPointerX;
    const dyPixels = event.clientY - dragRef.current.startPointerY;

    const dxCanvas = (dxPixels / rect.width) * CANVAS_SIZE;
    const dyCanvas = (dyPixels / rect.height) * CANVAS_SIZE;

    const targetTable = tables.find((t) => t.tableId === dragRef.current?.id);
    const width = targetTable?.width ?? 1000;
    const height = targetTable?.height ?? 1000;

    const rawX = Math.round((dragRef.current.startX + dxCanvas) / 100) * 100;
    const rawY = Math.round((dragRef.current.startY + dyCanvas) / 100) * 100;

    const clampedX = Math.max(0, Math.min(CANVAS_SIZE - width, rawX));
    const clampedY = Math.max(0, Math.min(CANVAS_SIZE - height, rawY));

    onMoveTable(dragRef.current.id, clampedX, clampedY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (dragRef.current) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // no-op
      }
      dragRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cx.layoutCanvas}
      role="img"
      aria-label="Xem trước bố trí bàn theo tỷ lệ canvas"
    >
      {tables.map((table) => {
        const isSelected = selectedTableId === table.tableId;
        return (
          <span
            key={table.tableId}
            className={cn(
              cx.layoutCanvasTable,
              table.shape === 'ROUND' && 'rounded-full',
              isSelected &&
                'ring-2 ring-primary ring-offset-2 shadow-md z-10 font-bold bg-primary text-primary-foreground',
              onMoveTable && 'cursor-grab active:cursor-grabbing select-none',
            )}
            style={{
              left: `${(table.x / CANVAS_SIZE) * 100}%`,
              top: `${(table.y / CANVAS_SIZE) * 100}%`,
              width: `${Math.max((table.width / CANVAS_SIZE) * 100, 3)}%`,
              height: `${Math.max((table.height / CANVAS_SIZE) * 100, 3)}%`,
              transform: `rotate(${table.rotationDegrees}deg)`,
              touchAction: onMoveTable ? 'none' : 'auto',
            }}
            title={`${table.label}: ${table.seatCapacity} ghế (Tọa độ: X ${table.x}, Y ${table.y})`}
            onPointerDown={(e) => handlePointerDown(e, table)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={() => onSelectTable?.(table.tableId)}
          >
            {table.label}
          </span>
        );
      })}
    </div>
  );
}
