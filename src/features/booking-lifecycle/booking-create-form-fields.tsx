'use client';

import { DatePicker } from '../../design-system/date-picker';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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

const fieldLabelClass = 'flex flex-col gap-1 text-xs font-semibold';
const selectClass =
  'h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm font-normal text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
const sectionClass = 'flex flex-col gap-3 border-t border-border pt-5';

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
    <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-hy-1">
      {/* Consultation Code Box (hidden visually, preserved in DOM for form submission and test automation) */}
      <div className="sr-only">
        <label htmlFor="consultation-id-input">Mã hồ sơ tư vấn</label>
        <Input
          id="consultation-id-input"
          key={consultation?.id ?? 'new'}
          name="consultationId"
          readOnly
          required
          defaultValue={consultation?.id ?? ''}
          placeholder="Tự động điền sau khi hoàn thành Bước 01"
          className="border-border bg-secondary font-mono text-xs text-muted-foreground"
        />
      </div>
      <input
        key={`${consultation?.id}:${consultation?.revision}`}
        name="expectedRevision"
        type="hidden"
        value={consultation?.revision ?? 1}
      />

      <div className={sectionClass}>
        <h3 className="text-base font-semibold">1. Địa điểm &amp; Lịch tổ chức</h3>
        <label htmlFor="hallId-select" className={fieldLabelClass}>
          Sảnh tiệc
          <select
            id="hallId-select"
            className={selectClass}
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

        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <label className={fieldLabelClass}>
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
            <small id="booking-date-help" className="text-2xs font-normal text-muted-foreground">
              Chọn ngày mốt hoặc muộn hơn (theo giờ Việt Nam).
            </small>
          </label>
          <label htmlFor="shiftCode-select" className={fieldLabelClass}>
            <span>Ca</span>
            <select
              id="shiftCode-select"
              className={selectClass}
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
                  {shift.code === 'LUNCH' ? 'Trưa' : 'Tối'} · {shift.startTime}–{shift.endTime}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={disabled}
            type="button"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              const form = event.currentTarget.form;
              if (form) onCheckAvailability(form);
            }}
          >
            Kiểm tra lịch
          </Button>
          {localAvailability.checked ? (
            <Badge
              variant={localAvailability.available ? 'success' : 'warning'}
              className="whitespace-normal"
            >
              <span>
                {localAvailability.available
                  ? 'Sảnh đang trống (Sẵn sàng giữ chỗ)'
                  : 'Khung giờ này đang được bảo lưu'}
              </span>
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              Kiểm tra tình trạng trống của sảnh trước khi tạo đề xuất
            </span>
          )}
        </div>
      </div>

      <div className={sectionClass}>
        <h3 className="text-base font-semibold">2. Thực đơn &amp; Quy mô bàn tiệc</h3>
        <label htmlFor="menuPackageVersionId-select" className={fieldLabelClass}>
          Thực đơn đặt tiệc
          <select
            id="menuPackageVersionId-select"
            className={selectClass}
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

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <label htmlFor="tableCount-input" className={fieldLabelClass}>
            <span>Số bàn</span>
            <Input
              id="tableCount-input"
              className="font-normal tabular-nums"
              key={`tableCount-${prefillTableCount ?? ''}`}
              name="tableCount"
              type="number"
              min={1}
              max={500}
              defaultValue={prefillTableCount ? String(prefillTableCount) : ''}
              required
            />
          </label>
          <label htmlFor="planningHeadcount-input" className={fieldLabelClass}>
            <span>Số khách dự kiến</span>
            <Input
              id="planningHeadcount-input"
              className="font-normal tabular-nums"
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
