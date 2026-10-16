'use client';

import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import apiContractLock from '../../../api-contract.lock.json';
import { ApiClientError } from '../../lib/api/client';
import {
  createIdentityApi,
  ManagementIdentitySession,
  sharedManagementSession,
  type ManagementSessionSnapshot,
} from '../identity-access/session';
import { OperationsShell } from '../identity-access/operations-shell';
import {
  type CatalogGateway,
  createVenueCatalogGateway,
  type CatalogHall,
  type ManagerRestaurant,
  type ManagerShift,
  type VenueCatalogGateway,
  type VenueCatalogSnapshot,
} from './catalog-api';
import { DishMenuPanel } from './dish-menu-panel';
import { LayoutPanel } from './layout-panel';
import { MediaPanel } from './media-panel';
import { TimelinePanel } from './timeline-panel';

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;

const catalogTabs = [
  { id: 'venue', label: 'Nhà hàng & sảnh' },
  { id: 'food', label: 'Món & thực đơn' },
  { id: 'timeline', label: 'Kịch bản tiệc' },
  { id: 'layout', label: 'Bố cục bàn' },
] as const;
type CatalogTab = (typeof catalogTabs)[number]['id'];

function CatalogTabs({
  active,
  onChange,
}: {
  active: CatalogTab;
  onChange: (tab: CatalogTab) => void;
}) {
  return (
    <div className="catalog-tabs" role="tablist" aria-label="Danh mục vận hành">
      {catalogTabs.map((tab, index) => (
        <button
          key={tab.id}
          id={`catalog-tab-${tab.id}`}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={`catalog-panel-${tab.id}`}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === 'ArrowRight') next = (index + 1) % catalogTabs.length;
            else if (event.key === 'ArrowLeft')
              next = (index + catalogTabs.length - 1) % catalogTabs.length;
            else if (event.key === 'Home') next = 0;
            else if (event.key === 'End') next = catalogTabs.length - 1;
            else return;
            event.preventDefault();
            const selected = catalogTabs[next];
            if (selected === undefined) return;
            onChange(selected.id);
            document.getElementById(`catalog-tab-${selected.id}`)?.focus();
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const catalogSession = sharedManagementSession;
const catalogGateway = createVenueCatalogGateway();
const catalogContractDigest = apiContractLock.source.sha256.slice(0, 8);

export function VenueCatalogPage() {
  const [identity, setIdentity] = useState<ManagementSessionSnapshot | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'manager' | 'staff' | 'anonymous'>('loading');

  useEffect(() => {
    let active = true;
    void catalogSession.restore().then((snapshot) => {
      if (!active) return;
      setIdentity(snapshot);
      if (snapshot.status === 'anonymous') setState('anonymous');
      else setState(snapshot.presentation === 'manager' ? 'manager' : 'staff');
    });
    return () => {
      active = false;
    };
  }, []);

  const logout = () => {
    setLoggingOut(true);
    setLogoutError(null);
    void catalogSession
      .logout()
      .catch(() =>
        setLogoutError('Không thể kết nối máy chủ để đăng xuất. Hãy tải lại trang rồi thử lại.'),
      )
      .finally(() => {
        setIdentity(catalogSession.snapshot());
        setState('anonymous');
        setLoggingOut(false);
      });
  };
  const content =
    state === 'loading' ? (
      <CatalogStatus label="Đang xác minh quyền truy cập…" />
    ) : state === 'anonymous' ? (
      <CatalogAccessPanel title="Cần đăng nhập">
        <p>Hãy đăng nhập bằng tài khoản Quản lý để mở danh mục địa điểm.</p>
        {logoutError ? <p role="alert">{logoutError}</p> : null}
        <Link className="catalog-primary-link" href="/">
          Về trang đăng nhập
        </Link>
      </CatalogAccessPanel>
    ) : (
      <VenueCatalogWorkspace
        role={state === 'manager' ? 'MANAGER' : 'STAFF'}
        gateway={catalogGateway}
        authorize={(operation) => catalogSession.authorize(operation)}
      />
    );
  return (
    <OperationsShell
      activePage="catalog"
      contentId="catalog-content"
      snapshot={identity}
      onLogout={logout}
      pending={loggingOut}
    >
      {content}
    </OperationsShell>
  );
}

export function VenueCatalogWorkspace({
  authorize,
  gateway,
  role,
}: Readonly<{
  authorize: Authorize;
  gateway: VenueCatalogGateway;
  role: 'MANAGER' | 'STAFF';
}>) {
  if (role !== 'MANAGER') {
    return (
      <CatalogAccessPanel title="Không có quyền quản trị danh mục">
        <p role="alert">Khu vực này chỉ dành cho Quản lý được máy chủ xác thực.</p>
      </CatalogAccessPanel>
    );
  }
  return <ManagerVenueWorkspace authorize={authorize} gateway={gateway} />;
}

function ManagerVenueWorkspace({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: VenueCatalogGateway | CatalogGateway }>) {
  const [activeTab, setActiveTab] = useState<CatalogTab>(() => {
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (tabParam === 'food' || tabParam === 'timeline' || tabParam === 'layout') {
        return tabParam;
      }
    }
    return 'venue';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (
      tabParam === 'food' ||
      tabParam === 'timeline' ||
      tabParam === 'layout' ||
      tabParam === 'venue'
    ) {
      setActiveTab(tabParam);
    }
  }, []);
  const [snapshot, setSnapshot] = useState<VenueCatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hallFilter, setHallFilter] = useState<'ACTIVE' | 'ALL' | 'RETIRED'>('ALL');
  const [editingHall, setEditingHall] = useState<CatalogHall | null>(null);
  const [creatingHall, setCreatingHall] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await authorize((token) => gateway.loadVenue(token)));
    } catch (caught) {
      setError(catalogErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [authorize, gateway]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const run = async (successMessage: string, operation: (token: string) => Promise<void>) => {
    setPending(true);
    setError(null);
    setMessage(null);
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try {
      await authorize(operation);
      setMessage(successMessage);
      await load();
      focused?.focus();
      return true;
    } catch (caught) {
      setError(catalogErrorMessage(caught));
      focused?.focus();
      return false;
    } finally {
      setPending(false);
    }
  };

  if (loading && snapshot === null) return <CatalogStatus label="Đang tải danh mục địa điểm…" />;
  if (snapshot === null) {
    return (
      <CatalogAccessPanel title="Không thể tải danh mục">
        <p role="alert">{error ?? 'Máy chủ không trả về dữ liệu danh mục.'}</p>
        <button className="catalog-primary-button" type="button" onClick={() => void load()}>
          Thử lại
        </button>
      </CatalogAccessPanel>
    );
  }

  const halls = snapshot.halls.filter(
    ({ lifecycle }) => hallFilter === 'ALL' || lifecycle === hallFilter,
  );

  return (
    <main id="catalog-content" className="catalog-main">
      <header className="catalog-header">
        <div>
          <span className="preview-label">Wedding Estate · Catalog</span>
          <p className="section-kicker">Danh mục vận hành</p>
          <h1>Danh mục địa điểm</h1>
        </div>
        <div className="catalog-contract-mark">
          <span>Contract lock</span>
          <strong>{catalogContractDigest}</strong>
        </div>
      </header>

      <div className="catalog-announcements" aria-live="polite">
        {message === null ? null : (
          <p className="catalog-success" role="status">
            {message}
          </p>
        )}
        {error === null ? null : (
          <p className="catalog-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <CatalogTabs active={activeTab} onChange={setActiveTab} />
      <div
        role="tabpanel"
        id="catalog-panel-venue"
        aria-labelledby="catalog-tab-venue"
        hidden={activeTab !== 'venue'}
      >
        <section className="catalog-section" id="venue" aria-labelledby="restaurant-title">
          <SectionHeading
            eyebrow={`Revision ${snapshot.restaurant.revision}`}
            title="Hồ sơ nhà hàng"
          />
          <RestaurantForm
            restaurant={snapshot.restaurant}
            pending={pending}
            onSubmit={(input) =>
              run('Đã lưu hồ sơ nhà hàng.', (token) => gateway.updateRestaurant(token, input))
            }
          />
        </section>

        <section className="catalog-section" aria-labelledby="shift-title">
          <SectionHeading eyebrow="LUNCH · DINNER" title="Khung giờ phục vụ" />
          <div className="shift-grid">
            {snapshot.shifts.map((shift) => (
              <ShiftForm
                key={shift.code}
                shift={shift}
                pending={pending}
                onSubmit={(input) =>
                  run(`Đã cập nhật ca ${shiftLabel(shift.code)}.`, (token) =>
                    gateway.updateShift(token, input),
                  )
                }
              />
            ))}
          </div>
        </section>

        <section className="catalog-section" aria-labelledby="hall-title">
          <div className="catalog-section-toolbar">
            <SectionHeading eyebrow={`${snapshot.halls.length} bản ghi`} title="Danh sách sảnh" />
            <div className="catalog-toolbar-actions">
              <label>
                Lọc trạng thái sảnh
                <select
                  value={hallFilter}
                  onChange={(event) =>
                    setHallFilter(event.currentTarget.value as typeof hallFilter)
                  }
                >
                  <option value="ALL">Tất cả</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="RETIRED">Đã ngừng</option>
                </select>
              </label>
              <button
                className="catalog-primary-button"
                type="button"
                onClick={() => {
                  setEditingHall(null);
                  setCreatingHall(true);
                }}
              >
                Thêm sảnh
              </button>
            </div>
          </div>

          {halls.length === 0 ? (
            <p className="catalog-empty">Không có sảnh phù hợp bộ lọc hiện tại.</p>
          ) : (
            <div className="catalog-table-scroll">
              <table className="catalog-table">
                <caption className="sr-only">Danh sách sảnh theo trạng thái</caption>
                <thead>
                  <tr>
                    <th scope="col">Sảnh</th>
                    <th scope="col">Sức chứa</th>
                    <th scope="col">Thứ tự</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {halls.map((hall) => (
                    <tr key={hall.id}>
                      <td>
                        <strong>{hall.name}</strong>
                        <span>{hall.description || 'Chưa có mô tả'}</span>
                      </td>
                      <td>{hall.maxGuests.toLocaleString('vi-VN')} khách</td>
                      <td>{hall.displayOrder}</td>
                      <td>
                        <Status lifecycle={hall.lifecycle} />
                      </td>
                      <td>
                        <div className="catalog-row-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setCreatingHall(false);
                              setEditingHall(hall);
                            }}
                            aria-label={`Chỉnh sửa ${hall.name}`}
                          >
                            Chỉnh sửa
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              void run(
                                hall.lifecycle === 'ACTIVE'
                                  ? `Đã ngừng ${hall.name}.`
                                  : `Đã khôi phục ${hall.name}.`,
                                (token) =>
                                  gateway.changeHallLifecycle(token, {
                                    id: hall.id,
                                    expectedRevision: hall.revision,
                                    transition: hall.lifecycle === 'ACTIVE' ? 'RETIRE' : 'RESTORE',
                                  }),
                              )
                            }
                          >
                            {hall.lifecycle === 'ACTIVE' ? 'Ngừng hoạt động' : 'Khôi phục'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {creatingHall || editingHall !== null ? (
            <HallForm
              hall={editingHall}
              pending={pending}
              onCancel={() => {
                setCreatingHall(false);
                setEditingHall(null);
              }}
              onSubmit={async (input) => {
                const succeeded = await run(
                  editingHall === null ? 'Đã tạo sảnh mới.' : 'Đã lưu thay đổi sảnh.',
                  (token) =>
                    editingHall === null
                      ? gateway.createHall(token, { ...input, id: crypto.randomUUID() })
                      : gateway.updateHall(token, {
                          ...input,
                          id: editingHall.id,
                          expectedRevision: editingHall.revision,
                        }),
                );
                if (succeeded) {
                  setCreatingHall(false);
                  setEditingHall(null);
                }
              }}
            />
          ) : null}
        </section>
        {supportsMedia(gateway) ? <MediaPanel gateway={gateway} authorize={authorize} /> : null}
      </div>
      <div
        role="tabpanel"
        id="catalog-panel-food"
        aria-labelledby="catalog-tab-food"
        hidden={activeTab !== 'food'}
      >
        {supportsFood(gateway) ? (
          <DishMenuPanel gateway={gateway} authorize={authorize} />
        ) : (
          <p>Danh mục món và thực đơn chưa khả dụng.</p>
        )}
      </div>
      <div
        role="tabpanel"
        id="catalog-panel-timeline"
        aria-labelledby="catalog-tab-timeline"
        hidden={activeTab !== 'timeline'}
      >
        {supportsTimeline(gateway) ? (
          <TimelinePanel gateway={gateway} authorize={authorize} />
        ) : (
          <p>Danh mục kịch bản tiệc chưa khả dụng.</p>
        )}
      </div>
      <div
        role="tabpanel"
        id="catalog-panel-layout"
        aria-labelledby="catalog-tab-layout"
        hidden={activeTab !== 'layout'}
      >
        {supportsLayout(gateway) ? (
          <LayoutPanel gateway={gateway} authorize={authorize} />
        ) : (
          <p>Danh mục bố cục bàn chưa khả dụng.</p>
        )}
      </div>
    </main>
  );
}

function supportsFood(gateway: VenueCatalogGateway | CatalogGateway): gateway is CatalogGateway {
  return 'loadFood' in gateway;
}

function supportsTimeline(
  gateway: VenueCatalogGateway | CatalogGateway,
): gateway is CatalogGateway {
  return 'loadTimelines' in gateway;
}

function supportsLayout(gateway: VenueCatalogGateway | CatalogGateway): gateway is CatalogGateway {
  return 'loadLayouts' in gateway;
}

function supportsMedia(gateway: VenueCatalogGateway | CatalogGateway): gateway is CatalogGateway {
  return 'loadMediaResources' in gateway;
}

function RestaurantForm({
  onSubmit,
  pending,
  restaurant,
}: Readonly<{
  onSubmit: (input: Parameters<VenueCatalogGateway['updateRestaurant']>[1]) => Promise<boolean>;
  pending: boolean;
  restaurant: ManagerRestaurant;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSubmit({
      displayName: field(data, 'displayName'),
      description: field(data, 'description'),
      address: field(data, 'address'),
      publicPhone: nullableField(data, 'publicPhone'),
      publicEmail: nullableField(data, 'publicEmail'),
      expectedRevision: restaurant.revision,
    });
  };
  return (
    <form className="catalog-form-grid" onSubmit={submit} key={restaurant.revision}>
      <Field label="Tên hiển thị" name="displayName" defaultValue={restaurant.displayName} />
      <Field label="Địa chỉ" name="address" defaultValue={restaurant.address} />
      <Field
        label="Email công khai"
        name="publicEmail"
        type="email"
        defaultValue={restaurant.publicEmail ?? ''}
      />
      <Field
        label="Điện thoại công khai"
        name="publicPhone"
        defaultValue={restaurant.publicPhone ?? ''}
      />
      <Field
        className="catalog-field-wide"
        label="Mô tả"
        name="description"
        as="textarea"
        defaultValue={restaurant.description}
      />
      <div className="catalog-form-actions catalog-field-wide">
        <button className="catalog-primary-button" type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu hồ sơ nhà hàng'}
        </button>
      </div>
    </form>
  );
}

function ShiftForm({
  onSubmit,
  pending,
  shift,
}: Readonly<{
  onSubmit: (input: Parameters<VenueCatalogGateway['updateShift']>[1]) => Promise<boolean>;
  pending: boolean;
  shift: ManagerShift;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSubmit({
      code: shift.code,
      startTime: field(data, 'startTime'),
      endTime: field(data, 'endTime'),
      isActive: data.get('isActive') === 'on',
      expectedRevision: shift.revision,
    });
  };
  const prefix = shift.code.toLowerCase();
  return (
    <form className="shift-form" onSubmit={submit} key={shift.revision}>
      <div className="shift-form-title">
        <div>
          <span className="section-kicker">Revision {shift.revision}</span>
          <h3>{shiftLabel(shift.code)}</h3>
        </div>
        <Status lifecycle={shift.isActive ? 'ACTIVE' : 'RETIRED'} />
      </div>
      <Field
        label="Bắt đầu"
        name="startTime"
        type="time"
        defaultValue={shift.startTime}
        id={`${prefix}-start`}
      />
      <Field
        label="Kết thúc"
        name="endTime"
        type="time"
        defaultValue={shift.endTime}
        id={`${prefix}-end`}
      />
      <label className="catalog-checkbox">
        <input name="isActive" type="checkbox" defaultChecked={shift.isActive} />
        Đang nhận tiệc
      </label>
      <button className="catalog-secondary-button" type="submit" disabled={pending}>
        Lưu khung giờ
      </button>
    </form>
  );
}

function HallForm({
  hall,
  onCancel,
  onSubmit,
  pending,
}: Readonly<{
  hall: CatalogHall | null;
  onCancel: () => void;
  onSubmit: (input: Omit<Parameters<VenueCatalogGateway['createHall']>[1], 'id'>) => Promise<void>;
  pending: boolean;
}>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onSubmit({
      name: field(data, 'name'),
      description: field(data, 'description'),
      maxGuests: integerField(data, 'maxGuests'),
      displayOrder: integerField(data, 'displayOrder'),
    });
  };
  return (
    <form className="catalog-drawer" onSubmit={submit}>
      <div className="catalog-drawer-heading">
        <div>
          <span className="section-kicker">
            {hall === null ? 'Bản ghi mới' : `Revision ${hall.revision}`}
          </span>
          <h3>{hall === null ? 'Thêm sảnh' : `Chỉnh sửa ${hall.name}`}</h3>
        </div>
        <button type="button" onClick={onCancel} aria-label="Đóng biểu mẫu sảnh">
          ×
        </button>
      </div>
      <div className="catalog-form-grid">
        <Field label="Tên sảnh" name="name" defaultValue={hall?.name ?? ''} />
        <Field
          label="Sức chứa tối đa"
          name="maxGuests"
          type="number"
          min={1}
          max={10_000}
          defaultValue={hall?.maxGuests ?? 100}
        />
        <Field
          label="Thứ tự hiển thị"
          name="displayOrder"
          type="number"
          min={0}
          defaultValue={hall?.displayOrder ?? 0}
        />
        <Field
          className="catalog-field-wide"
          label="Mô tả sảnh"
          name="description"
          as="textarea"
          defaultValue={hall?.description ?? ''}
        />
      </div>
      <div className="catalog-form-actions">
        <button className="catalog-secondary-button" type="button" onClick={onCancel}>
          Hủy
        </button>
        <button className="catalog-primary-button" type="submit" disabled={pending}>
          {hall === null ? 'Tạo sảnh' : 'Lưu thay đổi sảnh'}
        </button>
      </div>
    </form>
  );
}

function Field({
  as = 'input',
  className,
  id,
  label,
  name,
  ...props
}: Readonly<
  React.InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input' | 'textarea';
    className?: string;
    label: string;
    name: string;
  }
>) {
  const fieldId = id ?? `catalog-${name}`;
  return (
    <div className={`catalog-field${className === undefined ? '' : ` ${className}`}`}>
      <label htmlFor={fieldId}>{label}</label>
      {as === 'textarea' ? (
        <textarea
          id={fieldId}
          name={name}
          required
          defaultValue={String(props.defaultValue ?? '')}
        />
      ) : (
        <input {...props} id={fieldId} name={name} required />
      )}
    </div>
  );
}

function SectionHeading({ eyebrow, title }: Readonly<{ eyebrow: string; title: string }>) {
  const id = `${title.toLocaleLowerCase('vi-VN').replaceAll(/[^a-z0-9]+/gu, '-')}-title`;
  return (
    <div className="catalog-section-heading">
      <p className="section-kicker">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
    </div>
  );
}

function Status({ lifecycle }: Readonly<{ lifecycle: 'ACTIVE' | 'RETIRED' }>) {
  return (
    <span className={`status ${lifecycle === 'ACTIVE' ? 'status-ready' : 'status-retired'}`}>
      {lifecycle === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng'}
    </span>
  );
}

function CatalogStatus({ label }: Readonly<{ label: string }>) {
  return (
    <main id="catalog-content" className="catalog-loading" role="status" aria-busy="true">
      <span className="catalog-loading-mark" aria-hidden="true">
        W
      </span>
      <p>{label}</p>
    </main>
  );
}

function CatalogAccessPanel({ children, title }: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <main id="catalog-content" className="permission-page">
      <section className="permission-panel">
        <span className="preview-label">Wedding Estate · Catalog</span>
        <h1>{title}</h1>
        {children}
      </section>
    </main>
  );
}

function field(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function nullableField(data: FormData, name: string): string | null {
  return field(data, name) || null;
}

function integerField(data: FormData, name: string): number {
  return Number.parseInt(field(data, name), 10);
}

function shiftLabel(code: ManagerShift['code']): string {
  return code === 'LUNCH' ? 'Ca trưa' : 'Ca tối';
}

function catalogErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.status === 403 || error.status === 404) {
      return 'Máy chủ từ chối thao tác. Quyền hiển thị không thay đổi quyền thực tế.';
    }
    if (error.code === 'CATALOG_HALL_CAPACITY_CONFLICT') {
      return 'Sức chứa mới thấp hơn bố cục đang được công bố. Hãy điều chỉnh bố cục trước.';
    }
    if (error.status === 409) {
      return 'Dữ liệu đã thay đổi ở phiên khác. Hãy tải lại rồi thử lại.';
    }
    if (error.status === 422 && error.details !== undefined) {
      return error.details.map(({ message }) => message).join(' ');
    }
  }
  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.';
}
