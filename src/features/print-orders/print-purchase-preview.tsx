'use client';

import { formatVnd, type PrintOrderView } from './print-orders-types';
import { RetainedPrintPreview } from './retained-print-preview';

export function PrintPurchasePreview({
  order,
  authorize,
}: Readonly<{
  order: PrintOrderView;
  authorize: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
}>) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold">Bản in theo mẫu</h3>
      {order.lines.map((line, index) => {
        const title = line.displayVariant ?? `Mẫu ${index + 1}`;
        const quotedLine = order.currentCommercialRevision?.lines.find(
          (item) => item.lineId === line.lineId,
        );
        const summary = quotedLine
          ? `${line.quantity} bản · ${formatVnd(quotedLine.unitPriceVnd)}/bản · ${formatVnd(quotedLine.lineTotalVnd)}`
          : `${line.quantity} bản`;
        return line.printableRevisionId ? (
          <RetainedPrintPreview
            key={`${line.lineId}:${line.printableRevisionId}`}
            bookingId={order.bookingId}
            printableRevisionId={line.printableRevisionId}
            title={title}
            summary={summary}
            authorize={authorize}
          />
        ) : (
          <div
            key={line.lineId}
            className="flex min-w-0 flex-col gap-1 rounded-lg border border-border p-4 text-sm"
          >
            <strong className="font-semibold [overflow-wrap:anywhere]">{title}</strong>
            <p className="text-xs text-muted-foreground">{summary}</p>
            <p className="text-muted-foreground">Chưa có bản in được lưu.</p>
          </div>
        );
      })}
    </section>
  );
}
