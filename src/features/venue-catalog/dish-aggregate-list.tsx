'use client';

import { type FormEvent } from 'react';
import type { CatalogDish, CatalogGateway, DishWrite } from './catalog-api';
import {
  EditorHeading,
  LabeledInput,
  optionalInteger,
  text,
  type DishVersion,
} from './food-catalog-shared';

import { cx } from './catalog-classes';
import { FoodRecordRow, latestFoodVersion } from './food-record-card';
import { useFoodDraft } from './use-food-draft';
export function CreateDishForm({
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
    <form className={cx.editor} aria-label="Tạo món ăn" onSubmit={submit}>
      <EditorHeading title="Tạo món ăn" />
      <LabeledInput label="Tên món" name="name" />
      <LabeledInput label="Nhóm món" name="categoryLabel" />
      <LabeledInput label="Mô tả món" name="description" as="textarea" required={false} />
      <LabeledInput
        disabled={pending}
        label="Giá món (VND)"
        name="priceVnd"
        type="number"
        min={0}
        step={1}
        required={false}
      />
      <button className={cx.primaryButton} type="submit" disabled={pending}>
        Tạo bản nháp món ăn
      </button>
    </form>
  );
}

export function DishAggregate({
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
  const version = latestFoodVersion(dish);
  if (!version) return null;
  const editable = dish.versions.find(({ id }) => id === dish.draftVersionId) ?? version;
  return (
    <FoodRecordRow
      record={dish}
      pending={pending}
      editor={(onClose) => (
        <DishVersionRow
          dishId={dish.id}
          version={editable}
          gateway={gateway}
          pending={pending}
          run={run}
          onClose={onClose}
        />
      )}
      onDelete={() =>
        run('Đã xóa món ăn khỏi danh mục.', (token) =>
          gateway.deleteDish(token, { id: dish.id, expectedRevision: dish.revision }),
        )
      }
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
  );
}

export function DishVersionRow({
  dishId,
  onClose,
  gateway,
  pending,
  run,
  version,
}: Readonly<{
  onClose: () => void;
  dishId: string;
  gateway: CatalogGateway;
  pending: boolean;
  run: (success: string, operation: (token: string) => Promise<void>) => Promise<boolean>;
  version: DishVersion;
}>) {
  const ensureDraft = useFoodDraft(version);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const publish =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publish';
    void run(publish ? 'Đã lưu và công bố món ăn.' : 'Đã lưu bản nháp món ăn.', async (token) => {
      const draft = await ensureDraft((input) => gateway.cloneDish(token, { dishId, ...input }));
      const revision = await gateway.updateDishDraft(token, {
        versionId: draft.id,
        expectedRevision: draft.revision,
        name: text(data, 'name'),
        description: text(data, 'description'),
        categoryLabel: text(data, 'categoryLabel'),
        priceVnd: optionalInteger(data, 'priceVnd'),
      });
      draft.revision = revision;
      if (publish)
        await gateway.publishDish(token, {
          versionId: draft.id,
          expectedRevision: revision,
        });
    }).then((ok) => {
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
        label="Tên món bản nháp"
        name="name"
        defaultValue={version.name}
      />
      <LabeledInput
        disabled={pending}
        label="Nhóm món bản nháp"
        name="categoryLabel"
        defaultValue={version.categoryLabel}
      />
      <LabeledInput
        disabled={pending}
        label="Mô tả món bản nháp"
        name="description"
        as="textarea"
        defaultValue={version.description}
        required={false}
      />
      <LabeledInput
        disabled={pending}
        label="Giá món bản nháp (VND)"
        name="priceVnd"
        type="number"
        min={0}
        step={1}
        defaultValue={version.priceVnd ?? ''}
        required={false}
      />
      <div className={cx.formActions}>
        <button className={cx.secondaryButton} type="button" disabled={pending} onClick={onClose}>
          Hủy
        </button>
        <button className={cx.secondaryButton} type="submit" disabled={pending}>
          Lưu bản nháp
        </button>
        <button
          className={cx.primaryButton}
          type="submit"
          name="action"
          value="publish"
          disabled={pending}
        >
          Lưu và công bố
        </button>
      </div>
    </form>
  );
}
