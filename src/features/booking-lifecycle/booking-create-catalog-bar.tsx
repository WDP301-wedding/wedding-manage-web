'use client';

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
  return (
    <div className="booking-catalog-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {loadingSelections ? (
          <p role="status" className="booking-catalog-status">
            Đang tải danh mục sảnh, khung giờ và thực đơn đang phục vụ…
          </p>
        ) : selections === null ? (
          <p className="booking-catalog-status">
            Tải danh mục để chọn sảnh, khung giờ và thực đơn đang phục vụ.
          </p>
        ) : selections.halls.length === 0 ||
          selections.menus.length === 0 ||
          selections.shifts.length === 0 ? (
          <p role="status" className="booking-catalog-status is-warning">
            Danh mục chưa đủ thông tin đặt tiệc. Cập nhật trong mục Danh mục rồi tải lại.
          </p>
        ) : (
          <p className="booking-catalog-status is-success">
            ✓ Đã tải {selections.halls.length} sảnh tiệc, {selections.menus.length} thực đơn đang
            phục vụ.
          </p>
        )}
      </div>
      <button
        className="booking-secondary booking-catalog-btn"
        disabled={disabled || loadingSelections}
        type="button"
        onClick={onLoadCatalog}
      >
        {loadingSelections
          ? 'Đang tải danh mục…'
          : selections === null
            ? 'Tải danh mục đặt tiệc'
            : 'Tải lại danh mục đặt tiệc'}
      </button>
    </div>
  );
}
