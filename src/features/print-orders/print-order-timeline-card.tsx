import type React from 'react';
import { Clock3Icon } from './icons';
import {
  formatVietnameseDateTime,
  formatVnd,
  isOrderApprovedOrBeyond,
  type PrintOrderView,
} from './print-orders-types';

export interface PrintOrderTimelineCardProps {
  selectedOrder: PrintOrderView;
}

export function PrintOrderTimelineCard({ selectedOrder }: Readonly<PrintOrderTimelineCardProps>) {
  return (
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
              {selectedOrder.status === 'CANCELLED' ? 'Đơn đã hủy' : 'Couple phê duyệt & Sản xuất'}
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
  );
}
