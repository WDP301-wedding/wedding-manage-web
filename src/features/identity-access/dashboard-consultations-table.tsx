'use client';

import Link from 'next/link';
import { cn } from 'cn';
import type { ConsultationRequestItem } from '../../services/consultation.service';
import { Badge } from '../../components/ui/badge';
import { CopyButton } from './copy-button';
import {
  linkActionClass,
  rowClass,
  subTextClass,
  tableClass,
  tableWrapClass,
  tdClass,
  theadClass,
  thClass,
} from './dashboard-classes';
import { SortHeader } from './table-controls';
import {
  type ConsultationSortField,
  type SortOrder,
  consultationBookingHref,
} from './use-dashboard-consultations';

export interface DashboardConsultationsTableProps {
  items: readonly ConsultationRequestItem[];
  sortField: ConsultationSortField;
  sortOrder: SortOrder;
  onSortChange: (field: ConsultationSortField) => void;
}

const STATUS = {
  CONVERTED: { label: 'Đã chuyển đổi', variant: 'success' },
  CLOSED: { label: 'Đã đóng', variant: 'neutral' },
  NEW: { label: 'Chờ xử lý', variant: 'warning' },
} as const;

function RequestAction({ item }: Readonly<{ item: ConsultationRequestItem }>) {
  const bookingHref = consultationBookingHref(item);
  if (bookingHref) {
    return (
      <Link
        className={cn(linkActionClass, 'bg-accent text-accent-foreground')}
        href={bookingHref}
        prefetch={false}
      >
        Đặt tiệc
      </Link>
    );
  }
  if (item.status === 'NEW') {
    return (
      <Link
        className={cn(linkActionClass, 'text-primary hover:bg-accent')}
        href="/consultation-requests"
        prefetch={false}
      >
        Xử lý
      </Link>
    );
  }
  return <span className={subTextClass}>Không có thao tác</span>;
}

export function DashboardConsultationsTable({
  items,
  sortField,
  sortOrder,
  onSortChange,
}: Readonly<DashboardConsultationsTableProps>) {
  const sortHeader = (field: ConsultationSortField, label: string, title: string) => (
    <SortHeader
      label={label}
      title={title}
      active={sortField === field}
      order={sortOrder}
      onSort={() => onSortChange(field)}
    />
  );

  return (
    <div className={tableWrapClass}>
      <table aria-label="Danh sách yêu cầu tư vấn gần đây" className={tableClass}>
        <thead className={theadClass}>
          <tr>
            {sortHeader('createdAt', 'Ngày đăng ký', 'Sắp xếp theo ngày đăng ký')}
            {sortHeader('displayName', 'Khách hàng', 'Sắp xếp theo khách hàng')}
            <th scope="col" className={thClass}>
              Mã hồ sơ
            </th>
            <th scope="col" className={thClass}>
              Số điện thoại
            </th>
            {sortHeader('preferredDate', 'Ngày dự kiến', 'Sắp xếp theo ngày dự kiến')}
            {sortHeader('status', 'Trạng thái', 'Sắp xếp theo trạng thái')}
            <th scope="col" className={cn(thClass, 'text-right')}>
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = STATUS[item.status] ?? STATUS.NEW;
            return (
              <tr key={item.id} className={rowClass}>
                <td className={cn(tdClass, 'font-semibold whitespace-nowrap tabular-nums')}>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString('vi-VN')
                    : 'Hôm nay'}
                </td>
                <td className={tdClass}>
                  <div className="flex flex-col gap-0.5">
                    <strong className="font-semibold">
                      {item.displayName || 'Khách vãng lai'}
                    </strong>
                    <span className={cn(subTextClass, 'break-all')}>{item.email}</span>
                  </div>
                </td>
                <td className={tdClass}>
                  {item.consultationId ? (
                    <div className="inline-flex items-center gap-1">
                      <code
                        className="inline-block max-w-[170px] truncate rounded-md bg-secondary px-1.5 py-0.5 font-mono text-2xs"
                        title={item.consultationId}
                      >
                        {item.consultationId}
                      </code>
                      <CopyButton text={item.consultationId} />
                    </div>
                  ) : (
                    <span className={subTextClass}>Chưa cấp mã</span>
                  )}
                </td>
                <td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
                  {item.phone || <span className={subTextClass}>Chưa có</span>}
                </td>
                <td className={cn(tdClass, 'tabular-nums')}>
                  {item.preferredDate || 'Chưa định ngày'}
                  {item.preferredShift ? (
                    <span className={cn(subTextClass, 'block')}>
                      {item.preferredShift === 'LUNCH' ? 'Ca trưa' : 'Ca tối'}
                    </span>
                  ) : null}
                </td>
                <td className={tdClass}>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
                <td className={cn(tdClass, 'text-right')}>
                  <RequestAction item={item} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
