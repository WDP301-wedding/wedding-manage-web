import type { CatalogLayout, LayoutTableWrite } from '@/src/features/venue-catalog/api/catalog-api';
import { CANVAS_SIZE } from './layout-table-editor';

export type LayoutVersion = CatalogLayout['versions'][number];

export const MAX_GUESTS_PER_TABLE = 10;

export function defaultTable(tableId: string, order = 1): LayoutTableWrite {
  return {
    tableId,
    label: `Bàn ${String(order).padStart(2, '0')}`,
    shape: 'ROUND',
    seatCapacity: MAX_GUESTS_PER_TABLE,
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
  if (range.minGuests < 1 || range.maxGuests < range.minGuests) {
    return 'Khách tối đa phải lớn hơn hoặc bằng khách tối thiểu.';
  }
  return null;
}
