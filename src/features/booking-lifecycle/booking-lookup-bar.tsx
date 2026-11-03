'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Heart, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import type { Authorize } from './booking-api';
import { formatDate } from './booking-helpers';
import { useBookingLookup, type BookingIdentity } from './use-booking-lookup';

export interface BookingLookupBarProps {
  bookingId: string;
  activeBookingId?: string | undefined;
  setBookingId: (id: string) => void;
  onLoadProposal: (id: string) => void;
  pending: string | null;
  recentBookingIds: readonly string[];
  authorize: Authorize;
  revision?: number | undefined;
}

const resultsClass =
  'absolute top-full left-0 right-0 sm:left-auto sm:right-0 z-50 mt-1 flex max-h-80 w-full flex-col gap-1 overflow-y-auto rounded-xl border border-border bg-popover/95 p-2 shadow-xl backdrop-blur-md transition-all sm:w-[460px]';
const resultButtonClass =
  'flex w-full flex-col items-start gap-0.5 rounded-lg p-3 text-left [overflow-wrap:anywhere] transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 aria-[current=true]:bg-accent';

function details(item: BookingIdentity) {
  const date = formatDate(item.eventDate);
  return [date, item.hallName, item.shiftCode === 'LUNCH' ? 'Ca trưa' : 'Ca tối']
    .filter(Boolean)
    .join(' · ');
}
function IdentityLabel({ item }: Readonly<{ item: BookingIdentity }>) {
  const couple = [item.groomName, item.brideName].filter(Boolean).join(' & ');
  const contactInfo = [item.phone ? `SĐT: ${item.phone}` : null, item.email]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      <strong className="font-semibold">
        {item.bookingCode} · {item.customerName}
      </strong>
      {couple && couple !== item.customerName ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          <Heart aria-hidden className="size-3.5" />
          {couple}
        </span>
      ) : null}
      <span className="text-xs">{details(item)}</span>
      {contactInfo ? <small className="text-2xs text-muted-foreground">{contactInfo}</small> : null}
      {item.alias ? <span className="text-xs text-muted-foreground">{item.alias}</span> : null}
    </>
  );
}
export function BookingLookupBar({
  bookingId,
  activeBookingId,
  setBookingId,
  onLoadProposal,
  pending,
  recentBookingIds,
  authorize,
  revision,
}: Readonly<BookingLookupBarProps>) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (sectionRef.current && !sectionRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
        if (detailsRef.current) detailsRef.current.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchFocused(false);
        if (detailsRef.current) detailsRef.current.open = false;
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const lookup = useBookingLookup(authorize, recentBookingIds, bookingId, revision);
  const select = (item: BookingIdentity) => {
    if (pending !== null) return;
    setIsSearchFocused(false);
    if (detailsRef.current) detailsRef.current.open = false;
    setBookingId(item.bookingId);
    lookup.changeQuery('');
    void onLoadProposal(item.bookingId);
  };
  const searching = lookup.query.trim().length >= 2;
  const isUuid = /^[a-f0-9-]{36}$/iu.test(lookup.query.trim());
  return (
    <section
      ref={sectionRef}
      className="relative flex w-full min-w-0 flex-col gap-2 sm:w-[460px] sm:max-w-full"
      aria-label="Tra cứu hồ sơ tiệc"
    >
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (lookup.matches.length >= 1) {
            select(lookup.matches[0]!);
          } else if (isUuid) {
            setIsSearchFocused(false);
            setBookingId(lookup.query.trim());
            lookup.changeQuery('');
            void onLoadProposal(lookup.query.trim());
          }
        }}
      >
        <label htmlFor="booking-lookup-search" className="text-xs font-semibold">
          Tìm hồ sơ tiệc
        </label>
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="booking-lookup-search"
                type="search"
                className="pl-10"
                maxLength={120}
                value={lookup.query}
                onChange={(event) => {
                  lookup.changeQuery(event.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onClick={() => setIsSearchFocused(true)}
                placeholder="Mã HY, tên cô dâu chú rể, người đặt, SĐT, email…"
                aria-describedby="booking-lookup-help"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={
                pending !== null ||
                (!isUuid &&
                  (!searching || lookup.searchStatus !== 'ready' || lookup.matches.length === 0))
              }
            >
              Mở hồ sơ
            </Button>
          </div>
          {searching && isSearchFocused ? (
            <div
              className={resultsClass}
              aria-label="Kết quả tìm hồ sơ"
              aria-busy={lookup.searchStatus === 'loading'}
            >
              {lookup.searchStatus === 'loading' ? (
                <p role="status" className="px-3 py-2 text-xs text-muted-foreground">
                  Đang tìm hồ sơ…
                </p>
              ) : null}
              {lookup.searchStatus === 'ready' && lookup.matches.length === 0 ? (
                <p role="status" className="px-3 py-2 text-xs text-muted-foreground">
                  Không tìm thấy hồ sơ phù hợp.
                </p>
              ) : null}
              {lookup.matches.map((item) => (
                <button
                  key={item.bookingId}
                  type="button"
                  className={resultButtonClass}
                  disabled={pending !== null}
                  onClick={() => select(item)}
                >
                  <IdentityLabel item={item} />
                </button>
              ))}
              {lookup.matches.length === 20 ? (
                <small className="px-3 py-1 text-2xs text-muted-foreground">
                  Có thể còn kết quả khác. Nhập thêm mã hoặc tên để thu hẹp.
                </small>
              ) : null}
              {lookup.searchError ? (
                <p role="alert" className="px-3 py-2 text-xs text-hy-error">
                  {lookup.searchError}{' '}
                  <Button type="button" variant="link" size="xs" onClick={lookup.retry}>
                    Thử lại
                  </Button>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <small id="booking-lookup-help" className="text-2xs text-muted-foreground">
          Tìm theo mã tiệc (HY-...), tên cô dâu chú rể, tên người đặt, số điện thoại hoặc email.
        </small>
      </form>
      {lookup.current && lookup.current.bookingId === activeBookingId ? (
        <div
          className="flex flex-col gap-0.5 rounded-lg border border-border bg-card p-4 [overflow-wrap:anywhere]"
          role="status"
        >
          <small className="text-2xs font-medium text-primary">Hồ sơ đang mở</small>
          <IdentityLabel item={lookup.current} />
        </div>
      ) : null}
      {lookup.recent.length > 0 ? (
        <details
          ref={detailsRef}
          className="group relative"
          onClick={(event) => {
            const target = event.target;
            if (
              target instanceof Element &&
              target.closest('button') &&
              !target.closest('button')?.hasAttribute('disabled')
            )
              event.currentTarget.open = false;
          }}
        >
          <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden
              className="size-4 transition-transform group-open:rotate-90"
            />
            Tiệc đã mở gần đây ({lookup.recent.length})
          </summary>
          <div className={resultsClass}>
            {lookup.recent.map((item) => (
              <button
                key={item.bookingId}
                type="button"
                className={resultButtonClass}
                disabled={pending !== null || item.bookingId === activeBookingId}
                aria-current={item.bookingId === bookingId ? 'true' : undefined}
                onClick={() => select(item)}
              >
                <IdentityLabel item={item} />
              </button>
            ))}
          </div>
        </details>
      ) : null}
      {lookup.recentError ? (
        <p role="alert" className="text-xs text-hy-error">
          Không tải được danh sách tiệc gần đây.{' '}
          <Button type="button" variant="link" size="xs" onClick={lookup.retry}>
            Thử lại
          </Button>
        </p>
      ) : null}
    </section>
  );
}
