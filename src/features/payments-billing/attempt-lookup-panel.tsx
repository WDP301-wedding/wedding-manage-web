'use client';

import type { AttemptView } from './billing-api';
import { AttemptStatus } from './billing-display';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export interface AttemptLookupPanelProps {
  disabled: boolean;
  attemptId: string;
  setAttemptId: (id: string) => void;
  attempt: AttemptView | null;
  onLookup: () => void;
}

export function AttemptLookupPanel({
  disabled,
  attemptId,
  setAttemptId,
  attempt,
  onLookup,
}: Readonly<AttemptLookupPanelProps>) {
  return (
    <section className="flex min-w-0 flex-[1_1_340px] flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-hy-1">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold">Tra cứu trạng thái giao dịch</h2>
        <p className="text-xs text-muted-foreground">
          Nhập mã giao dịch thanh toán để xem kết quả và tình trạng cập nhật hồ sơ.
        </p>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onLookup();
        }}
      >
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Mã giao dịch thanh toán
          <Input
            className="font-normal"
            value={attemptId}
            onChange={(event) => setAttemptId(event.target.value)}
            required
            disabled={disabled}
            placeholder="Nhập mã giao dịch thanh toán…"
          />
        </label>
        <Button type="submit" variant="outline" className="self-start" disabled={disabled}>
          Tra cứu giao dịch
        </Button>
      </form>
      {attempt !== null && <AttemptStatus attempt={attempt} />}
    </section>
  );
}
