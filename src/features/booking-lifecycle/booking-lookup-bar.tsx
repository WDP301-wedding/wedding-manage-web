'use client';

export interface BookingLookupBarProps {
  bookingId: string;
  setBookingId: (id: string) => void;
  onLoadProposal: (id: string) => void;
  pending: string | null;
  recentBookingIds: readonly string[];
}

export function BookingLookupBar({
  bookingId,
  setBookingId,
  onLoadProposal,
  pending,
  recentBookingIds,
}: Readonly<BookingLookupBarProps>) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        alignItems: 'flex-end',
      }}
    >
      <form
        className="booking-lookup"
        onSubmit={(event) => {
          event.preventDefault();
          void onLoadProposal(bookingId.trim());
        }}
      >
        <label>
          Mã booking
          <input
            required
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            placeholder="Mã hồ sơ đặt tiệc"
          />
        </label>
        <button disabled={pending !== null || bookingId.trim() === ''} type="submit">
          Tải hồ sơ
        </button>
      </form>
      {recentBookingIds.length > 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--hy-text-muted, #6e5d63)' }}>Chuyển sang tiệc khác:</span>
          <select
            aria-label="Chọn nhanh mã tiệc gần đây"
            value={recentBookingIds.includes(bookingId) ? bookingId : ''}
            onChange={(event) => {
              const selected = event.target.value;
              if (selected) {
                setBookingId(selected);
                void onLoadProposal(selected);
              }
            }}
            style={{ maxWidth: '280px' }}
          >
            <option value="">-- Tiệc đã mở gần đây ({recentBookingIds.length}) --</option>
            {recentBookingIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
