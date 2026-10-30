'use client';

import { DatePicker } from '../../design-system/date-picker';
import { money } from './booking-helpers';
import type { BookingSelections } from './booking-api';

export interface BookingCreateFormFieldsProps {
  consultation: { id: string; revision: number } | null;
  selections: BookingSelections | null;
  loadingSelections: boolean;
  loadError: string | null;
  loadCatalog: () => void;
  matchedHall: BookingSelections['halls'][number] | undefined;
  matchedMenu: BookingSelections['menus'][number] | undefined;
  prefillEventDate?: string | undefined;
  prefillShift?: string | undefined;
  prefillTableCount?: number | undefined;
  prefillExpectedGuests?: number | undefined;
  minimumDate: string;
  disabled: boolean;
  localAvailability: { checked: boolean; available?: boolean; message?: string };
  onCheckAvailability: (form: HTMLFormElement) => void;
}

export function BookingCreateFormFields({
  consultation,
  selections,
  loadingSelections,
  loadError,
  loadCatalog,
  matchedHall,
  matchedMenu,
  prefillEventDate,
  prefillShift,
  prefillTableCount,
  prefillExpectedGuests,
  minimumDate,
  disabled,
  localAvailability,
  onCheckAvailability,
}: Readonly<BookingCreateFormFieldsProps>) {
  const triggerCatalog = () => {
    if (selections === null && !loadingSelections && loadError === null) {
      loadCatalog();
    }
  };

  return (
    <div className="booking-form-sections">
      {/* Consultation Code Box */}
      <div className="booking-section-card">
        <label htmlFor="consultation-id-input">Mã hồ sơ tư vấn</label>
        <input
          id="consultation-id-input"
          key={consultation?.id ?? 'new'}
          name="consultationId"
          readOnly
          required
          defaultValue={consultation?.id ?? ''}
          placeholder="Tự động điền sau khi hoàn thành Bước 01"
          className="booking-readonly-input"
        />
        <small
          style={{
            color: '#5d665f',
            fontSize: '0.75rem',
            marginTop: '-0.5rem',
            display: 'block',
          }}
        >
          {consultation
            ? `✓ Đã kết nối hồ sơ tư vấn (Phiên bản ${consultation.revision})`
            : 'Mã này sẽ tự động điền khi bạn bấm "Tạo hồ sơ tư vấn" ở Bước 01'}
        </small>
        <input
          key={`${consultation?.id}:${consultation?.revision}`}
          name="expectedRevision"
          type="hidden"
          value={consultation?.revision ?? 1}
        />
      </div>

      {/* Section 1: Venue & Time */}
      <div className="booking-section-card">
        <h3 className="booking-section-title">1. Địa điểm &amp; Lịch tổ chức</h3>
        <label htmlFor="hallId-select">
          Sảnh tiệc
          <select
            id="hallId-select"
            key={`hallId-${matchedHall?.id ?? 'none'}`}
            name="hallId"
            required
            defaultValue={matchedHall?.id ?? ''}
            onFocus={triggerCatalog}
            onClick={triggerCatalog}
          >
            <option value="" disabled>
              {loadingSelections ? 'Đang tải sảnh…' : 'Chọn sảnh'}
            </option>
            {selections?.halls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {hall.name} · tối đa {hall.maxGuests} khách
              </option>
            ))}
          </select>
        </label>

        <div className="booking-fields-inline">
          <label>
            <span id="booking-date-label">Ngày tổ chức</span>
            <DatePicker
              key={`eventDate-${prefillEventDate ?? ''}`}
              name="eventDate"
              min={minimumDate}
              defaultValue={prefillEventDate ?? ''}
              ariaLabelledby="booking-date-label"
              ariaDescribedby="booking-date-help"
              required
            />
            <small id="booking-date-help">
              Chọn ngày mốt hoặc muộn hơn (theo giờ Việt Nam).
            </small>
          </label>
          <label htmlFor="shiftCode-select">
            <span>Ca</span>
            <select
              id="shiftCode-select"
              key={`shiftCode-${prefillShift ?? ''}-${selections ? 'loaded' : 'loading'}`}
              name="shiftCode"
              defaultValue={prefillShift ?? ''}
              required
            >
              <option value="" disabled>
                Chọn ca
              </option>
              {selections === null ? (
                <>
                  <option value="LUNCH">Trưa</option>
                  <option value="DINNER">Tối</option>
                </>
              ) : null}
              {selections?.shifts.map((shift) => (
                <option key={shift.code} value={shift.code}>
                  {shift.code === 'LUNCH' ? 'Trưa' : 'Tối'} · {shift.startTime}–
                  {shift.endTime}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Inline Availability Action & Tag */}
        <div className="booking-availability-inline">
          <button
            className="booking-secondary booking-check-btn"
            disabled={disabled}
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form) onCheckAvailability(form);
            }}
          >
            Kiểm tra lịch
          </button>
          {localAvailability.checked ? (
            <div
              className={`booking-avail-tag ${localAvailability.available ? 'is-available' : 'is-busy'}`}
            >
              <span>
                {localAvailability.available
                  ? 'Sảnh đang trống (Sẵn sàng giữ chỗ)'
                  : 'Khung giờ này đang được bảo lưu'}
              </span>
            </div>
          ) : (
            <span className="booking-avail-hint">
              Kiểm tra tình trạng trống của sảnh trước khi tạo đề xuất
            </span>
          )}
        </div>
      </div>

      {/* Section 2: Menu & Scale */}
      <div className="booking-section-card">
        <h3 className="booking-section-title">2. Thực đơn &amp; Quy mô bàn tiệc</h3>
        <label htmlFor="menuPackageVersionId-select">
          Thực đơn đặt tiệc
          <select
            id="menuPackageVersionId-select"
            key={`menuId-${matchedMenu?.versionId ?? 'none'}`}
            name="menuPackageVersionId"
            required
            defaultValue={matchedMenu?.versionId ?? ''}
            onFocus={triggerCatalog}
            onClick={triggerCatalog}
          >
            <option value="" disabled>
              {loadingSelections ? 'Đang tải thực đơn…' : 'Chọn thực đơn'}
            </option>
            {selections?.menus.map((menu) => (
              <option key={menu.versionId} value={menu.versionId}>
                {menu.name} · bản {menu.versionNumber} · {money(menu.priceVndPerTable)}/bàn
              </option>
            ))}
          </select>
        </label>

        <div className="booking-fields-inline">
          <label htmlFor="tableCount-input">
            <span>Số bàn</span>
            <input
              id="tableCount-input"
              key={`tableCount-${prefillTableCount ?? ''}`}
              name="tableCount"
              type="number"
              min={1}
              max={500}
              defaultValue={prefillTableCount ? String(prefillTableCount) : ''}
              required
            />
          </label>
          <label htmlFor="planningHeadcount-input">
            <span>Số khách dự kiến</span>
            <input
              id="planningHeadcount-input"
              key={`planningHeadcount-${prefillExpectedGuests ?? ''}`}
              name="planningHeadcount"
              type="number"
              min={0}
              max={10000}
              defaultValue={prefillExpectedGuests ? String(prefillExpectedGuests) : ''}
              required
            />
          </label>
        </div>
      </div>
    </div>
  );
}
