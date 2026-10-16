'use client';

import { useCallback, useEffect, useState } from 'react';
import { minimumEventDate, useMinimumEventDate } from '../../lib/event-date';
import type { BookingPrefill } from './booking-helpers';
import { field, formatDateTime, money } from './booking-helpers';
import { bookingStyles } from './booking.styles';
import type { Authorize, BookingSelections, ManagementBookingGateway } from './booking-api';

export interface BookingCreatePanelProps {
  authorize: Authorize;
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  onCreated: (
    result: {
      bookingId: string;
      revision: number;
      consultationRevision: number;
    },
    consultationId: string,
  ) => void;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
  setMessage: (message: string) => void;
  onValidationError: (message: string) => void;
  autoLoadCatalog?: boolean;
  prefill?: BookingPrefill | undefined;
}

export function BookingCreatePanel({
  authorize,
  consultation,
  disabled,
  gateway,
  onCreated,
  run,
  setMessage,
  onValidationError,
  autoLoadCatalog = false,
  prefill,
}: Readonly<BookingCreatePanelProps>) {
  const [selections, setSelections] = useState<BookingSelections | null>(null);
  const [loadingSelections, setLoadingSelections] = useState(false);
  const minimumDate = useMinimumEventDate();

  const loadCatalog = useCallback(() => {
    if (loadingSelections) return;
    setLoadingSelections(true);
    void run('catalog', () => authorize((token) => gateway.loadSelections(token)))
      .then((result) => {
        if (result !== null) setSelections(result);
      })
      .finally(() => {
        setLoadingSelections(false);
      });
  }, [authorize, gateway, loadingSelections, run]);

  useEffect(() => {
    if (autoLoadCatalog && selections === null && !loadingSelections) {
      loadCatalog();
    }
  }, [autoLoadCatalog, selections, loadingSelections, loadCatalog]);

  const validate = (form: HTMLFormElement, creating: boolean) => {
    if (disabled) return false;
    if (selections === null) {
      onValidationError(
        'Hãy tải danh mục đặt tiệc để chọn sảnh, ca và thực đơn trước khi tiếp tục.',
      );
      return false;
    }
    if (
      selections.halls.length === 0 ||
      selections.shifts.length === 0 ||
      (creating && selections.menus.length === 0)
    ) {
      onValidationError(
        'Danh mục chưa đủ thông tin đặt tiệc. Cập nhật trong mục Danh mục rồi tải lại.',
      );
      return false;
    }
    const date = field(new FormData(form), 'eventDate');
    if (date !== '' && date < minimumEventDate()) {
      onValidationError(
        'Ngày tổ chức phải từ ngày mốt trở đi (theo giờ Việt Nam). Hãy chọn lại ngày.',
      );
      return false;
    }
    if (creating) return form.reportValidity();
    return ['hallId', 'eventDate', 'shiftCode'].every((name) => {
      const control = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement;
      return control.reportValidity();
    });
  };

  const input = (form: HTMLFormElement) => {
    const data = new FormData(form);
    return {
      consultationId: field(data, 'consultationId'),
      hallId: field(data, 'hallId'),
      eventDate: field(data, 'eventDate'),
      shiftCode: field(data, 'shiftCode') as 'LUNCH' | 'DINNER',
      menuPackageVersionId: field(data, 'menuPackageVersionId'),
      tableCount: Number(data.get('tableCount')),
      planningHeadcount: Number(data.get('planningHeadcount')),
      expectedRevision: Number(data.get('expectedRevision')),
    };
  };

  return (
    <article className="booking-card">
      <span className="booking-step">02</span>
      <h2>Kiểm tra &amp; tạo booking</h2>
      <button
        className="booking-secondary"
        disabled={disabled || loadingSelections}
        type="button"
        onClick={loadCatalog}
      >
        {loadingSelections
          ? 'Đang tải danh mục…'
          : selections === null
            ? 'Tải danh mục đặt tiệc'
            : 'Tải lại danh mục đặt tiệc'}
      </button>
      {loadingSelections ? (
        <p role="status">Đang tải danh mục sảnh, khung giờ và thực đơn đang phục vụ…</p>
      ) : selections === null ? (
        <p>Tải danh mục để chọn sảnh, khung giờ và thực đơn đang phục vụ.</p>
      ) : selections.halls.length === 0 ||
        selections.menus.length === 0 ||
        selections.shifts.length === 0 ? (
        <p role="status">
          Danh mục chưa đủ thông tin đặt tiệc. Cập nhật trong mục Danh mục rồi tải lại.
        </p>
      ) : (
        <p style={{ color: '#166534', fontSize: '0.875rem' }}>
          ✓ Đã tải {selections.halls.length} sảnh tiệc, {selections.menus.length} thực đơn đang phục
          vụ.
        </p>
      )}
      {prefill?.eventDate || prefill?.expectedGuests ? (
        <div style={bookingStyles.prefillBox}>
          <span>✓</span>
          <span>
            Đã điền sẵn ngày tổ chức
            {prefill.eventDate ? ` (${prefill.eventDate})` : ''}
            {prefill.expectedGuests
              ? ` và ${prefill.expectedGuests} khách (~${prefill.tableCount ?? Math.max(1, Math.ceil(prefill.expectedGuests / 10))} bàn)`
              : ''}{' '}
            từ yêu cầu tư vấn.
          </span>
        </div>
      ) : null}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!validate(event.currentTarget, true)) return;
          const value = input(event.currentTarget);
          void run('booking', () => authorize((token) => gateway.createBooking(token, value))).then(
            (result) => result && onCreated(result, value.consultationId),
          );
        }}
      >
        <label>
          Mã hồ sơ tư vấn
          <input
            key={consultation?.id ?? 'new'}
            name="consultationId"
            required
            defaultValue={consultation?.id ?? ''}
            placeholder="Tự động điền sau khi hoàn thành Bước 01"
          />
        </label>
        <small
          style={{
            color: '#5d665f',
            fontSize: '0.75rem',
            marginTop: '-0.5rem',
            marginBottom: '0.75rem',
            display: 'block',
          }}
        >
          {consultation
            ? `✓ Đã kết nối hồ sơ tư vấn (Phiên bản ${consultation.revision})`
            : 'Mã này sẽ tự động điền khi bạn bấm "Tạo hồ sơ tư vấn" ở Bước 01'}
        </small>
        <label>
          Phiên bản hồ sơ tư vấn
          <input
            key={`${consultation?.id}:${consultation?.revision}`}
            name="expectedRevision"
            type="number"
            min={1}
            required
            defaultValue={consultation?.revision ?? 1}
          />
        </label>
        <label>
          Sảnh tiệc
          <select
            name="hallId"
            required
            defaultValue=""
            onFocus={() => {
              if (selections === null) loadCatalog();
            }}
            onClick={() => {
              if (selections === null) loadCatalog();
            }}
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
            <input
              key={`eventDate-${prefill?.eventDate ?? ''}`}
              name="eventDate"
              type="date"
              min={minimumDate}
              defaultValue={prefill?.eventDate ?? ''}
              aria-labelledby="booking-date-label"
              aria-describedby="booking-date-help"
              required
            />
            <small id="booking-date-help">Chọn ngày mốt hoặc muộn hơn (theo giờ Việt Nam).</small>
          </label>
          <label>
            Ca
            <select name="shiftCode" defaultValue="DINNER" required>
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
        <label>
          Thực đơn đặt tiệc
          <select
            name="menuPackageVersionId"
            required
            defaultValue=""
            onFocus={() => {
              if (selections === null) loadCatalog();
            }}
            onClick={() => {
              if (selections === null) loadCatalog();
            }}
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
          <label>
            Số bàn
            <input
              key={`tableCount-${prefill?.tableCount ?? 20}`}
              name="tableCount"
              type="number"
              min={1}
              max={500}
              defaultValue={prefill?.tableCount ?? 20}
              required
            />
          </label>
          <label>
            Số khách dự kiến
            <input
              key={`planningHeadcount-${prefill?.expectedGuests ?? 200}`}
              name="planningHeadcount"
              type="number"
              min={0}
              max={10000}
              defaultValue={prefill?.expectedGuests ?? 200}
              required
            />
          </label>
        </div>
        <div className="booking-actions">
          <button
            className="booking-secondary"
            disabled={disabled}
            type="button"
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form === null || !validate(form, false)) return;
              const value = input(form);
              void run('availability', () =>
                authorize((token) => gateway.checkAvailability(token, value)),
              ).then((result) => {
                if (result !== null)
                  setMessage(
                    result.available
                      ? 'Khung giờ đang trống.'
                      : `Khung giờ đang được giữ${result.expiresAt === null ? '.' : ` đến ${formatDateTime(result.expiresAt)}.`}`,
                  );
              });
            }}
          >
            Kiểm tra lịch
          </button>
          <button disabled={disabled} type="submit">
            Tạo booking
          </button>
        </div>
      </form>
    </article>
  );
}
