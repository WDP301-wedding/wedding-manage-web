'use client';
import { HySelect } from '../../components/ui/select-field';

import type { LayoutTableWrite } from './catalog-api';
import { cn } from 'cn';

import { cx } from './catalog-classes';
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
  selected = false,
  table,
}: Readonly<{
  onChange: (table: LayoutTableWrite) => void;
  onRemove: () => void;
  selected?: boolean;
  table: LayoutTableWrite;
}>) {
  const number = (key: keyof LayoutTableWrite, value: string) =>
    onChange({ ...table, [key]: Number.parseInt(value, 10) || 0 });
  return (
    <fieldset
      id={`table-editor-${table.tableId}`}
      className={cn(
        cx.layoutTableEditor,
        selected && 'border-primary ring-1 ring-primary bg-accent/10',
      )}
    >
      <legend className="relative z-[1] bg-card">{table.label}</legend>
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
        <HySelect
          value={table.shape}
          onChange={(event) =>
            onChange({ ...table, shape: event.currentTarget.value as LayoutTableWrite['shape'] })
          }
        >
          <option value="ROUND">Tròn</option>
          <option value="RECTANGLE">Chữ nhật</option>
        </HySelect>
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
        className={cx.secondaryButton}
        type="button"
        onClick={onRemove}
        aria-label={`Bỏ và ngừng vĩnh viễn ${table.label}`}
      >
        Bỏ bàn
      </button>
    </fieldset>
  );
}
