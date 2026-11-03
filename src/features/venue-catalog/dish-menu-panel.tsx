'use client';
import { HySelect } from '../../components/ui/select-field';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CatalogGateway, FoodCatalogSnapshot } from './catalog-api';
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
  OrderedVersionList,
} from './menu-aggregate-list';

import { cx } from './catalog-classes';
import { cn } from 'cn';
import { Plus } from 'lucide-react';
import { PrintOrderDialog } from '../print-orders/print-order-dialog';
import { currentDishOptions } from './food-record-card';
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
  const [creating, setCreating] = useState<'dish' | 'menu' | null>(null);
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
      await load();
      return true;
    } catch (caught) {
      await load();
      setError(foodErrorMessage(caught));
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
        <p>Theo dõi bản đang công bố, quản lý bản nháp và xem lịch sử phiên bản.</p>
      </div>
      <PanelMessages message={message} error={error} />
      {error && (
        <p className={cx.error} role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3 border-b border-border p-5">
        <button
          type="button"
          className={cx.secondaryButton}
          disabled={pending}
          onClick={() => setCreating('dish')}
        >
          <Plus aria-hidden />
          Thêm món ăn
        </button>
        <button
          type="button"
          className={cx.primaryButton}
          disabled={pending}
          onClick={() => setCreating('menu')}
        >
          <Plus aria-hidden />
          Thêm gói thực đơn
        </button>
      </div>
      {creating !== null && (
        <PrintOrderDialog
          label={creating === 'dish' ? 'Thêm món ăn' : 'Thêm gói thực đơn'}
          title={creating === 'dish' ? 'Thêm món ăn' : 'Thêm gói thực đơn'}
          onClose={() => {
            if (!pending) setCreating(null);
          }}
        >
          {creating === 'dish' ? (
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
                ).then((ok) => {
                  if (ok) setCreating(null);
                  return ok;
                })
              }
            />
          ) : (
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
                ).then((ok) => {
                  if (ok) setCreating(null);
                  return ok;
                })
              }
            />
          )}
        </PrintOrderDialog>
      )}

      <div className="flex min-w-0 flex-col gap-6 px-4 pb-6 sm:px-6">
        <div>
          <h3 className={cx.subheading}>Món ăn ({filteredDishes.length})</h3>
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
              <HySelect
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
              </HySelect>
            ) : null}
            <HySelect
              className="h-9 rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={dishLifecycle}
              onChange={(e) => setDishLifecycle(e.currentTarget.value as typeof dishLifecycle)}
              aria-label="Lọc trạng thái món"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang phục vụ</option>
              <option value="RETIRED">Đã ngừng</option>
            </HySelect>
          </div>
          {filteredDishes.length === 0 ? (
            <p className={cx.empty}>Không có món ăn phù hợp. Thêm món mới hoặc thay đổi bộ lọc.</p>
          ) : (
            <FoodTable label="Danh sách món ăn">
              {filteredDishes.map((dish) => (
                <DishAggregate
                  key={dish.id}
                  dish={dish}
                  pending={pending}
                  run={run}
                  gateway={gateway}
                />
              ))}
            </FoodTable>
          )}
        </div>
        <div>
          <h3 className={cx.subheading}>Gói thực đơn ({filteredMenus.length})</h3>
          <div className="mt-2.5 mb-3 flex flex-wrap gap-2 text-xs">
            <input
              className="h-9 min-w-[130px] flex-1 rounded-md border border-input bg-card px-2.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              type="search"
              placeholder="Tìm gói thực đơn..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.currentTarget.value)}
              aria-label="Tìm gói thực đơn"
            />
            <HySelect
              className="h-9 rounded-md border border-input bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={menuLifecycle}
              onChange={(e) => setMenuLifecycle(e.currentTarget.value as typeof menuLifecycle)}
              aria-label="Lọc trạng thái thực đơn"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang áp dụng</option>
              <option value="RETIRED">Đã ngừng</option>
            </HySelect>
          </div>
          {filteredMenus.length === 0 ? (
            <p className={cx.empty}>
              Không có gói thực đơn phù hợp. Thêm gói mới hoặc thay đổi bộ lọc.
            </p>
          ) : (
            <FoodTable label="Danh sách gói thực đơn">
              {filteredMenus.map((menu) => (
                <MenuAggregate
                  key={menu.id}
                  dishOptions={currentDishOptions(snapshot.dishes)}
                  menu={menu}
                  pending={pending}
                  run={run}
                  gateway={gateway}
                />
              ))}
            </FoodTable>
          )}
        </div>
      </div>
    </section>
  );
}

function FoodTable({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className={cx.tableScroll} role="region" aria-label={label} tabIndex={0}>
      <table className={cx.table}>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {['Tên', 'Trạng thái', 'Phiên bản công bố', 'Giá', 'Thao tác'].map((title) => (
              <th key={title} scope="col">
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
