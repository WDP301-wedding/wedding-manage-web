'use client';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  offeringCatalogs,
  type OfferingDraft,
  type OfferingItem,
  type OfferingKind,
} from './offering-catalog-api';

export function OfferingCatalogForm({
  kind,
  editing,
  draft,
  setDraft,
  pending,
  disabled,
  onSubmit,
  onCancel,
}: {
  kind: OfferingKind;
  editing: OfferingItem | null;
  draft: OfferingDraft;
  setDraft: (draft: OfferingDraft) => void;
  pending: boolean;
  disabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const config = offeringCatalogs[kind];
  const fields: {
    key: 'name' | 'description' | 'unit' | 'chargingRule';
    label: string;
    max: number;
    required: boolean;
  }[] = [
    { key: 'name', label: config.nameLabel, max: 120, required: true },
    { key: 'description', label: 'Mô tả / quy cách', max: 2000, required: kind === 'incidentals' },
    { key: 'unit', label: 'Đơn vị tính', max: 80, required: true },
    ...(kind === 'incidentals'
      ? [{ key: 'chargingRule' as const, label: 'Quy tắc tính phí', max: 1000, required: true }]
      : []),
  ];
  return (
    <form onSubmit={onSubmit} className="min-w-0 border-t border-border pt-5">
      <fieldset disabled={pending || disabled} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <legend className="mb-4 max-w-full text-base font-semibold [overflow-wrap:anywhere]">
          {editing ? `Sửa ${editing.name}` : config.addLabel}
        </legend>
        {fields.map(({ key, label, max, required }) => (
          <label key={key} className="flex min-w-0 flex-col gap-1.5 text-sm">
            {label}
            <Input
              required={required}
              maxLength={max}
              value={draft[key]}
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
            />
          </label>
        ))}
        <label className="flex min-w-0 flex-col gap-1.5 text-sm">
          Đơn giá (VND)
          <Input
            type="number"
            min={0}
            max={Number.MAX_SAFE_INTEGER}
            step={1}
            required
            value={draft.unitPriceVnd}
            onChange={(event) => setDraft({ ...draft, unitPriceVnd: Number(event.target.value) })}
          />
        </label>
        <div className="flex min-w-0 flex-wrap gap-2 sm:col-span-2">
          <Button type="submit">{pending ? 'Đang lưu…' : config.saveLabel}</Button>
          {editing ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy chỉnh sửa
            </Button>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
