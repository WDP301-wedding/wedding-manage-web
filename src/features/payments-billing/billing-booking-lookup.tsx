'use client';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatDate } from '../booking-lifecycle/booking-helpers';
import type { BookingIdentity } from '../booking-lifecycle/use-booking-lookup';

function BookingMatch({
  item,
  onSelect,
}: Readonly<{ item: BookingIdentity; onSelect: (item: BookingIdentity) => void }>) {
  const couple = [item.groomName, item.brideName].filter(Boolean).join(' & ');
  const contactInfo = [item.phone ? `SĐT: ${item.phone}` : null, item.email]
    .filter(Boolean)
    .join(', ');
  const dateStr = formatDate(item.eventDate);
  return (
    <button
      type="button"
      className="flex w-full flex-col items-start gap-0.5 rounded-lg p-3 text-left transition-colors [overflow-wrap:anywhere] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      onClick={() => onSelect(item)}
    >
      <strong className="font-semibold">
        {item.bookingCode} · {item.customerName}
      </strong>
      {couple && couple !== item.customerName && (
        <span className="text-xs font-medium text-primary">{couple}</span>
      )}
      <span className="text-xs">
        {[dateStr, item.hallName, item.shiftCode === 'LUNCH' ? 'Ca trưa' : 'Ca tối']
          .filter(Boolean)
          .join(', ')}
      </span>
      {contactInfo && <small className="text-2xs text-muted-foreground">{contactInfo}</small>}
    </button>
  );
}

export function BillingBookingLookup({
  value,
  disabled,
  matches,
  open,
  onChange,
  onFocus,
  onSelect,
  onSubmit,
}: Readonly<{
  value: string;
  disabled: boolean;
  matches: BookingIdentity[];
  open: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onSelect: (item: BookingIdentity) => void;
  onSubmit: () => void;
}>) {
  return (
    <form
      className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[480px] sm:max-w-full"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-end gap-2">
        <div className="relative min-w-0 flex-1">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Mã hồ sơ đặt tiệc
            <Input
              className="font-normal"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onFocus={onFocus}
              placeholder="Mã HY, tên cô dâu chú rể, người đặt, SĐT, email…"
              required
              disabled={disabled}
            />
          </label>
          {open && matches.length > 0 && (
            <div
              className="absolute inset-x-0 top-full z-20 mt-1 flex max-h-80 flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-hy-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1"
              role="listbox"
            >
              {matches.map((item) => (
                <BookingMatch key={item.bookingId} item={item} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
        <Button type="submit" disabled={disabled}>
          Xem thanh toán
        </Button>
      </div>
    </form>
  );
}
