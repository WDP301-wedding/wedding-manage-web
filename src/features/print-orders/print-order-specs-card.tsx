import { Badge } from '../../components/ui/badge';
import { cardClass, cardTitleClass, hintClass } from './print-order-classes';
import { formatVnd, type PrintOrderView } from './print-orders-types';

export interface PrintOrderSpecsCardProps {
  selectedOrder: PrintOrderView;
}

export function PrintOrderSpecsCard({ selectedOrder }: Readonly<PrintOrderSpecsCardProps>) {
  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={cardTitleClass}>Dòng thiết kế đã chốt</h3>
        <Badge variant="neutral">{selectedOrder.lines.length} dòng</Badge>
      </div>

      <ul className="flex flex-col">
        {selectedOrder.lines.map((line, idx) => {
          const quotedLine = selectedOrder.currentCommercialRevision?.lines.find(
            (ql) => ql.lineId === line.lineId,
          );
          return (
            <li
              key={line.lineId}
              className="flex flex-col gap-1 border-t border-border py-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-baseline justify-between gap-3">
                <strong className="font-semibold">
                  {idx + 1}. {line.displayVariant ?? `Bản in ${line.designId}`}
                </strong>
                <span className="text-xs whitespace-nowrap tabular-nums">
                  {line.quantity} bản in
                </span>
              </div>
              <span className={hintClass}>
                Mã thiết kế: <code className="font-mono">{line.designId}</code>
              </span>
              <span className={hintClass}>
                Phiên bản bản in:{' '}
                <code className="font-mono">
                  {line.printableRevisionId ?? 'Chưa gán phiên bản in ấn'}
                </code>
              </span>
              {quotedLine ? (
                <span className="text-xs tabular-nums">
                  Đơn giá: {formatVnd(quotedLine.unitPriceVnd)}/bản (
                  {formatVnd(quotedLine.lineTotalVnd)})
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!selectedOrder.lines.some((line) => line.printableRevisionId) ? (
        <p className={hintClass}>Các dòng in lịch sử này chưa có bản xem trước được lưu.</p>
      ) : null}
    </section>
  );
}
