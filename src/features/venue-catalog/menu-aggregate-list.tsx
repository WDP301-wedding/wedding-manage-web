'use client';

import { type FormEvent, useMemo, useState } from 'react';
import type { CatalogGateway, CatalogMenu } from './catalog-api';
import {
  integer,
  LabeledInput,
  text,
  VersionSummary,
  formatVnd,
  type MenuVersion,
} from './food-catalog-shared';
import { OrderedVersionList, CreateMenuForm } from './create-menu-form';

import { cx } from './catalog-classes';
import { FoodRecordCard, latestFoodVersion } from './food-record-card';
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
    const historical = version.items
      .filter((item) => items.includes(item.dishVersionId))
      .map((item) => ({
        id: item.dishVersionId,
        label: `${item.name} · phiên bản ${item.dishVersionNumber}`,
      }));
    return [...historical, ...dishOptions].filter(
      (option, index, all) => all.findIndex(({ id }) => id === option.id) === index,
    );
  }, [dishOptions, version.items, items]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const publish =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publish';
    void run(
      publish ? 'Đã lưu và công bố gói thực đơn.' : 'Đã lưu bản nháp thực đơn.',
      async (token) => {
        const revision = await gateway.updateMenuDraft(token, {
          versionId: version.id,
          expectedRevision: version.revision,
          name: text(data, 'name'),
          description: text(data, 'description'),
          priceVndPerTable: integer(data, 'priceVndPerTable'),
          items: items.map((dishVersionId, index) => ({ dishVersionId, displayOrder: index + 1 })),
        });
        if (publish)
          await gateway.publishMenu(token, { versionId: version.id, expectedRevision: revision });
      },
    );
  };

  return (
    <form className={cx.draftForm} aria-label={`Bản nháp ${version.name}`} onSubmit={submit}>
      <span className={cx.versionState}>Chỉnh sửa gói thực đơn</span>
      <LabeledInput label="Tên gói bản nháp" name="name" defaultValue={version.name} />
      <LabeledInput
        label="Mô tả gói bản nháp"
        name="description"
        as="textarea"
        defaultValue={version.description}
        required={false}
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
          disabled={pending || selected === ''}
          onClick={() => {
            if (selected !== '' && !items.includes(selected)) setItems([...items, selected]);
            setSelected('');
          }}
        >
          Thêm
        </button>
      </div>
      <OrderedVersionList items={items} options={options} onChange={setItems} disabled={pending} />
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
          type="submit"
          name="action"
          value="publish"
          disabled={pending || items.length === 0}
        >
          Lưu và công bố
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
  dishOptions: readonly { id: string; label: string }[];
  gateway: CatalogGateway;
  menu: CatalogMenu;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
}>) {
  const version = latestFoodVersion(menu);
  if (!version) return null;
  const label = version.name;
  return (
    <FoodRecordCard
      label={label}
      lifecycle={menu.lifecycle}
      draft={version.state === 'DRAFT'}
      price={version.priceVndPerTable}
      priceUnit="bàn"
      pending={pending}
      summary={
        <p>
          {version.items.length} món · {version.description || 'Chưa có mô tả'}
        </p>
      }
      details={
        <>
          <p className="text-sm text-muted-foreground">{version.description || 'Chưa có mô tả.'}</p>
          <p className="font-semibold text-primary">{formatVnd(version.priceVndPerTable)} / bàn</p>
          <h3 className="font-semibold">Các món trong thực đơn ({version.items.length})</h3>
          <ol className="flex flex-col divide-y divide-border">
            {[...version.items]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((item, index) => (
                <li key={item.dishVersionId} className="py-3">
                  <div className="flex gap-3">
                    <span className="text-sm text-muted-foreground">{index + 1}.</span>
                    <div>
                      <strong className="text-sm">{item.name}</strong>
                      <p className="mt-1 text-xs text-muted-foreground">{item.categoryLabel}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                </li>
              ))}
          </ol>
        </>
      }
      editor={
        version.state === 'DRAFT' ? (
          <MenuDraftEditor
            key={`${version.id}-${version.revision}`}
            dishOptions={dishOptions}
            gateway={gateway}
            pending={pending}
            run={run}
            version={version}
          />
        ) : (
          <p role="status">Đang mở trình chỉnh sửa…</p>
        )
      }
      onEdit={() =>
        version.state === 'DRAFT'
          ? Promise.resolve(true)
          : run('Đã mở bản chỉnh sửa thực đơn.', (token) =>
              gateway.cloneMenu(token, {
                packageId: menu.id,
                sourceVersionId: version.id,
                versionId: crypto.randomUUID(),
              }),
            )
      }
      onDelete={() =>
        run('Đã xóa gói thực đơn khỏi danh mục.', (token) =>
          gateway.deleteMenu(token, { id: menu.id, expectedRevision: menu.revision }),
        )
      }
      onLifecycle={() =>
        run(menu.lifecycle === 'ACTIVE' ? 'Đã ngừng gói thực đơn.' : 'Đã khôi phục gói.', (token) =>
          gateway.changeMenuLifecycle(token, {
            id: menu.id,
            expectedRevision: menu.revision,
            transition: menu.lifecycle === 'ACTIVE' ? 'RETIRE' : 'RESTORE',
          }),
        )
      }
    />
  );
}
