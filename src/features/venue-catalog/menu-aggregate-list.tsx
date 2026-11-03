'use client';

import { type FormEvent, useMemo, useState } from 'react';
import type { CatalogGateway, CatalogMenu } from './catalog-api';
import { integer, LabeledInput, text, type MenuVersion } from './food-catalog-shared';
import { OrderedVersionList, CreateMenuForm } from './create-menu-form';

import { cx } from './catalog-classes';
import { FoodRecordRow, latestFoodVersion } from './food-record-card';
import { useFoodDraft } from './use-food-draft';
export { OrderedVersionList, CreateMenuForm };

export function MenuDraftEditor({
  menuId,
  onClose,
  dishOptions,
  gateway,
  pending,
  run,
  version,
}: Readonly<{
  menuId: string;
  onClose: () => void;
  dishOptions: readonly { id: string; label: string }[];
  gateway: CatalogGateway;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  version: MenuVersion;
}>) {
  const ensureDraft = useFoodDraft(version);
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
        const draft = await ensureDraft((input) =>
          gateway.cloneMenu(token, { packageId: menuId, ...input }),
        );
        const revision = await gateway.updateMenuDraft(token, {
          versionId: draft.id,
          expectedRevision: draft.revision,
          name: text(data, 'name'),
          description: text(data, 'description'),
          priceVndPerTable: integer(data, 'priceVndPerTable'),
          items: items.map((dishVersionId, index) => ({ dishVersionId, displayOrder: index + 1 })),
        });
        draft.revision = revision;
        if (publish)
          await gateway.publishMenu(token, {
            versionId: draft.id,
            expectedRevision: revision,
          });
      },
    ).then((ok) => {
      if (ok) onClose();
    });
  };

  return (
    <form className={cx.draftForm} aria-label={`Bản nháp ${version.name}`} onSubmit={submit}>
      <span className={cx.versionState}>
        {version.state === 'DRAFT' ? 'Chỉnh sửa bản nháp' : 'Tạo phiên bản mới từ bản đang công bố'}
      </span>
      <LabeledInput
        disabled={pending}
        label="Tên gói bản nháp"
        name="name"
        defaultValue={version.name}
      />
      <LabeledInput
        disabled={pending}
        label="Mô tả gói bản nháp"
        name="description"
        as="textarea"
        defaultValue={version.description}
        required={false}
      />
      <LabeledInput
        disabled={pending}
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
          disabled={pending}
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
        <button className={cx.secondaryButton} type="button" disabled={pending} onClick={onClose}>
          Hủy
        </button>
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
  const editable = menu.versions.find(({ id }) => id === menu.draftVersionId) ?? version;
  return (
    <FoodRecordRow
      record={menu}
      pending={pending}
      editor={(onClose) => (
        <MenuDraftEditor
          menuId={menu.id}
          version={editable}
          dishOptions={dishOptions}
          gateway={gateway}
          pending={pending}
          run={run}
          onClose={onClose}
        />
      )}
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
