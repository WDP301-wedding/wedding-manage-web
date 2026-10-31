'use client';

import { cn } from 'cn';
import { Button } from '../../components/ui/button';
import type { BookingSelections } from './booking-api';

export interface BookingCreateCatalogBarProps {
  loadingSelections: boolean;
  selections: BookingSelections | null;
  disabled: boolean;
  onLoadCatalog: () => void;
}

export function BookingCreateCatalogBar({
  loadingSelections,
  selections,
  disabled,
  onLoadCatalog,
}: Readonly<BookingCreateCatalogBarProps>) {
  const incomplete =
    selections !== null &&
    (selections.halls.length === 0 ||
      selections.menus.length === 0 ||
      selections.shifts.length === 0);
  const tone =
    loadingSelections || selections === null
      ? 'bg-secondary'
      : incomplete
        ? 'bg-hy-warning-bg text-hy-warning'
        : 'bg-hy-success-bg text-hy-success';

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-xs',
        tone,
      )}
    >
      {loadingSelections ? (
        <p role="status">Đang tải danh mục sảnh, khung giờ và thực đơn đang phục vụ…</p>
      ) : selections === null ? (
        <p>Tải danh mục để chọn sảnh, khung giờ và thực đơn đang phục vụ.</p>
      ) : incomplete ? (
        <p role="status">
          Danh mục chưa đủ thông tin đặt tiệc. Cập nhật trong mục Danh mục rồi tải lại.
        </p>
      ) : (
        <p>
          Đã tải {selections.halls.length} sảnh tiệc, {selections.menus.length} thực đơn đang phục
          vụ.
        </p>
      )}
      <Button
        variant={selections === null ? 'default' : 'outline'}
        size="sm"
        disabled={disabled || loadingSelections}
        type="button"
        onClick={onLoadCatalog}
      >
        {loadingSelections
          ? 'Đang tải danh mục…'
          : selections === null
            ? 'Tải danh mục đặt tiệc'
            : 'Tải lại danh mục đặt tiệc'}
      </Button>
    </div>
  );
}
