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
  RestaurantForm,
  SectionHeading,
  ShiftForm,
  shiftLabel,
} from './catalog-forms';
import { DishMenuPanel } from './dish-menu-panel';
import { LayoutPanel } from './layout-panel';
import { MediaPanel } from './media-panel';
import { TimelinePanel } from './timeline-panel';
import { VenueHallsSection } from './venue-halls-section';

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

  const [visitedTabs, setVisitedTabs] = useState<Set<CatalogTab>>(() => new Set([activeTab]));

  const handleTabChange = useCallback((tab: CatalogTab) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFromUrl = () => {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      const validTab: CatalogTab =
        tabParam === 'food' || tabParam === 'timeline' || tabParam === 'layout'
          ? tabParam
          : 'venue';
      setActiveTab(validTab);
      setVisitedTabs((prev) => {
        if (prev.has(validTab)) return prev;
        const next = new Set(prev);
        next.add(validTab);
        return next;
      });
    };
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
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
          <span className="preview-label" style={{ color: 'var(--hy-wine)' }}>
            Hỷ Yến · Quản trị nhà hàng
          </span>
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

      <CatalogTabs active={activeTab} onChange={handleTabChange} />
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

        <VenueHallsSection
          halls={snapshot.halls}
          hallFilter={hallFilter}
          setHallFilter={setHallFilter}
          creatingHall={creatingHall}
          setCreatingHall={setCreatingHall}
          editingHall={editingHall}
          setEditingHall={setEditingHall}
          pending={pending}
          onToggleLifecycle={(hall) =>
            void run(
              hall.lifecycle === 'ACTIVE' ? `Đã ngừng ${hall.name}.` : `Đã khôi phục ${hall.name}.`,
              (token) =>
                gateway.changeHallLifecycle(token, {
                  id: hall.id,
                  expectedRevision: hall.revision,
                  transition: hall.lifecycle === 'ACTIVE' ? 'RETIRE' : 'RESTORE',
                }),
            )
          }
          onSaveHall={async (input) => {
            const hallData = {
              name: input.name,
              maxGuests: input.maxGuests,
              description: input.description ?? '',
              displayOrder: input.displayOrder ?? 0,
            };
            const succeeded = await run(
              editingHall === null ? 'Đã tạo sảnh mới.' : 'Đã lưu thay đổi sảnh.',
              (token) =>
                editingHall === null
                  ? gateway.createHall(token, { ...hallData, id: crypto.randomUUID() })
                  : gateway.updateHall(token, {
                      ...hallData,
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
        {supportsMedia(gateway) && visitedTabs.has('venue') ? (
          <MediaPanel gateway={gateway} authorize={authorize} active={activeTab === 'venue'} />
        ) : null}
      </div>
      <div
        role="tabpanel"
        id="catalog-panel-food"
        aria-labelledby="catalog-tab-food"
        hidden={activeTab !== 'food'}
      >
        {visitedTabs.has('food') ? (
          supportsFood(gateway) ? (
            <DishMenuPanel gateway={gateway} authorize={authorize} />
          ) : (
            <p className="catalog-empty">Không hỗ trợ quản lý món ăn.</p>
          )
        ) : null}
      </div>
      <div
        role="tabpanel"
        id="catalog-panel-timeline"
        aria-labelledby="catalog-tab-timeline"
        hidden={activeTab !== 'timeline'}
      >
        {visitedTabs.has('timeline') ? (
          supportsTimeline(gateway) ? (
            <TimelinePanel gateway={gateway} authorize={authorize} />
          ) : (
            <p className="catalog-empty">Không hỗ trợ quản lý kịch bản.</p>
          )
        ) : null}
      </div>
      <div
        role="tabpanel"
        id="catalog-panel-layout"
        aria-labelledby="catalog-tab-layout"
        hidden={activeTab !== 'layout'}
      >
        {visitedTabs.has('layout') ? (
          supportsLayout(gateway) ? (
            <LayoutPanel gateway={gateway} authorize={authorize} />
          ) : (
            <p className="catalog-empty">Không hỗ trợ quản lý sơ đồ bàn.</p>
          )
        ) : null}
      </div>
    </main>
  );
}
