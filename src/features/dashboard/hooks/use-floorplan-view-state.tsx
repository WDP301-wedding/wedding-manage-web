'use client';

import { useState } from 'react';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';
import type { TableItem } from '@/src/features/dashboard/components/cockpit/cockpit-types';

export type RealFloorplanViewProps = Readonly<{
  workspace: StaffWorkspace | null;
  booking: NavigationBooking;
  loading?: boolean;
}>;

export const SEATING_STATUS_META: Record<
  StaffWorkspace['seating']['status'],
  { label: string; tone: 'success' | 'warning' | 'info' | 'neutral' }
> = {
  CONFIRMED: { label: 'Khách đã chốt sơ đồ', tone: 'success' },
  DRAFT: { label: 'Bản nháp từ khách', tone: 'info' },
  REQUIRES_REVIEW: { label: 'Cần rà soát lại', tone: 'warning' },
  ABSENT: { label: 'Chưa lập sơ đồ', tone: 'neutral' },
};

export function useFloorplanViewState({ workspace, booking, loading = false }: RealFloorplanViewProps) {
  const tables = workspace?.seating.renderSnapshot ?? [];
  const seatingStatus = workspace?.seating.status ?? null;
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [searchTableQuery, setSearchTableQuery] = useState('');

  // Keep distinct groups + their real customer-chosen color swatch
  const groupColorMap = new Map<string, string | null>();
  for (const t of tables) {
    if (t.guestGroupName) {
      if (!groupColorMap.has(t.guestGroupName)) {
        groupColorMap.set(t.guestGroupName, t.color);
      }
    }
  }
  const distinctGroups = Array.from(groupColorMap.entries()).map(([name, color]) => ({
    name,
    color,
    count: tables.filter((t) => t.guestGroupName === name).length,
  }));
  const unassignedCount = tables.filter((t) => !t.guestGroupName).length;

  // Uniform aspect-ratio transform matching customer seating-svg geometry 1:1
  const rawBounds = tables.map((t: TableItem) => {
    const angle = (t.rotationDegrees * Math.PI) / 180;
    const w = Math.abs(Math.cos(angle)) * t.width + Math.abs(Math.sin(angle)) * t.height;
    const h = Math.abs(Math.sin(angle)) * t.width + Math.abs(Math.cos(angle)) * t.height;
    const cx = t.x + t.width / 2;
    const cy = t.y + t.height / 2;
    return {
      left: cx - w / 2,
      top: cy - h / 2,
      right: cx + w / 2,
      bottom: cy + h / 2,
    };
  });

  const rawMinLeft = rawBounds.length > 0 ? Math.min(...rawBounds.map((b) => b.left)) : 0;
  const rawMinTop = rawBounds.length > 0 ? Math.min(...rawBounds.map((b) => b.top)) : 0;
  const rawMaxRight = rawBounds.length > 0 ? Math.max(...rawBounds.map((b) => b.right)) : 800;
  const rawMaxBottom = rawBounds.length > 0 ? Math.max(...rawBounds.map((b) => b.bottom)) : 400;
  const rawWidth = Math.max(1, rawMaxRight - rawMinLeft);
  const rawHeight = Math.max(1, rawMaxBottom - rawMinTop);

  // Studio canvas viewport inside 880x540 (leaving clean room for stage banner at top & entrance at bottom)
  const canvasLeft = 48;
  const canvasRight = 832;
  const canvasTop = 98;
  const canvasBottom = 468;
  const availWidth = canvasRight - canvasLeft;
  const availHeight = canvasBottom - canvasTop;

  const uniformScale = Math.min(availWidth / rawWidth, availHeight / rawHeight);
  const scaledWidth = rawWidth * uniformScale;
  const scaledHeight = rawHeight * uniformScale;
  const offsetX = canvasLeft + (availWidth - scaledWidth) / 2;
  const offsetY = canvasTop + (availHeight - scaledHeight) / 2;

  const selectedTable: TableItem | undefined =
    tables.find((t: TableItem) => t.layoutTableId === selectedTableId) ?? tables[0];

  const hallTitle = workspace?.timeline.hallName || booking.hallNameSnapshot || 'Sảnh tiệc';
  const selectedDisplayLabel = selectedTable
    ? /^bàn\s/iu.test(selectedTable.tableLabel)
      ? selectedTable.tableLabel
      : `Bàn ${selectedTable.tableLabel}`
    : null;

  const assignedMembers = workspace?.members ?? [];
  const menuOfferings = workspace?.operations.offerings.filter((o) => o.category === 'MENU') ?? [];

  return {
    booking,
    workspace,
    loading,
    tables,
    seatingStatus,
    selectedTableId,
    setSelectedTableId,
    groupFilter,
    setGroupFilter,
    searchTableQuery,
    setSearchTableQuery,
    distinctGroups,
    unassignedCount,
    rawMinLeft,
    rawMinTop,
    offsetX,
    offsetY,
    uniformScale,
    selectedTable,
    hallTitle,
    selectedDisplayLabel,
    assignedMembers,
    menuOfferings,
  };
}
