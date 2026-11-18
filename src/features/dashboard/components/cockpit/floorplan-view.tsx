'use client';

import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { cn } from 'cn';
import { Badge } from '@/src/components/ui/badge';
import { Input } from '@/src/components/ui/input';
import {
  SEATING_STATUS_META,
  useFloorplanViewState,
  type RealFloorplanViewProps,
} from '@/src/features/dashboard/hooks/use-floorplan-view-state';
import { RealFloorplanViewContent } from './floorplan-view-content';

export function RealFloorplanView(props: RealFloorplanViewProps) {
  const model = useFloorplanViewState(props);
  const {
    booking,
    workspace,
    tables,
    seatingStatus,
    groupFilter,
    setGroupFilter,
    searchTableQuery,
    setSearchTableQuery,
    distinctGroups,
    unassignedCount,
    selectedTable,
    hallTitle,
    selectedDisplayLabel,
    assignedMembers,
    menuOfferings,
  } = model;

  const statusMeta = seatingStatus ? SEATING_STATUS_META[seatingStatus] : null;

  return (
    <div className="floorplan-cockpit-grid">
      {/* Floorplan Main Canvas Box */}
      <div className="floorplan-map-box">
        <div className="floorplan-controls-bar">
          <div className="flex flex-wrap items-center gap-2">
            <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ck-text-main)' }}>
              Sơ Đồ {hallTitle}
            </span>
            {statusMeta ? <Badge variant={statusMeta.tone}>{statusMeta.label}</Badge> : null}
          </div>

          {tables.length > 0 ? (
            <>
              <div className="zone-filter-buttons">
                <button
                  type="button"
                  className={cn('filter-chip', groupFilter === 'ALL' && 'active')}
                  onClick={() => setGroupFilter('ALL')}
                >
                  Tất cả ({tables.length} bàn)
                </button>
                {distinctGroups.map((group) => (
                  <button
                    key={group.name}
                    type="button"
                    className={cn('filter-chip inline-flex items-center gap-1.5', groupFilter === group.name && 'active')}
                    onClick={() => setGroupFilter(group.name)}
                  >
                    {group.color ? (
                      <span
                        className="size-2.5 shrink-0 rounded-full border border-black/15"
                        style={{ backgroundColor: group.color }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span>
                      {group.name} ({group.count})
                    </span>
                  </button>
                ))}
                {unassignedCount > 0 ? (
                  <button
                    type="button"
                    className={cn('filter-chip', groupFilter === '__UNASSIGNED__' && 'active')}
                    onClick={() => setGroupFilter('__UNASSIGNED__')}
                  >
                    Chưa gán nhóm ({unassignedCount})
                  </button>
                ) : null}
              </div>

              {/* Quick Table Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  fieldSize="sm"
                  type="text"
                  value={searchTableQuery}
                  onChange={(e) => setSearchTableQuery(e.target.value)}
                  placeholder="Tìm bàn, nhóm…"
                  className="w-40 pl-8"
                />
              </div>
            </>
          ) : null}
        </div>

        <RealFloorplanViewContent model={model} />
      </div>

      {/* Right Table Inspector Card (100% Real Workspace Data) */}
      <div className="floorplan-inspector-card">
        <div className="inspector-header">
          <div>
            <span className="strip-sub-code">Chi Tiết Bàn Tiệc</span>
            <h3 className="inspector-table-name">
              {selectedDisplayLabel ?? 'Chưa chọn bàn'}
            </h3>
            {selectedTable ? (
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {selectedTable.guestGroupName ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-2xs font-semibold text-foreground">
                    {selectedTable.color ? (
                      <span
                        className="size-2 rounded-full border border-black/15"
                        style={{ backgroundColor: selectedTable.color }}
                        aria-hidden="true"
                      />
                    ) : null}
                    {selectedTable.guestGroupName}
                  </span>
                ) : (
                  <Badge variant="neutral">Chưa gán nhóm khách</Badge>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="spec-items-list">
          <div className="spec-line">
            <span className="spec-label">Nhóm khách (từ khách):</span>
            <span className="spec-val">
              {selectedTable?.guestGroupName ?? 'Chưa gán nhóm'}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Kiểu bàn:</span>
            <span className="spec-val">
              {selectedTable
                ? selectedTable.shape === 'ROUND'
                  ? 'Bàn tròn'
                  : 'Bàn chữ nhật'
                : '—'}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Quy mô toàn tiệc:</span>
            <span className="spec-val">
              {workspace
                ? `${workspace.operations.tableCount} bàn · ${workspace.planningHeadcount} khách dự kiến`
                : `${booking.tableCount} bàn`}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Nhân sự phụ trách:</span>
            <span className="spec-val">
              {assignedMembers.length > 0
                ? assignedMembers.map((m) => m.label).join(', ')
                : 'Chưa phân công'}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Thực đơn của tiệc:</span>
            <span className="spec-val">
              {menuOfferings.length > 0
                ? menuOfferings.map((o) => o.name).join(', ')
                : 'Chưa có thực đơn'}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <Link
            href={`/bookings?bookingId=${booking.bookingId}`}
            className="btn-action btn-action-primary w-full justify-center no-underline"
          >
            Mở Hồ Sơ Tiệc
            <ArrowUpRight className="size-3.5" />
          </Link>
          <Link
            href={`/staff?bookingId=${booking.bookingId}`}
            className="btn-action btn-action-secondary w-full justify-center no-underline"
          >
            Xem Bảng Tác Nghiệp Nhân Sự
          </Link>
        </div>
      </div>
    </div>
  );
}
