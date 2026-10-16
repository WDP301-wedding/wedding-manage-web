'use client';

import { type FormEvent, useMemo, useState } from 'react';
import type { CatalogGateway, CatalogLayout, LayoutTableWrite } from './catalog-api';

export type LayoutVersion = CatalogLayout['versions'][number];

export const CANVAS_SIZE = 10_000;

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

export function TableNumber({
  label,
  max,
  min,
  onChange,
  value,
}: Readonly<{
  label: string;
  max: number;
  min: number;
  onChange: (value: string) => void;
  value: number;
}>) {
  return (
    <label>
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

export function TableEditor({
  onChange,
  onRemove,
  table,
}: Readonly<{
  onChange: (table: LayoutTableWrite) => void;
  onRemove: () => void;
  table: LayoutTableWrite;
}>) {
  const number = (key: keyof LayoutTableWrite, value: string) =>
    onChange({ ...table, [key]: Number.parseInt(value, 10) || 0 });
  return (
    <fieldset className="layout-table-editor">
      <legend>{table.label}</legend>
      <code title="Danh tính bàn ổn định">{table.tableId}</code>
      <label>
        <span>Nhãn bàn</span>
        <input
          value={table.label}
          onChange={(event) => onChange({ ...table, label: event.currentTarget.value })}
        />
      </label>
      <label>
        <span>Hình dạng</span>
        <select
          value={table.shape}
          onChange={(event) =>
            onChange({ ...table, shape: event.currentTarget.value as LayoutTableWrite['shape'] })
          }
        >
          <option value="ROUND">Tròn</option>
          <option value="RECTANGLE">Chữ nhật</option>
        </select>
      </label>
      <TableNumber
        label={`Số ghế ${table.label}`}
        value={table.seatCapacity}
        min={1}
        max={100}
        onChange={(value) => number('seatCapacity', value)}
      />
      <TableNumber
        label={`Tọa độ X ${table.label}`}
        value={table.x}
        min={0}
        max={CANVAS_SIZE}
        onChange={(value) => number('x', value)}
      />
      <TableNumber
        label={`Tọa độ Y ${table.label}`}
        value={table.y}
        min={0}
        max={CANVAS_SIZE}
        onChange={(value) => number('y', value)}
      />
      <TableNumber
        label={`Chiều rộng ${table.label}`}
        value={table.width}
        min={1}
        max={CANVAS_SIZE}
        onChange={(value) => number('width', value)}
      />
      <TableNumber
        label={`Chiều cao ${table.label}`}
        value={table.height}
        min={1}
        max={CANVAS_SIZE}
        onChange={(value) => number('height', value)}
      />
      <TableNumber
        label={`Góc xoay ${table.label}`}
        value={table.rotationDegrees}
        min={0}
        max={359}
        onChange={(value) => number('rotationDegrees', value)}
      />
      <button
        type="button"
        className="catalog-danger-button"
        onClick={onRemove}
        aria-label={`Bỏ và ngừng vĩnh viễn ${table.label}`}
      >
        Bỏ &amp; ngừng UUID
      </button>
    </fieldset>
  );
}

export function LayoutCanvas({ tables }: Readonly<{ tables: readonly LayoutTableWrite[] }>) {
  return (
    <div className="layout-canvas" role="img" aria-label="Xem trước bố trí bàn theo tỷ lệ canvas">
      {tables.map((table) => (
        <span
          key={table.tableId}
          className={`layout-canvas-table ${table.shape === 'ROUND' ? 'is-round' : ''}`}
          style={{
            left: `${(table.x / CANVAS_SIZE) * 100}%`,
            top: `${(table.y / CANVAS_SIZE) * 100}%`,
            width: `${Math.max((table.width / CANVAS_SIZE) * 100, 3)}%`,
            height: `${Math.max((table.height / CANVAS_SIZE) * 100, 3)}%`,
            transform: `rotate(${table.rotationDegrees}deg)`,
          }}
          title={`${table.label}: ${table.seatCapacity} ghế`}
        >
          {table.label}
        </span>
      ))}
    </div>
  );
}

export function LayoutDraftEditor({
  gateway,
  hallMaximum,
  layout,
  pending,
  run,
  setError,
  version,
}: Readonly<{
  gateway: CatalogGateway;
  hallMaximum: number;
  layout: CatalogLayout;
  pending: boolean;
  run: (
    successMessage: string,
    operation: (token: string) => Promise<void>,
    options?: Readonly<{ reload?: boolean }>,
  ) => Promise<boolean>;
  setError: (error: string | null) => void;
  version: LayoutVersion;
}>) {
  const [tables, setTables] = useState<LayoutTableWrite[]>(() =>
    version.tables.map((table) => ({ ...table })),
  );
  const [retirements, setRetirements] = useState<string[]>([]);
  const totalSeats = useMemo(
    () => tables.reduce((total, table) => total + table.seatCapacity, 0),
    [tables],
  );

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
    void run('Đã lưu bố trí và danh tính bàn ổn định.', async (token) => {
      await gateway.updateLayoutDraft(token, {
        versionId: version.id,
        expectedRevision: version.revision,
        name: nameVal,
        description: descVal,
        minGuests: minVal,
        maxGuests: maxVal,
        tables: normalized,
      });
      await Promise.all(
        retirements.map((tableId) =>
          gateway.retireLayoutTable(token, { templateId: layout.id, tableId }),
        ),
      );
    });
  };

  const addTable = () => {
    const tableId = crypto.randomUUID();
    void run(
      'Đã đăng ký UUID bàn mới. Hãy lưu bố trí để hoàn tất.',
      async (token) => {
        await gateway.registerLayoutTable(token, { templateId: layout.id, tableId });
        setTables((current) => [...current, defaultTable(tableId, current.length + 1)]);
      },
      { reload: false },
    );
  };

  return (
    <form
      className="catalog-draft-form layout-draft"
      aria-label={`Bản nháp ${version.name}`}
      onSubmit={submit}
    >
      <div className="layout-draft-heading">
        <div>
          <span className="catalog-version-state">Bản nháp · revision {version.revision}</span>
          <h4>Biên tập hình học bằng số</h4>
        </div>
        <div className="layout-metrics" aria-label="Ràng buộc bố trí">
          <span>Canvas 10.000 × 10.000</span>
          <span>
            {totalSeats.toLocaleString('vi-VN')} / {hallMaximum.toLocaleString('vi-VN')} ghế
          </span>
          <span>
            Khoảng khách {version.minGuests}–{version.maxGuests}
          </span>
        </div>
      </div>
      <div className="layout-meta-grid">
        <label className="catalog-field" htmlFor={`layout-name-${version.id}`}>
          <span>Tên bố trí bản nháp</span>
          <input
            id={`layout-name-${version.id}`}
            name="name"
            defaultValue={version.name}
            required
          />
        </label>
        <label className="catalog-field" htmlFor={`layout-description-${version.id}`}>
          <span>Mô tả bản nháp</span>
          <input
            id={`layout-description-${version.id}`}
            name="description"
            defaultValue={version.description}
          />
        </label>
        <label className="catalog-field">
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
        <label className="catalog-field">
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
      <LayoutCanvas tables={tables} />
      <div className="layout-table-list">
        {tables.map((table, index) => (
          <TableEditor
            key={table.tableId}
            table={table}
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
      <div className="catalog-form-actions">
        <button
          className="catalog-secondary-button"
          type="button"
          disabled={pending}
          onClick={addTable}
        >
          Thêm bàn với UUID mới
        </button>
        <button className="catalog-secondary-button" type="submit" disabled={pending}>
          Lưu bố trí nháp
        </button>
        <button
          className="catalog-primary-button"
          type="button"
          disabled={pending}
          onClick={() =>
            void run('Đã công bố mẫu bố trí.', (token) =>
              gateway.publishLayout(token, {
                versionId: version.id,
                expectedRevision: version.revision,
              }),
            )
          }
        >
          Công bố bố trí
        </button>
      </div>
    </form>
  );
}
