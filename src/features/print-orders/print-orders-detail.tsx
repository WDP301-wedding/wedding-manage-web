import type React from 'react';
import {
  ArchiveIcon,
  CheckIcon,
  Clock3Icon,
  FileTextIcon,
  PackageCheckIcon,
  Trash2Icon,
} from './icons';
import { printOrderStyles } from './print-orders.styles';
import {
  canCancelOrder,
  canMarkHandedOver,
  canMarkReady,
  canProposeReplacement,
  canQuoteOrder,
  canStartProduction,
  formatVietnameseDate,
  formatVietnameseDateTime,
  formatVnd,
  isCommercialRevisionExpired,
  isOrderApprovedOrBeyond,
  type PrintOrderView,
} from './print-orders-types';

export interface PrintOrdersDetailProps {
  selectedOrder: PrintOrderView;
  isSubmitting: boolean;
  onStartProduction: () => void;
  onMarkReady: () => void;
  onOpenHandoverModal: () => void;
  onOpenQuoteDrawer: (isReplacementProposal: boolean) => void;
  onOpenCancelModal: () => void;
}

export function PrintOrdersDetail({
  selectedOrder,
  isSubmitting,
  onStartProduction,
  onMarkReady,
  onOpenHandoverModal,
  onOpenQuoteDrawer,
  onOpenCancelModal,
}: PrintOrdersDetailProps) {
  return (
    <div className="v0-selected-details" style={printOrderStyles.selectedDetails}>
      <div className="v0-details-header">
        <div>
          <span className="v0-heading-kicker">Chi tiết đơn in ấn được chọn</span>
          <h2>
            Đơn in: {selectedOrder.orderId}{' '}
            <span className="v0-sub-id">(Hợp đồng: {selectedOrder.bookingId})</span>
          </h2>
        </div>
        <div className="v0-details-actions">
          {canStartProduction(selectedOrder) ? (
            <button
              type="button"
              className="v0-button v0-button-primary"
              onClick={onStartProduction}
              disabled={isSubmitting}
            >
              <PackageCheckIcon width={16} height={16} />
              <span>Bắt đầu sản xuất</span>
            </button>
          ) : null}

          {canMarkReady(selectedOrder) ? (
            <button
              type="button"
              className="v0-button v0-button-primary"
              onClick={onMarkReady}
              disabled={isSubmitting}
            >
              <CheckIcon width={16} height={16} />
              <span>Sẵn sàng bàn giao</span>
            </button>
          ) : null}

          {canMarkHandedOver(selectedOrder) ? (
            <button
              type="button"
              className="v0-button v0-button-primary"
              onClick={onOpenHandoverModal}
              disabled={isSubmitting}
            >
              <ArchiveIcon width={16} height={16} />
              <span>Bàn giao đơn in</span>
            </button>
          ) : null}

          {canQuoteOrder(selectedOrder) ? (
            <button
              type="button"
              className="v0-button v0-button-secondary"
              onClick={() => onOpenQuoteDrawer(false)}
              disabled={isSubmitting}
            >
              <span>
                {selectedOrder.status === 'REQUESTED' ? 'Lập báo giá' : 'Gửi báo giá mới'}
              </span>
            </button>
          ) : null}

          {canProposeReplacement(selectedOrder) ? (
            <button
              type="button"
              className="v0-button v0-button-secondary"
              onClick={() => onOpenQuoteDrawer(true)}
              disabled={isSubmitting}
            >
              <span>Đề xuất thay thế</span>
            </button>
          ) : null}

          {canCancelOrder(selectedOrder) ? (
            <button
              type="button"
              className="v0-button v0-button-danger"
              onClick={onOpenCancelModal}
              disabled={isSubmitting}
              title="Hủy đơn in"
            >
              <Trash2Icon width={16} height={16} />
              <span>Hủy đơn in</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Three Detail Cards */}
      <div className="v0-detail-grid">
        {/* Card 1: Multi-line Design Specs */}
        <div className="v0-detail-card">
          <div className="v0-card-head">
            <FileTextIcon width={18} height={18} />
            <h3>Dòng thiết kế đã chốt</h3>
            <span className="v0-badge">{selectedOrder.lines.length} dòng</span>
          </div>

          {/* Render All Lines */}
          <div className="v0-lines-list">
            {selectedOrder.lines.map((line, idx) => {
              const quotedLine = selectedOrder.currentCommercialRevision?.lines.find(
                (ql) => ql.lineId === line.lineId,
              );
              return (
                <div key={line.lineId} className="v0-line-item-box">
                  <div className="v0-line-item-header">
                    <strong>
                      #{idx + 1}: {line.displayVariant ?? `Bản in ${line.designId}`}
                    </strong>
                    <span className="v0-line-qty-badge">{line.quantity} bản in</span>
                  </div>
                  <div className="v0-line-item-meta">
                    <span>
                      Mã thiết kế: <code>{line.designId}</code>
                    </span>
                    <span>
                      Bản in (Rev):{' '}
                      <code>{line.printableRevisionId ?? 'Chưa gán phiên bản in ấn'}</code>
                    </span>
                    {quotedLine ? (
                      <span>
                        Đơn giá: {formatVnd(quotedLine.unitPriceVnd)}/bản (
                        {formatVnd(quotedLine.lineTotalVnd)})
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Neutral Digital Preview Placeholder */}
          <div className="v0-design-preview-container">
            <div className="v0-design-preview-frame">
              <div className="v0-design-preview-icon" aria-hidden="true">
                <FileTextIcon width={24} height={24} />
              </div>
              <div className="v0-design-preview-title">Chưa có bản xem trước kỹ thuật số</div>
              <div className="v0-design-preview-caption">
                Mã thiết kế: {selectedOrder.lines[0]?.designId ?? 'Chưa xác định'} · Phiên bản in:{' '}
                {selectedOrder.lines[0]?.printableRevisionId ?? 'Chưa gán phiên bản in ấn'}
              </div>
              <small className="v0-design-preview-note">
                Bản vẽ in ấn số hóa sẽ được đồng bộ khi studio thiệp cưới xuất bản bản in chính
                thức.
              </small>
            </div>
          </div>
        </div>

        {/* Card 2: Commercial Terms & Status */}
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
                  <strong>
                    {formatVnd(selectedOrder.pendingReplacementProposal.orderTotalVnd)}
                  </strong>
                  <span className="text-amber" style={printOrderStyles.amberBlockSmall}>
                    Hạn chót:{' '}
                    {formatVietnameseDate(selectedOrder.pendingReplacementProposal.expiresAt)} · Dự
                    kiến bàn giao:{' '}
                    {formatVietnameseDate(
                      selectedOrder.pendingReplacementProposal.estimatedHandoverAt,
                    )}
                  </span>
                  <span className="text-amber" style={printOrderStyles.amberBlockSmallWithMargin}>
                    Chờ Couple phản hồi · Sản xuất đang bị tạm dừng. Quá trình sản xuất bị chặn cho
                    đến khi Couple phê duyệt.
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

        {/* Card 3: Authoritative Timeline */}
        <div className="v0-detail-card v0-timeline-card">
          <div className="v0-card-head">
            <Clock3Icon width={18} height={18} />
            <h3>Dòng thời gian đơn in</h3>
          </div>

          <ol className="v0-timeline">
            {/* Step 1: Requested */}
            <li className="v0-step step-done">
              <div className="v0-step-marker" />
              <div className="v0-step-body">
                <strong>Yêu cầu đặt in</strong>
                <span className="v0-step-date">
                  {formatVietnameseDateTime(selectedOrder.createdAt)}
                </span>
                <p>Couple đã khởi tạo yêu cầu in ấn từ ứng dụng.</p>
              </div>
            </li>

            {/* Step 2: Quotation Issued */}
            <li
              className={`v0-step ${
                selectedOrder.currentCommercialRevision !== null ? 'step-done' : 'step-current'
              }`}
            >
              <div className="v0-step-marker" />
              <div className="v0-step-body">
                <strong>Báo giá thương mại</strong>
                <span className="v0-step-date">
                  {selectedOrder.currentCommercialRevision
                    ? formatVietnameseDateTime(selectedOrder.currentCommercialRevision.createdAt)
                    : 'Chờ Quản lý gửi báo giá'}
                </span>
                <p>
                  {selectedOrder.currentCommercialRevision
                    ? `Revision ${selectedOrder.currentCommercialRevision.revisionNumber} (${formatVnd(selectedOrder.currentCommercialRevision.orderTotalVnd)})`
                    : 'Đang chờ lập báo giá.'}
                </p>
              </div>
            </li>

            {/* Step 3: Approval or In Production */}
            <li
              className={`v0-step ${
                isOrderApprovedOrBeyond(selectedOrder.status)
                  ? 'step-done'
                  : selectedOrder.status === 'CANCELLED'
                    ? 'step-cancelled'
                    : 'step-pending'
              }`}
            >
              <div className="v0-step-marker" />
              <div className="v0-step-body">
                <strong>
                  {selectedOrder.status === 'CANCELLED'
                    ? 'Đơn đã hủy'
                    : 'Couple phê duyệt & Sản xuất'}
                </strong>
                <span className="v0-step-date">
                  {selectedOrder.status === 'CANCELLED'
                    ? 'Đã kết thúc'
                    : selectedOrder.status === 'IN_PRODUCTION' ||
                        selectedOrder.status === 'READY_FOR_HANDOVER' ||
                        selectedOrder.status === 'HANDED_OVER'
                      ? 'Đang/đã hoàn tất sản xuất'
                      : isOrderApprovedOrBeyond(selectedOrder.status)
                        ? 'Đã duyệt · Chờ bắt đầu sản xuất'
                        : 'Chưa diễn ra'}
                </span>
                <p>
                  {selectedOrder.status === 'CANCELLED'
                    ? 'Đơn in đã hủy, không thể tiếp tục sản xuất.'
                    : isOrderApprovedOrBeyond(selectedOrder.status)
                      ? 'Couple đã chấp thuận điều khoản thương mại.'
                      : 'Chờ Couple xem xét báo giá trên ứng dụng.'}
                </p>
              </div>
            </li>

            {/* Step 4: Handover */}
            <li
              className={`v0-step ${
                selectedOrder.status === 'HANDED_OVER'
                  ? 'step-done'
                  : selectedOrder.status === 'READY_FOR_HANDOVER'
                    ? 'step-current'
                    : 'step-pending'
              }`}
            >
              <div className="v0-step-marker" />
              <div className="v0-step-body">
                <strong>Bàn giao tại nhà hàng</strong>
                <span className="v0-step-date">
                  {selectedOrder.handedOverAt
                    ? formatVietnameseDateTime(selectedOrder.handedOverAt)
                    : selectedOrder.status === 'READY_FOR_HANDOVER'
                      ? 'Sẵn sàng giao nhận'
                      : 'Chưa khả dụng'}
                </span>
                <p>
                  {selectedOrder.handedOverAt
                    ? `Đã bàn giao · Mã chứng từ: ${selectedOrder.evidenceReference ?? 'N/A'}`
                    : selectedOrder.status === 'READY_FOR_HANDOVER'
                      ? 'Ấn phẩm đã xong, chờ xác nhận bàn giao tại kho.'
                      : 'Chỉ khả dụng sau khi hoàn thành sản xuất.'}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
