'use client';

import { type FormEvent, useState } from 'react';
import { formatVnd } from '../../lib/formatters';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { IncidentalExpensesResponse } from '../../services/billing.service';

const fieldClass = 'flex min-w-0 flex-col gap-1';
const labelClass = 'text-xs font-semibold';

export interface IncidentalFormData {
  name: string;
  note?: string;
  quantity: number;
  unit: string;
  unitPriceVnd: number;
  sourceType?: 'CATALOG' | 'OTHER';
  offeringId?: string;
  reason?: string;
}

export function IncidentalCreateForm({
  disabled = false,
  loading = false,
  onSubmit,
  onCancel,
  pricing,
}: Readonly<{
  disabled?: boolean;
  loading?: boolean;
  onSubmit: (data: IncidentalFormData) => Promise<void>;
  onCancel: () => void;
  pricing?: IncidentalExpensesResponse['pricing'] | undefined;
}>) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(pricing ? 'khoản' : 'thùng');
  const [unitPriceVnd, setUnitPriceVnd] = useState(0);
  const [note, setNote] = useState('');
  const [selection, setSelection] = useState('OTHER');
  const [reason, setReason] = useState('');
  const selected = pricing?.find((p) => p.offeringId === selection);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || quantity <= 0 || unitPriceVnd < 0) return;

    await onSubmit({
      name: name.trim(),
      ...(note.trim() ? { note: note.trim() } : {}),
      quantity,
      unit: unit.trim(),
      unitPriceVnd,
      ...(pricing
        ? selected
          ? { sourceType: 'CATALOG' as const, offeringId: selected.offeringId }
          : { sourceType: 'OTHER' as const, reason: reason.trim() }
        : {}),
    });
  };

  const totalCalculated = quantity * unitPriceVnd;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-3 rounded-lg bg-muted p-4"
    >
      <h4 className="font-semibold">Ghi nhận chi phí phát sinh mới</h4>
      {pricing ? (
        <label className={fieldClass}>
          Hạng mục
          <select
            className="rounded-md border border-input bg-background p-2"
            value={selection}
            onChange={(e) => {
              setSelection(e.target.value);
              const item = pricing.find((p) => p.offeringId === e.target.value);
              setName(item?.name ?? '');
              setUnit(item?.unit ?? 'khoản');
              setUnitPriceVnd(item?.unitPriceVnd ?? 0);
            }}
          >
            <option value="OTHER">Khác — nhập mô tả và lý do</option>
            {pricing.map((p) => (
              <option key={p.offeringId} value={p.offeringId}>
                {p.name} · {formatVnd(p.unitPriceVnd)}/{p.unit}
              </option>
            ))}
          </select>
          {selected ? (
            <small>
              {selected.description} · {selected.chargingRule}
            </small>
          ) : null}
        </label>
      ) : null}
      {pricing && !selected ? (
        <label className={fieldClass}>
          Lý do phát sinh *
          <Input
            required
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="inc-name" className={labelClass}>
            Tên hạng mục *
          </label>
          <Input
            id="inc-name"
            readOnly={Boolean(selected)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="VD: Nước ngọt phát sinh"
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="inc-qty" className={labelClass}>
            Số lượng *
          </label>
          <Input
            id="inc-qty"
            type="number"
            min={1}
            className="tabular-nums"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="inc-unit" className={labelClass}>
            Đơn vị tính *
          </label>
          <Input
            id="inc-unit"
            readOnly={Boolean(selected)}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            required
          />
        </div>

        <div className={fieldClass}>
          <label htmlFor="inc-price" className={labelClass}>
            Đơn giá (VND) *
          </label>
          <Input
            id="inc-price"
            readOnly={Boolean(selected)}
            type="number"
            min={0}
            step={1}
            className="tabular-nums"
            value={unitPriceVnd}
            onChange={(e) => setUnitPriceVnd(Number(e.target.value))}
            required
            placeholder="VD: 300000"
          />
        </div>
      </div>

      <div className={fieldClass}>
        <label htmlFor="inc-note" className={labelClass}>
          Ghi chú / Biên bản bàn giao
        </label>
        <Input
          id="inc-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="VD: Theo yêu cầu của gia đình cô dâu / chú rể"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="text-xs text-muted-foreground">
          Thành tiền ước tính:{' '}
          <strong className="text-base text-primary tabular-nums">
            {formatVnd(totalCalculated)}
          </strong>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={disabled || loading}>
            {loading ? 'Đang lưu…' : 'Lưu phát sinh'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Huỷ
          </Button>
        </div>
      </div>
    </form>
  );
}
