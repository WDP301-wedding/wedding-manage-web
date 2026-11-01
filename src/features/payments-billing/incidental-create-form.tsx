'use client';

import { type FormEvent, useState } from 'react';
import { formatVnd } from '../../lib/formatters';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const fieldClass = 'flex min-w-0 flex-col gap-1';
const labelClass = 'text-xs font-semibold';

export interface IncidentalFormData {
  name: string;
  note?: string;
  quantity: number;
  unit: string;
  unitPriceVnd: number;
}

export function IncidentalCreateForm({
  disabled = false,
  loading = false,
  onSubmit,
  onCancel,
}: Readonly<{
  disabled?: boolean;
  loading?: boolean;
  onSubmit: (data: IncidentalFormData) => Promise<void>;
  onCancel: () => void;
}>) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('thùng');
  const [unitPriceVnd, setUnitPriceVnd] = useState(0);
  const [note, setNote] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || quantity <= 0 || unitPriceVnd < 0) return;

    await onSubmit({
      name: name.trim(),
      ...(note.trim() ? { note: note.trim() } : {}),
      quantity,
      unit: unit.trim(),
      unitPriceVnd,
    });
  };

  const totalCalculated = quantity * unitPriceVnd;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-3 rounded-lg bg-muted p-4"
    >
      <h4 className="font-semibold">Ghi nhận chi phí phát sinh mới</h4>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={fieldClass}>
          <label htmlFor="inc-name" className={labelClass}>
            Tên hạng mục *
          </label>
          <Input
            id="inc-name"
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
          <Input id="inc-unit" value={unit} onChange={(e) => setUnit(e.target.value)} required />
        </div>

        <div className={fieldClass}>
          <label htmlFor="inc-price" className={labelClass}>
            Đơn giá (VND) *
          </label>
          <Input
            id="inc-price"
            type="number"
            min={0}
            step={1}
            className="tabular-nums"
            value={unitPriceVnd || ''}
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
