import { cn } from 'cn';
import { cardClass, cardTitleClass } from './print-order-classes';
import {
  formatVietnameseDateTime,
  formatVnd,
  isOrderApprovedOrBeyond,
  type PrintOrderView,
} from './print-orders-types';

export interface PrintOrderTimelineCardProps {
  selectedOrder: PrintOrderView;
}

type StepState = 'done' | 'current' | 'pending' | 'cancelled';

const markerClass: Record<StepState, string> = {
  done: 'border-primary bg-primary',
  current: 'border-primary bg-card ring-4 ring-accent',
  pending: 'border-input bg-card',
  cancelled: 'border-hy-error bg-hy-error-bg',
};

function Step({
  state,
  title,
  when,
  note,
}: Readonly<{ state: StepState; title: string; when: string; note: string }>) {
  return (
    <li className="relative flex gap-3 pb-5 before:absolute before:top-4 before:bottom-0 before:left-[5px] before:w-px before:bg-border last:pb-0 last:before:hidden">
      <span
        aria-hidden="true"
        className={cn('mt-1 size-3 shrink-0 rounded-full border-2', markerClass[state])}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <strong className={cn('font-semibold', state === 'pending' && 'text-muted-foreground')}>
          {title}
        </strong>
        <span className="text-xs text-muted-foreground tabular-nums">{when}</span>
        <p className="text-xs">{note}</p>
      </div>
    </li>
  );
}

export function PrintOrderTimelineCard({ selectedOrder }: Readonly<PrintOrderTimelineCardProps>) {
  const { status } = selectedOrder;
  const revision = selectedOrder.currentCommercialRevision;
  const cancelled = status === 'CANCELLED';
  const producing =
    status === 'IN_PRODUCTION' || status === 'READY_FOR_HANDOVER' || status === 'HANDED_OVER';

  return (
    <section className={cardClass}>
      <h3 className={cardTitleClass}>Dòng thời gian đơn in</h3>
      <ol className="flex flex-col">
        <Step
          state="done"
          title="Yêu cầu đặt in"
          when={formatVietnameseDateTime(selectedOrder.createdAt)}
          note={
            selectedOrder.purchase
              ? 'Couple đã xem bản in và xác nhận chi phí.'
              : 'Couple đã khởi tạo yêu cầu in ấn.'
          }
        />
        <Step
          state={revision !== null ? 'done' : 'current'}
          title="Báo giá thương mại"
          when={revision ? formatVietnameseDateTime(revision.createdAt) : 'Chờ Quản lý gửi báo giá'}
          note={
            revision
              ? `Phiên bản ${revision.revisionNumber} (${formatVnd(revision.orderTotalVnd)})`
              : 'Đang chờ lập báo giá.'
          }
        />
        <Step
          state={isOrderApprovedOrBeyond(status) ? 'done' : cancelled ? 'cancelled' : 'pending'}
          title={
            cancelled
              ? 'Đơn đã hủy'
              : selectedOrder.purchase
                ? 'Nhà hàng duyệt đơn và phụ lục'
                : 'Couple phê duyệt & Sản xuất'
          }
          when={
            cancelled
              ? 'Đã kết thúc'
              : producing
                ? 'Đang/đã hoàn tất sản xuất'
                : isOrderApprovedOrBeyond(status)
                  ? 'Đã duyệt, chờ bắt đầu sản xuất'
                  : 'Chưa diễn ra'
          }
          note={
            cancelled
              ? 'Đơn in đã hủy, không thể tiếp tục sản xuất.'
              : isOrderApprovedOrBeyond(status)
                ? 'Couple đã chấp thuận điều khoản thương mại.'
                : selectedOrder.purchase
                  ? 'Couple đã đồng ý, đang chờ nhà hàng duyệt đơn và chi phí.'
                  : 'Chờ Couple xem xét báo giá.'
          }
        />
        <Step
          state={
            status === 'HANDED_OVER'
              ? 'done'
              : status === 'READY_FOR_HANDOVER'
                ? 'current'
                : 'pending'
          }
          title="Bàn giao tại nhà hàng"
          when={
            selectedOrder.handedOverAt
              ? formatVietnameseDateTime(selectedOrder.handedOverAt)
              : status === 'READY_FOR_HANDOVER'
                ? 'Sẵn sàng giao nhận'
                : 'Chưa khả dụng'
          }
          note={
            selectedOrder.handedOverAt
              ? `Đã bàn giao, mã chứng từ: ${selectedOrder.evidenceReference ?? 'chưa có'}`
              : status === 'READY_FOR_HANDOVER'
                ? 'Ấn phẩm đã xong, chờ xác nhận bàn giao tại kho.'
                : 'Chỉ khả dụng sau khi hoàn thành sản xuất.'
          }
        />
      </ol>
    </section>
  );
}
