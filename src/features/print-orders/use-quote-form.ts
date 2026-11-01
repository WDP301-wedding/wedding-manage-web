import { type FormEvent, useMemo, useState } from 'react';
import {
  computeQuotedLineTotal,
  formatVnd,
  isValidFutureHandoverDate,
  MAX_LINE_UNIT_PRICE_VND,
  MIN_LINE_UNIT_PRICE_VND,
  toVietnamBusinessIsoString,
  type PrintOrderView,
  type QuotePrintOrderBody,
} from './print-orders-types';

const DEFAULT_UNIT_PRICE = 85000;
const DATE_ERROR = 'Ngày dự kiến bàn giao phải là ngày trong tương lai (tối thiểu từ ngày mai).';

function existingPrice(order: PrintOrderView, lineId: string): number {
  return (
    order.currentCommercialRevision?.lines.find((ql) => ql.lineId === lineId)?.unitPriceVnd ??
    DEFAULT_UNIT_PRICE
  );
}

/** Lỗi của ô đơn giá theo chữ người dùng gõ, hoặc null khi hợp lệ. */
export function unitPriceError(valStr: string): string | null {
  if (valStr.includes('-')) return 'Đơn giá không được là số âm.';
  if (valStr.includes('.') || valStr.includes(',')) {
    return 'Đơn giá phải là số nguyên dương VND, không chứa phần thập phân.';
  }
  const trimmed = valStr.trim();
  if (trimmed === '') return 'Vui lòng nhập đơn giá.';
  if (!/^\d+$/.test(trimmed)) return 'Đơn giá chỉ được chứa các chữ số.';
  const num = parseInt(trimmed, 10);
  if (num < MIN_LINE_UNIT_PRICE_VND) return `Đơn giá tối thiểu là ${MIN_LINE_UNIT_PRICE_VND} ₫.`;
  if (num > MAX_LINE_UNIT_PRICE_VND) {
    return `Đơn giá không được vượt quá ${formatVnd(MAX_LINE_UNIT_PRICE_VND)}.`;
  }
  return null;
}

export function useQuoteForm(
  order: PrintOrderView,
  isSubmitting: boolean,
  onSubmit: (body: QuotePrintOrderBody) => void,
) {
  const [unitPrices, setUnitPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(order.lines.map((l) => [l.lineId, existingPrice(order, l.lineId)])),
  );
  const [rawInputs, setRawInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.lines.map((l) => [l.lineId, String(existingPrice(order, l.lineId))])),
  );
  const [handoverDate, setHandoverDate] = useState(
    () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
  );
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const [dateError, setDateError] = useState<string | null>(null);

  const handlePriceChange = (lineId: string, valStr: string) => {
    setRawInputs((prev) => ({ ...prev, [lineId]: valStr }));
    const error = unitPriceError(valStr);
    if (error) {
      setPriceErrors((prev) => ({ ...prev, [lineId]: error }));
      return;
    }
    setPriceErrors((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
    setUnitPrices((prev) => ({ ...prev, [lineId]: parseInt(valStr.trim(), 10) }));
  };

  const handleDateChange = (valStr: string) => {
    setHandoverDate(valStr);
    setDateError(isValidFutureHandoverDate(valStr) ? null : DATE_ERROR);
  };

  const calculatedTotal = useMemo(
    () =>
      order.lines.reduce(
        (sum, l) => sum + computeQuotedLineTotal(l.quantity, unitPrices[l.lineId] ?? 0),
        0,
      ),
    [order.lines, unitPrices],
  );

  const hasErrors =
    Object.keys(priceErrors).length > 0 ||
    dateError !== null ||
    order.lines.some((l) => (unitPrices[l.lineId] ?? 0) < MIN_LINE_UNIT_PRICE_VND);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (hasErrors || isSubmitting) return;
    if (!isValidFutureHandoverDate(handoverDate)) {
      setDateError(DATE_ERROR);
      return;
    }
    onSubmit({
      expectedRevision: order.revision,
      lines: order.lines.map((l) => ({
        lineId: l.lineId,
        unitPriceVnd: unitPrices[l.lineId] ?? DEFAULT_UNIT_PRICE,
      })),
      estimatedHandoverAt: toVietnamBusinessIsoString(handoverDate, 17, 0),
    });
  };

  return {
    unitPrices,
    rawInputs,
    priceErrors,
    handoverDate,
    dateError,
    calculatedTotal,
    hasErrors,
    handlePriceChange,
    handleDateChange,
    handleSubmit,
  };
}
