'use client';
import { RealFloorplanViewContent } from './floorplan-view-content';

import { Search } from 'lucide-react';
import { cn } from 'cn';
import { Input } from '@/src/components/ui/input';
import { notify } from '@/src/design-system/notifications/index';
import { type TableItem } from './cockpit-types';
import {
  useFloorplanViewState,
  type RealFloorplanViewProps,
} from '@/src/features/dashboard/hooks/use-floorplan-view-state';

export function RealFloorplanView(props: RealFloorplanViewProps) {
  const model = useFloorplanViewState(props);
  const {
    booking,
    tables,
    groupFilter,
    setGroupFilter,
    searchTableQuery,
    setSearchTableQuery,
    distinctGroups,
    selectedTable,
    hallTitle,
    isSelectedVip,
    isSelectedReserve,
    selectedDisplayLabel,
    staffLead,
    menuPackageName,
  } = model;
  return (
    <div className="floorplan-cockpit-grid">
      {/* Floorplan Main Canvas Box */}
      <div className="floorplan-map-box">
        <div className="floorplan-controls-bar">
          <span style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ck-text-main)' }}>
            Sơ Đồ {hallTitle}
          </span>
          <div className="zone-filter-buttons">
            <button
              type="button"
              className={cn('filter-chip', groupFilter === 'ALL' && 'active')}
              onClick={() => setGroupFilter('ALL')}
            >
              Tất cả ({tables.length || booking.tableCount} Bàn)
            </button>
            {distinctGroups.length > 0 ? (
              distinctGroups.map((group) => {
                const count = tables.filter((t: TableItem) => t.guestGroupName === group).length;
                return (
                  <button
                    key={group}
                    type="button"
                    className={cn('filter-chip', groupFilter === group && 'active')}
                    onClick={() => setGroupFilter(group)}
                  >
                    {group} ({count})
                  </button>
                );
              })
            ) : (
              <>
                <button
                  type="button"
                  className={cn('filter-chip', groupFilter === 'groom' && 'active')}
                  onClick={() => setGroupFilter('groom')}
                >
                  Khu A - Nhà Trai (20)
                </button>
                <button
                  type="button"
                  className={cn('filter-chip', groupFilter === 'bride' && 'active')}
                  onClick={() => setGroupFilter('bride')}
                >
                  Khu B - Nhà Gái (20)
                </button>
                <button
                  type="button"
                  className={cn('filter-chip', groupFilter === 'vip' && 'active')}
                  onClick={() => setGroupFilter('vip')}
                >
                  Bàn Danh Dự VIP (4)
                </button>
                <button
                  type="button"
                  className={cn('filter-chip', groupFilter === 'reserve' && 'active')}
                  onClick={() => setGroupFilter('reserve')}
                >
                  Bàn Dự Phòng (4)
                </button>
              </>
            )}
          </div>

          {/* Quick Table Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              fieldSize="sm"
              type="text"
              value={searchTableQuery}
              onChange={(e) => setSearchTableQuery(e.target.value)}
              placeholder="Tìm số bàn…"
              className="w-36 pl-8"
            />
          </div>
        </div>

        <RealFloorplanViewContent model={model} />
      </div>

      {/* Right Table Inspector Card */}
      <div className="floorplan-inspector-card">
        <div className="inspector-header">
          <div>
            <span className="strip-sub-code">Chi Tiết Bàn Tiệc</span>
            <h3 className="inspector-table-name">{selectedDisplayLabel}</h3>
            {isSelectedReserve ? (
              <span
                className="solid-tag"
                style={{ background: '#FEF7EE', color: '#925410', border: '1px solid #F5E0C2' }}
              >
                Bàn Dự Phòng
              </span>
            ) : isSelectedVip ? (
              <span
                className="solid-tag"
                style={{ background: '#F9ECEE', color: '#631321', border: '1px solid #E8C9CE' }}
              >
                Bàn Danh Dự VIP
              </span>
            ) : (
              <span className="solid-tag solid-tag-success">Đang Dùng Món</span>
            )}
          </div>
          <button
            type="button"
            className="btn-action btn-action-secondary"
            style={{ padding: '4px 8px', fontSize: '11.5px' }}
            onClick={() => notify.info(`Đã gửi lệnh in thẻ định vị cho ${selectedDisplayLabel}`)}
          >
            In Thẻ Bàn
          </button>
        </div>

        <div className="spec-items-list">
          <div className="spec-line">
            <span className="spec-label">Khu vực:</span>
            <span className="spec-val">{selectedTable?.guestGroupName || 'Khu Vực Chung'}</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Sức chứa:</span>
            <span className="spec-val">10 / 10 khách có mặt</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Phục vụ chính:</span>
            <span className="spec-val">{staffLead}</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Thực đơn bàn:</span>
            <span className="spec-val">{menuPackageName}</span>
          </div>
        </div>

        <div className="dietary-notes-card">
          <span className="dietary-notes-title">Ghi chú phục vụ &amp; Khẩu vị:</span>
          <p className="dietary-bullet">
            {isSelectedVip
              ? 'Bàn danh dự: Chuẩn bị sẵn khăn lụa ướt & trà lài nóng cao cấp, kiểm tra rượu vang trước giờ khai tiệc.'
              : isSelectedReserve
                ? 'Bàn dự phòng: Giữ mâm sẵn sàng trong bếp, chỉ kích hoạt lên món khi có lệnh từ Quản lý sảnh.'
                : 'Phục vụ món ăn theo đúng nhịp kịch bản bếp, đảm bảo độ nóng sốt và tiếp thêm đồ uống chu đáo.'}
          </p>
        </div>

        <button
          type="button"
          className="btn-action btn-action-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() =>
            notify.success(`Đã phát lệnh yêu cầu kiểm tra đồ uống cho ${selectedDisplayLabel}`)
          }
        >
          Lệnh Tiếp Thêm Đồ Uống
        </button>
      </div>
    </div>
  );
}
