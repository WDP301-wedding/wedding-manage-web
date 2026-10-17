'use client';

import type React from 'react';
import { useRef, useState } from 'react';
import { useFocusTrap } from './focus-trap';
import { XIcon } from './icons';
import type { PrintOrderView } from './print-orders-types';

export interface HandoverModalProps {
  order: PrintOrderView;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (evidenceReference: string) => void;
}

export function HandoverModal({ order, isSubmitting, onClose, onConfirm }: HandoverModalProps) {
  const [evidence, setEvidence] = useState(`BBBG-${order.orderId}`);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
    onClose,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidence.trim() || isSubmitting) return;
    onConfirm(evidence.trim());
  };

  return (
    <>
      <div className="v0-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="v0-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận bàn giao"
      >
        <div className="v0-modal-head">
          <h3>Bàn giao đơn in · {order.orderId}</h3>
          <button
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <XIcon width={18} height={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="v0-modal-body">
          <p>
            Vui lòng nhập mã biên bản hoặc mã chứng từ giao nhận tại nhà hàng để hoàn tất việc bàn
            giao ấn phẩm cho tiệc cưới:
          </p>
          <div className="v0-form-group">
            <label className="v0-label" htmlFor="evidence-input">
              Mã chứng từ / Biên bản bàn giao:
            </label>
            <input
              ref={inputRef}
              id="evidence-input"
              type="text"
              className="v0-input"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Ví dụ: BG-2408-014-KHO"
              maxLength={120}
              required
            />
          </div>
          <div className="v0-modal-actions">
            <button
              type="button"
              className="v0-button v0-button-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="v0-button v0-button-primary"
              disabled={!evidence.trim() || isSubmitting}
            >
              {isSubmitting ? 'Đang xử lý…' : 'Xác nhận bàn giao'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
