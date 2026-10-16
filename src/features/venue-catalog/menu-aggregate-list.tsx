'use client';

import { type FormEvent, useMemo, useState } from 'react';
import type { CatalogDish, CatalogGateway, CatalogMenu, MenuWrite } from './catalog-api';
import {
  AggregateHeader,
  EditorHeading,
  integer,
  LabeledInput,
  move,
  text,
  VersionSummary,
  type MenuVersion,
} from './food-catalog-shared';

export function OrderedVersionList({
  items,
  onChange,
  options,
}: Readonly<{
  items: readonly string[];
  onChange: (items: string[]) => void;
  options: readonly { id: string; label: string }[];
}>) {
  return (
    <ol className="catalog-order-list" aria-label="Thứ tự món trong gói">
      {items.map((id, index) => (
        <li key={id}>
          <span>{options.find((option) => option.id === id)?.label ?? id}</span>
          <div>
            <button
              type="button"
              aria-label={`Đưa món ${index + 1} lên`}
              disabled={index === 0}
              onClick={() => onChange(move(items, index, index - 1))}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Đưa món ${index + 1} xuống`}
              disabled={index === items.length - 1}
              onClick={() => onChange(move(items, index, index + 1))}
            >
              ↓
            </button>
            <button
              type="button"
              aria-label={`Bỏ món ${index + 1}`}
              onClick={() => onChange(items.filter((item) => item !== id))}
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CreateMenuForm({
  dishes,
  onSubmit,
  pending,
}: Readonly<{
  dishes: readonly CatalogDish[];
  onSubmit: (input: MenuWrite) => Promise<boolean>;
  pending: boolean;
}>) {
  const options = useMemo(
    () =>
      dishes.flatMap((dish) =>
        dish.versions
          .filter((version) => version.state === 'PUBLISHED')
          .map((version) => ({
            id: version.id,
            label: `${version.name} · phiên bản ${version.versionNumber ?? '—'}`,
          })),
      ),
    [dishes],
  );
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [items, setItems] = useState<string[]>([]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (items.length === 0) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    void onSubmit({
      name: text(data, 'name'),
      description: text(data, 'description'),
      priceVndPerTable: integer(data, 'priceVndPerTable'),
      items: items.map((dishVersionId, index) => ({ dishVersionId, displayOrder: index + 1 })),
    }).then((success) => {
      if (success) {
        form.reset();
        setItems([]);
        setSelectedVersionId('');
      }
    });
  };

  return (
    <form className="catalog-editor" aria-label="Tạo gói thực đơn" onSubmit={submit}>
      <EditorHeading eyebrow="Giá theo bàn" title="Tạo gói thực đơn" />
      <LabeledInput label="Tên gói" name="name" />
      <LabeledInput label="Mô tả gói" name="description" as="textarea" />
      <LabeledInput
        label="Giá mỗi bàn (VND)"
        name="priceVndPerTable"
        type="number"
        min={1}
        step={1}
      />
      <div className="catalog-field">
        <label htmlFor="menu-dish-version">Món phiên bản</label>
        <div className="catalog-inline-control">
          <select
            id="menu-dish-version"
            value={selectedVersionId}
            onChange={(event) => setSelectedVersionId(event.currentTarget.value)}
          >
            <option value="">Chọn phiên bản đã công bố</option>
            {options.map((option) => (
              <option key={option.id} value={option.id} disabled={items.includes(option.id)}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="catalog-secondary-button"
            disabled={selectedVersionId === ''}
            onClick={() => {
              if (selectedVersionId !== '' && !items.includes(selectedVersionId)) {
                setItems((current) => [...current, selectedVersionId]);
                setSelectedVersionId('');
              }
            }}
          >
            Thêm món vào gói
          </button>
        </div>
      </div>
      <OrderedVersionList items={items} options={options} onChange={setItems} />
      {items.length === 0 ? (
        <p className="catalog-help">Thực đơn cần ít nhất một phiên bản món đã công bố.</p>
      ) : null}
      <button
        className="catalog-primary-button"
        type="submit"
        disabled={pending || items.length === 0}
      >
        Tạo bản nháp thực đơn
      </button>
    </form>
  );
}

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
