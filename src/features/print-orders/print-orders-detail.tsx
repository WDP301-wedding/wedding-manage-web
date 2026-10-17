import type React from 'react';
import { ArchiveIcon, CheckIcon, PackageCheckIcon, Trash2Icon } from './icons';
import { printOrderStyles } from './print-orders.styles';
import {
  canCancelOrder,
  canMarkHandedOver,
  canMarkReady,
  canProposeReplacement,
  canQuoteOrder,
  canStartProduction,
  type PrintOrderView,
} from './print-orders-types';
import { PrintOrderSpecsCard } from './print-order-specs-card';
import { PrintOrderCommercialCard } from './print-order-commercial-card';
import { PrintOrderTimelineCard } from './print-order-timeline-card';

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
        <PrintOrderSpecsCard selectedOrder={selectedOrder} />
        <PrintOrderCommercialCard selectedOrder={selectedOrder} />
        <PrintOrderTimelineCard selectedOrder={selectedOrder} />
      </div>
    </div>
  );
}
