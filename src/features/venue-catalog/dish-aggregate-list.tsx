'use client';

import { type FormEvent } from 'react';
import type { CatalogDish, CatalogGateway, DishWrite } from './catalog-api';
import {
  EditorHeading,
  LabeledInput,
  optionalInteger,
  text,
  VersionSummary,
  formatVnd,
  type DishVersion,
} from './food-catalog-shared';

import { cx } from './catalog-classes';
import { FoodRecordCard, latestFoodVersion } from './food-record-card';
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
  const label = version.name;
  return (
    <FoodRecordCard
      label={label}
      lifecycle={dish.lifecycle}
      draft={version.state === 'DRAFT'}
      price={version.priceVnd}
      pending={pending}
      summary={<p>{version.categoryLabel}</p>}
      details={
        <>
          <p className="text-sm text-muted-foreground">{version.description || 'Chưa có mô tả.'}</p>
          <p className="text-sm">Nhóm món: {version.categoryLabel}</p>
          <p className="font-semibold text-primary">
            {version.priceVnd === null ? 'Chưa niêm yết giá' : formatVnd(version.priceVnd)}
          </p>
        </>
      }
      editor={
        version.state === 'DRAFT' ? (
          <DishVersionRow
            key={`${version.id}-${version.revision}`}
            dishId={dish.id}
            version={version}
            gateway={gateway}
            pending={pending}
            run={run}
            canClone={false}
          />
        ) : (
          <p role="status">Đang mở trình chỉnh sửa…</p>
        )
      }
      onEdit={() =>
        version.state === 'DRAFT'
          ? Promise.resolve(true)
          : run('Đã mở bản chỉnh sửa món ăn.', (token) =>
              gateway.cloneDish(token, {
                dishId: dish.id,
                sourceVersionId: version.id,
                versionId: crypto.randomUUID(),
              }),
            )
      }
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
      <div className={cx.versionRow}>
        <VersionSummary version={version} price={version.priceVnd} />
      </div>
    );
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const publish =
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'publish';
    void run(publish ? 'Đã lưu và công bố món ăn.' : 'Đã lưu bản nháp món ăn.', async (token) => {
      const revision = await gateway.updateDishDraft(token, {
        versionId: version.id,
        expectedRevision: version.revision,
        name: text(data, 'name'),
        description: text(data, 'description'),
        categoryLabel: text(data, 'categoryLabel'),
        priceVnd: optionalInteger(data, 'priceVnd'),
      });
      if (publish)
        await gateway.publishDish(token, { versionId: version.id, expectedRevision: revision });
    });
  };
  return (
    <form className={cx.draftForm} aria-label={`Bản nháp ${version.name}`} onSubmit={submit}>
      <span className={cx.versionState}>Chỉnh sửa món ăn</span>
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
        required={false}
      />
      <LabeledInput
        label="Giá món bản nháp (VND)"
        name="priceVnd"
        type="number"
        min={0}
        step={1}
        defaultValue={version.priceVnd ?? ''}
        required={false}
      />
      <div className={cx.formActions}>
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
