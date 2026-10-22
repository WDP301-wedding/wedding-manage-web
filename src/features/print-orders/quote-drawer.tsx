'use client';

import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import { useFocusTrap } from './focus-trap';
import { XIcon } from './icons';
import { printOrderStyles } from './print-orders.styles';
import {
  computeQuotedLineTotal,
  formatVnd,
  isCommercialRevisionExpired,
  isValidFutureHandoverDate,
  MAX_LINE_UNIT_PRICE_VND,
  MIN_LINE_UNIT_PRICE_VND,
  toVietnamBusinessIsoString,
  type PrintOrderView,
  type QuotePrintOrderBody,
} from './print-orders-types';

export interface QuoteDrawerProps {
  order: PrintOrderView;
  isReplacementProposal: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (body: QuotePrintOrderBody) => void;
}

export function QuoteDrawer({
  order,
  isReplacementProposal,
  isSubmitting,
  onClose,
  onSubmit,
}: QuoteDrawerProps) {
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    order.lines.forEach((l) => {
      const existing = order.currentCommercialRevision?.lines.find((ql) => ql.lineId === l.lineId);
      map[l.lineId] = existing?.unitPriceVnd ?? 85000;
    });
    return map;
  });

  const [rawInputs, setRawInputs] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    order.lines.forEach((l) => {
      const existing = order.currentCommercialRevision?.lines.find((ql) => ql.lineId === l.lineId);
      map[l.lineId] = String(existing?.unitPriceVnd ?? 85000);
    });
    return map;
  });

  const [handoverDate, setHandoverDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0] ?? '';
  });

  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const [dateError, setDateError] = useState<string | null>(null);

  const drawerRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap({
    isOpen: true,
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
    onClose,
  });

  const handlePriceChange = (lineId: string, valStr: string) => {
    setRawInputs((prev) => ({ ...prev, [lineId]: valStr }));

    // Reject negative numbers or decimals
    if (valStr.includes('-')) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: 'Đơn giá không được là số âm.',
      }));
      return;
    }
    if (valStr.includes('.') || valStr.includes(',')) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: 'Đơn giá phải là số nguyên dương VND, không chứa phần thập phân.',
      }));
      return;
    }

    const trimmed = valStr.trim();
    if (trimmed === '') {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: 'Vui lòng nhập đơn giá.',
      }));
      return;
    }

    if (!/^\d+$/.test(trimmed)) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: 'Đơn giá chỉ được chứa các chữ số.',
      }));
      return;
    }

    const num = parseInt(trimmed, 10);
    if (Number.isNaN(num) || num < MIN_LINE_UNIT_PRICE_VND) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: `Đơn giá tối thiểu là ${MIN_LINE_UNIT_PRICE_VND} ₫.`,
      }));
    } else if (num > MAX_LINE_UNIT_PRICE_VND) {
      setPriceErrors((prev) => ({
        ...prev,
        [lineId]: `Đơn giá không được vượt quá ${formatVnd(MAX_LINE_UNIT_PRICE_VND)}.`,
      }));
    } else {
      setPriceErrors((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
      setUnitPrices((prev) => ({ ...prev, [lineId]: num }));
    }
  };

  const handleDateChange = (valStr: string) => {
    setHandoverDate(valStr);
    if (!isValidFutureHandoverDate(valStr)) {
      setDateError('Ngày dự kiến bàn giao phải là ngày trong tương lai (tối thiểu từ ngày mai).');
    } else {
      setDateError(null);
    }
  };

  const calculatedTotal = useMemo(() => {
    return order.lines.reduce((sum, l) => {
      const price = unitPrices[l.lineId] ?? 0;
      return sum + computeQuotedLineTotal(l.quantity, price);
    }, 0);
  }, [order.lines, unitPrices]);

  const hasErrors =
    Object.keys(priceErrors).length > 0 ||
    dateError !== null ||
    order.lines.some((l) => (unitPrices[l.lineId] ?? 0) < MIN_LINE_UNIT_PRICE_VND);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors || isSubmitting) return;

    if (!isValidFutureHandoverDate(handoverDate)) {
      setDateError('Ngày dự kiến bàn giao phải là ngày trong tương lai (tối thiểu từ ngày mai).');
      return;
    }

    const payload: QuotePrintOrderBody = {
      expectedRevision: order.revision,
      lines: order.lines.map((l) => ({
        lineId: l.lineId,
        unitPriceVnd: unitPrices[l.lineId] ?? 85000,
      })),
      estimatedHandoverAt: toVietnamBusinessIsoString(handoverDate, 17, 0),
    };
    onSubmit(payload);
  };

  return (
    <>
      <div className="v0-drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
        className="v0-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={
          isReplacementProposal
            ? 'Đề xuất thay thế đơn in'
            : order.status === 'REQUESTED'
              ? 'Lập báo giá thương mại'
              : 'Gửi báo giá mới'
        }
        tabIndex={-1}
      >
        <div className="v0-drawer-head">
          <div>
            <h2>
              {isReplacementProposal
                ? `Đề xuất thay thế · ${order.orderId}`
                : order.status === 'REQUESTED'
                  ? `Báo giá thương mại · ${order.orderId}`
                  : `Gửi báo giá mới · ${order.orderId}`}
            </h2>
            <p>
              {isReplacementProposal
                ? 'Đề xuất mức giá mới cho đơn in đã duyệt. Sản xuất sẽ tạm dừng cho đến khi Couple duyệt lại.'
                : 'Nhập đơn giá cho từng dòng in ấn. Báo giá có hiệu lực trong 7 ngày.'}
            </p>
            {order.currentCommercialRevision &&
            isCommercialRevisionExpired(order.currentCommercialRevision) ? (
              <div style={printOrderStyles.drawerHeaderInfo}>
                <span className="v0-badge v0-badge-warning">Báo giá cũ đã hết hạn</span>
              </div>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="v0-icon-button"
            onClick={onClose}
            aria-label="Đóng bảng báo giá"
          >
            <XIcon width={20} height={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="v0-drawer-body">
          <div className="v0-form-group">
            <label className="v0-label">Phiên bản đơn in dự kiến (Expected revision)</label>
            <div className="v0-revision-badge-card">
              <div className="v0-revision-pill">
                <span className="v0-revision-tag">Revision {order.revision}</span>
                <span>Khóa phiên bản máy chủ hiện tại</span>
              </div>
              <span className="v0-revision-hint">Chống xung đột ghi đè đồng thời</span>
            </div>
          </div>

          <div className="v0-lines-edit-list">
            <div className="v0-lines-header">
              <label className="v0-label">Đơn giá từng dòng in (VND/bản)</label>
              <span className="v0-badge-count">{order.lines.length} dòng thiết kế</span>
            </div>
            {order.lines.map((line, idx) => {
              const currentPrice = unitPrices[line.lineId] ?? 0;
              const rawVal = rawInputs[line.lineId] ?? '';
              const lineError = priceErrors[line.lineId];
              const lineSubtotal = computeQuotedLineTotal(line.quantity, currentPrice);
              return (
                <div key={line.lineId} className="v0-line-edit-card">
                  <div className="v0-line-edit-header">
                    <div className="v0-line-title-group">
                      <span className="v0-line-index-badge">#{idx + 1}</span>
                      <strong className="v0-line-name">
                        {line.displayVariant ?? line.designId}
                      </strong>
                    </div>
                    <span className="v0-line-qty">{line.quantity} bản in</span>
                  </div>

                  <div className="v0-line-edit-input-row">
                    <div className="v0-price-input-box">
                      <span className="v0-price-currency">₫</span>
                      <input
                        type="text"
                        className={`v0-input ${lineError ? 'v0-input-error' : ''}`}
                        value={rawVal}
                        onChange={(e) => handlePriceChange(line.lineId, e.target.value)}
                        placeholder="Nhập đơn giá (VND)…"
                        aria-label={`Đơn giá dòng ${idx + 1}`}
                        required
                      />
                    </div>
                    <div className="v0-line-subtotal-display">
                      <span className="v0-subtotal-label">Thành tiền dòng:</span>
                      <strong className="v0-subtotal-value">
                        = {formatVnd(lineSubtotal)}
                      </strong>
                    </div>
                  </div>
                  {lineError ? <span className="v0-input-error-msg">{lineError}</span> : null}
                </div>
              );
            })}
          </div>

          <div className="v0-form-group">
            <label className="v0-label" htmlFor="handover-date-input">
              Ngày dự kiến bàn giao (giờ kinh doanh 17:00 VN)
            </label>
            <div className="v0-date-wrapper">
              <input
                id="handover-date-input"
                type="date"
                className={`v0-input ${dateError ? 'v0-input-error' : ''}`}
                value={handoverDate}
                onChange={(e) => handleDateChange(e.target.value)}
                required
              />
              <span className="v0-input-hint">Đảm bảo tối thiểu 5 ngày làm việc để xưởng in hoàn thiện</span>
            </div>
            {dateError ? <span className="v0-input-error-msg">{dateError}</span> : null}
          </div>

          <div className="v0-drawer-summary-card">
            <div className="v0-summary-main-row">
              <span className="v0-summary-title">Tổng giá trị báo giá (Xem trước client):</span>
              <strong className="v0-summary-amount">{formatVnd(calculatedTotal)}</strong>
            </div>
            <small>Số liệu chính thức do máy chủ tính toán và lưu vết bất biến.</small>
          </div>

          <div className="v0-drawer-actions">
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
              disabled={hasErrors || isSubmitting}
            >
              {isSubmitting
                ? 'Đang gửi…'
                : isReplacementProposal
                  ? 'Gửi đề xuất thay thế'
                  : `Tạo revision ${(order.currentCommercialRevision?.revisionNumber ?? 0) + 1}`}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
