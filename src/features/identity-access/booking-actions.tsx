import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import type { DashboardBookingItem } from './dashboard-bookings-table';
export function BookingActions({
  booking,
  mine,
  assignedToOther,
  assignedEmail,
  onClaim,
}: Readonly<{
  booking: DashboardBookingItem;
  mine: boolean;
  assignedToOther: boolean;
  assignedEmail?: string | undefined;
  onClaim: (bookingId: string, hallName?: string) => void;
}>) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="hy-select-trigger"
        aria-label={`Thao tác ${booking.bookingCode ?? booking.hallNameSnapshot}`}
      >
        Thao tác
        <span className="hy-select-chevron" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="hy-select-positioner">
          <Menu.Popup className="hy-select-popup" style={{ minWidth: '12rem' }}>
            <Menu.Item
              className="hy-select-option"
              render={<Link href={`/bookings?bookingId=${booking.bookingId}`} prefetch={false} />}
            >
              Xem hồ sơ
            </Menu.Item>
            <Menu.Item
              className="hy-select-option"
              render={<Link href={`/billing?bookingId=${booking.bookingId}`} prefetch={false} />}
            >
              Thanh toán
            </Menu.Item>
            <Menu.Item
              className="hy-select-option"
              render={<Link href={`/staff?bookingId=${booking.bookingId}`} prefetch={false} />}
            >
              Nhân sự
            </Menu.Item>
            {!mine &&
              (assignedToOther ? (
                <Menu.Item disabled className="hy-select-option">
                  {assignedEmail ? 'Đã có người phụ trách' : 'Đã được phân công'}
                </Menu.Item>
              ) : (
                <Menu.Item
                  className="hy-select-option"
                  onClick={() => onClaim(booking.bookingId, booking.hallNameSnapshot || undefined)}
                >
                  Nhận tiệc
                </Menu.Item>
              ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
