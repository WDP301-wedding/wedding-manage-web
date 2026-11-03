'use client';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

import { useCallback, useEffect, useState } from 'react';

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
import { Plus, Search } from 'lucide-react';
import { PrintOrderDialog } from '../print-orders/print-order-dialog';
import { currentDishOptions, latestFoodVersion } from './food-record-card';
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

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
        <label className={`${cx.field} min-w-0 flex-1`}>
          <span>Tìm món ăn hoặc gói thực đơn</span>
          <span className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground"
            />
            <input
              className="pl-9!"
              placeholder="Nhập tên, nhóm món…"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </span>
        </label>
        <label className={cx.field}>
          Trạng thái
          <select value={status} onChange={(event) => setStatus(event.currentTarget.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="RETIRED">Đã ngừng</option>
          </select>
        </label>
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
          <h3 className={cx.subheading}>Món ăn ({snapshot.dishes.filter(matches).length})</h3>
          {snapshot.dishes.filter(matches).length === 0 ? (
            <p className={cx.empty}>Không có món ăn phù hợp. Thêm món mới hoặc thay đổi bộ lọc.</p>
          ) : (
            <FoodTable label="Danh sách món ăn">
              {snapshot.dishes.filter(matches).map((dish) => (
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
          <h3 className={cx.subheading}>Gói thực đơn ({snapshot.menus.filter(matches).length})</h3>
          {snapshot.menus.filter(matches).length === 0 ? (
            <p className={cx.empty}>
              Không có gói thực đơn phù hợp. Thêm gói mới hoặc thay đổi bộ lọc.
            </p>
          ) : (
            <FoodTable label="Danh sách gói thực đơn">
              {snapshot.menus.filter(matches).map((menu) => (
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

  function matches(
    record: FoodCatalogSnapshot['dishes'][number] | FoodCatalogSnapshot['menus'][number],
  ) {
    const version = latestFoodVersion(record);
    if (!version || (status !== 'ALL' && record.lifecycle !== status)) return false;
    const normalize = (value: string) =>
      value.normalize('NFD').replace(/\p{M}/gu, '').replaceAll('đ', 'd').toLocaleLowerCase('vi-VN');
    const content = `${version.name} ${'categoryLabel' in version ? version.categoryLabel : ''}`;
    return normalize(content).includes(normalize(search.trim()));
  }
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
