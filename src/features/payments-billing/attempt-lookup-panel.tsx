'use client';

import type { AttemptView } from './billing-api';
import { AttemptStatus } from './billing-display';

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
    <section className="billing-panel">
      <h2>Tra cứu trạng thái giao dịch</h2>
      <p>Nhập mã giao dịch thanh toán để xem kết quả và tình trạng cập nhật hồ sơ.</p>
      <form
        className="billing-lookup"
        onSubmit={(event) => {
          event.preventDefault();
          onLookup();
        }}
      >
        <label>
          Mã giao dịch thanh toán
          <input
            value={attemptId}
            onChange={(event) => setAttemptId(event.target.value)}
            required
            disabled={disabled}
          />
        </label>
        <button disabled={disabled}>Tra cứu giao dịch</button>
      </form>
      {attempt !== null && <AttemptStatus attempt={attempt} />}
    </section>
  );
}
