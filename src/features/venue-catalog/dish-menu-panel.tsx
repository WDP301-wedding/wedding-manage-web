'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { ApiClientError } from '../../lib/api/client';
import type {
  CatalogDish,
  CatalogGateway,
  CatalogMenu,
  DishWrite,
  FoodCatalogSnapshot,
  MenuWrite,
} from './catalog-api';

type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;
type DishVersion = CatalogDish['versions'][number];
type MenuVersion = CatalogMenu['versions'][number];

export function DishMenuPanel({
  authorize,
  gateway,
}: Readonly<{ authorize: Authorize; gateway: CatalogGateway }>) {
  const [snapshot, setSnapshot] = useState<FoodCatalogSnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSnapshot(await authorize((token) => gateway.loadFood(token)));
      setError(null);
    } catch (caught) {
      setError(foodErrorMessage(caught));
    }
  }, [authorize, gateway]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

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
      setError(foodErrorMessage(caught));
      return false;
    } finally {
      setPending(false);
    }
  };

  if (snapshot === null) {
    return (
      <section className="catalog-section food-panel" aria-labelledby="food-title">
        <div className="catalog-section-heading">
          <p className="section-kicker">Versioned catalog</p>
          <h2 id="food-title">Món ăn &amp; thực đơn</h2>
        </div>
        {error === null ? (
          <p className="catalog-empty" role="status">
            Đang tải món ăn và thực đơn…
          </p>
        ) : (
          <div className="catalog-retry-state">
            <p role="alert">{error}</p>
            <button type="button" className="catalog-primary-button" onClick={() => void load()}>
              Thử lại
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="catalog-section food-panel" id="food" aria-labelledby="food-title">
      <div className="catalog-section-heading">
        <p className="section-kicker">Versioned catalog</p>
        <h2 id="food-title">Món ăn &amp; thực đơn</h2>
      </div>
      <PanelMessages message={message} error={error} />

      <div className="catalog-split-grid">
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

      <div className="catalog-version-columns">
        <div>
          <h3 className="catalog-subheading">Món ăn</h3>
          {snapshot.dishes.length === 0 ? (
            <p className="catalog-empty">Chưa có món ăn. Tạo bản nháp đầu tiên ở phía trên.</p>
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
          <h3 className="catalog-subheading">Gói thực đơn</h3>
          {snapshot.menus.length === 0 ? (
            <p className="catalog-empty">Chưa có gói thực đơn.</p>
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

function CreateDishForm({
  onSubmit,
  pending,
}: Readonly<{ onSubmit: (input: DishWrite) => Promise<boolean>; pending: boolean }>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void onSubmit({
      name: text(data, 'name'),
      categoryLabel: text(data, 'categoryLabel'),
      description: text(data, 'description'),
      priceVnd: optionalInteger(data, 'priceVnd'),
    }).then((success) => {
      if (success) form.reset();
    });
  };
  return (
    <form className="catalog-editor" aria-label="Tạo món ăn" onSubmit={submit}>
      <EditorHeading eyebrow="Bản nháp mới" title="Tạo món ăn" />
      <LabeledInput label="Tên món" name="name" />
      <LabeledInput label="Nhóm món" name="categoryLabel" />
      <LabeledInput label="Mô tả món" name="description" as="textarea" />
      <LabeledInput label="Giá món (VND)" name="priceVnd" type="number" min={0} step={1} />
      <button className="catalog-primary-button" type="submit" disabled={pending}>
        Tạo bản nháp món ăn
      </button>
    </form>
  );
}

function CreateMenuForm({
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

function OrderedVersionList({
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

function DishAggregate({
  dish,
  gateway,
  pending,
  run,
}: Readonly<{
  dish: CatalogDish;
  gateway: CatalogGateway;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
}>) {
  const label =
    dish.versions.find((version) => version.id === dish.currentPublishedVersionId)?.name ??
    dish.versions[0]?.name ??
    'Món chưa đặt tên';
  return (
    <article className="catalog-aggregate">
      <AggregateHeader
        label={label}
        lifecycle={dish.lifecycle}
        onLifecycle={() =>
          run(dish.lifecycle === 'ACTIVE' ? 'Đã ngừng món ăn.' : 'Đã khôi phục món ăn.', (token) =>
            gateway.changeDishLifecycle(token, {
              id: dish.id,
              expectedRevision: dish.revision,
              transition: dish.lifecycle === 'ACTIVE' ? 'RETIRE' : 'RESTORE',
            }),
          )
        }
      />
      <div className="catalog-history" role="region" aria-label={`Lịch sử ${label}`}>
        {dish.versions.map((version) => (
          <DishVersionRow
            key={version.id}
            dishId={dish.id}
            gateway={gateway}
            pending={pending}
            run={run}
            version={version}
            canClone={dish.draftVersionId === null}
          />
        ))}
      </div>
    </article>
  );
}

function DishVersionRow({
  canClone,
  dishId,
  gateway,
  pending,
  run,
  version,
}: Readonly<{
  canClone: boolean;
  dishId: string;
  gateway: CatalogGateway;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  version: DishVersion;
}>) {
  if (version.state !== 'DRAFT') {
    return (
      <div className="catalog-version-row">
        <VersionSummary version={version} price={version.priceVnd} />
        {canClone ? (
          <button
            type="button"
            className="catalog-secondary-button"
            disabled={pending}
            aria-label={`Nhân bản phiên bản ${version.versionNumber ?? ''}`}
            onClick={() =>
              void run('Đã nhân bản thành bản nháp độc lập.', (token) =>
                gateway.cloneDish(token, {
                  dishId,
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
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run('Đã lưu bản nháp món ăn.', (token) =>
      gateway.updateDishDraft(token, {
        versionId: version.id,
        expectedRevision: version.revision,
        name: text(data, 'name'),
        description: text(data, 'description'),
        categoryLabel: text(data, 'categoryLabel'),
        priceVnd: optionalInteger(data, 'priceVnd'),
      }),
    );
  };
  return (
    <form className="catalog-draft-form" aria-label={`Bản nháp ${version.name}`} onSubmit={submit}>
      <span className="catalog-version-state">Bản nháp · revision {version.revision}</span>
      <LabeledInput label="Tên món bản nháp" name="name" defaultValue={version.name} />
      <LabeledInput
        label="Nhóm món bản nháp"
        name="categoryLabel"
        defaultValue={version.categoryLabel}
      />
      <LabeledInput
        label="Mô tả món bản nháp"
        name="description"
        as="textarea"
        defaultValue={version.description}
      />
      <LabeledInput
        label="Giá món bản nháp (VND)"
        name="priceVnd"
        type="number"
        min={0}
        step={1}
        defaultValue={version.priceVnd ?? ''}
      />
      <div className="catalog-form-actions">
        <button className="catalog-secondary-button" type="submit" disabled={pending}>
          Lưu bản nháp
        </button>
        <button
          className="catalog-primary-button"
          type="button"
          disabled={pending}
          onClick={() =>
            void run('Đã công bố phiên bản món ăn.', (token) =>
              gateway.publishDish(token, {
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

function MenuAggregate({
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

function MenuVersionRow({
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

function MenuDraftEditor({
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

function VersionSummary({
  price,
  version,
}: Readonly<{ price: number | null; version: DishVersion | MenuVersion }>) {
  const state =
    version.state === 'PUBLISHED'
      ? `Đã công bố · v${version.versionNumber ?? '—'}`
      : version.state === 'SUPERSEDED'
        ? `Đã thay thế · v${version.versionNumber ?? '—'}`
        : 'Bản nháp';
  return (
    <div>
      <span className="catalog-version-state">{state}</span>
      <strong>{version.name}</strong>
      <small>{price === null ? 'Không niêm yết giá' : formatVnd(price)}</small>
    </div>
  );
}

function AggregateHeader({
  label,
  lifecycle,
  onLifecycle,
}: Readonly<{
  label: string;
  lifecycle: 'ACTIVE' | 'RETIRED';
  onLifecycle: () => Promise<boolean>;
}>) {
  return (
    <header className="catalog-aggregate-header">
      <div>
        <span className={`status ${lifecycle === 'ACTIVE' ? 'status-ready' : 'status-retired'}`}>
          {lifecycle === 'ACTIVE' ? 'Đang hoạt động' : 'Đã ngừng'}
        </span>
        <h4>{label}</h4>
      </div>
      <button type="button" onClick={() => void onLifecycle()}>
        {lifecycle === 'ACTIVE' ? 'Ngừng' : 'Khôi phục'}
      </button>
    </header>
  );
}

function LabeledInput({
  as = 'input',
  label,
  name,
  ...props
}: Readonly<
  React.InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input' | 'textarea';
    label: string;
    name: string;
  }
>) {
  const id = `food-${name}-${label.replaceAll(/\s+/gu, '-').toLocaleLowerCase('vi-VN')}`;
  return (
    <div className="catalog-field">
      <label htmlFor={id}>{label}</label>
      {as === 'textarea' ? (
        <textarea id={id} name={name} required defaultValue={String(props.defaultValue ?? '')} />
      ) : (
        <input {...props} id={id} name={name} required />
      )}
    </div>
  );
}

function EditorHeading({ eyebrow, title }: Readonly<{ eyebrow: string; title: string }>) {
  return (
    <div className="catalog-editor-heading">
      <span className="section-kicker">{eyebrow}</span>
      <h3>{title}</h3>
    </div>
  );
}

function PanelMessages({
  error,
  message,
}: Readonly<{ error: string | null; message: string | null }>) {
  return (
    <div className="catalog-panel-messages" aria-live="polite">
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
  );
}

function text(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function integer(data: FormData, name: string): number {
  return Number.parseInt(text(data, name), 10);
}

function optionalInteger(data: FormData, name: string): number | null {
  const value = text(data, name);
  return value === '' ? null : Number.parseInt(value, 10);
}

function move(items: readonly string[], from: number, to: number): string[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function foodErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 403 || error.status === 404) {
      return 'Máy chủ từ chối thao tác. Vai trò hiển thị không cấp thêm quyền.';
    }
    if (error.status === 409) {
      return 'Phiên bản đã thay đổi. Hãy tải lại dữ liệu và áp dụng chỉnh sửa lần nữa.';
    }
    if (error.status === 422) {
      return error.details?.map(({ message }) => message).join(' ') || 'Dữ liệu chưa hợp lệ.';
    }
  }
  return 'Không thể hoàn tất thao tác món ăn hoặc thực đơn.';
}
