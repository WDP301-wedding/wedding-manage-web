import { Button } from '../../components/ui/button';
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
    <aside
      id="print-order-detail"
      aria-label="Chi tiết đơn in ấn được chọn"
      className="flex min-w-0 flex-col gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2"
    >
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-hy-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">
            Đơn in: {selectedOrder.orderId}
          </h2>
          <span className="text-xs break-all text-muted-foreground">
            (Hợp đồng: {selectedOrder.bookingId})
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {canStartProduction(selectedOrder) ? (
            <Button onClick={onStartProduction} disabled={isSubmitting}>
              Bắt đầu sản xuất
            </Button>
          ) : null}
          {canMarkReady(selectedOrder) ? (
            <Button onClick={onMarkReady} disabled={isSubmitting}>
              Sẵn sàng bàn giao
            </Button>
          ) : null}
          {canMarkHandedOver(selectedOrder) ? (
            <Button onClick={onOpenHandoverModal} disabled={isSubmitting}>
              Bàn giao đơn in
            </Button>
          ) : null}
          {canQuoteOrder(selectedOrder) ? (
            <Button
              variant="outline"
              onClick={() => onOpenQuoteDrawer(false)}
              disabled={isSubmitting}
            >
              {selectedOrder.status === 'REQUESTED' ? 'Lập báo giá' : 'Gửi báo giá mới'}
            </Button>
          ) : null}
          {canProposeReplacement(selectedOrder) ? (
            <Button
              variant="outline"
              onClick={() => onOpenQuoteDrawer(true)}
              disabled={isSubmitting}
            >
              Đề xuất thay thế
            </Button>
          ) : null}
          {canCancelOrder(selectedOrder) ? (
            <Button
              variant="ghost"
              className="text-destructive hover:bg-hy-error-bg"
              onClick={onOpenCancelModal}
              disabled={isSubmitting}
            >
              Hủy đơn in
            </Button>
          ) : null}
        </div>
      </div>
      <PrintOrderSpecsCard selectedOrder={selectedOrder} />
      <PrintOrderCommercialCard selectedOrder={selectedOrder} />
      <PrintOrderTimelineCard selectedOrder={selectedOrder} />
    </aside>
  );
}
