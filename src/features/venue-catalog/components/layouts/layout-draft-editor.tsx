'use client';

import { Input } from '@/src/components/ui/input';
import { HySelect } from '@/src/components/ui/select-field';
import { type FormEvent, useMemo, useRef, useState } from 'react';
import type { LayoutTableWrite, LayoutWrite } from '@/src/features/venue-catalog/api/catalog-api';
import { TableEditor } from './layout-table-editor';
import { cx } from '@/src/features/venue-catalog/styles/catalog-classes';
import { cn } from 'cn';
import {
  type LayoutVersion,
  MAX_GUESTS_PER_TABLE,
  defaultTable,
  validateLayout,
} from './layout-validation';
import { LayoutCanvas } from './layout-canvas';

export { defaultTable } from './layout-validation';
export type { LayoutVersion } from './layout-validation';
export { LayoutCanvas } from './layout-canvas';
export { CANVAS_SIZE, TableEditor, TableNumber } from './layout-table-editor';
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
  const [maxGuests, setMaxGuests] = useState(String(version.maxGuests));
  const maxGuestsInput = useRef<HTMLInputElement>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showBatchTools, setShowBatchTools] = useState(false);
  const [batchCount, setBatchCount] = useState(5);
  const [batchSeats, setBatchSeats] = useState(MAX_GUESTS_PER_TABLE);
  const [batchShape, setBatchShape] = useState<'ROUND' | 'RECTANGLE'>('ROUND');

  const totalSeats = useMemo(
    () => tables.reduce((total, table) => total + table.seatCapacity, 0),
    [tables],
  );
  const guestLimit = Math.min(
    hallMaximum,
    tables.reduce(
      (total, { seatCapacity }) => total + Math.min(seatCapacity, MAX_GUESTS_PER_TABLE),
      0,
    ),
  );
  const maxGuestsError =
    Number(maxGuests) > guestLimit
      ? `Bố cục có ${tables.length} bàn, tối đa ${guestLimit.toLocaleString('vi-VN')} khách.`
      : null;
  const maxGuestsErrorId = `layout-max-guests-error-${version.id}`;

  const handleMoveTable = (id: string, x: number, y: number) => {
    setTables((current) => current.map((tbl) => (tbl.tableId === id ? { ...tbl, x, y } : tbl)));
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
    if (maxGuestsError) {
      maxGuestsInput.current?.focus();
      return;
    }
    const data = new FormData(event.currentTarget);
    const normalized = tables.map((table, index) => ({ ...table, displayOrder: index + 1 }));
    const nameVal = typeof data.get('name') === 'string' ? (data.get('name') as string).trim() : '';
    const descVal =
      typeof data.get('description') === 'string' ? (data.get('description') as string).trim() : '';
    const minVal = Number.parseInt(String(data.get('minGuests') || ''), 10);
    const maxVal = Number(maxGuests);

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
        <div className="flex flex-col gap-1">
          <label className={cx.field}>
            <span>Khách tối đa</span>
            <input
              ref={maxGuestsInput}
              name="maxGuests"
              type="number"
              min={1}
              step={1}
              value={maxGuests}
              onChange={(event) => setMaxGuests(event.currentTarget.value)}
              aria-invalid={maxGuestsError ? true : undefined}
              aria-describedby={maxGuestsError ? maxGuestsErrorId : undefined}
              required
            />
          </label>
          <div aria-live="polite">
            {maxGuestsError && (
              <p id={maxGuestsErrorId} className="text-xs text-destructive">
                {maxGuestsError}
              </p>
            )}
          </div>
        </div>
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
        onSelectTable={setSelectedTableId}
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
              <Input
                fieldSize="sm"
                type="number"
                min={1}
                max={30}
                className="w-20"
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.currentTarget.value) || 1)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              <span>Số ghế mỗi bàn</span>
              <Input
                fieldSize="sm"
                type="number"
                min={1}
                max={50}
                className="w-20"
                value={batchSeats}
                onChange={(e) =>
                  setBatchSeats(Number(e.currentTarget.value) || MAX_GUESTS_PER_TABLE)
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              <span>Hình dạng</span>
              <HySelect
                fieldSize="sm"
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
