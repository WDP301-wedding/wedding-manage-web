import type { ReactNode } from 'react';
import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  canCancelOrder,
  canMarkHandedOver,
  canMarkReady,
  canProposeReplacement,
  canQuoteOrder,
  canStartProduction,
  deriveCommercialStatus,
  deriveProductionStatus,
  printOrderDisplay,
  type PrintOrderView,
} from './print-orders-types';
import { toneBadge } from './print-order-classes';
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
  onOpenHistory?: () => void;
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
  onOpenHistory,
}: PrintOrdersDetailProps) {
  const commercial = deriveCommercialStatus(selectedOrder);
  const production = deriveProductionStatus(selectedOrder);
  const display = printOrderDisplay(selectedOrder);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section aria-label="Trạng thái và thao tác" className="flex flex-col gap-3">
        <div>
          <p className="font-semibold [overflow-wrap:anywhere]">{display.couple}</p>
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {display.eventDate} · {display.hall}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={toneBadge[commercial.tone]} className="h-auto whitespace-normal">
            {commercial.label}
          </Badge>
          <Badge variant={toneBadge[production.tone]} className="h-auto whitespace-normal">
            {production.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
          Mã đặt tiệc {selectedOrder.bookingSummary?.bookingCode ?? selectedOrder.bookingId}
        </p>
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
          {onOpenHistory ? (
            <Button variant="outline" onClick={onOpenHistory} disabled={isSubmitting}>
              <Clock3 aria-hidden className="size-4" />
              Xem lịch sử
            </Button>
          ) : null}
        </div>
      </section>
      {purchasePreview}
      <div className="grid min-w-0 items-start gap-4 md:grid-cols-2">
        <PrintOrderCommercialCard selectedOrder={selectedOrder} />
        <PrintOrderTimelineCard selectedOrder={selectedOrder} />
      </div>
    </div>
  );
}
