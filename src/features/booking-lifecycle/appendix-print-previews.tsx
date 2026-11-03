'use client';

import type { AppendixRevisionItem } from '../../services/contract.service';
import { RetainedPrintPreview } from '../print-orders/retained-print-preview';

export function AppendixPrintPreviews({ appendix }: Readonly<{ appendix: AppendixRevisionItem }>) {
  const lines = (appendix.printRequests ?? []).flatMap((request) => request.document.lines);
  if (!lines.length) return null;
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Các mẫu in trong phụ lục">
      <h4 className="font-semibold">Bản in được Couple xác nhận</h4>
      <p className="text-xs text-muted-foreground">
        Kiểm tra từng mẫu trước khi duyệt phụ lục. Mẫu in được giữ nguyên theo phiên bản đã chốt.
      </p>
      {lines.map((print) => {
        const effectiveLine = appendix.document.afterLines.find(
          (line) => line.category === 'PRINT' && line.sourceId === print.line.sourceId,
        );
        return (
          <div key={print.line.sourceId} className="flex min-w-0 flex-col gap-2">
            <p className="text-sm">
              {effectiveLine
                ? `${effectiveLine.quantity.toLocaleString('vi-VN')} thiệp · ${effectiveLine.unitPriceVnd.toLocaleString('vi-VN')} đ/thiệp`
                : 'Mẫu được đề nghị bỏ khỏi phụ lục này'}
            </p>
            <RetainedPrintPreview
              key={print.printableRevisionId}
              bookingId={appendix.document.bookingId}
              printableRevisionId={print.printableRevisionId}
              title={print.title}
            />
          </div>
        );
      })}
    </section>
  );
}
