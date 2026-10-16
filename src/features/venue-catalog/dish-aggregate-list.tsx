'use client';

import { type FormEvent } from 'react';
import type { CatalogDish, CatalogGateway, DishWrite } from './catalog-api';
import {
  AggregateHeader,
  EditorHeading,
  LabeledInput,
  optionalInteger,
  text,
  VersionSummary,
  type DishVersion,
} from './food-catalog-shared';

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

export function DishVersionRow({
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
