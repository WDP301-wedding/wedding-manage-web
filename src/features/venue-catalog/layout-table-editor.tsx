'use client';

import type { LayoutTableWrite } from './catalog-api';

export const CANVAS_SIZE = 10_000;

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
        label={`Góc xoay độ ${table.label}`}
        value={table.rotationDegrees}
        min={0}
        max={359}
        onChange={(value) => number('rotationDegrees', value)}
      />
      <button
        className="catalog-secondary-button"
        type="button"
        onClick={onRemove}
        aria-label={`Bỏ và ngừng vĩnh viễn ${table.label}`}
      >
        Bỏ bàn
      </button>
    </fieldset>
  );
}
