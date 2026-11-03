'use client';

import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import type { CatalogDish, MenuWrite } from './catalog-api';
import { EditorHeading, formatVnd, integer, LabeledInput, move, text } from './food-catalog-shared';

import { cx } from './catalog-classes';
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
    <ol className={cx.orderList} aria-label="Thứ tự món trong gói">
      {items.map((id, index) => (
        <li key={id}>
          <span>{options.find((option) => option.id === id)?.label ?? id}</span>
          <div>
            <button
              type="button"
              className={cx.orderButton}
              aria-label={`Đưa món ${index + 1} lên`}
              disabled={index === 0}
              onClick={() => onChange(move(items, index, index - 1))}
            >
              <ArrowUp aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              className={cx.orderButton}
              aria-label={`Đưa món ${index + 1} xuống`}
              disabled={index === items.length - 1}
              onClick={() => onChange(move(items, index, index + 1))}
            >
              <ArrowDown aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              className={cx.orderButton}
              aria-label={`Bỏ món ${index + 1}`}
              onClick={() => onChange(items.filter((item) => item !== id))}
            >
              <X aria-hidden className="size-4" />
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

  const dishPriceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const dish of dishes) {
      for (const v of dish.versions) {
        if (typeof v.priceVnd === 'number') {
          map.set(v.id, v.priceVnd);
        }
      }
    }
    return map;
  }, [dishes]);

  const totalApertifPrice = useMemo(() => {
    return items.reduce((sum, id) => sum + (dishPriceMap.get(id) ?? 0), 0);
  }, [items, dishPriceMap]);

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
    <form className={cx.editor} aria-label="Tạo gói thực đơn" onSubmit={submit}>
      <EditorHeading title="Tạo gói thực đơn" />
      <LabeledInput label="Tên gói" name="name" />
      <LabeledInput label="Mô tả gói" name="description" as="textarea" />
      <LabeledInput
        label="Giá mỗi bàn (VND)"
        name="priceVndPerTable"
        type="number"
        min={1}
        step={1}
      />
      <div className={cx.field}>
        <label htmlFor="menu-dish-version">Món phiên bản</label>
        <div className={cx.inlineControl}>
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
            className={cx.secondaryButton}
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
      {items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            Tổng giá các món đơn lẻ ({items.length} món):
          </span>
          <strong className="font-semibold text-foreground">
            {formatVnd(totalApertifPrice)}
          </strong>
        </div>
      ) : null}
      {items.length === 0 ? (
        <p className={cx.help}>Thực đơn cần ít nhất một phiên bản món đã công bố.</p>
      ) : null}
      <button className={cx.primaryButton} type="submit" disabled={pending || items.length === 0}>
        Tạo bản nháp thực đơn
      </button>
    </form>
  );
}
