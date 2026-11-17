'use client';
import { useState } from 'react';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';
import { type TableItem } from '@/src/features/dashboard/components/cockpit/cockpit-types';

export type RealFloorplanViewProps = Readonly<{
  workspace: StaffWorkspace | null;
  booking: NavigationBooking;
}>;
export function useFloorplanViewState({ workspace, booking }: RealFloorplanViewProps) {
  const tables = workspace?.seating.renderSnapshot ?? [];
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    tables.length > 0 ? (tables[0]?.layoutTableId ?? null) : null,
  );
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const distinctGroups = Array.from(
    new Set(tables.map((t: TableItem) => t.guestGroupName).filter(Boolean)),
  ) as string[];
  const filteredTables = tables.filter((t: TableItem) => {
    if (groupFilter !== 'ALL' && (t.guestGroupName || 'Khác') !== groupFilter) return false;
    if (searchTableQuery.trim()) {
      const q = searchTableQuery.toLowerCase().trim();
      return (
        t.tableLabel.toLowerCase().includes(q) ||
        (t.guestGroupName && t.guestGroupName.toLowerCase().includes(q))
      );
    }
    return true;
  });
  const rawBounds = tables.map((t: TableItem) => {
    const angle = (t.rotationDegrees * Math.PI) / 180;
    const w = Math.abs(Math.cos(angle)) * t.width + Math.abs(Math.sin(angle)) * t.height;
    const h = Math.abs(Math.sin(angle)) * t.width + Math.abs(Math.cos(angle)) * t.height;
    const cx = t.x + t.width / 2;
    const cy = t.y + t.height / 2;
    return {
      cx,
      cy,
      left: cx - w / 2,
      top: cy - h / 2,
      right: cx + w / 2,
      bottom: cy + h / 2,
    };
  });
  const rawMinLeft = rawBounds.length > 0 ? Math.min(...rawBounds.map((b) => b.left)) : 0;
  const rawMinTop = rawBounds.length > 0 ? Math.min(...rawBounds.map((b) => b.top)) : 0;
  const rawMaxRight = rawBounds.length > 0 ? Math.max(...rawBounds.map((b) => b.right)) : 880;
  const rawMaxBottom = rawBounds.length > 0 ? Math.max(...rawBounds.map((b) => b.bottom)) : 540;
  const rawWidth = Math.max(1, rawMaxRight - rawMinLeft);
  const rawHeight = Math.max(1, rawMaxBottom - rawMinTop);
  const targetMinX = 75;
  const targetMaxX = 805;
  const targetMinY = 118;
  const targetMaxY = 405;
  const targetWidth = targetMaxX - targetMinX;
  const targetHeight = targetMaxY - targetMinY;
  const scaleX = targetWidth / rawWidth;
  const scaleY = targetHeight / rawHeight;
  const selectedTable: TableItem | undefined =
    tables.find((t: TableItem) => t.layoutTableId === selectedTableId) ?? tables[0];
  const hallTitle = booking.hallNameSnapshot || 'Sảnh Grand Diamond';
  const isSelectedVip =
    selectedTable &&
    ((selectedTable.guestGroupName || '').toLowerCase().includes('vip') ||
      selectedTable.tableLabel.toLowerCase().includes('vip') ||
      (selectedTable.guestGroupName || '').toLowerCase().includes('parents') ||
      (selectedTable.guestGroupName || '').toLowerCase().includes('danh dự'));
  const isSelectedReserve =
    selectedTable &&
    ((selectedTable.guestGroupName || '').toLowerCase().includes('dự phòng') ||
      selectedTable.tableLabel.toLowerCase().includes('dp') ||
      (selectedTable.guestGroupName || '').toLowerCase().includes('reserve'));
  const selectedDisplayLabel = selectedTable
    ? selectedTable.tableLabel.startsWith('Bàn')
      ? selectedTable.tableLabel
      : `Bàn ${selectedTable.tableLabel}`
    : 'Bàn VIP 01';
  const staffLead =
    workspace?.members && workspace.members.length > 0 && workspace.members[0]?.label
      ? `${workspace.members[0].label} (Tổ điều phối)`
      : 'Điều phối viên sảnh trực (Tổ 1)';
  const menuOfferings = workspace?.operations.offerings.filter((o) => o.category === 'MENU') ?? [];
  const menuPackageName =
    menuOfferings.length > 0
      ? `Set Ẩm Thực ${menuOfferings[0]?.name ?? 'Cao Cấp'}`
      : 'Hoàng Kim Yến Tiệc V4';
  return {
    booking,
    tables,
    selectedTableId,
    setSelectedTableId,
    groupFilter,
    setGroupFilter,
    searchTableQuery,
    setSearchTableQuery,
    distinctGroups,
    rawMinLeft,
    rawMinTop,
    targetMinX,
    targetMinY,
    scaleX,
    scaleY,
    selectedTable,
    hallTitle,
    isSelectedVip,
    isSelectedReserve,
    selectedDisplayLabel,
    staffLead,
    menuPackageName,
  };
}
