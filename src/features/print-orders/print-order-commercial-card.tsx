import type React from 'react';
import { Clock3Icon } from './icons';
import { printOrderStyles } from './print-orders.styles';
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

export function PrintOrderCommercialCard({
  selectedOrder,
}: Readonly<PrintOrderCommercialCardProps>) {
  return (
    <div className="v0-detail-card">
      <div className="v0-card-head">
        <Clock3Icon width={18} height={18} />
        <h3>Tóm tắt thương mại</h3>
      </div>

      <dl className="v0-spec-list">
        <div>
          <dt>Tổng số lượng</dt>
          <dd>
            <strong>{selectedOrder.lines.reduce((s, l) => s + l.quantity, 0)} bản in</strong>
          </dd>
        </div>

        <div>
          <dt>
            {isOrderApprovedOrBeyond(selectedOrder.status)
              ? 'Giá đã chấp thuận'
              : selectedOrder.status === 'QUOTED'
                ? 'Giá chào báo giá (Chờ duyệt)'
                : selectedOrder.status === 'CANCELLED'
                  ? 'Giá thương mại trước khi hủy'
                  : 'Giá thương mại'}
          </dt>
          <dd>
            {selectedOrder.currentCommercialRevision ? (
              <strong className="v0-price-highlight">
                {formatVnd(selectedOrder.currentCommercialRevision.orderTotalVnd)}
              </strong>
            ) : (
              <span className="text-muted">Không có dữ liệu thương mại</span>
            )}
          </dd>
        </div>

        {selectedOrder.currentCommercialRevision ? (
          <div>
            <dt>
              {isOrderApprovedOrBeyond(selectedOrder.status)
                ? 'Thời hạn báo giá gốc'
                : 'Hạn chót báo giá (7 ngày)'}
            </dt>
            <dd>
              {formatVietnameseDate(selectedOrder.currentCommercialRevision.expiresAt)}
              {selectedOrder.status === 'QUOTED' &&
              isCommercialRevisionExpired(selectedOrder.currentCommercialRevision) ? (
                <span className="text-danger" style={printOrderStyles.textDangerBlock}>
                  (Báo giá đã hết hạn)
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}

        {/* Pending Replacement Proposal Banner if present */}
        {selectedOrder.pendingReplacementProposal ? (
          <div className="v0-proposal-block">
            <dt>Đề xuất thay thế đang chờ Couple duyệt</dt>
            <dd>
              <strong>{formatVnd(selectedOrder.pendingReplacementProposal.orderTotalVnd)}</strong>
              <span className="text-amber" style={printOrderStyles.amberBlockSmall}>
                Hạn chót: {formatVietnameseDate(selectedOrder.pendingReplacementProposal.expiresAt)}{' '}
                · Dự kiến bàn giao:{' '}
                {formatVietnameseDate(selectedOrder.pendingReplacementProposal.estimatedHandoverAt)}
              </span>
              <span className="text-amber" style={printOrderStyles.amberBlockSmallWithMargin}>
                Chờ Couple phản hồi · Sản xuất đang bị tạm dừng. Quá trình sản xuất bị chặn cho đến
                khi Couple phê duyệt.
              </span>
              <div style={printOrderStyles.proposalLinesBox}>
                {selectedOrder.pendingReplacementProposal.lines.map((pLine, pIdx) => {
                  const acceptedLine = selectedOrder.currentCommercialRevision?.lines.find(
                    (al) => al.lineId === pLine.lineId,
                  );
                  return (
                    <div key={pLine.lineId} style={printOrderStyles.proposalLineRow}>
                      <span>
                        #{pIdx + 1}: {formatVnd(acceptedLine?.unitPriceVnd ?? 0)} ➔{' '}
                        <strong>{formatVnd(pLine.unitPriceVnd)}</strong>
                      </span>
                      <span>Tổng: {formatVnd(pLine.lineTotalVnd)}</span>
                    </div>
                  );
                })}
              </div>
            </dd>
          </div>
        ) : null}

        <div>
          <dt>Cặp đôi</dt>
          <dd>{selectedOrder.displayCouple ?? 'Chưa gán thông tin'}</dd>
        </div>

        <div>
          <dt>Ngày tiệc</dt>
          <dd>{selectedOrder.displayEventDate ?? 'Chưa có thông tin ngày tiệc'}</dd>
        </div>

        <div>
          <dt>Sảnh tiệc</dt>
          <dd>{selectedOrder.displayHall ?? 'Chưa gán thông tin'}</dd>
        </div>
      </dl>
    </div>
  );
}
