import type { ReactNode } from 'react';
import { cardClass, cardTitleClass } from './print-order-classes';
import {
  formatVietnameseDate,
  formatVnd,
  isCommercialRevisionExpired,
  isOrderApprovedOrBeyond,
  type PrintOrderView,
} from './print-orders-types';

export interface PrintOrderCommercialCardProps {
  selectedOrder: PrintOrderView;
}

function Row({ term, children }: Readonly<{ term: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-border py-2.5 first:border-t-0 first:pt-0">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function priceTerm(status: PrintOrderView['status']): string {
  if (isOrderApprovedOrBeyond(status)) return 'Giá đã chấp thuận';
  if (status === 'QUOTED') return 'Giá chào báo giá (Chờ duyệt)';
  if (status === 'CANCELLED') return 'Giá thương mại trước khi hủy';
  return 'Giá thương mại';
}

export function PrintOrderCommercialCard({
  selectedOrder,
}: Readonly<PrintOrderCommercialCardProps>) {
  const revision = selectedOrder.currentCommercialRevision;
  const proposal = selectedOrder.pendingReplacementProposal;
  return (
    <section className={cardClass}>
      <h3 className={cardTitleClass}>Tóm tắt thương mại</h3>
      <dl className="flex flex-col">
        <Row term="Tổng số lượng">
          <strong className="font-semibold tabular-nums">
            {selectedOrder.lines.reduce((s, l) => s + l.quantity, 0)} bản in
          </strong>
        </Row>
        <Row
          term={
            selectedOrder.purchase && selectedOrder.status === 'REQUESTED'
              ? 'Chi phí Couple đã xác nhận'
              : priceTerm(selectedOrder.status)
          }
        >
          {revision ? (
            <strong className="text-lg font-bold text-primary tabular-nums">
              {formatVnd(revision.orderTotalVnd)}
            </strong>
          ) : (
            <span className="text-muted-foreground">Không có dữ liệu thương mại</span>
          )}
        </Row>
        {revision ? (
          <Row
            term={
              isOrderApprovedOrBeyond(selectedOrder.status)
                ? 'Thời hạn báo giá gốc'
                : 'Hạn chót báo giá (7 ngày)'
            }
          >
            {formatVietnameseDate(revision.expiresAt)}
            {selectedOrder.status === 'QUOTED' && isCommercialRevisionExpired(revision) ? (
              <span className="block text-xs text-hy-error">(Báo giá đã hết hạn)</span>
            ) : null}
          </Row>
        ) : null}

        {proposal ? (
          <div className="my-1 flex flex-col gap-1.5 rounded-lg bg-hy-warning-bg px-4 py-3 text-hy-warning">
            <dt className="text-xs font-semibold">Đề xuất thay thế đang chờ Couple duyệt</dt>
            <dd className="flex flex-col gap-1.5">
              <strong className="text-base font-bold tabular-nums">
                {formatVnd(proposal.orderTotalVnd)}
              </strong>
              <span className="text-xs">
                Hạn chót: {formatVietnameseDate(proposal.expiresAt)}. Dự kiến bàn giao:{' '}
                {proposal.estimatedHandoverAt
                  ? formatVietnameseDate(proposal.estimatedHandoverAt)
                  : 'Chưa hẹn ngày bàn giao'}
              </span>
              <span className="text-xs">
                Chờ Couple phản hồi · Sản xuất đang bị tạm dừng. Quá trình sản xuất bị chặn cho đến
                khi Couple phê duyệt.
              </span>
              <ul className="flex flex-col gap-1 text-xs text-foreground">
                {proposal.lines.map((pLine, pIdx) => {
                  const acceptedLine = revision?.lines.find((al) => al.lineId === pLine.lineId);
                  return (
                    <li
                      key={pLine.lineId}
                      className="flex flex-wrap justify-between gap-2 tabular-nums"
                    >
                      <span>
                        {pIdx + 1}. {formatVnd(acceptedLine?.unitPriceVnd ?? 0)} thành{' '}
                        <strong>{formatVnd(pLine.unitPriceVnd)}</strong>
                      </span>
                      <span>Tổng: {formatVnd(pLine.lineTotalVnd)}</span>
                    </li>
                  );
                })}
              </ul>
            </dd>
          </div>
        ) : null}

        <Row term="Cặp đôi">{selectedOrder.displayCouple ?? 'Chưa gán thông tin'}</Row>
        <Row term="Ngày tiệc">
          {selectedOrder.displayEventDate ?? 'Chưa có thông tin ngày tiệc'}
        </Row>
        <Row term="Sảnh tiệc">{selectedOrder.displayHall ?? 'Chưa gán thông tin'}</Row>
      </dl>
    </section>
  );
}
