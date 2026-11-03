'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';
import type { AppendixRevisionItem } from '../../services/contract.service';

export type PrintAdjustment = Readonly<{
  quantities: Readonly<Record<string, number>>;
  reason: string;
}>;

export function AppendixPrintAdjustment({
  appendix,
  disabled,
  onSave,
}: Readonly<{
  appendix: AppendixRevisionItem;
  disabled: boolean;
  onSave: (input: PrintAdjustment) => Promise<boolean>;
}>) {
  const sources = new Set(
    (appendix.printRequests ?? []).flatMap((request) =>
      request.document.lines.map((line) => line.line.sourceId),
    ),
  );
  const prints = appendix.document.afterLines.filter(
    (line) => line.category === 'PRINT' && sources.has(line.sourceId),
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(prints.map((line) => [line.sourceId, line.quantity])),
  );
  const [reason, setReason] = useState('Điều chỉnh số lượng in thiệp');
  const [open, setOpen] = useState(false);
  if (!prints.length) return null;
  const changed = prints.some((line) => quantities[line.sourceId] !== line.quantity);
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Điều chỉnh số lượng in qua phụ lục mới
      </Button>
      {open ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!changed || disabled) return;
            void onSave({ quantities, reason }).then((saved) => {
              if (saved) setOpen(false);
            });
          }}
        >
          <p className="text-xs text-muted-foreground">
            Nhập 0 để bỏ mẫu. Phụ lục mới không kế thừa phê duyệt; cần gửi duyệt và được cả hai bên
            đồng ý. Đơn in hiện tại chỉ cập nhật khi phụ lục mới có hiệu lực. Mẫu đã vào sản xuất
            không thể điều chỉnh.
          </p>
          {prints.map((line) => (
            <label key={line.sourceId} className="flex flex-col gap-1 text-sm">
              Số lượng: {line.name}
              <input
                type="number"
                min={0}
                max={10000}
                step={1}
                required
                value={quantities[line.sourceId] ?? line.quantity}
                disabled={disabled}
                onChange={(event) =>
                  setQuantities((prior) => ({
                    ...prior,
                    [line.sourceId]: Number(event.target.value),
                  }))
                }
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm">
            Lý do điều chỉnh
            <input
              required
              maxLength={500}
              value={reason}
              disabled={disabled}
              onChange={(event) => setReason(event.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            />
          </label>
          <Button type="submit" disabled={disabled || !changed || !reason.trim()}>
            Lưu phụ lục điều chỉnh
          </Button>
        </form>
      ) : null}
    </section>
  );
}
