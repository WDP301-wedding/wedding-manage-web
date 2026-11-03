'use client';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CatalogGateway, FoodCatalogSnapshot } from './catalog-api';
import { notify } from '../../design-system/notifications';
import { CreateDishForm, DishAggregate, DishVersionRow } from './dish-aggregate-list';
import {
  AggregateHeader,
  type Authorize,
  type DishVersion,
  EditorHeading,
  foodErrorMessage,
  formatVnd,
  integer,
  LabeledInput,
  type MenuVersion,
  move,
  optionalInteger,
  PanelMessages,
  text,
  VersionSummary,
} from './food-catalog-shared';
import {
  CreateMenuForm,
  MenuAggregate,
  MenuDraftEditor,
  MenuVersionRow,
  OrderedVersionList,
} from './menu-aggregate-list';

import { cx } from './catalog-classes';
import { cn } from 'cn';
export {
  AggregateHeader,
  CreateDishForm,
  CreateMenuForm,
  DishAggregate,
  DishVersionRow,
  EditorHeading,
  foodErrorMessage,
  formatVnd,
  integer,
  LabeledInput,
  MenuAggregate,
  MenuDraftEditor,
  MenuVersionRow,
  move,
  optionalInteger,
  OrderedVersionList,
  PanelMessages,
  text,
  VersionSummary,
  type Authorize,
  type DishVersion,
  type MenuVersion,
};

export function DishMenuPanel({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: CatalogGateway }>) {
  const [snapshot, setSnapshot] = useState<FoodCatalogSnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dishSearch, setDishSearch] = useState('');
  const [dishCategory, setDishCategory] = useState('ALL');
  const [dishLifecycle, setDishLifecycle] = useState<'ALL' | 'ACTIVE' | 'RETIRED'>('ALL');

  const [menuSearch, setMenuSearch] = useState('');
  const [menuLifecycle, setMenuLifecycle] = useState<'ALL' | 'ACTIVE' | 'RETIRED'>('ALL');

  const dishCategories = useMemo(() => {
    if (!snapshot) return [];
    const set = new Set<string>();
    for (const dish of snapshot.dishes) {
      for (const v of dish.versions) {
        if (v.categoryLabel) set.add(v.categoryLabel.trim());
      }
    }
    return Array.from(set).sort();
  }, [snapshot]);

  const filteredDishes = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.dishes.filter((dish) => {
      if (dishLifecycle !== 'ALL' && dish.lifecycle !== dishLifecycle) return false;
      if (dishCategory !== 'ALL') {
        const matchesCat = dish.versions.some(
          (v) => (v.categoryLabel ?? '').toLowerCase() === dishCategory.toLowerCase(),
        );
        if (!matchesCat) return false;
      }
      if (dishSearch.trim() !== '') {
        const query = dishSearch.trim().toLowerCase();
        const matchesQuery = dish.versions.some(
          (v) =>
            v.name.toLowerCase().includes(query) ||
            (v.description ?? '').toLowerCase().includes(query) ||
            (v.categoryLabel ?? '').toLowerCase().includes(query),
        );
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [snapshot, dishLifecycle, dishCategory, dishSearch]);

  const filteredMenus = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.menus.filter((menu) => {
      if (menuLifecycle !== 'ALL' && menu.lifecycle !== menuLifecycle) return false;
      if (menuSearch.trim() !== '') {
        const query = menuSearch.trim().toLowerCase();
        const matchesQuery = menu.versions.some(
          (v) =>
            v.name.toLowerCase().includes(query) ||
            (v.description ?? '').toLowerCase().includes(query),
        );
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [snapshot, menuLifecycle, menuSearch]);

  const load = useCallback(
    async (background = false) => {
      try {
        const next = await authorize((token) => gateway.loadFood(token));
        if (!background || !hasDirtyCatalogForms()) setSnapshot(next);
        setError(null);
      } catch (caught) {
        setError(foodErrorMessage(caught));
      }
    },
    [authorize, gateway],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useCatalogLiveRefresh(load);

  const run = async (success: string, operation: (token: string) => Promise<void>) => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await authorize(operation);
      setMessage(success);
      notify.success(success);
      await load();
      return true;
    } catch (caught) {
      const msg = foodErrorMessage(caught);
      setError(msg);
      notify.error(caught, { fallbackMessage: msg });
      return false;
    } finally {
      setPending(false);
    }
  };

  if (snapshot === null) {
    return (
      <section className={cn(cx.section, cx.foodPanel)} aria-labelledby="food-title">
        <div className={cx.sectionHeading}>
          <h2 id="food-title">Món ăn &amp; thực đơn</h2>
        </div>
        {error === null ? (
          <p className={cx.empty} role="status">
            Đang tải món ăn và thực đơn…
          </p>
        ) : (
          <div className={cx.retryState}>
            <p>{error}</p>
            <button type="button" className={cx.primaryButton} onClick={() => void load()}>
              Thử lại
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={cn(cx.section, cx.foodPanel)} id="food" aria-labelledby="food-title">
      <div className={cx.sectionHeading}>
        <h2 id="food-title">Món ăn &amp; thực đơn</h2>
      </div>
      <PanelMessages message={message} error={error} />

      <div className={cx.splitGrid}>
        <CreateDishForm
          pending={pending}
          onSubmit={(input) =>
            run('Đã tạo bản nháp món ăn.', (token) =>
              gateway.createDish(token, {
                ...input,
                dishId: crypto.randomUUID(),
                versionId: crypto.randomUUID(),
                displayOrder: snapshot.dishes.length,
              }),
            )
          }
        />
        <CreateMenuForm
          dishes={snapshot.dishes}
          pending={pending}
          onSubmit={(input) =>
            run('Đã tạo bản nháp thực đơn.', (token) =>
              gateway.createMenu(token, {
                ...input,
                menuPackageId: crypto.randomUUID(),
                versionId: crypto.randomUUID(),
                displayOrder: snapshot.menus.length,
              }),
            )
          }
        />
      </div>

      <div className={cx.versionColumns}>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h3 className="text-base font-semibold">
              Món ăn{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({filteredDishes.length}/{snapshot.dishes.length})
              </span>
            </h3>
          </div>
          <div className="mt-2.5 mb-3 flex flex-wrap gap-2 text-xs">
            <input
              className="h-9 min-w-[130px] flex-1 rounded-md border border-input bg-card px-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="search"
              placeholder="Tìm món ăn..."
              value={dishSearch}
              onChange={(e) => setDishSearch(e.currentTarget.value)}
              aria-label="Tìm kiếm món ăn"
            />
            {dishCategories.length > 0 ? (
              <select
                className="h-9 rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={dishCategory}
                onChange={(e) => setDishCategory(e.currentTarget.value)}
                aria-label="Lọc theo nhóm món"
              >
                <option value="ALL">Tất cả nhóm</option>
                {dishCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              className="h-9 rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={dishLifecycle}
              onChange={(e) =>
                setDishLifecycle(e.currentTarget.value as typeof dishLifecycle)
              }
              aria-label="Lọc trạng thái món"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang phục vụ</option>
              <option value="RETIRED">Đã ngừng</option>
            </select>
          </div>
          {snapshot.dishes.length === 0 ? (
            <p className={cx.empty}>Chưa có món ăn. Tạo bản nháp đầu tiên ở phía trên.</p>
          ) : filteredDishes.length === 0 ? (
            <p className={cx.empty}>Không tìm thấy món ăn phù hợp với bộ lọc.</p>
          ) : (
            filteredDishes.map((dish) => (
              <DishAggregate
                key={dish.id}
                dish={dish}
                pending={pending}
                run={run}
                gateway={gateway}
              />
            ))
          )}
        </div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <h3 className="text-base font-semibold">
              Gói thực đơn{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({filteredMenus.length}/{snapshot.menus.length})
              </span>
            </h3>
          </div>
          <div className="mt-2.5 mb-3 flex flex-wrap gap-2 text-xs">
            <input
              className="h-9 min-w-[130px] flex-1 rounded-md border border-input bg-card px-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="search"
              placeholder="Tìm gói thực đơn..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.currentTarget.value)}
              aria-label="Tìm gói thực đơn"
            />
            <select
              className="h-9 rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={menuLifecycle}
              onChange={(e) =>
                setMenuLifecycle(e.currentTarget.value as typeof menuLifecycle)
              }
              aria-label="Lọc trạng thái thực đơn"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang áp dụng</option>
              <option value="RETIRED">Đã ngừng</option>
            </select>
          </div>
          {snapshot.menus.length === 0 ? (
            <p className={cx.empty}>Chưa có gói thực đơn.</p>
          ) : filteredMenus.length === 0 ? (
            <p className={cx.empty}>Không tìm thấy gói thực đơn phù hợp với bộ lọc.</p>
          ) : (
            filteredMenus.map((menu) => (
              <MenuAggregate
                key={menu.id}
                dishOptions={snapshot.dishes.flatMap((dish) =>
                  dish.versions
                    .filter((version) => version.state === 'PUBLISHED')
                    .map((version) => ({
                      id: version.id,
                      label: `${version.name} · phiên bản ${version.versionNumber ?? '—'}`,
                      priceVnd: version.priceVnd,
                    })),
                )}
                menu={menu}
                pending={pending}
                run={run}
                gateway={gateway}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
