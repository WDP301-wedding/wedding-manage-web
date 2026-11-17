'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { staffWorkspaceService } from '@/src/services/staff/staff-workspace.service';
import type { StaffWorkspace } from '@/src/services/staff/staff-workspace.contracts';
import { describeApiError } from '@/src/lib/api/api-errors';
import { type DashboardOperationsCockpitProps } from './cockpit-types';
import { RealFloorplanView } from './floorplan-view';
import { RealRundownView } from './rundown-view';
import { RealSettlementView } from './settlement-view';
import { RealMenuView } from './menu-view';

export type { DashboardOperationsCockpitProps } from './cockpit-types';
export { RealFloorplanView } from './floorplan-view';
export { RealRundownView } from './rundown-view';
export { RealSettlementView } from './settlement-view';
export { RealBookingsView } from './bookings-view';
export { RealMenuView } from './menu-view';

export function DashboardOperationsCockpit({
  booking,
  activeView = 'floorplan',
  onOpenContract,
}: Readonly<DashboardOperationsCockpitProps>) {
  const [workspace, setWorkspace] = useState<StaffWorkspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) {
      setWorkspace(null);
      setError(null);
      return;
    }

    if (booking.phase !== 'CONFIRMED' && booking.phase !== 'COMPLETED') {
      setWorkspace(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void staffWorkspaceService
      .read(booking.bookingId)
      .then((data: StaffWorkspace) => {
        if (!active) return;
        setWorkspace(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(describeApiError(err).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [booking?.bookingId, booking?.phase]);

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <LayoutGrid className="size-8 text-muted-foreground/60" />
        <h3 className="text-base font-bold text-foreground">Trung Tâm Điều Phối Ca Trực Sảnh</h3>
        <p className="max-w-md text-xs text-muted-foreground">
          Vui lòng chọn một tiệc cưới từ danh sách bên dưới để xem sơ đồ sảnh và kịch bản vận hành
          thực tế.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {activeView === 'floorplan' && <RealFloorplanView workspace={workspace} booking={booking} />}
      {activeView === 'rundown' && <RealRundownView workspace={workspace} booking={booking} />}
      {activeView === 'settlement' && <RealSettlementView booking={booking} />}
      {activeView === 'menu' && <RealMenuView workspace={workspace} booking={booking} />}
    </div>
  );
}
