'use client';
import { cn } from 'cn';
import { type TableItem } from './cockpit-types';
import type { useFloorplanViewState } from '@/src/features/dashboard/hooks/use-floorplan-view-state';
export function RealFloorplanViewContent({
  model,
}: Readonly<{ model: ReturnType<typeof useFloorplanViewState> }>) {
  const {
    tables,
    selectedTableId,
    setSelectedTableId,
    groupFilter,
    searchTableQuery,
    rawMinLeft,
    rawMinTop,
    targetMinX,
    targetMinY,
    scaleX,
    scaleY,
    selectedTable,
    hallTitle,
  } = model;
  return (
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
        <text x={440} y={66} fill="#E8C9CE" fontSize={11} fontWeight={500} textAnchor="middle">
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
        <text x={440} y={447} fill="#631321" fontSize={11} fontWeight={600} textAnchor="middle">
          CỬA ĐÓN KHÁCH CHÍNH
        </text>

        {/* Real Tables or Default Architectural Layout */}
        {tables.length > 0 ? (
          tables.map((t: TableItem) => {
            const isSelected =
              t.layoutTableId === (selectedTable?.layoutTableId ?? selectedTableId);
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
                !(t.guestGroupName || '')
                  .toLowerCase()
                  .includes(searchTableQuery.toLowerCase().trim()));

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
            <g
              className={cn('table-marker', selectedTableId === 'vip1' && 'is-selected')}
              onClick={() => setSelectedTableId('vip1')}
            >
              <circle
                cx="330"
                cy="125"
                r="26"
                fill="#F9ECEE"
                stroke="#631321"
                strokeWidth={2}
                className="ring"
              />
              <text
                x="330"
                y="130"
                fill="#631321"
                fontSize={11}
                fontWeight={700}
                textAnchor="middle"
              >
                VIP 1
              </text>
              <text
                x="330"
                y="162"
                fill="#52525B"
                fontSize={10}
                fontWeight={600}
                textAnchor="middle"
              >
                Nhà Trai
              </text>
            </g>
            <g
              className={cn('table-marker', selectedTableId === 'vip2' && 'is-selected')}
              onClick={() => setSelectedTableId('vip2')}
            >
              <circle
                cx="550"
                cy="125"
                r="26"
                fill="#F9ECEE"
                stroke="#631321"
                strokeWidth={2}
                className="ring"
              />
              <text
                x="550"
                y="130"
                fill="#631321"
                fontSize={11}
                fontWeight={700}
                textAnchor="middle"
              >
                VIP 2
              </text>
              <text
                x="550"
                y="162"
                fill="#52525B"
                fontSize={10}
                fontWeight={600}
                textAnchor="middle"
              >
                Nhà Gái
              </text>
            </g>
            <g
              className={cn('table-marker', selectedTableId === 'vip3' && 'is-selected')}
              onClick={() => setSelectedTableId('vip3')}
            >
              <circle
                cx="330"
                cy="205"
                r="24"
                fill="#FAF2DF"
                stroke="#8C6822"
                strokeWidth={1.5}
                className="ring"
              />
              <text
                x="330"
                y="210"
                fill="#8C6822"
                fontSize={10}
                fontWeight={700}
                textAnchor="middle"
              >
                VIP 3
              </text>
              <text
                x="330"
                y="240"
                fill="#71717A"
                fontSize={10}
                fontWeight={500}
                textAnchor="middle"
              >
                Đối tác
              </text>
            </g>
            <g
              className={cn('table-marker', selectedTableId === 'vip4' && 'is-selected')}
              onClick={() => setSelectedTableId('vip4')}
            >
              <circle
                cx="550"
                cy="205"
                r="24"
                fill="#FAF2DF"
                stroke="#8C6822"
                strokeWidth={1.5}
                className="ring"
              />
              <text
                x="550"
                y="210"
                fill="#8C6822"
                fontSize={10}
                fontWeight={700}
                textAnchor="middle"
              >
                VIP 4
              </text>
              <text
                x="550"
                y="240"
                fill="#71717A"
                fontSize={10}
                fontWeight={500}
                textAnchor="middle"
              >
                Đối tác
              </text>
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
  );
}
