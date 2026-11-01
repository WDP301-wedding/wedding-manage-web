'use client';

import { cn } from 'cn';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DatePicker } from '../../design-system/date-picker';
import { dialogActionsClass, errorTextClass, hintClass, labelClass } from './print-order-classes';
import { PrintOrderDialog } from './print-order-dialog';
import {
  computeQuotedLineTotal,
  formatVnd,
  isCommercialRevisionExpired,
  type PrintOrderView,
  type QuotePrintOrderBody,
} from './print-orders-types';
import { useQuoteForm } from './use-quote-form';

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
  const form = useQuoteForm(order, isSubmitting, onSubmit);
  const label = isReplacementProposal
    ? 'Đề xuất thay thế đơn in'
    : order.status === 'REQUESTED'
      ? 'Lập báo giá thương mại'
      : 'Gửi báo giá mới';
  const expired =
    order.currentCommercialRevision !== null &&
    isCommercialRevisionExpired(order.currentCommercialRevision);

  return (
    <PrintOrderDialog
      variant="drawer"
      label={label}
      title={`${label} ${order.orderId}`}
      closeLabel="Đóng bảng báo giá"
      onClose={onClose}
      description={
        <div className="flex flex-col items-start gap-2">
          <p>
            {isReplacementProposal
              ? 'Đề xuất mức giá mới cho đơn in đã duyệt. Sản xuất sẽ tạm dừng cho đến khi Couple duyệt lại.'
              : 'Nhập đơn giá cho từng dòng in ấn. Báo giá có hiệu lực trong 7 ngày.'}
          </p>
          {expired ? <Badge variant="warning">Báo giá cũ đã hết hạn</Badge> : null}
        </div>
      }
    >
      <form onSubmit={form.handleSubmit} className="flex flex-col gap-5">
        <p className={hintClass}>Phiên bản đơn in dự kiến: {order.revision}</p>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 flex w-full items-center justify-between gap-2 text-xs font-semibold">
            Đơn giá từng dòng in (VND/bản)
            <span className="font-normal text-muted-foreground">
              {order.lines.length} dòng thiết kế
            </span>
          </legend>
          {order.lines.map((line, idx) => {
            const lineError = form.priceErrors[line.lineId];
            const lineSubtotal = computeQuotedLineTotal(
              line.quantity,
              form.unitPrices[line.lineId] ?? 0,
            );
            return (
              <div
                key={line.lineId}
                className="flex flex-col gap-2 rounded-lg border border-border p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <strong className="font-semibold">
                    {idx + 1}. {line.displayVariant ?? line.designId}
                  </strong>
                  <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    {line.quantity} bản in
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Input
                    className={cn(
                      'max-w-[200px] font-normal tabular-nums',
                      lineError && 'border-destructive',
                    )}
                    inputMode="numeric"
                    value={form.rawInputs[line.lineId] ?? ''}
                    onChange={(e) => form.handlePriceChange(line.lineId, e.target.value)}
                    placeholder="Nhập đơn giá (VND)…"
                    aria-label={`Đơn giá dòng ${idx + 1}`}
                    aria-invalid={Boolean(lineError)}
                    required
                  />
                  <span className="text-xs text-muted-foreground">
                    Thành tiền dòng:{' '}
                    <strong className="text-sm text-foreground tabular-nums">
                      {formatVnd(lineSubtotal)}
                    </strong>
                  </span>
                </div>
                {lineError ? <span className={errorTextClass}>{lineError}</span> : null}
              </div>
            );
          })}
        </fieldset>

        <div className={labelClass}>
          <label htmlFor="handover-date-input">
            Ngày dự kiến bàn giao (giờ kinh doanh 17:00 VN)
          </label>
          <DatePicker
            id="handover-date-input"
            value={form.handoverDate}
            onChange={form.handleDateChange}
            hasError={Boolean(form.dateError)}
            required
          />
          <span className="font-normal text-muted-foreground">
            Đảm bảo tối thiểu 5 ngày làm việc để xưởng in hoàn thiện
          </span>
          {form.dateError ? <span className={errorTextClass}>{form.dateError}</span> : null}
        </div>

        <div className="flex flex-col gap-1 rounded-lg bg-muted px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold">Tổng giá trị báo giá (tạm tính):</span>
            <strong className="text-lg font-bold text-primary tabular-nums">
              {formatVnd(form.calculatedTotal)}
            </strong>
          </div>
          <small className={hintClass}>Số liệu chính thức do máy chủ tính toán và lưu vết.</small>
        </div>

        <div className={dialogActionsClass}>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button type="submit" disabled={form.hasErrors || isSubmitting}>
            {isSubmitting
              ? 'Đang gửi…'
              : isReplacementProposal
                ? 'Gửi đề xuất thay thế'
                : `Tạo revision ${(order.currentCommercialRevision?.revisionNumber ?? 0) + 1}`}
          </Button>
        </div>
      </form>
    </PrintOrderDialog>
  );
}
