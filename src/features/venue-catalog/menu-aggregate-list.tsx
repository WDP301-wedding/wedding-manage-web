'use client';

import { type FormEvent, useMemo, useState } from 'react';
import type { CatalogGateway, CatalogMenu } from './catalog-api';
import {
  AggregateHeader,
  formatVnd,
  integer,
  LabeledInput,
  text,
  VersionSummary,
  type MenuVersion,
} from './food-catalog-shared';
import { OrderedVersionList, CreateMenuForm } from './create-menu-form';

import { cx } from './catalog-classes';
export { OrderedVersionList, CreateMenuForm };

export function MenuDraftEditor({
  dishOptions,
  gateway,
  pending,
  run,
  version,
}: Readonly<{
  dishOptions: readonly { id: string; label: string; priceVnd?: number | null }[];
  gateway: CatalogGateway;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  version: MenuVersion;
}>) {
  const [items, setItems] = useState(() =>
    [...version.items]
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map(({ dishVersionId }) => dishVersionId),
  );
  const [selected, setSelected] = useState('');
  const options = useMemo(() => {
    const historical = version.items.map((item) => ({
      id: item.dishVersionId,
      label: `${item.name} · phiên bản ${item.dishVersionNumber}`,
    }));
    return [...historical, ...dishOptions].filter(
      (option, index, all) => all.findIndex(({ id }) => id === option.id) === index,
    );
  }, [dishOptions, version.items]);

  const totalItemsPrice = useMemo(() => {
    const priceMap = new Map<string, number>();
    for (const opt of dishOptions) {
      if (typeof opt.priceVnd === 'number') {
        priceMap.set(opt.id, opt.priceVnd);
      }
    }
    return items.reduce((sum, id) => sum + (priceMap.get(id) ?? 0), 0);
  }, [items, dishOptions]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run('Đã lưu bản nháp thực đơn.', (token) =>
      gateway.updateMenuDraft(token, {
        versionId: version.id,
        expectedRevision: version.revision,
        name: text(data, 'name'),
        description: text(data, 'description'),
        priceVndPerTable: integer(data, 'priceVndPerTable'),
        items: items.map((dishVersionId, index) => ({ dishVersionId, displayOrder: index + 1 })),
      }),
    );
  };

  return (
    <form className={cx.draftForm} aria-label={`Bản nháp ${version.name}`} onSubmit={submit}>
      <span className={cx.versionState}>Bản nháp · revision {version.revision}</span>
      <LabeledInput label="Tên gói bản nháp" name="name" defaultValue={version.name} />
      <LabeledInput
        label="Mô tả gói bản nháp"
        name="description"
        as="textarea"
        defaultValue={version.description}
      />
      <LabeledInput
        label="Giá bàn bản nháp (VND)"
        name="priceVndPerTable"
        type="number"
        min={1}
        step={1}
        defaultValue={version.priceVndPerTable}
      />
      <div className={cx.inlineControl}>
        <select
          aria-label="Thêm phiên bản món vào bản nháp"
          value={selected}
          onChange={(event) => setSelected(event.currentTarget.value)}
        >
          <option value="">Chọn phiên bản món</option>
          {options.map((option) => (
            <option key={option.id} value={option.id} disabled={items.includes(option.id)}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className={cx.secondaryButton}
          type="button"
          disabled={selected === ''}
          onClick={() => {
            if (selected !== '' && !items.includes(selected)) setItems([...items, selected]);
            setSelected('');
          }}
        >
          Thêm
        </button>
      </div>
      <OrderedVersionList items={items} options={options} onChange={setItems} />
      {totalItemsPrice > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Tổng giá các món đơn lẻ ({items.length} món):
          </span>
          <strong className="font-semibold text-foreground">
            {formatVnd(totalItemsPrice)}
          </strong>
        </div>
      ) : null}
      <div className={cx.formActions}>
        <button
          className={cx.secondaryButton}
          type="submit"
          disabled={pending || items.length === 0}
        >
          Lưu bản nháp
        </button>
        <button
          className={cx.primaryButton}
          type="button"
          disabled={pending}
          onClick={() =>
            void run('Đã công bố gói thực đơn.', (token) =>
              gateway.publishMenu(token, {
                versionId: version.id,
                expectedRevision: version.revision,
              }),
            )
          }
        >
          Công bố
        </button>
      </div>
    </form>
  );
}

export function MenuVersionRow({
  canClone,
  dishOptions,
  gateway,
  menuId,
  pending,
  run,
  version,
}: Readonly<{
  canClone: boolean;
  dishOptions: readonly { id: string; label: string; priceVnd?: number | null }[];
  gateway: CatalogGateway;
  menuId: string;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  version: MenuVersion;
}>) {
  if (version.state !== 'DRAFT') {
    return (
      <div className={cx.versionRow}>
        <VersionSummary version={version} price={version.priceVndPerTable} />
        {canClone ? (
          <button
            className={cx.secondaryButton}
            type="button"
            disabled={pending}
            onClick={() =>
              void run('Đã nhân bản gói thành bản nháp.', (token) =>
                gateway.cloneMenu(token, {
                  packageId: menuId,
                  sourceVersionId: version.id,
                  versionId: crypto.randomUUID(),
                }),
              )
            }
          >
            Nhân bản
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <MenuDraftEditor
      dishOptions={dishOptions}
      gateway={gateway}
      pending={pending}
      run={run}
      version={version}
    />
  );
}

export function MenuAggregate({
  dishOptions,
  gateway,
  menu,
  pending,
  run,
}: Readonly<{
  dishOptions: readonly { id: string; label: string; priceVnd?: number | null }[];
  gateway: CatalogGateway;
  menu: CatalogMenu;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
}>) {
  const label =
    menu.versions.find((version) => version.id === menu.currentPublishedVersionId)?.name ??
    menu.versions[0]?.name ??
    'Gói chưa đặt tên';
  return (
    <article className={cx.aggregate}>
      <AggregateHeader
        label={label}
        lifecycle={menu.lifecycle}
        onLifecycle={() =>
          run(
            menu.lifecycle === 'ACTIVE' ? 'Đã ngừng gói thực đơn.' : 'Đã khôi phục gói.',
            (token) =>
              gateway.changeMenuLifecycle(token, {
                id: menu.id,
                expectedRevision: menu.revision,
                transition: menu.lifecycle === 'ACTIVE' ? 'RETIRE' : 'RESTORE',
              }),
          )
        }
      />
      <div className={cx.history} role="region" aria-label={`Lịch sử ${label}`}>
        {menu.versions.map((version) => (
          <MenuVersionRow
            key={version.id}
            canClone={menu.draftVersionId === null}
            dishOptions={dishOptions}
            gateway={gateway}
            menuId={menu.id}
            pending={pending}
            run={run}
            version={version}
          />
        ))}
      </div>
    </article>
  );
}
