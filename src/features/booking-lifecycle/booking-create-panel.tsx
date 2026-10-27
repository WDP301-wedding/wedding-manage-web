'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { minimumEventDate, useMinimumEventDate } from '../../lib/event-date';
import type { BookingPrefill } from './booking-helpers';
import { field, formatDateTime, money, normalizeSearch } from './booking-helpers';
import { bookingStyles } from './booking.styles';
import { DatePicker } from '../../design-system/date-picker';
import { notify } from '../../design-system/notifications';
import type { Authorize, BookingSelections, ManagementBookingGateway } from './booking-api';

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
  const [selections, setSelections] = useState<BookingSelections | null>(null);
  const [loadingSelections, setLoadingSelections] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<BookingSelections | null> | null>(null);
  const autoLoadedRef = useRef(false);
  const creatingRef = useRef(false);
  const minimumDate = useMinimumEventDate();

  const loadCatalog = useCallback((): Promise<BookingSelections | null> => {
    if (inFlightRef.current !== null) {
      return inFlightRef.current;
    }
    setLoadingSelections(true);
    setLoadError(null);
    const promise = run('catalog', () => authorize((token) => gateway.loadSelections(token)))
      .then((result) => {
        if (result !== null) {
          setSelections(result);
          setLoadError(null);
        } else {
          const msg =
            'Không thể tải danh mục đặt tiệc. Vui lòng bấm "Tải lại danh mục đặt tiệc" để thử lại.';
          setLoadError(msg);
          notify.error(msg);
        }
        return result;
      })
      .catch((err) => {
        const msg =
          'Không thể tải danh mục đặt tiệc. Vui lòng bấm "Tải lại danh mục đặt tiệc" để thử lại.';
        setLoadError(msg);
        notify.error(err, { fallbackMessage: msg });
        return null;
      })
      .finally(() => {
        inFlightRef.current = null;
        setLoadingSelections(false);
      });

    inFlightRef.current = promise;
    return promise;
  }, [authorize, gateway, run]);

  useEffect(() => {
    if (
      autoLoadCatalog &&
      selections === null &&
      !autoLoadedRef.current &&
      inFlightRef.current === null
    ) {
      autoLoadedRef.current = true;
      void loadCatalog();
    }
  }, [autoLoadCatalog, selections, loadCatalog]);

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

  const currentHall = selections?.halls.find((h) => h.id === formValues.hallId) ?? matchedHall;
  const currentMenu =
    selections?.menus.find((m) => m.versionId === formValues.menuPackageVersionId) ?? matchedMenu;
  const currentTables = Number(formValues.tableCount) || 0;
  const currentHeadcount = Number(formValues.planningHeadcount) || 0;
  const maxGuests = currentHall?.maxGuests ?? 0;
  const isOverCapacity = maxGuests > 0 && currentHeadcount > maxGuests;
  const capacityPercent =
    maxGuests > 0 && currentHeadcount > 0
      ? Math.min(100, Math.round((currentHeadcount / maxGuests) * 100))
      : 0;
  const estimatedTotal = currentMenu ? currentMenu.priceVndPerTable * currentTables : 0;
  const estimatedDeposit = Math.round(estimatedTotal * 0.3);

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

      {/* Slim Catalog Toolbar */}
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
          onClick={loadCatalog}
        >
          {loadingSelections
            ? 'Đang tải danh mục…'
            : selections === null
              ? 'Tải danh mục đặt tiệc'
              : 'Tải lại danh mục đặt tiệc'}
        </button>
      </div>

      {/* Preferences / Prefill Card */}
      {prefill?.eventDate ||
      prefill?.expectedGuests ||
      prefill?.preferredHallName ||
      prefill?.preferredMenuName ||
      prefill?.preferredShift ||
      prefill?.preferredHallId ||
      prefill?.preferredMenuVersionId ? (
        <div className="booking-prefill-card">
          <div className="booking-prefill-header">
            <span className="booking-prefill-badge">✓ Yêu cầu từ tư vấn</span>
            <span className="booking-prefill-desc">
              Thông tin khách đã gửi (chỉ tự chọn khi còn trong danh mục):
              {prefill.preferredHallName ? ` Sảnh (${prefill.preferredHallName}),` : ''}
              {prefill.preferredShift
                ? ` Ca (${prefill.preferredShift === 'LUNCH' ? 'Trưa' : 'Tối'}),`
                : ''}
              {prefill.preferredMenuName ? ` Thực đơn (${prefill.preferredMenuName}),` : ''}
              {prefill.eventDate ? ` ngày tổ chức (${prefill.eventDate})` : ''}
              {prefill.expectedGuests ? ` và ${prefill.expectedGuests} khách` : ''} từ yêu cầu tư
              vấn.
            </span>
          </div>
          <div className="booking-prefill-chips">
            {prefill.preferredHallName ? (
              <span className="booking-chip">
                Sảnh: <strong>{prefill.preferredHallName}</strong>
              </span>
            ) : null}
            {prefill.preferredShift ? (
              <span className="booking-chip">
                {prefill.preferredShift === 'LUNCH' ? 'Ca trưa' : 'Ca tối'}
              </span>
            ) : null}
            {prefill.eventDate ? (
              <span className="booking-chip">
                Ngày: <strong>{prefill.eventDate}</strong>
              </span>
            ) : null}
            {prefill.expectedGuests ? (
              <span className="booking-chip">
                Quy mô: <strong>{prefill.expectedGuests} khách</strong>
              </span>
            ) : null}
            {prefill.preferredMenuName ? (
              <span className="booking-chip">
                Thực đơn: <strong>{prefill.preferredMenuName}</strong>
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          style={{
            ...bookingStyles.statusBanner('info'),
            fontSize: '0.82rem',
            padding: '8px 12px',
            marginBottom: '1rem',
            lineHeight: 1.5,
          }}
        >
          <strong>Gợi ý nghiệp vụ:</strong> Cặp đôi chưa chọn ngày cưới dự kiến khi gửi yêu cầu tư
          vấn. Quản lý vui lòng trao đổi, thống nhất ngày cưới &amp; quy mô cùng khách hàng rồi chọn
          ngày phù hợp bên dưới để kiểm tra lịch sảnh.
        </div>
      )}

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
          {/* LEFT COLUMN: Input Configuration (60%) */}
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
                  onFocus={() => {
                    if (selections === null && !loadingSelections && loadError === null)
                      void loadCatalog();
                  }}
                  onClick={() => {
                    if (selections === null && !loadingSelections && loadError === null)
                      void loadCatalog();
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
                  <DatePicker
                    key={`eventDate-${prefill?.eventDate ?? ''}`}
                    name="eventDate"
                    min={minimumDate}
                    defaultValue={prefill?.eventDate ?? ''}
                    ariaLabelledby="booking-date-label"
                    ariaDescribedby="booking-date-help"
                    required
                  />
                  <small id="booking-date-help">
                    Chọn ngày mốt hoặc muộn hơn (theo giờ Việt Nam).
                  </small>
                </label>
                <label htmlFor="shiftCode-select">
                  Ca
                  <select
                    id="shiftCode-select"
                    key={`shiftCode-${prefill?.preferredShift ?? ''}`}
                    name="shiftCode"
                    defaultValue={prefill?.preferredShift ?? ''}
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
                    if (form === null || !validate(form, false)) return;
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
                  onFocus={() => {
                    if (selections === null && !loadingSelections && loadError === null)
                      void loadCatalog();
                  }}
                  onClick={() => {
                    if (selections === null && !loadingSelections && loadError === null)
                      void loadCatalog();
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
                <label htmlFor="tableCount-input">
                  Số bàn
                  <input
                    id="tableCount-input"
                    key={`tableCount-${prefill?.tableCount ?? ''}`}
                    name="tableCount"
                    type="number"
                    min={1}
                    max={500}
                    defaultValue={prefill?.tableCount ?? ''}
                    required
                  />
                </label>
                <label htmlFor="planningHeadcount-input">
                  Số khách dự kiến
                  <input
                    id="planningHeadcount-input"
                    key={`planningHeadcount-${prefill?.expectedGuests ?? ''}`}
                    name="planningHeadcount"
                    type="number"
                    min={0}
                    max={10000}
                    defaultValue={prefill?.expectedGuests ?? ''}
                    required
                  />
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Proposal Preview & Hold (40%) */}
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
                      {formValues.eventDate || 'Chưa chọn ngày'}
                    </span>
                  </div>
                  <div className="booking-meta-item">
                    <span className="booking-meta-label">Ca tiệc</span>
                    <span className="booking-meta-val">
                      {formValues.shiftCode === 'LUNCH'
                        ? 'Trưa (10:00–14:00)'
                        : formValues.shiftCode === 'DINNER'
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
                  disabled={disabled || consultation === null}
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
        </div>
      </form>
    </article>
  );
}
