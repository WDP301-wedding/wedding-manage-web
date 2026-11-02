'use client';

import type { FormEvent } from 'react';
import { Check } from 'lucide-react';
import { cn } from 'cn';
import type { GuestSearchResultItem } from '../../services/staff.service';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  cardClass,
  cardHintClass,
  cardTitleClass,
  labelClass,
  tableWrapClass,
  tdClass,
  thClass,
} from './staff-classes';

export interface CheckinDeskSectionProps {
  bookingId: string;
  setBookingId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searching: boolean;
  pending: boolean;
  guests: readonly GuestSearchResultItem[];
  onSearchGuests: (event?: FormEvent) => Promise<void>;
  onCheckIn: (guestId: string) => Promise<void>;
  onUndoCheckIn: (guestId: string) => Promise<void>;
}

// Trên điện thoại mỗi dòng khách thành một thẻ: ẩn tiêu đề cột, ô xếp thành lưới 2 cột.
const rowClass =
  'border-t border-border transition-colors duration-300 max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:gap-x-3 max-sm:gap-y-1 max-sm:rounded-xl max-sm:border max-sm:p-4';
const cellClass = cn(tdClass, 'max-sm:p-0');

function GuestRow({
  guest,
  pending,
  onCheckIn,
  onUndoCheckIn,
}: Readonly<{
  guest: GuestSearchResultItem;
  pending: boolean;
  onCheckIn: (guestId: string) => Promise<void>;
  onUndoCheckIn: (guestId: string) => Promise<void>;
}>) {
  const arrived = guest.checkedIn;
  const tables = guest.tableLabels ?? [];
  const hasTable = tables.length > 0;
  return (
    <tr
      className={cn(
        rowClass,
        arrived ? 'bg-hy-success-bg/40 max-sm:border-hy-success/30' : 'bg-card',
      )}
    >
      <td className={cn(cellClass, 'font-semibold max-sm:col-start-1')}>{guest.name}</td>
      <td className={cn(cellClass, 'text-muted-foreground max-sm:col-start-1 max-sm:text-xs')}>
        {guest.phoneLast4 ? `…${guest.phoneLast4}` : 'Không có SĐT'}
      </td>
      <td className={cn(cellClass, 'max-sm:col-start-1 max-sm:text-xs')}>
        {guest.groupName || 'Chung'}
      </td>
      <td
        className={cn(
          cellClass,
          'font-semibold tabular-nums max-sm:col-start-1',
          !hasTable && 'font-normal text-muted-foreground',
        )}
      >
        {hasTable ? tables.join(', ') : 'Chưa xếp bàn'}
      </td>
      <td className={cn(cellClass, 'max-sm:col-start-2 max-sm:row-start-1')}>
        {arrived ? (
          <Badge variant="success">
            <Check aria-hidden className="hy-draw-check" />
            Đã check-in
          </Badge>
        ) : (
          <Badge variant="neutral">Chưa đến</Badge>
        )}
      </td>
      <td
        className={cn(
          cellClass,
          'text-right max-sm:col-start-2 max-sm:row-span-3 max-sm:row-start-2 max-sm:self-end',
        )}
      >
        {arrived ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void onUndoCheckIn(guest.guestId)}
            aria-label={`Hoàn tác check-in cho khách ${guest.name}`}
          >
            Hoàn tác
          </Button>
        ) : (
          <Button
            disabled={pending}
            onClick={() => void onCheckIn(guest.guestId)}
            aria-label={`Check-in cho khách ${guest.name}`}
          >
            Check-in ngay
          </Button>
        )}
      </td>
    </tr>
  );
}

export function CheckinDeskSection({
  bookingId,
  setBookingId,
  searchQuery,
  setSearchQuery,
  searching,
  pending,
  guests,
  onSearchGuests,
  onCheckIn,
  onUndoCheckIn,
}: Readonly<CheckinDeskSectionProps>) {
  return (
    <section aria-labelledby="checkin-desk-title" className="flex flex-col gap-6">
      <div className={cn(cardClass, 'max-w-3xl')}>
        <div className="flex flex-col gap-0.5">
          <h2 id="checkin-desk-title" className={cardTitleClass}>
            Bàn đón tiếp &amp; Tra cứu khách mời
          </h2>
          <p className={cardHintClass}>
            Nhập mã tiệc để tải dữ liệu khách mời. Tra cứu nhanh theo họ tên hoặc số điện thoại.
          </p>
        </div>

        <form
          onSubmit={onSearchGuests}
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className={labelClass}>
            Mã tiệc
            <Input
              id="staff-booking-id"
              className="font-normal"
              required
              placeholder="VD: HY-000018"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              onBlur={() => setBookingId(bookingId.trim())}
            />
          </label>
          <label className={labelClass}>
            Họ tên hoặc SĐT khách
            <Input
              id="staff-search-query"
              className="font-normal"
              placeholder="Nhập tên khách mời hoặc số điện thoại"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={searching || !bookingId.trim()}>
            {searching ? 'Đang tìm…' : 'Tra cứu khách'}
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Danh sách kết quả tra cứu ({guests.length})</h3>

        {guests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-input px-6 py-10 text-center text-muted-foreground">
            Chưa có khách mời nào được hiển thị. Hãy nhập mã tiệc và bấm tra cứu.
          </p>
        ) : (
          <div
            className={cn(
              tableWrapClass,
              'max-sm:overflow-visible max-sm:border-0 max-sm:bg-transparent',
            )}
          >
            <table
              aria-label="Danh sách khách mời check-in"
              className="w-full border-collapse text-sm max-sm:block"
            >
              <thead className="bg-muted max-sm:sr-only">
                <tr>
                  <th className={thClass}>Họ và tên</th>
                  <th className={thClass}>Số đuôi SĐT</th>
                  <th className={thClass}>Nhóm khách</th>
                  <th className={thClass}>Bàn gợi ý</th>
                  <th className={thClass}>Trạng thái</th>
                  <th className={cn(thClass, 'text-right')}>Thao tác tác nghiệp</th>
                </tr>
              </thead>
              <tbody className="max-sm:flex max-sm:flex-col max-sm:gap-2">
                {guests.map((guest) => (
                  <GuestRow
                    key={guest.guestId}
                    guest={guest}
                    pending={pending}
                    onCheckIn={onCheckIn}
                    onUndoCheckIn={onUndoCheckIn}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
