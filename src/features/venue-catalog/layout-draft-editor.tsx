'use client';
import { HySelect } from '../../components/ui/select-field';

import { type FormEvent, useMemo, useRef, useState } from 'react';
import type { CatalogLayout, LayoutTableWrite, LayoutWrite } from './catalog-api';
import { CANVAS_SIZE, TableEditor, TableNumber } from './layout-table-editor';

import { cx } from './catalog-classes';
import { cn } from 'cn';
export { CANVAS_SIZE, TableEditor, TableNumber };

export type LayoutVersion = CatalogLayout['versions'][number];

export function defaultTable(tableId: string, order = 1): LayoutTableWrite {
  return {
    tableId,
    label: `Bàn ${String(order).padStart(2, '0')}`,
    shape: 'ROUND',
    seatCapacity: 10,
    x: 500 + ((order - 1) % 5) * 1500,
    y: 500 + Math.floor((order - 1) / 5) * 1500,
    width: 1000,
    height: 1000,
    rotationDegrees: 0,
    displayOrder: order,
  };
}

export function validateLayout(
  tables: readonly LayoutTableWrite[],
  hallMaximum: number,
  range: Readonly<{ minGuests: number; maxGuests: number }>,
): string | null {
  if (tables.length === 0) return 'Mỗi bố trí cần ít nhất một bàn.';
  if (
    tables.some(
      ({ x, y, width, height }) =>
        x < 0 ||
        y < 0 ||
        width < 1 ||
        height < 1 ||
        x + width > CANVAS_SIZE ||
        y + height > CANVAS_SIZE,
    )
  ) {
    return 'Một bàn vượt biên canvas 10.000 × 10.000. Hãy chỉnh tọa độ hoặc kích thước.';
  }
  const seats = tables.reduce((total, table) => total + table.seatCapacity, 0);
  if (seats > hallMaximum) return 'Tổng số ghế vượt sức chứa sảnh.';
  if (range.minGuests < 1 || range.maxGuests < range.minGuests || range.maxGuests > seats) {
    return 'Khoảng khách phải tăng dần và không vượt tổng số ghế.';
  }
  return null;
}

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

export function LayoutDraftEditor({
  hallMaximum,
  pending,
  onSave,
  onCancel,
  setError,
  version,
}: Readonly<{
  hallMaximum: number;
  pending: boolean;
  onSave: (
    input: LayoutWrite,
    retirements: readonly string[],
    publish: boolean,
  ) => Promise<boolean>;
  onCancel: () => void;
  setError: (error: string | null) => void;
  version: LayoutVersion;
}>) {
  const [tables, setTables] = useState<LayoutTableWrite[]>(() =>
    version.tables.map((table) => ({ ...table })),
  );
  const [retirements, setRetirements] = useState<string[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showBatchTools, setShowBatchTools] = useState(false);
  const [batchCount, setBatchCount] = useState(5);
  const [batchSeats, setBatchSeats] = useState(10);
  const [batchShape, setBatchShape] = useState<'ROUND' | 'RECTANGLE'>('ROUND');

  const totalSeats = useMemo(
    () => tables.reduce((total, table) => total + table.seatCapacity, 0),
    [tables],
  );

  const handleMoveTable = (id: string, x: number, y: number) => {
    setTables((current) => current.map((tbl) => (tbl.tableId === id ? { ...tbl, x, y } : tbl)));
  };

  const handleSelectTable = (id: string) => {
    setSelectedTableId(id);
    const element = document.getElementById(`table-editor-${id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const addBatchTables = () => {
    const count = Math.min(Math.max(1, batchCount), 30);
    const newItems: LayoutTableWrite[] = [];
    const startOrder = tables.length + 1;

    for (let i = 0; i < count; i++) {
      const id = crypto.randomUUID();
      const order = startOrder + i;
      newItems.push({
        tableId: id,
        label: `Bàn ${String(order).padStart(2, '0')}`,
        shape: batchShape,
        seatCapacity: batchSeats,
        x: 500 + ((order - 1) % 5) * 1800,
        y: 500 + Math.floor((order - 1) / 5) * 1800,
        width: 1000,
        height: 1000,
        rotationDegrees: 0,
        displayOrder: order,
      });
    }

    setTables((current) => [...current, ...newItems]);
    setShowBatchTools(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const normalized = tables.map((table, index) => ({ ...table, displayOrder: index + 1 }));
    const nameVal = typeof data.get('name') === 'string' ? (data.get('name') as string).trim() : '';
    const descVal =
      typeof data.get('description') === 'string' ? (data.get('description') as string).trim() : '';
    const minVal = Number.parseInt(String(data.get('minGuests') || ''), 10);
    const maxVal = Number.parseInt(String(data.get('maxGuests') || ''), 10);

    const validation = validateLayout(normalized, hallMaximum, {
      minGuests: minVal,
      maxGuests: maxVal,
    });
    if (validation !== null) {
      setError(validation);
      return;
    }
    void onSave(
      {
        name: nameVal,
        description: descVal,
        minGuests: minVal,
        maxGuests: maxVal,
        tables: normalized,
      },
      retirements,
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publish',
    );
  };

  const addTable = () => {
    const tableId = crypto.randomUUID();
    setTables((current) => [...current, defaultTable(tableId, current.length + 1)]);
  };

  return (
    <form
      className={cn(cx.draftForm, cx.layoutDraft)}
      aria-label={`Bản nháp ${version.name}`}
      onSubmit={submit}
    >
      <div className={cx.layoutDraftHeading}>
        <div>
          <span className={cx.versionState}>
            {version.state === 'DRAFT'
              ? 'Bản nháp · chưa công bố'
              : `Tạo bản nháp từ phiên bản ${version.versionNumber}`}
          </span>
          <h4>Biên tập hình học bằng số</h4>
        </div>
        <div className={cx.layoutMetrics} aria-label="Ràng buộc bố trí">
          <span>Canvas 10.000 × 10.000</span>
          <span>
            {totalSeats.toLocaleString('vi-VN')} / {hallMaximum.toLocaleString('vi-VN')} ghế
          </span>
          <span>
            Khoảng khách {version.minGuests}–{version.maxGuests}
          </span>
        </div>
      </div>
      <div className={cx.layoutMetaGrid}>
        <label className={cx.field} htmlFor={`layout-name-${version.id}`}>
          <span>Tên bố trí bản nháp</span>
          <input
            id={`layout-name-${version.id}`}
            name="name"
            defaultValue={version.name}
            required
          />
        </label>
        <label className={cx.field} htmlFor={`layout-description-${version.id}`}>
          <span>Mô tả bản nháp</span>
          <input
            id={`layout-description-${version.id}`}
            name="description"
            defaultValue={version.description}
          />
        </label>
        <label className={cx.field}>
          <span>Khách tối thiểu</span>
          <input
            name="minGuests"
            type="number"
            min={1}
            step={1}
            defaultValue={version.minGuests}
            required
          />
        </label>
        <label className={cx.field}>
          <span>Khách tối đa</span>
          <input
            name="maxGuests"
            type="number"
            min={1}
            step={1}
            defaultValue={version.maxGuests}
            required
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          💡 Kéo thả bàn trực tiếp trên sơ đồ để chỉnh vị trí nhanh (bước nhảy 100 đơn vị).
        </span>
        {selectedTableId ? (
          <span className="font-semibold text-primary">
            Đang chọn: {tables.find((t) => t.tableId === selectedTableId)?.label ?? selectedTableId}
          </span>
        ) : null}
      </div>
      <LayoutCanvas
        tables={tables}
        selectedTableId={selectedTableId}
        onSelectTable={handleSelectTable}
        onMoveTable={handleMoveTable}
      />
      <div className={cx.layoutTableList}>
        {tables.map((table, index) => (
          <TableEditor
            key={table.tableId}
            table={table}
            selected={selectedTableId === table.tableId}
            onChange={(next) =>
              setTables((current) =>
                current.map((item, itemIndex) => (itemIndex === index ? next : item)),
              )
            }
            onRemove={() => {
              if (tables.length === 1) {
                setError('Mỗi bố trí cần ít nhất một bàn.');
                return;
              }
              setRetirements((current) => [...current, table.tableId]);
              setTables((current) => current.filter(({ tableId }) => tableId !== table.tableId));
            }}
          />
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h5 className="text-sm font-semibold">Tạo nhanh dãy bàn (Batch Generator)</h5>
            <p className="text-xs text-muted-foreground">
              Tạo cùng lúc nhiều bàn và tự động xếp vị trí theo ma trận lưới
            </p>
          </div>
          <button
            type="button"
            className={cx.secondaryButton}
            onClick={() => setShowBatchTools(!showBatchTools)}
          >
            {showBatchTools ? 'Đóng công cụ' : 'Mở công cụ tạo nhanh'}
          </button>
        </div>
        {showBatchTools ? (
          <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <label className="flex flex-col gap-1 text-xs font-semibold">
              <span>Số lượng bàn</span>
              <input
                type="number"
                min={1}
                max={30}
                className="h-9 w-20 rounded-md border border-input bg-card px-2 text-xs"
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.currentTarget.value) || 1)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              <span>Số ghế mỗi bàn</span>
              <input
                type="number"
                min={1}
                max={50}
                className="h-9 w-20 rounded-md border border-input bg-card px-2 text-xs"
                value={batchSeats}
                onChange={(e) => setBatchSeats(Number(e.currentTarget.value) || 10)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              <span>Hình dạng</span>
              <HySelect
                className="h-9 rounded-md border border-input bg-card px-2 text-xs"
                value={batchShape}
                onChange={(e) => setBatchShape(e.currentTarget.value as 'ROUND' | 'RECTANGLE')}
              >
                <option value="ROUND">Bàn tròn</option>
                <option value="RECTANGLE">Bàn chữ nhật</option>
              </HySelect>
            </label>
            <button
              type="button"
              className={cx.primaryButton}
              disabled={pending}
              onClick={() => void addBatchTables()}
            >
              Tạo nhanh {batchCount} bàn
            </button>
          </div>
        ) : null}
      </div>
      <div className={cx.formActions}>
        <button className={cx.secondaryButton} type="button" disabled={pending} onClick={onCancel}>
          Hủy
        </button>
        <button className={cx.secondaryButton} type="button" disabled={pending} onClick={addTable}>
          Thêm bàn với UUID mới
        </button>
        <button className={cx.secondaryButton} type="submit" disabled={pending}>
          Lưu bố trí nháp
        </button>
        <button className={cx.primaryButton} type="submit" value="publish" disabled={pending}>
          Lưu và công bố
        </button>
      </div>
    </form>
  );
}
