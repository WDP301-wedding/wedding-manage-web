'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CatalogGateway,
  CatalogHall,
  VenueCatalogGateway,
  VenueCatalogSnapshot,
} from './catalog-api';
import {
  CatalogAccessPanel,
  catalogErrorMessage,
  CatalogStatus,
  HallForm,
  RestaurantForm,
  SectionHeading,
  ShiftForm,
  shiftLabel,
  Status,
} from './catalog-forms';
import { DishMenuPanel } from './dish-menu-panel';
import { LayoutPanel } from './layout-panel';
import { MediaPanel } from './media-panel';
import { TimelinePanel } from './timeline-panel';

export type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;

export const catalogTabs = [
  { id: 'venue', label: 'Nhà hàng & sảnh' },
  { id: 'food', label: 'Món & thực đơn' },
  { id: 'timeline', label: 'Kịch bản tiệc' },
  { id: 'layout', label: 'Bố cục bàn' },
] as const;
export type CatalogTab = (typeof catalogTabs)[number]['id'];

export function CatalogTabs({
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

export function supportsFood(
  gateway: VenueCatalogGateway | CatalogGateway,
): gateway is CatalogGateway {
  return 'loadFood' in gateway;
}

export function supportsTimeline(
  gateway: VenueCatalogGateway | CatalogGateway,
): gateway is CatalogGateway {
  return 'loadTimelines' in gateway;
}

export function supportsLayout(
  gateway: VenueCatalogGateway | CatalogGateway,
): gateway is CatalogGateway {
  return 'loadLayouts' in gateway;
}

export function supportsMedia(
  gateway: VenueCatalogGateway | CatalogGateway,
): gateway is CatalogGateway {
  return 'loadMediaResources' in gateway;
}

export function ManagerVenueWorkspace({
  authorize,
  catalogContractDigest,
  gateway,
}: Readonly<{
  authorize: Authorize;
  catalogContractDigest?: string;
  gateway: VenueCatalogGateway | CatalogGateway;
}>) {
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
        {catalogContractDigest ? (
          <div className="catalog-contract-mark">
            <span>Contract lock</span>
            <strong>{catalogContractDigest}</strong>
          </div>
        ) : null}
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
          <p className="catalog-empty">Không hỗ trợ quản lý món ăn.</p>
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
          <p className="catalog-empty">Không hỗ trợ quản lý kịch bản.</p>
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
          <p className="catalog-empty">Không hỗ trợ quản lý sơ đồ bàn.</p>
        )}
      </div>
    </main>
  );
}
