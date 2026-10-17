'use client';

import { type FormEvent, useMemo, useState } from 'react';
import type { CatalogGateway, CatalogMenu } from './catalog-api';
import {
  AggregateHeader,
  integer,
  LabeledInput,
  text,
  VersionSummary,
  type MenuVersion,
} from './food-catalog-shared';
import { OrderedVersionList, CreateMenuForm } from './create-menu-form';

export { OrderedVersionList, CreateMenuForm };

export function MenuDraftEditor({
  dishOptions,
  gateway,
  pending,
  run,
  version,
}: Readonly<{
  dishOptions: readonly { id: string; label: string }[];
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
    <form className="catalog-draft-form" aria-label={`Bản nháp ${version.name}`} onSubmit={submit}>
      <span className="catalog-version-state">Bản nháp · revision {version.revision}</span>
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
      <div className="catalog-inline-control">
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
          className="catalog-secondary-button"
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
      <div className="catalog-form-actions">
        <button
          className="catalog-secondary-button"
          type="submit"
          disabled={pending || items.length === 0}
        >
          Lưu bản nháp
        </button>
        <button
          className="catalog-primary-button"
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
  dishOptions: readonly { id: string; label: string }[];
  gateway: CatalogGateway;
  menuId: string;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  version: MenuVersion;
}>) {
  if (version.state !== 'DRAFT') {
    return (
      <div className="catalog-version-row">
        <VersionSummary version={version} price={version.priceVndPerTable} />
        {canClone ? (
          <button
            className="catalog-secondary-button"
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
  dishOptions: readonly { id: string; label: string }[];
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
    <article className="catalog-aggregate">
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
      <div className="catalog-history" role="region" aria-label={`Lịch sử ${label}`}>
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
