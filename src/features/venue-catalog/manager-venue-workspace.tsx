'use client';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

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
import { IncidentalCatalog } from './incidental-catalog';
import { OfferingCatalog } from './offering-catalog';
import { MediaPanel } from './media-panel';
import { TimelinePanel } from './timeline-panel';
import { VenueHallsSection } from './venue-halls-section';
import { notify } from '../../design-system/notifications';

import { cx } from './catalog-classes';
import {
  type Authorize,
  type CatalogTab,
  CatalogTabs,
  supportsFood,
  supportsLayout,
  supportsMedia,
  supportsTimeline,
} from './catalog-tabs';
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
      if (
        tabParam === 'food' ||
        tabParam === 'timeline' ||
        tabParam === 'layout' ||
        tabParam === 'incidentals' ||
        tabParam === 'services'
      ) {
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
        tabParam === 'food' ||
        tabParam === 'timeline' ||
        tabParam === 'layout' ||
        tabParam === 'incidentals' ||
        tabParam === 'services'
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
  const [error, setError] = useState<string | null>(null);
  const [hallFilter, setHallFilter] = useState<'ACTIVE' | 'ALL' | 'RETIRED'>('ALL');
  const [editingHall, setEditingHall] = useState<CatalogHall | null>(null);
  const [creatingHall, setCreatingHall] = useState(false);

  const load = useCallback(
    async (background = false) => {
      setLoading(true);
      setError(null);
      try {
        const next = await authorize((token) => gateway.loadVenue(token));
        if (!background || !hasDirtyCatalogForms()) setSnapshot(next);
      } catch (caught) {
        const msg = catalogErrorMessage(caught);
        setError(msg);
        notify.error(caught, { fallbackMessage: msg });
      } finally {
        setLoading(false);
      }
    },
    [authorize, gateway],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useCatalogLiveRefresh(load);

  const run = async (successMessage: string, operation: (token: string) => Promise<void>) => {
    setPending(true);
    setError(null);
    const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try {
      await authorize(operation);
      notify.success(successMessage);
      await load();
      focused?.focus();
      return true;
    } catch (caught) {
      const msg = catalogErrorMessage(caught);
      setError(msg);
      notify.error(caught, { fallbackMessage: msg });
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
        <p>{error ?? 'Máy chủ không trả về dữ liệu danh mục.'}</p>
        <button className={cx.primaryButton} type="button" onClick={() => void load()}>
          Thử lại
        </button>
      </CatalogAccessPanel>
    );
  }

  return (
    <main id="catalog-content" data-ui-v3 className={cx.main}>
      <header className={cx.header}>
        <h1 className="text-2xl font-bold">Danh mục địa điểm</h1>
        {catalogContractDigest ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            Khoá hợp đồng
            <code className="rounded-md bg-secondary px-2 py-0.5 font-mono text-foreground">
              {catalogContractDigest}
            </code>
          </p>
        ) : null}
      </header>

      <CatalogTabs active={activeTab} onChange={handleTabChange} />
      <div
        className={cx.tabPanel}
        role="tabpanel"
        id="catalog-panel-venue"
        aria-labelledby="catalog-tab-venue"
        hidden={activeTab !== 'venue'}
      >
        <section className={cx.section} id="venue" aria-labelledby="restaurant-title">
          <SectionHeading
            meta={`Phiên bản ${snapshot.restaurant.revision}`}
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

        <section className={cx.section} aria-labelledby="shift-title">
          <SectionHeading title="Khung giờ phục vụ" />
          <div className={cx.shiftGrid}>
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
          <div id="media-hall">
            <MediaPanel
              gateway={gateway}
              authorize={authorize}
              active={activeTab === 'venue'}
              allowedTypes={['HALL', 'RESTAURANT_PROFILE']}
              heading="Thư viện ảnh sảnh tiệc"
              description="Quản lý hình ảnh thực tế và phối cảnh của từng sảnh tiệc. Ảnh sẽ hiển thị cho khách hàng khi chọn sảnh."
            />
          </div>
        ) : null}
      </div>
      <div
        className={cx.tabPanel}
        role="tabpanel"
        id="catalog-panel-food"
        aria-labelledby="catalog-tab-food"
        hidden={activeTab !== 'food'}
      >
        {visitedTabs.has('food') ? (
          supportsFood(gateway) ? (
            <>
              <DishMenuPanel gateway={gateway} authorize={authorize} />
              {supportsMedia(gateway) ? (
                <MediaPanel
                  gateway={gateway}
                  authorize={authorize}
                  active={activeTab === 'food'}
                  allowedTypes={['MENU_PACKAGE_VERSION', 'DISH_VERSION']}
                  heading="Thư viện ảnh món ăn & thực đơn"
                  description="Quản lý hình ảnh của từng món ăn và ảnh bìa các gói thực đơn tiệc cưới."
                />
              ) : null}
            </>
          ) : (
            <p className={cx.empty}>Không hỗ trợ quản lý món ăn.</p>
          )
        ) : null}
      </div>
      <div
        className={cx.tabPanel}
        role="tabpanel"
        id="catalog-panel-timeline"
        aria-labelledby="catalog-tab-timeline"
        hidden={activeTab !== 'timeline'}
      >
        {visitedTabs.has('timeline') ? (
          supportsTimeline(gateway) ? (
            <TimelinePanel gateway={gateway} authorize={authorize} />
          ) : (
            <p className={cx.empty}>Không hỗ trợ quản lý kịch bản.</p>
          )
        ) : null}
      </div>
      <div
        className={cx.tabPanel}
        role="tabpanel"
        id="catalog-panel-layout"
        aria-labelledby="catalog-tab-layout"
        hidden={activeTab !== 'layout'}
      >
        {visitedTabs.has('layout') ? (
          supportsLayout(gateway) ? (
            <>
              <LayoutPanel gateway={gateway} authorize={authorize} />
              {supportsMedia(gateway) ? (
                <MediaPanel
                  gateway={gateway}
                  authorize={authorize}
                  active={activeTab === 'layout'}
                  allowedTypes={['LAYOUT_TEMPLATE_VERSION']}
                  heading="Thư viện ảnh mẫu sơ đồ bàn"
                  description="Quản lý ảnh chụp thực tế hoặc phối cảnh của các mẫu sơ đồ sắp xếp bàn tiệc."
                />
              ) : null}
            </>
          ) : (
            <p className={cx.empty}>Không hỗ trợ quản lý sơ đồ bàn.</p>
          )
        ) : null}
      </div>
      <div
        className={cx.tabPanel}
        role="tabpanel"
        id="catalog-panel-incidentals"
        aria-labelledby="catalog-tab-incidentals"
        hidden={activeTab !== 'incidentals'}
      >
        {visitedTabs.has('incidentals') ? <IncidentalCatalog authorize={authorize} /> : null}
      </div>
      <div
        className={cx.tabPanel}
        role="tabpanel"
        id="catalog-panel-services"
        aria-labelledby="catalog-tab-services"
        hidden={activeTab !== 'services'}
      >
        {visitedTabs.has('services') ? (
          <OfferingCatalog kind="services" authorize={authorize} />
        ) : null}
      </div>
    </main>
  );
}
