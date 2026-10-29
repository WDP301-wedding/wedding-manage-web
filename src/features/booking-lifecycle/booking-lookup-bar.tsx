'use client';

import type { Authorize } from './booking-api';
import { useBookingLookup, type BookingIdentity } from './use-booking-lookup';
import styles from './booking-lookup-bar.module.css';

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
function details(item: BookingIdentity) {
  const date = item.eventDate.split('-').reverse().join('/');
  return [date, item.hallName, item.shiftCode === 'LUNCH' ? 'Ca trưa' : 'Ca tối']
    .filter(Boolean)
    .join(' · ');
}
function IdentityLabel({ item }: Readonly<{ item: BookingIdentity }>) {
  return (
    <>
      <strong>
        {item.bookingCode} · {item.customerName}
      </strong>
      <span>{details(item)}</span>
      {item.alias ? <span>{item.alias}</span> : null}
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
  const lookup = useBookingLookup(authorize, recentBookingIds, bookingId, revision);
  const select = (item: BookingIdentity) => {
    if (pending !== null) return;
    setBookingId(item.bookingId);
    lookup.changeQuery('');
    void onLoadProposal(item.bookingId);
  };
  const searching = lookup.query.trim().length >= 2;
  return (
    <section className={styles.lookup} aria-label="Tra cứu hồ sơ tiệc">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (lookup.matches.length === 1) select(lookup.matches[0]!);
        }}
      >
        <label htmlFor="booking-lookup-search">Tìm hồ sơ tiệc</label>
        <div className={styles.searchRow}>
          <input
            id="booking-lookup-search"
            type="search"
            maxLength={120}
            value={lookup.query}
            onChange={(event) => lookup.changeQuery(event.target.value)}
            placeholder="Mã HY, tên khách hoặc số điện thoại"
            aria-describedby="booking-lookup-help"
          />
          <button
            type="submit"
            disabled={
              pending !== null ||
              !searching ||
              lookup.searchStatus !== 'ready' ||
              lookup.matches.length !== 1
            }
          >
            Mở hồ sơ
          </button>
        </div>
        <small id="booking-lookup-help">
          Nhập ít nhất 2 ký tự, sau đó chọn đúng tiệc trong kết quả.
        </small>
      </form>
      {searching ? (
        <div
          className={styles.results}
          aria-label="Kết quả tìm hồ sơ"
          aria-busy={lookup.searchStatus === 'loading'}
        >
          {lookup.searchStatus === 'loading' ? <p role="status">Đang tìm hồ sơ…</p> : null}
          {lookup.searchStatus === 'ready' && lookup.matches.length === 0 ? (
            <p role="status">Không tìm thấy hồ sơ phù hợp.</p>
          ) : null}
          {lookup.matches.map((item) => (
            <button
              key={item.bookingId}
              type="button"
              disabled={pending !== null}
              onClick={() => select(item)}
            >
              <IdentityLabel item={item} />
            </button>
          ))}
          {lookup.matches.length === 20 ? (
            <small>Có thể còn kết quả khác. Nhập thêm mã hoặc tên để thu hẹp.</small>
          ) : null}
          {lookup.searchError ? (
            <p role="alert">
              {lookup.searchError}{' '}
              <button type="button" onClick={lookup.retry}>
                Thử lại
              </button>
            </p>
          ) : null}
        </div>
      ) : null}
      {lookup.current && lookup.current.bookingId === activeBookingId ? (
        <div className={styles.current} role="status">
          <small>Hồ sơ đang mở</small>
          <IdentityLabel item={lookup.current} />
        </div>
      ) : null}
      {lookup.recent.length > 0 ? (
        <details className={styles.recent}>
          <summary>Tiệc đã mở gần đây ({lookup.recent.length})</summary>
          <div className={styles.results}>
            {lookup.recent.map((item) => (
              <button
                key={item.bookingId}
                type="button"
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
        <p role="alert">
          Không tải được danh sách tiệc gần đây.{' '}
          <button type="button" onClick={lookup.retry}>
            Thử lại
          </button>
        </p>
      ) : null}
    </section>
  );
}
