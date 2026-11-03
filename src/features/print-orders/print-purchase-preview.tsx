'use client';

import type { PrintOrderView } from './print-orders-types';
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
      <h3 className="font-semibold">Các mẫu in đã chốt</h3>
      <p className="text-sm text-muted-foreground">
        Mỗi mẫu giữ đúng phiên bản được hai bên đồng ý, kể cả khi thiệp điện tử tiếp tục được sửa.
      </p>
      {order.lines.map((line, index) =>
        line.printableRevisionId ? (
          <RetainedPrintPreview
            key={`${line.lineId}:${line.printableRevisionId}`}
            bookingId={order.bookingId}
            printableRevisionId={line.printableRevisionId}
            title={line.displayVariant ?? `Mẫu ${index + 1} · ${line.quantity} thiệp`}
            authorize={authorize}
          />
        ) : (
          <p key={line.lineId} className="text-sm text-muted-foreground">
            Mẫu {index + 1} chưa có bản in được lưu.
          </p>
        ),
      )}
    </section>
  );
}
