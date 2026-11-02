'use client';

import { hasDirtyCatalogForms, useCatalogLiveRefresh } from './use-catalog-live-refresh';

import { useCallback, useEffect, useState } from 'react';

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
          <h3 className={cx.subheading}>Món ăn</h3>
          {snapshot.dishes.length === 0 ? (
            <p className={cx.empty}>Chưa có món ăn. Tạo bản nháp đầu tiên ở phía trên.</p>
          ) : (
            snapshot.dishes.map((dish) => (
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
          <h3 className={cx.subheading}>Gói thực đơn</h3>
          {snapshot.menus.length === 0 ? (
            <p className={cx.empty}>Chưa có gói thực đơn.</p>
          ) : (
            snapshot.menus.map((menu) => (
              <MenuAggregate
                key={menu.id}
                dishOptions={snapshot.dishes.flatMap((dish) =>
                  dish.versions
                    .filter((version) => version.state === 'PUBLISHED')
                    .map((version) => ({
                      id: version.id,
                      label: `${version.name} · phiên bản ${version.versionNumber ?? '—'}`,
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
