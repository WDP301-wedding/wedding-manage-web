'use client';

import { formatDate, money } from './booking-helpers';
import type { BookingSelections } from './booking-api';

export interface BookingCreateSummaryProps {
  currentHall: BookingSelections['halls'][number] | undefined;
  currentMenu: BookingSelections['menus'][number] | undefined;
  eventDate: string;
  shiftCode: string;
  currentTables: number;
  currentHeadcount: number;
  disabled: boolean;
  hasConsultation: boolean;
}

export function BookingCreateSummary({
  currentHall,
  currentMenu,
  eventDate,
  shiftCode,
  currentTables,
  currentHeadcount,
  disabled,
  hasConsultation,
}: Readonly<BookingCreateSummaryProps>) {
  const maxGuests = currentHall?.maxGuests ?? 0;
  const isOverCapacity = maxGuests > 0 && currentHeadcount > maxGuests;
  const capacityPercent =
    maxGuests > 0 && currentHeadcount > 0
      ? Math.min(100, Math.round((currentHeadcount / maxGuests) * 100))
      : 0;
  const estimatedTotal = currentMenu ? currentMenu.priceVndPerTable * currentTables : 0;
  const estimatedDeposit = Math.round(estimatedTotal * 0.3);

  return (
    <aside className="booking-summary-sticky">
      <div className="booking-summary-card">
        <div className="booking-summary-header">
          <div>
            <span className="booking-summary-kicker">Tóm tắt đề xuất</span>
            <h3 className="booking-summary-title">
              {currentHall?.name || 'Chưa chọn sảnh'}
            </h3>
          </div>
          <span className="booking-summary-badge">DRAFT</span>
        </div>

        <div className="booking-summary-body">
          <div className="booking-summary-meta">
            <div className="booking-meta-item">
              <span className="booking-meta-label">Ngày tổ chức</span>
              <span className="booking-meta-val">
                {eventDate ? formatDate(eventDate) : 'Chưa chọn ngày'}
              </span>
            </div>
            <div className="booking-meta-item">
              <span className="booking-meta-label">Ca tiệc</span>
              <span className="booking-meta-val">
                {shiftCode === 'LUNCH'
                  ? 'Trưa (10:00–14:00)'
                  : shiftCode === 'DINNER'
                    ? 'Tối (17:00–22:00)'
                    : 'Chưa chọn ca'}
              </span>
            </div>
          </div>

          {/* Sức chứa sảnh */}
          <div className="booking-capacity-box">
            <div className="booking-capacity-header">
              <span>Sức chứa sảnh</span>
              <span>
                {currentHall
                  ? `${currentHeadcount || 0} / ${currentHall.maxGuests} khách`
                  : '--'}
              </span>
            </div>
            <div className="booking-capacity-track">
              <div
                className={`booking-capacity-fill ${isOverCapacity ? 'is-over' : ''}`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
            {isOverCapacity ? (
              <p className="booking-capacity-alert">
                Vượt quá sức chứa tối đa của sảnh ({currentHall?.maxGuests} khách)
              </p>
            ) : currentHall && currentHeadcount > 0 ? (
              <p className="booking-capacity-ok">
                Sức chứa sảnh phù hợp ({capacityPercent}%)
              </p>
            ) : null}
          </div>

          {/* Bảng tính chi phí */}
          <div className="booking-price-breakdown">
            <div className="booking-price-row">
              <span>Thực đơn</span>
              <strong>{currentMenu?.name || 'Chưa chọn'}</strong>
            </div>
            <div className="booking-price-row">
              <span>Đơn giá</span>
              <span>{currentMenu ? `${money(currentMenu.priceVndPerTable)}/bàn` : '--'}</span>
            </div>
            <div className="booking-price-row">
              <span>Số bàn</span>
              <span>{currentTables ? `${currentTables} bàn` : '--'}</span>
            </div>
            <div className="booking-price-divider" />
            <div className="booking-price-row booking-total-row">
              <span>Tạm tính:</span>
              <strong className="booking-total-price">{money(estimatedTotal)}</strong>
            </div>
            <div className="booking-price-row booking-deposit-row">
              <span>Tiền cọc tối thiểu (30%):</span>
              <strong className="booking-deposit-price">{money(estimatedDeposit)}</strong>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="booking-summary-action">
          <button
            disabled={disabled || !hasConsultation}
            type="submit"
            className="booking-submit-btn"
            aria-label="Tạo booking"
          >
            <span>Tạo booking</span>
            <span className="booking-submit-sub" aria-hidden="true">
              &amp; Khởi tạo đề xuất giữ sảnh →
            </span>
          </button>
          <p className="booking-action-hint">
            Khung giờ sẽ được tự động bảo lưu sau khi tạo đề xuất
          </p>
        </div>
      </div>
    </aside>
  );
}
