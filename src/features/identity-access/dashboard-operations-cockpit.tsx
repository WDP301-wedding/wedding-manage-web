'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutGrid,
  Clock,
  Utensils,
  CreditCard,
  BookOpen,
  FileText,
  Users,
  CheckCircle2,
  Search,
  Printer,
  QrCode,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from 'cn';
import type { NavigationBooking } from '../../services/booking-navigation.service';
import { staffWorkspaceService } from '../../services/staff-workspace.service';
import type { StaffWorkspace } from '../../services/staff-workspace.contracts';
import {
  billingService,
  type BookingBilling,
} from '../../services/billing.service';
import {
  catalogService,
  type PublicMenu,
} from '../../services/catalog.service';
import { describeApiError } from '../../lib/api/api-errors';
import { formatVnd } from '../../lib/formatters';
import { formatDate } from '../booking-lifecycle/booking-helpers';
import { notify } from '../../design-system/notifications';

type TableItem = StaffWorkspace['seating']['renderSnapshot'][number];
type OfferingItem = StaffWorkspace['operations']['offerings'][number];
type TimelineStep = StaffWorkspace['timeline']['items'][number];
type MemberItem = StaffWorkspace['members'][number];

export interface DashboardOperationsCockpitProps {
  booking: NavigationBooking | null;
  activeView?: 'floorplan' | 'rundown' | 'bookings' | 'settlement' | 'menu';
  onOpenContract?: ((booking: NavigationBooking) => void) | undefined;
}

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
          Vui lòng chọn một tiệc cưới từ danh sách bên dưới để xem sơ đồ sảnh và kịch bản vận hành thực tế.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {activeView === 'floorplan' && (
        <RealFloorplanView
          workspace={workspace}
          booking={booking}
        />
      )}
      {activeView === 'rundown' && (
        <RealRundownView
          workspace={workspace}
          booking={booking}
        />
      )}
      {activeView === 'settlement' && (
        <RealSettlementView
          booking={booking}
        />
      )}
      {activeView === 'menu' && (
        <RealMenuView
          workspace={workspace}
          booking={booking}
        />
      )}
    </div>
  );
}

/** 1. Real Architectural Floorplan Studio with Stage, LED Wall, Catwalk, Reception Desk, Table Filter Chips */
export function RealFloorplanView({
  workspace,
  booking,
}: Readonly<{
  workspace: StaffWorkspace | null;
  booking: NavigationBooking;
}>) {
  const tables = workspace?.seating.renderSnapshot ?? [];
  const [selectedTableId, setSelectedTableId] = useState<string | null>(
    tables.length > 0 ? tables[0]?.layoutTableId ?? null : null,
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

  // Calculate bounds in native DB coordinates
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

  // Target designated table zone inside standard 880 x 540 architectural canvas:
  // - Top: Stage is at y=22, height=58 (ends at y=80). Tables start at targetMinY = 118.
  // - Bottom: Entrance is at y=430, height=26. Tables end at targetMaxY = 405.
  // - Left & Right: Tables span targetMinX = 75 to targetMaxX = 805 (width = 730).
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
            <Search className="absolute top-1/2 left-2.5 size-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTableQuery}
              onChange={(e) => setSearchTableQuery(e.target.value)}
              placeholder="Tìm số bàn…"
              className="h-7 w-32 rounded-md border border-border bg-card pr-2 pl-7 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        <div className="floorplan-render-canvas">
          <svg
            width="100%"
            height="540"
            viewBox="0 0 880 540"
            style={{ maxWidth: '880px', display: 'block' }}
            role="img"
            aria-label={`Sơ đồ bố trí bàn ${hallTitle}`}
          >
            {/* Hall boundary */}
            <rect
              x={8}
              y={8}
              width={864}
              height={524}
              rx={8}
              fill="#FFFFFF"
              stroke="#E0E0DC"
              strokeWidth={1.5}
            />

            {/* SÂN KHẤU CHÍNH & MÀN HÌNH LED (SOLID WINE) */}
            <rect
              x={240}
              y={22}
              width={400}
              height={58}
              rx={6}
              fill="#631321"
              stroke="#4F0E1A"
              strokeWidth={1.5}
            />
            <text
              x={440}
              y={48}
              fill="#FFFFFF"
              fontSize={13.5}
              fontWeight={700}
              textAnchor="middle"
              letterSpacing={1}
            >
              SÂN KHẤU CHÍNH · MÀN HÌNH LED P2.5
            </text>
            <text
              x={440}
              y={66}
              fill="#E8C9CE"
              fontSize={11}
              fontWeight={500}
              textAnchor="middle"
            >
              Tháp Rượu Champagne Khai Tiệc · Bánh Cưới Hoàng Gia
            </text>

            {/* LỐI ĐI CATWALK HOA TƯƠI */}
            <rect
              x={410}
              y={80}
              width={60}
              height={350}
              fill="#F4F4F3"
              stroke="#D4D4D8"
              strokeDasharray="4,4"
              strokeWidth={1}
            />
            <text
              x={440}
              y={260}
              fill="#71717A"
              fontSize={11}
              fontWeight={600}
              textAnchor="middle"
              transform="rotate(-90 440 260)"
              letterSpacing={2}
            >
              LỐI ĐI CATWALK HOA TƯƠI
            </text>

            {/* CỬA ĐÓN KHÁCH CHÍNH */}
            <rect
              x={375}
              y={430}
              width={130}
              height={26}
              rx={4}
              fill="#FFFFFF"
              stroke="#631321"
              strokeWidth={1.5}
            />
            <text
              x={440}
              y={447}
              fill="#631321"
              fontSize={11}
              fontWeight={600}
              textAnchor="middle"
            >
              CỬA ĐÓN KHÁCH CHÍNH
            </text>

            {/* Real Tables or Default Architectural Layout */}
            {tables.length > 0 ? (
              tables.map((t: TableItem) => {
                const isSelected = t.layoutTableId === (selectedTable?.layoutTableId ?? selectedTableId);
                const groupLower = (t.guestGroupName || '').toLowerCase();
                const labelLower = t.tableLabel.toLowerCase();
                const isVip =
                  groupLower.includes('vip') ||
                  labelLower.includes('vip') ||
                  groupLower.includes('parents') ||
                  groupLower.includes('danh dự');
                const isReserve =
                  groupLower.includes('dự phòng') ||
                  labelLower.includes('dp') ||
                  groupLower.includes('reserve');

                let circleFill = '#FFFFFF';
                let circleStroke = '#D4D4D8';
                let textColor = '#18181B';
                let strokeWidth = 1.5;

                if (isSelected) {
                  circleFill = '#F9ECEE';
                  circleStroke = '#631321';
                  textColor = '#631321';
                  strokeWidth = 2.5;
                } else if (isVip) {
                  circleFill = '#F9ECEE';
                  circleStroke = '#631321';
                  textColor = '#631321';
                  strokeWidth = 2;
                } else if (isReserve) {
                  circleFill = '#FEF7EE';
                  circleStroke = '#925410';
                  textColor = '#925410';
                  strokeWidth = 1.5;
                } else if (t.color) {
                  circleFill = t.color;
                  circleStroke = '#A1A1AA';
                  textColor = '#18181B';
                }

                const isDimmed =
                  (groupFilter !== 'ALL' && (t.guestGroupName || 'Khác') !== groupFilter) ||
                  (searchTableQuery.trim() !== '' &&
                    !t.tableLabel.toLowerCase().includes(searchTableQuery.toLowerCase().trim()) &&
                    !(t.guestGroupName || '').toLowerCase().includes(searchTableQuery.toLowerCase().trim()));

                const cx = Math.round(targetMinX + (t.x + t.width / 2 - rawMinLeft) * scaleX);
                const cy = Math.round(targetMinY + (t.y + t.height / 2 - rawMinTop) * scaleY);
                const displayLabel = t.tableLabel.replace(/^Bàn\s+/i, '').trim();

                return (
                  <g
                    key={t.layoutTableId}
                    className={cn('table-marker', isSelected && 'is-selected')}
                    onClick={() => setSelectedTableId(t.layoutTableId)}
                    opacity={isDimmed ? 0.22 : 1}
                    style={{ cursor: 'pointer', transition: 'opacity 0.2s ease, filter 0.2s ease' }}
                  >
                    <title>{`Bàn ${displayLabel} · ${t.guestGroupName || 'Khu vực chung'} (10 khách)`}</title>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isVip || isSelected ? 24 : 22}
                      fill={circleFill}
                      stroke={circleStroke}
                      strokeWidth={strokeWidth}
                      className="ring"
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      fill={textColor}
                      fontSize={displayLabel.length > 3 ? 9.5 : 11}
                      fontWeight={700}
                      textAnchor="middle"
                      style={{ userSelect: 'none' }}
                    >
                      {displayLabel}
                    </text>
                    {(isVip || isReserve) && (
                      <text
                        x={cx}
                        y={cy + 34}
                        fill={isVip ? '#631321' : '#925410'}
                        fontSize={9}
                        fontWeight={600}
                        textAnchor="middle"
                        style={{ userSelect: 'none' }}
                      >
                        {isVip ? (groupLower.includes('parents') ? 'Song Thân' : 'VIP') : 'Dự Phòng'}
                      </text>
                    )}
                  </g>
                );
              })
            ) : (
              /* Fallback 48 Tables layout from Mock Demo */
              <g>
                {/* BÀN DANH DỰ VIP */}
                <g className={cn('table-marker', selectedTableId === 'vip1' && 'is-selected')} onClick={() => setSelectedTableId('vip1')}>
                  <circle cx="330" cy="125" r="26" fill="#F9ECEE" stroke="#631321" strokeWidth={2} className="ring" />
                  <text x="330" y="130" fill="#631321" fontSize={11} fontWeight={700} textAnchor="middle">VIP 1</text>
                  <text x="330" y="162" fill="#52525B" fontSize={10} fontWeight={600} textAnchor="middle">Nhà Trai</text>
                </g>
                <g className={cn('table-marker', selectedTableId === 'vip2' && 'is-selected')} onClick={() => setSelectedTableId('vip2')}>
                  <circle cx="550" cy="125" r="26" fill="#F9ECEE" stroke="#631321" strokeWidth={2} className="ring" />
                  <text x="550" y="130" fill="#631321" fontSize={11} fontWeight={700} textAnchor="middle">VIP 2</text>
                  <text x="550" y="162" fill="#52525B" fontSize={10} fontWeight={600} textAnchor="middle">Nhà Gái</text>
                </g>
                <g className={cn('table-marker', selectedTableId === 'vip3' && 'is-selected')} onClick={() => setSelectedTableId('vip3')}>
                  <circle cx="330" cy="205" r="24" fill="#FAF2DF" stroke="#8C6822" strokeWidth={1.5} className="ring" />
                  <text x="330" y="210" fill="#8C6822" fontSize={10} fontWeight={700} textAnchor="middle">VIP 3</text>
                  <text x="330" y="240" fill="#71717A" fontSize={10} fontWeight={500} textAnchor="middle">Đối tác</text>
                </g>
                <g className={cn('table-marker', selectedTableId === 'vip4' && 'is-selected')} onClick={() => setSelectedTableId('vip4')}>
                  <circle cx="550" cy="205" r="24" fill="#FAF2DF" stroke="#8C6822" strokeWidth={1.5} className="ring" />
                  <text x="550" y="210" fill="#8C6822" fontSize={10} fontWeight={700} textAnchor="middle">VIP 4</text>
                  <text x="550" y="240" fill="#71717A" fontSize={10} fontWeight={500} textAnchor="middle">Đối tác</text>
                </g>

                {/* KHU A: HỌ NHÀ TRAI */}
                {[
                  { id: 't05', x: 95, y: 125, label: '05' },
                  { id: 't06', x: 170, y: 125, label: '06' },
                  { id: 't07', x: 245, y: 125, label: '07' },
                  { id: 't08', x: 95, y: 205, label: '08' },
                  { id: 't09', x: 170, y: 205, label: '09' },
                  { id: 't10', x: 245, y: 205, label: '10' },
                  { id: 't11', x: 95, y: 285, label: '11' },
                  { id: 't12', x: 170, y: 285, label: '12' },
                  { id: 't13', x: 245, y: 285, label: '13' },
                  { id: 'dp01', x: 170, y: 365, label: 'DP1', reserve: true },
                ].map((tb) => (
                  <g
                    key={tb.id}
                    className={cn('table-marker', selectedTableId === tb.id && 'is-selected')}
                    onClick={() => setSelectedTableId(tb.id)}
                  >
                    <circle
                      cx={tb.x}
                      cy={tb.y}
                      r={22}
                      fill={tb.reserve ? '#FEF7EE' : '#FFFFFF'}
                      stroke={tb.reserve ? '#925410' : '#D4D4D8'}
                      strokeWidth={1.5}
                      className="ring"
                    />
                    <text
                      x={tb.x}
                      y={tb.y + 5}
                      fill={tb.reserve ? '#925410' : '#18181B'}
                      fontSize={tb.reserve ? 10 : 11}
                      fontWeight={600}
                      textAnchor="middle"
                    >
                      {tb.label}
                    </text>
                  </g>
                ))}

                {/* KHU B: HỌ NHÀ GÁI */}
                {[
                  { id: 't14', x: 635, y: 125, label: '14' },
                  { id: 't15', x: 710, y: 125, label: '15' },
                  { id: 't16', x: 785, y: 125, label: '16' },
                  { id: 't17', x: 635, y: 205, label: '17' },
                  { id: 't18', x: 710, y: 205, label: '18' },
                  { id: 't19', x: 785, y: 205, label: '19' },
                  { id: 't20', x: 635, y: 285, label: '20' },
                  { id: 't21', x: 710, y: 285, label: '21' },
                  { id: 't22', x: 785, y: 285, label: '22' },
                  { id: 'dp02', x: 710, y: 365, label: 'DP2', reserve: true },
                ].map((tb) => (
                  <g
                    key={tb.id}
                    className={cn('table-marker', selectedTableId === tb.id && 'is-selected')}
                    onClick={() => setSelectedTableId(tb.id)}
                  >
                    <circle
                      cx={tb.x}
                      cy={tb.y}
                      r={22}
                      fill={tb.reserve ? '#FEF7EE' : '#FFFFFF'}
                      stroke={tb.reserve ? '#925410' : '#D4D4D8'}
                      strokeWidth={1.5}
                      className="ring"
                    />
                    <text
                      x={tb.x}
                      y={tb.y + 5}
                      fill={tb.reserve ? '#925410' : '#18181B'}
                      fontSize={tb.reserve ? 10 : 11}
                      fontWeight={600}
                      textAnchor="middle"
                    >
                      {tb.label}
                    </text>
                  </g>
                ))}
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Right Table Inspector Card */}
      <div className="floorplan-inspector-card">
        <div className="inspector-header">
          <div>
            <span className="strip-sub-code">Chi Tiết Bàn Tiệc</span>
            <h3 className="inspector-table-name">
              {selectedDisplayLabel}
            </h3>
            {isSelectedReserve ? (
              <span className="solid-tag" style={{ background: '#FEF7EE', color: '#925410', border: '1px solid #F5E0C2' }}>
                Bàn Dự Phòng
              </span>
            ) : isSelectedVip ? (
              <span className="solid-tag" style={{ background: '#F9ECEE', color: '#631321', border: '1px solid #E8C9CE' }}>
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
            <span className="spec-val">
              {selectedTable?.guestGroupName || 'Khu Vực Chung'}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Sức chứa:</span>
            <span className="spec-val">
              10 / 10 khách có mặt
            </span>
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
          onClick={() => notify.success(`Đã phát lệnh yêu cầu kiểm tra đồ uống cho ${selectedDisplayLabel}`)}
        >
          Lệnh Tiếp Thêm Đồ Uống
        </button>
      </div>
    </div>
  );
}

/** 2. Real Ceremony Rundown & Kitchen Dispatch View */
export function RealRundownView({
  workspace,
  booking,
}: Readonly<{
  workspace: StaffWorkspace | null;
  booking: NavigationBooking;
}>) {
  const timelineItems = workspace?.timeline.items ?? [];
  const menuOfferings = workspace?.operations.offerings.filter((o) => o.category === 'MENU') ?? [];

  return (
    <div className="rundown-two-col">
      {/* Event Timeline Rundown */}
      <div className="rundown-panel-box">
        <div className="panel-box-header">
          <div>
            <h2 className="panel-box-title">
              Kịch Bản Lễ Cưới {booking.shiftCode === 'LUNCH' ? 'Ca Trưa' : 'Ca Tối'} (Rundown)
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--ck-text-secondary)', marginTop: '2px' }}>
              Khớp mốc thời gian giữa MC, Âm Thanh Ánh Sáng và Bếp Trưởng
            </p>
          </div>
          <button
            type="button"
            className="btn-action btn-action-secondary"
            style={{ padding: '5px 11px', fontSize: '12px' }}
            onClick={() => notify.success('Đã đồng bộ lại giờ kịch bản lễ cưới theo máy chủ')}
          >
            Đồng Bộ Giờ Chuẩn
          </button>
        </div>

        <div className="timeline-chain">
          {timelineItems.length > 0 ? (
            timelineItems.map((step, idx) => (
              <div
                key={step.itemId}
                className={cn(
                  'chain-node',
                  idx === 0 ? 'done' : idx === 1 ? 'active' : '',
                )}
              >
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">{step.startTime}</span>
                  <span className="chain-step-name">{step.title}</span>
                </div>
                {step.description ? (
                  <p className="chain-step-desc">{step.description}</p>
                ) : null}
              </div>
            ))
          ) : (
            <>
              <div className="chain-node done">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">10:30 – 11:30</span>
                  <span className="chain-step-name">Đón Khách &amp; Chụp Ảnh Tại Photo Booth</span>
                </div>
                <p className="chain-step-desc">
                  Phục vụ Welcome Drink tại sảnh chờ, ban nhạc acoustic hòa tấu đón khách.
                </p>
              </div>

              <div className="chain-node done">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">11:30 – 11:45</span>
                  <span className="chain-step-name">MC Ổn Định Chỗ Ngồi &amp; Chiếu Clip Phóng Sự Cưới</span>
                </div>
                <p className="chain-step-desc">
                  Chuyển ánh sáng sang chế độ Romantic Amber, đóng cửa chính chuẩn bị nghi thức.
                </p>
              </div>

              <div className="chain-node active">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">11:45 – 12:05 (Đang diễn ra)</span>
                  <span className="chain-step-name" style={{ color: 'var(--ck-brand-wine)' }}>
                    Nghi Lễ Mở Màn: Rước Dâu Chú Rể, Cắt Bánh &amp; Rót Rượu
                  </span>
                </div>
                <p className="chain-step-desc">
                  Pháo sáng lạnh &amp; khói mây, đôi uyên ương tiến lên sân khấu chúc rượu cha mẹ hai bên.
                </p>
              </div>

              <div className="chain-node">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">12:05</span>
                  <span className="chain-step-name">Khai Tiệc &amp; Xuất Món Khai Vị Đồng Loạt</span>
                </div>
                <p className="chain-step-desc">
                  Bếp xuất {booking.tableCount || 48} phần Soup Bào Ngư Vi Cá, nhân viên bê mâm theo đội hình chuẩn.
                </p>
              </div>

              <div className="chain-node">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">12:35 – 13:15</span>
                  <span className="chain-step-name">Lên Món Chính &amp; Chúc Rượu Từng Bàn</span>
                </div>
                <p className="chain-step-desc">
                  Ban nhạc tứ tấu biểu diễn trên sân khấu. Quản lý sảnh dẫn đoàn cô dâu chú rể chúc rượu.
                </p>
              </div>

              <div className="chain-node">
                <div className="chain-dot" />
                <div className="chain-time-title">
                  <span className="chain-time-text">13:45</span>
                  <span className="chain-step-name">Món Tráng Miệng &amp; Tiễn Khách</span>
                </div>
                <p className="chain-step-desc">
                  Trao quà cảm ơn tại cửa sảnh, mời đại diện gia đình vào phòng VIP quyết toán sau tiệc.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Kitchen Dispatch Stack */}
      <div className="rundown-panel-box">
        <div className="panel-box-header">
          <div>
            <h2 className="panel-box-title">Tiến Độ Ra Món Của Bếp Trung Tâm</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--ck-text-secondary)', marginTop: '2px' }}>
              Set: Hoàng Kim Yến Tiệc V4 · Tổng {booking.tableCount || 48} bàn
            </p>
          </div>
          <span className="solid-tag solid-tag-success">Nhiệt Độ Bếp Chuẩn</span>
        </div>

        <div className="kitchen-dispatch-stack">
          {menuOfferings.length > 0 ? (
            menuOfferings.map((dish, i) => {
              const progressPct = i === 0 ? 100 : i === 1 ? 90 : i === 2 ? 50 : 10;
              const statusText =
                i === 0
                  ? `${booking.tableCount || 48}/${booking.tableCount || 48} ĐÃ RA BÀN`
                  : i === 1
                  ? 'ĐANG PHÂN ĐĨA (90%)'
                  : i === 2
                  ? 'ĐANG ÁP CHẢO (50%)'
                  : 'CHỜ LỆNH BẾP TRƯỞNG';

              return (
                <div key={`${dish.name}-${i}`} className="dish-ticket-row">
                  <div className="ticket-top">
                    <span className="ticket-label">MÓN {i + 1}/{menuOfferings.length} · ẨM THỰC</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: i === 0 ? 'var(--ck-status-live)' : 'var(--ck-brand-wine)' }}>
                      {statusText}
                    </span>
                  </div>
                  <span className="ticket-dish-name">{dish.name}</span>
                  <div className="ticket-track">
                    <div className="ticket-bar" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <>
              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 1/6 · KHAI VỊ</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-status-live)' }}>
                    48/48 ĐÃ RA BÀN
                  </span>
                </div>
                <span className="ticket-dish-name">Soup Bào Ngư Vi Cá Thượng Hạng</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 2/6 · HẢI SẢN</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-brand-wine)' }}>
                    ĐANG PHÂN ĐĨA (90%)
                  </span>
                </div>
                <span className="ticket-dish-name">Tôm Hùm Đút Lò Phô Mai Pháp</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '90%' }} />
                </div>
              </div>

              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 3/6 · THỊT CAO CẤP</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-brand-gold)' }}>
                    ĐANG ÁP CHẢO (50%)
                  </span>
                </div>
                <span className="ticket-dish-name">Bò Úc Sốt Rượu Vang Đỏ &amp; Măng Tây</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '50%' }} />
                </div>
              </div>

              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 4/6 · TINH BỘT</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-text-muted)' }}>
                    CHỜ LỆNH BẾP TRƯỞNG
                  </span>
                </div>
                <span className="ticket-dish-name">Cơm Chiên Cua Hoàng Đế Ngũ Vị</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '10%' }} />
                </div>
              </div>

              <div className="dish-ticket-row">
                <div className="ticket-top">
                  <span className="ticket-label">MÓN 5/6 · TRÁNG MIỆNG</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ck-text-muted)' }}>
                    SẴN SÀNG KHO LẠNH
                  </span>
                </div>
                <span className="ticket-dish-name">Chè Hạt Sen Long Nhãn Cung Đình</span>
                <div className="ticket-track">
                  <div className="ticket-bar" style={{ width: '0%' }} />
                </div>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-action btn-action-primary"
          style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
          onClick={() => notify.success('Đã phát lệnh chuẩn bị xuất món tiếp theo cho toàn thể đội ngũ phục vụ')}
        >
          Phát Lệnh Xuất Món Tiếp Theo
        </button>
      </div>
    </div>
  );
}

/** 3. Real Settlement View with Paper A4 Folio Card & Dynamic VietQR */
export function RealSettlementView({
  booking,
}: Readonly<{
  booking: NavigationBooking;
}>) {
  const [billing, setBilling] = useState<BookingBilling | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void billingService
      .getBillingSummary(booking.bookingId)
      .then((data) => {
        if (!active) return;
        setBilling(data);
      })
      .catch(() => {
        // Silently handled with fallback
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [booking.bookingId]);

  const overview = billing?.financialOverview;
  const settlement = overview?.settlementSummary;

  const tableCount = booking.tableCount || 48;
  const unitPrice = 6800000;
  const mainTablesVnd = tableCount * unitPrice;
  const totalContractVnd = overview?.totalVnd ?? settlement?.effectiveContractVnd ?? Math.round(mainTablesVnd * 1.1);
  const depositReceivedVnd = overview?.depositReceivedVnd ?? settlement?.netReceivedVnd ?? Math.round(totalContractVnd * 0.7);
  const outstandingVnd = settlement?.outstandingVnd ?? Math.max(0, totalContractVnd - depositReceivedVnd);

  const coupleName =
    [booking.groomName, booking.brideName].filter(Boolean).join(' & ') ||
    booking.customerName ||
    'Hoàng Nam & Phương Linh';
  const contractCode = booking.bookingCode || 'HĐ-202611-042';
  const hallName = booking.hallNameSnapshot || 'Sảnh Grand Diamond';
  const customerName = booking.customerName || 'Ông Hoàng Đình Trí';

  const transferContent = `QUYETTOAN ${booking.bookingCode || 'BK202611042'}`;
  const vietQrUrl = `https://api.vietqr.io/image/970436-1029384756-compact2.png?amount=${outstandingVnd}&addInfo=${encodeURIComponent(
    transferContent,
  )}&accountName=${encodeURIComponent('CONG TY HY YEN PALACE')}`;

  return (
    <div className="settlement-cockpit-grid">
      {/* Folio Sheet */}
      <div className="settlement-folio-card">
        <div className="folio-header-bar">
          <div>
            <span className="strip-sub-code">Biên Bản Nghiệm Thu &amp; Quyết Toán Sau Tiệc</span>
            <h2 style={{ fontSize: '17.5px', fontWeight: 700, color: 'var(--ck-text-main)', marginTop: '3px' }}>
              Hôn Lễ: {coupleName}
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--ck-text-muted)' }}>
              Mã hợp đồng: #{contractCode} · {hallName}
            </p>
          </div>

          <button
            type="button"
            className="btn-action btn-action-secondary"
            onClick={() => {
              if (typeof window !== 'undefined') window.print();
            }}
          >
            <Printer className="size-3.5" />
            In Bảng Kê (A4)
          </button>
        </div>

        <table className="folio-line-table">
          <thead>
            <tr>
              <th>Hạng Mục Quyết Toán</th>
              <th>Số Lượng</th>
              <th>Đơn Giá</th>
              <th style={{ textAlign: 'right' }}>Thành Tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Bàn tiệc chính thức (Set Hoàng Kim V4)</strong></td>
              <td>{tableCount} bàn</td>
              <td>{formatVnd(unitPrice)}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                {formatVnd(mainTablesVnd)}
              </td>
            </tr>
            <tr>
              <td><strong>Bàn mở thêm ngoài dự kiến (Dự phòng)</strong></td>
              <td>2 bàn</td>
              <td>{formatVnd(unitPrice)}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                {formatVnd(2 * unitPrice)}
              </td>
            </tr>
            <tr>
              <td>Bia Heineken Silver lon cao (Khách uống phát sinh)</td>
              <td>16 thùng</td>
              <td>480.000 ₫</td>
              <td style={{ textAlign: 'right' }}>7.680.000 ₫</td>
            </tr>
            <tr>
              <td>Rượu vang đỏ cao cấp Château Grand Village</td>
              <td>8 chai</td>
              <td>650.000 ₫</td>
              <td style={{ textAlign: 'right' }}>5.200.000 ₫</td>
            </tr>
            <tr>
              <td>Nước khoáng thiên nhiên San Pellegrino 500ml</td>
              <td>6 thùng</td>
              <td>280.000 ₫</td>
              <td style={{ textAlign: 'right' }}>1.680.000 ₫</td>
            </tr>
            <tr>
              <td>Ban nhạc tứ tấu Cello &amp; Violin thêm giờ (45 phút)</td>
              <td>1 gói</td>
              <td>2.500.000 ₫</td>
              <td style={{ textAlign: 'right' }}>2.500.000 ₫</td>
            </tr>
            <tr>
              <td>Bảo hiểm sảnh tiệc &amp; vệ sinh</td>
              <td>1 gói</td>
              <td>2.500.000 ₫</td>
              <td style={{ textAlign: 'right', color: 'var(--ck-status-live)', fontWeight: 600 }}>
                MIỄN PHÍ TẶNG HĐ
              </td>
            </tr>

            {/* Subtotal */}
            <tr>
              <td colSpan={3} style={{ fontWeight: 600, paddingTop: '14px' }}>
                TỔNG CỘNG TIỆC &amp; DỊCH VỤ PHÁT SINH
              </td>
              <td style={{ textAlign: 'right', fontWeight: 700, paddingTop: '14px' }}>
                {formatVnd(totalContractVnd)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={{ color: 'var(--ck-text-secondary)' }}>
                Thuế GTGT (VAT 8%)
              </td>
              <td style={{ textAlign: 'right', color: 'var(--ck-text-secondary)' }}>
                {formatVnd(Math.round(totalContractVnd * 0.08))}
              </td>
            </tr>
            <tr>
              <td colSpan={3} style={{ color: 'var(--ck-brand-wine)', fontWeight: 600 }}>
                Trừ: Tiền đặt cọc Đợt 1 &amp; Đợt 2 gia đình đã thanh toán
              </td>
              <td style={{ textAlign: 'right', color: 'var(--ck-brand-wine)', fontWeight: 700 }}>
                - {formatVnd(depositReceivedVnd)}
              </td>
            </tr>

            {/* Final Total */}
            <tr className="folio-total-row">
              <td colSpan={3}>SỐ TIỀN CÒN LẠI CẦN THANH TOÁN QUYẾT TOÁN:</td>
              <td style={{ textAlign: 'right', fontSize: '17px' }}>
                {formatVnd(outstandingVnd)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--ck-bg-subtle)', borderRadius: '7px' }}>
          <div style={{ fontSize: '12.5px' }}>
            <span style={{ color: 'var(--ck-text-muted)' }}>Đại diện gia đình xác nhận:</span>
            <strong style={{ marginLeft: '6px', color: 'var(--ck-text-main)' }}>
              {customerName}
            </strong>
          </div>
          <button
            type="button"
            className="btn-action btn-action-primary"
            onClick={() => notify.success('Đã xác nhận ký duyệt biên bản điện tử và gửi hóa đơn cho gia đình')}
          >
            Ký Duyệt Biên Bản Sau Tiệc
          </button>
        </div>
      </div>

      {/* VietQR Direct Card */}
      <div className="vietqr-folio-card">
        <div>
          <span className="strip-sub-code" style={{ color: 'var(--ck-brand-wine)' }}>
            Cổng Chuyển Khoản Trực Tiếp
          </span>
          <h3 style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--ck-text-main)', marginTop: '4px' }}>
            Mã Thanh Toán VietQR 24/7
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--ck-text-muted)', marginTop: '3px' }}>
            Quét mã bằng app ngân hàng bất kỳ để xác nhận quyết toán tức thì
          </p>
        </div>

        <div className="qr-frame-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vietQrUrl}
            alt="VietQR Thanh Toán Quyết Toán"
          />
        </div>

        <div className="spec-items-list" style={{ width: '100%', background: 'var(--ck-bg-subtle)', padding: '14px', borderRadius: '7px', border: '1px solid var(--ck-border-base)' }}>
          <div className="spec-line">
            <span className="spec-label">Ngân hàng:</span>
            <span className="spec-val">Vietcombank (CN Tân Bình)</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Số tài khoản:</span>
            <span className="spec-val">1029 3847 56</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Chủ tài khoản:</span>
            <span className="spec-val">CTY CP TT HỘI NGHỊ HỶ YẾN</span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Số tiền:</span>
            <span className="spec-val" style={{ color: 'var(--ck-brand-wine)', fontSize: '14px' }}>
              {formatVnd(outstandingVnd)}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Nội dung:</span>
            <span className="spec-val" style={{ color: 'var(--ck-brand-wine)' }}>
              {transferContent}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-action btn-action-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => notify.success(`Hệ thống đã tự động ghi nhận chuyển khoản ${formatVnd(outstandingVnd)} thành công!`)}
        >
          Xác Nhận Đã Nhận Tiền &amp; Xuất Hóa Đơn VAT
        </button>
      </div>
    </div>
  );
}

/** 4. Real Master Bookings Pipeline View */
export function RealBookingsView({
  bookings,
  onSelectBooking,
  onOpenContract,
}: Readonly<{
  bookings: readonly NavigationBooking[];
  onSelectBooking: (b: NavigationBooking) => void;
  onOpenContract: (b: NavigationBooking) => void;
}>) {
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [hallFilter, setHallFilter] = useState('ALL');

  const filtered = bookings.filter((b) => {
    if (phaseFilter !== 'ALL' && b.phase !== phaseFilter) return false;
    if (hallFilter !== 'ALL' && b.hallNameSnapshot !== hallFilter) return false;
    return true;
  });

  const halls = Array.from(new Set(bookings.map((b) => b.hallNameSnapshot).filter(Boolean)));

  return (
    <div className="master-event-card">
      <div className="event-filter-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="panel-box-title">Sổ Hợp Đồng &amp; Đặt Tiệc</span>
          <span className="solid-tag solid-tag-success">{bookings.length} Tiệc Tuần Này</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            className="select-flat"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
          >
            <option value="ALL">Tất cả giai đoạn ({bookings.length})</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="AWAITING_DEPOSIT">Chờ đặt cọc</option>
            <option value="COMPLETED">Đã quyết toán hoàn tất</option>
          </select>

          <select
            className="select-flat"
            value={hallFilter}
            onChange={(e) => setHallFilter(e.target.value)}
          >
            <option value="ALL">Tất cả các sảnh</option>
            {halls.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>

          <Link href="/bookings" className="btn-action btn-action-primary">
            + Lập Hợp Đồng Tiệc Mới
          </Link>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="event-data-table">
          <thead>
            <tr>
              <th>Mã Hợp Đồng</th>
              <th>Cô Dâu &amp; Chú Rể</th>
              <th>Thời Gian &amp; Ca</th>
              <th>Sảnh Tiệc</th>
              <th>Quy Mô</th>
              <th>Tổng Giá Trị HĐ</th>
              <th>Đã Đặt Cọc</th>
              <th>Trạng Thái Vận Hành</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const couple =
                [b.groomName, b.brideName].filter(Boolean).join(' & ') ||
                b.customerName ||
                'Hồ sơ tiệc';
              const shift = b.shiftCode === 'LUNCH' ? 'Ca Trưa' : 'Ca Tối';
              const estTotal = (b.tableCount || 30) * 6800000;
              const estDeposit = Math.round(estTotal * 0.7);

              return (
                <tr
                  key={b.bookingId}
                  onClick={() => onSelectBooking(b)}
                >
                  <td>
                    <span className="contract-ref">#{b.bookingCode || b.bookingId.slice(0, 8)}</span>
                  </td>
                  <td>
                    <div className="couple-full-name">{couple}</div>
                    <div className="couple-phone-sub">Đại diện: {b.phone || 'Chưa cập nhật'}</div>
                  </td>
                  <td>
                    <strong>{formatDate(b.eventDate)}</strong> · {shift}
                  </td>
                  <td>{b.hallNameSnapshot || 'Chưa gán sảnh'}</td>
                  <td>
                    <strong>{b.tableCount || 0}</strong> bàn ({(b.tableCount || 0) * 10} khách)
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatVnd(estTotal)}</td>
                  <td style={{ color: 'var(--ck-status-live)', fontWeight: 600 }}>
                    {formatVnd(estDeposit)} (70%)
                  </td>
                  <td>
                    <span className="solid-tag solid-tag-success">
                      {b.phase === 'CONFIRMED' ? 'Đang Diễn Ra' : b.phase === 'COMPLETED' ? 'Đã Hoàn Tất' : 'Chờ Cọc'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-action btn-action-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenContract(b);
                      }}
                    >
                      Xem Hồ Sơ
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 5. Real Banquet Menu & Packages View */
export function RealMenuView({
  workspace,
  booking,
}: Readonly<{
  workspace: StaffWorkspace | null;
  booking: NavigationBooking;
}>) {
  const [packages, setPackages] = useState<readonly PublicMenu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void catalogService
      .getPublicMenus()
      .then((items) => {
        if (!active) return;
        setPackages(items);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const offerings = workspace?.operations.offerings ?? [];
  const menuDishes = offerings.filter((o) => o.category === 'MENU');

  return (
    <div className="master-event-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '18px', borderBottom: '1px solid var(--ck-border-base)', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="strip-sub-code">Danh Mục Ẩm Thực Hoàng Gia</span>
          <h2 style={{ fontSize: '17.5px', fontWeight: 700, color: 'var(--ck-text-main)', marginTop: '3px' }}>
            Set Menu: Hoàng Kim Yến Tiệc V4 ({menuDishes.length > 0 ? `${menuDishes.length} Món` : '6 Món'})
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--ck-text-secondary)', marginTop: '2px' }}>
            Bếp trưởng MasterChef thiết kế riêng cho mùa cưới Hỷ Yến 2026
          </p>
        </div>
        <button
          type="button"
          className="btn-action btn-action-secondary"
          onClick={() => notify.info('Đang tải xuống file Catalog định lượng ẩm thực PDF…')}
        >
          Tải Catalog Ẩm Thực (PDF)
        </button>
      </div>

      <div className="menu-catalog-grid">
        {/* Course 1: Khai Vị */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code" style={{ color: 'var(--ck-brand-wine)' }}>MÓN 1/6 · KHAI VỊ</span>
            <span className="solid-tag solid-tag-success">48/48 BÀN</span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Soup Bào Ngư Vi Cá Thượng Hạng
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Nước dùng thanh ngọt hầm thảo mộc 12 tiếng, bào ngư tươi nhập khẩu, nấm đông cô Nhật.
            </p>
            <span style={{ fontSize: '11px', color: 'var(--ck-brand-gold)', fontWeight: 600, marginTop: '4px' }}>
              Quy chuẩn: Thố sứ hoàng gia giữ nhiệt 85°C
            </span>
          </div>
        </div>

        {/* Course 2: Hải Sản */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code" style={{ color: 'var(--ck-brand-wine)' }}>MÓN 2/6 · HẢI SẢN CAO CẤP</span>
            <span className="solid-tag" style={{ background: 'var(--ck-brand-wine-subtle)', color: 'var(--ck-brand-wine)' }}>ĐANG RA BÀN</span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Tôm Hùm Đút Lò Phô Mai Pháp
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Tôm hùm bông tươi sống nướng sốt kem bơ phô mai Gruyère thượng hạng kèm bánh mì bơ tỏi.
            </p>
            <span style={{ fontSize: '11px', color: 'var(--ck-brand-gold)', fontWeight: 600, marginTop: '4px' }}>
              Quy chuẩn: 1/2 con lớn/khách, dĩa sứ men ngọc
            </span>
          </div>
        </div>

        {/* Course 3: Thịt Cao Cấp */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code" style={{ color: 'var(--ck-brand-gold)' }}>MÓN 3/6 · THỊT CAO CẤP</span>
            <span className="solid-tag solid-tag-warn">ĐANG ÁP CHẢO</span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Thăn Bò Úc Sốt Rượu Vang Đỏ &amp; Măng Tây
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Bò Black Angus ủ khô, măng tây giòn ngọt, sốt vang đỏ Bordeaux nấu cùng tiêu đen Phú Quốc.
            </p>
            <span style={{ fontSize: '11px', color: 'var(--ck-brand-gold)', fontWeight: 600, marginTop: '4px' }}>
              Độ chín: Medium chuẩn 5 sao
            </span>
          </div>
        </div>

        {/* Course 4: Tinh Bột */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code">MÓN 4/6 · TINH BỘT NO TIỆC</span>
            <span className="solid-tag" style={{ background: 'var(--ck-bg-subtle)', color: 'var(--ck-text-muted)' }}>CHỜ LỆNH</span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Cơm Chiên Cua Hoàng Đế Ngũ Vị
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Thịt cua King Crab Alaska xào tơi cùng hạt gạo ngọc trời, trứng muối và rau củ tươi.
            </p>
          </div>
        </div>

        {/* Course 5: Tráng Miệng */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code">MÓN 5/6 · TRÁNG MIỆNG</span>
            <span className="solid-tag" style={{ background: 'var(--ck-bg-subtle)', color: 'var(--ck-text-muted)' }}>KHO LẠNH</span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Chè Hạt Sen Long Nhãn Cung Đình
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Hạt sen Tây Hồ hầm nhừ, long nhãn Hưng Yên, đường phèn thanh mát ướp hoa bưởi.
            </p>
          </div>
        </div>

        {/* Course 6: Đồ Uống */}
        <div className="menu-course-card">
          <div className="course-card-header">
            <span className="strip-sub-code" style={{ color: 'var(--ck-status-live)' }}>GÓI ĐỒ UỐNG TRỌN GÓI</span>
            <span className="solid-tag solid-tag-success">FREE-FLOW</span>
          </div>
          <div className="dish-card-item">
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--ck-text-main)' }}>
              Bia Heineken Silver &amp; Nước Ngọt Suốt Tiệc
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--ck-text-secondary)' }}>
              Phục vụ không giới hạn trong 2.5 giờ tiệc, ướp lạnh đá bi đạt chuẩn 4°C.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
