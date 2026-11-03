import type { ReactNode } from 'react';
import Link from 'next/link';
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
  purchasePreview?: ReactNode;
  isSubmitting: boolean;
  onApprovePurchase?: () => void;
  onStartProduction: () => void;
  onMarkReady: () => void;
  onOpenHandoverModal: () => void;
  onOpenQuoteDrawer: (isReplacementProposal: boolean) => void;
  onOpenCancelModal: () => void;
}

export function PrintOrdersDetail({
  selectedOrder,
  purchasePreview,
  isSubmitting,
  onApprovePurchase,
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
        {selectedOrder.appendixSource ? (
          <p className="text-sm text-muted-foreground">
            Đơn in được tạo từ phụ lục đã được cả hai bên duyệt. Chi phí chỉ được ghi nhận một lần
            qua phụ lục.{' '}
            <Link
              href={`/bookings?bookingId=${encodeURIComponent(selectedOrder.bookingId)}&appendixRevisionId=${encodeURIComponent(selectedOrder.appendixSource.appendixRevisionId)}`}
              className="text-primary underline"
            >
              Xem phụ lục của đơn in
            </Link>
            . Thay đổi số lượng hoặc hủy in cần lập phụ lục điều chỉnh và được hai bên đồng ý lại.
          </p>
        ) : null}
        {selectedOrder.purchase ? (
          <p className="text-sm text-muted-foreground">
            {selectedOrder.purchase.cancellationRequested
              ? 'Couple đã yêu cầu hủy và giảm phí; sản xuất đang bị chặn. '
              : ''}
            Couple đã xác nhận bản in, {selectedOrder.purchase.material} và chi phí{' '}
            {selectedOrder.currentCommercialRevision?.orderTotalVnd.toLocaleString('vi-VN')} đ.
            Duyệt đơn đồng thời xác nhận phụ lục phía nhà hàng, không thu lại tiền cọc. Muốn thay
            đổi nội dung hoặc giá: hủy yêu cầu chờ duyệt để Couple chọn và xác nhận lại.
          </p>
        ) : null}
        {selectedOrder.appendixSource?.pendingAppendixRevisionId ? (
          <p role="status" className="text-sm text-muted-foreground">
            Sản xuất tạm dừng trong khi phụ lục điều chỉnh đang chờ hai bên duyệt.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {selectedOrder.purchase && selectedOrder.status === 'REQUESTED' ? (
            <Button onClick={onApprovePurchase} disabled={isSubmitting}>
              Duyệt đơn in & chi phí
            </Button>
          ) : null}

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
      {purchasePreview}
      <PrintOrderSpecsCard selectedOrder={selectedOrder} />
      <PrintOrderCommercialCard selectedOrder={selectedOrder} />
      <PrintOrderTimelineCard selectedOrder={selectedOrder} />
    </aside>
  );
}
