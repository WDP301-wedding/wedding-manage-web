'use client';

import { useRef } from 'react';
import { Button } from '../../components/ui/button';
import { dialogActionsClass } from './print-order-classes';
import { PrintOrderDialog } from './print-order-dialog';
import { formatVietnameseDateTime, formatVnd, type PrintOrderView } from './print-orders-types';

export { HandoverModal, type HandoverModalProps } from './print-order-handover-modal';
export { CancelOrderModal, type CancelOrderModalProps } from './print-order-cancel-modal';

const listClass = 'flex list-disc flex-col gap-2 pl-5';

export function CreateOrderNoticeModal({ onClose }: { onClose: () => void }) {
  const okBtnRef = useRef<HTMLButtonElement | null>(null);
  return (
    <PrintOrderDialog
      label="Quy trình khởi tạo đơn in"
      title="Quy tắc khởi tạo đơn in ấn thiệp cưới"
      onClose={onClose}
      initialFocusRef={okBtnRef}
    >
      <p>Theo quy định nghiệp vụ hệ thống, đơn in ấn vật lý do Couple khởi tạo trực tiếp:</p>
      <ul className={listClass}>
        <li>
          Đơn in ấn thiệp cưới được chủ động khởi tạo bởi <strong>Couple</strong> từ ứng dụng khách
          hàng sau khi hoàn tất tùy chỉnh và chốt bản mẫu thiết kế số hóa.
        </li>
        <li>
          <strong>Quản lý vận hành (Manager)</strong> không được phép tự ý tạo đơn in thay thế
          Couple để đảm bảo tính toàn vẹn và bất biến của hợp đồng thiết kế.
        </li>
        <li>
          Khi Couple gửi yêu cầu, đơn in sẽ xuất hiện tại hàng đợi này ở trạng thái chờ báo giá để
          Quản lý tiến hành báo giá.
        </li>
      </ul>
      <div className={dialogActionsClass}>
        <Button ref={okBtnRef} type="button" onClick={onClose}>
          Đã hiểu
        </Button>
      </div>
    </PrintOrderDialog>
  );
}

export function HistoryModal({
  order,
  onClose,
}: {
  order: PrintOrderView | null;
  onClose: () => void;
}) {
  return (
    <PrintOrderDialog
      label="Lịch sử đơn in"
      title={order ? `Lịch sử đơn in ${order.orderId}` : 'Lịch sử đơn in'}
      onClose={onClose}
    >
      <p>
        Nhật ký lưu vết bất biến các lần điều chỉnh trạng thái và báo giá thương mại theo hợp đồng:
      </p>
      {order ? (
        <ul className={listClass}>
          <li>
            <strong>Khởi tạo:</strong> {formatVietnameseDateTime(order.createdAt)} bởi Couple.
          </li>
          <li>
            <strong>Phiên bản hiện tại:</strong> {order.revision}.
          </li>
          {order.currentCommercialRevision ? (
            <li>
              <strong>Báo giá:</strong> phiên bản {order.currentCommercialRevision.revisionNumber} (
              {formatVnd(order.currentCommercialRevision.orderTotalVnd)}).
            </li>
          ) : null}
          {order.readyAt ? (
            <li>
              <strong>Sẵn sàng:</strong> {formatVietnameseDateTime(order.readyAt)}.
            </li>
          ) : null}
          {order.handedOverAt ? (
            <li>
              <strong>Đã bàn giao:</strong> {formatVietnameseDateTime(order.handedOverAt)} (Biên
              bản: {order.evidenceReference ?? 'chưa có'}).
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="text-muted-foreground">Chưa chọn đơn in nào.</p>
      )}
      <div className={dialogActionsClass}>
        <Button type="button" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </PrintOrderDialog>
  );
}
