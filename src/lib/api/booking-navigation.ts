export class ArchivedBookingError extends Error {
  readonly code = 'BOOKING_ARCHIVED';
  constructor() {
    super('Tiệc đã hủy. Đang mở hồ sơ tại khu vực Tiệc đã hủy.');
  }
}
export function enforceActiveBooking(payload: unknown): void {
  if (typeof window === 'undefined' || window.location.pathname === '/cancelled-bookings') return;
  if (payload === null || typeof payload !== 'object' || !('data' in payload)) return;
  const data = payload.data;
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return;
  const phase =
    'phase' in data
      ? data.phase
      : 'bookingPhase' in data
        ? data.bookingPhase
        : 'financialOverview' in data &&
            data.financialOverview !== null &&
            typeof data.financialOverview === 'object' &&
            'phase' in data.financialOverview
          ? data.financialOverview.phase
          : null;
  const bookingId = 'bookingId' in data ? data.bookingId : null;
  if (phase !== 'CANCELLED' || typeof bookingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(bookingId))
    return;
  window.location.replace('/cancelled-bookings' + '?bookingId=' + encodeURIComponent(bookingId));
  throw new ArchivedBookingError();
}
