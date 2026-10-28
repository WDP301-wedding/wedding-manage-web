'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { minimumEventDate, useMinimumEventDate } from '../../lib/event-date';
import type { BookingPrefill } from './booking-helpers';
import { field, formatDateTime, normalizeSearch } from './booking-helpers';
import { notify } from '../../design-system/notifications';
import type { Authorize, BookingSelections, ManagementBookingGateway } from './booking-api';
import { BookingCreateSummary } from './booking-create-summary';
import { BookingCreateFormFields } from './booking-create-form-fields';
import { BookingCreateCatalogBar } from './booking-create-catalog-bar';
import { BookingCreatePrefillCard } from './booking-create-prefill-card';
import { useBookingCatalog } from './use-booking-catalog';

export interface BookingCreatePanelProps {
  authorize: Authorize;
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  beforeCreate: () => Promise<{ id: string; revision: number } | null>;
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
  beforeCreate,
  run,
  setMessage,
  onValidationError,
  autoLoadCatalog = false,
  prefill,
}: Readonly<BookingCreatePanelProps>) {
  const { selections, loadingSelections, loadError, loadCatalog } = useBookingCatalog({
    authorize,
    gateway,
    run,
    autoLoadCatalog,
  });
  const creatingRef = useRef(false);
  const minimumDate = useMinimumEventDate();

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
    if (!date) {
      onValidationError('Vui lòng chọn ngày tổ chức.');
      return false;
    }
    if (date < minimumEventDate()) {
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

  const matchingHalls = selections?.halls.filter((h) => {
    if (prefill?.preferredHallId) return h.id === prefill.preferredHallId;
    if (!prefill?.preferredHallName) return false;
    const target = normalizeSearch(prefill.preferredHallName);
    const name = normalizeSearch(h.name);
    return name === target;
  });

  const matchingMenus = selections?.menus.filter((m) => {
    if (prefill?.preferredMenuVersionId) return m.versionId === prefill.preferredMenuVersionId;
    if (!prefill?.preferredMenuName) return false;
    const target = normalizeSearch(prefill.preferredMenuName);
    const name = normalizeSearch(m.name);
    return name === target;
  });

  const matchedHall = matchingHalls?.length === 1 ? matchingHalls[0] : undefined;
  const matchedMenu = matchingMenus?.length === 1 ? matchingMenus[0] : undefined;

  const [formValues, setFormValues] = useState<{
    hallId: string;
    eventDate: string;
    shiftCode: string;
    menuPackageVersionId: string;
    tableCount: string;
    planningHeadcount: string;
  }>({
    hallId: matchedHall?.id ?? '',
    eventDate: prefill?.eventDate ?? '',
    shiftCode: prefill?.preferredShift ?? '',
    menuPackageVersionId: matchedMenu?.versionId ?? '',
    tableCount: prefill?.tableCount
      ? String(prefill.tableCount)
      : prefill?.expectedGuests
        ? String(Math.ceil(prefill.expectedGuests / 10))
        : '',
    planningHeadcount: prefill?.expectedGuests ? String(prefill.expectedGuests) : '',
  });

  const [localAvailability, setLocalAvailability] = useState<{
    checked: boolean;
    available?: boolean;
    message?: string;
  }>({ checked: false });

  useEffect(() => {
    if (matchedHall && !formValues.hallId) {
      setFormValues((prev) => ({ ...prev, hallId: matchedHall.id }));
    }
  }, [matchedHall, formValues.hallId]);

  useEffect(() => {
    if (matchedMenu && !formValues.menuPackageVersionId) {
      setFormValues((prev) => ({ ...prev, menuPackageVersionId: matchedMenu.versionId }));
    }
  }, [matchedMenu, formValues.menuPackageVersionId]);

  useEffect(() => {
    if (prefill) {
      setFormValues((prev) => ({
        ...prev,
        eventDate: prev.eventDate || prefill.eventDate || '',
        shiftCode: prev.shiftCode || prefill.preferredShift || '',
        planningHeadcount:
          prev.planningHeadcount || (prefill.expectedGuests ? String(prefill.expectedGuests) : ''),
        tableCount:
          prev.tableCount ||
          (prefill.tableCount
            ? String(prefill.tableCount)
            : prefill.expectedGuests
              ? String(Math.ceil(prefill.expectedGuests / 10))
              : ''),
      }));
    }
  }, [prefill]);

  const syncFormValues = (form: HTMLFormElement) => {
    const data = new FormData(form);
    setFormValues({
      hallId: field(data, 'hallId'),
      eventDate: field(data, 'eventDate'),
      shiftCode: field(data, 'shiftCode'),
      menuPackageVersionId: field(data, 'menuPackageVersionId'),
      tableCount: field(data, 'tableCount'),
      planningHeadcount: field(data, 'planningHeadcount'),
    });
  };

  const handleCheckAvailability = (form: HTMLFormElement) => {
    if (!validate(form, false)) return;
    const value = input(form);
    void run('availability', () =>
      authorize((token) => gateway.checkAvailability(token, value)),
    ).then((result) => {
      if (result !== null) {
        const msg = result.available
          ? 'Khung giờ đang trống.'
          : `Khung giờ đang được giữ${result.expiresAt === null ? '.' : ` đến ${formatDateTime(result.expiresAt)}.`}`;
        setMessage(msg);
        setLocalAvailability({
          checked: true,
          available: result.available,
          message: msg,
        });
      }
    });
  };

  const currentHall = selections?.halls.find((h) => h.id === formValues.hallId) ?? matchedHall;
  const currentMenu =
    selections?.menus.find((m) => m.versionId === formValues.menuPackageVersionId) ?? matchedMenu;
  const currentTables = Number(formValues.tableCount) || 0;
  const currentHeadcount = Number(formValues.planningHeadcount) || 0;

  return (
    <article className="booking-card">
      <div className="booking-panel-header">
        <div>
          <span className="booking-step">02</span>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--hy-wine, #7a1f3d)' }}>
            Đề xuất &amp; Giữ sảnh
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '0.86rem',
              color: 'var(--hy-text-muted, #6e5d63)',
            }}
          >
            Khảo sát lịch khả dụng, chọn thực đơn và thiết lập đề xuất giữ chỗ 15 phút.
          </p>
        </div>
      </div>

      <BookingCreateCatalogBar
        loadingSelections={loadingSelections}
        selections={selections}
        disabled={disabled}
        onLoadCatalog={loadCatalog}
      />

      <BookingCreatePrefillCard prefill={prefill} />

      {selections &&
      ((prefill?.preferredHallId && !matchedHall) ||
        (prefill?.preferredMenuVersionId && !matchedMenu)) ? (
        <p role="status">
          Sảnh hoặc phiên bản thực đơn khách chọn không còn trong danh mục phục vụ. Hãy trao đổi với
          khách và chọn phương án thay thế; hệ thống không tự đổi lựa chọn.
        </p>
      ) : null}

      <form
        noValidate
        onChange={(e) => syncFormValues(e.currentTarget)}
        onSubmit={(event) => {
          event.preventDefault();
          if (creatingRef.current || !validate(event.currentTarget, true)) return;
          creatingRef.current = true;
          const value = input(event.currentTarget);
          void beforeCreate()
            .then(async (current) => {
              if (!current) return;
              const result = await run('booking', () =>
                authorize((token) =>
                  gateway.createBooking(token, {
                    ...value,
                    consultationId: current.id,
                    expectedRevision: current.revision,
                  }),
                ),
              );
              if (result) onCreated(result, current.id);
            })
            .finally(() => {
              creatingRef.current = false;
            });
        }}
      >
        <div className="booking-create-layout">
          <BookingCreateFormFields
            consultation={consultation}
            selections={selections}
            loadingSelections={loadingSelections}
            loadError={loadError}
            loadCatalog={loadCatalog}
            matchedHall={matchedHall}
            matchedMenu={matchedMenu}
            prefillEventDate={prefill?.eventDate}
            prefillShift={prefill?.preferredShift}
            prefillTableCount={prefill?.tableCount}
            prefillExpectedGuests={prefill?.expectedGuests}
            minimumDate={minimumDate}
            disabled={disabled}
            localAvailability={localAvailability}
            onCheckAvailability={handleCheckAvailability}
          />

          <BookingCreateSummary
            currentHall={currentHall}
            currentMenu={currentMenu}
            eventDate={formValues.eventDate}
            shiftCode={formValues.shiftCode}
            currentTables={currentTables}
            currentHeadcount={currentHeadcount}
            disabled={disabled}
            hasConsultation={consultation !== null}
          />
        </div>
      </form>
    </article>
  );
}
