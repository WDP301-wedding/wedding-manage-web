'use client';

import { type FormEvent, useRef, useState } from 'react';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { dialogActionsClass, labelClass } from '@/src/features/print-orders/styles/print-order-classes';
import { PrintQueueDialog } from './print-queue-dialog';
import type { PrintOrderView } from '@/src/features/print-orders/types/print-orders-types';

export interface HandoverModalProps {
  order: PrintOrderView;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (evidenceReference: string) => void;
}

export function HandoverModal({ order, isSubmitting, onClose, onConfirm }: HandoverModalProps) {
  const [evidence, setEvidence] = useState(`BBBG-${order.orderId}`);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!evidence.trim() || isSubmitting) return;
    onConfirm(evidence.trim());
  };

  return (
    <PrintQueueDialog
      label="Xác nhận bàn giao"
      title={`Bàn giao đơn in ${order.orderId}`}
      onClose={onClose}
      initialFocusRef={inputRef}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p>
          Vui lòng nhập mã biên bản hoặc mã chứng từ giao nhận tại nhà hàng để hoàn tất việc bàn
          giao ấn phẩm cho tiệc cưới.
        </p>
        <label className={labelClass} htmlFor="evidence-input">
          Mã chứng từ / Biên bản bàn giao
          <Input
            ref={inputRef}
            id="evidence-input"
            className="font-normal"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Ví dụ: BG-2408-014-KHO"
            maxLength={120}
            required
          />
        </label>
        <div className={dialogActionsClass}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" disabled={!evidence.trim() || isSubmitting}>
            {isSubmitting ? 'Đang xử lý…' : 'Xác nhận bàn giao'}
          </Button>
        </div>
      </form>
    </PrintQueueDialog>
  );
}
