import { z } from 'zod';
import { axiosApiClient } from '../lib/api/axios-client';
export const bookingRow = z.object({
  bookingId: z.uuid(),
  bookingCode: z.string().nullable().optional().default(null),
  customerName: z.string().nullable().optional().default(null),
  alias: z.string().nullable().optional().default(null),
  eventDate: z.iso.date(),
  hallId: z.uuid(),
  hallNameSnapshot: z.string(),
  shiftCode: z.enum(['LUNCH', 'DINNER']),
  phase: z.enum(['DRAFT', 'AWAITING_DEPOSIT', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
  tableCount: z.int(),
  createdAt: z.iso.datetime(),
  cancelledAt: z.iso.datetime().nullable(),
  brideName: z.string().nullable(),
  groomName: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  managerAccountId: z.uuid(),
  managerEmail: z.string().nullable(),
  paidVnd: z.number().nullable().optional(),
  outstandingVnd: z.number().nullable().optional(),
  paymentStatus: z.enum(['PAID', 'DEBT', 'AWAITING_DEPOSIT', 'DRAFT']).nullable().optional(),
});
const paging = {
  page: z.int().positive(),
  pageSize: z.int().positive(),
  total: z.int().nonnegative(),
  totalPages: z.int().nonnegative(),
};
export const bookingPage = z.object({
  ...paging,
  items: z.array(bookingRow),
  counts: z.object({ all: z.int(), mine: z.int() }),
});
export const archivePage = z.object({ ...paging, items: z.array(bookingRow) });
export const archiveDetail = z.object({
  booking: bookingRow,
  cancellationReason: z.string().nullable(),
  contract: z
    .object({ state: z.string(), totalVnd: z.int(), depositVnd: z.int(), document: z.unknown() })
    .nullable(),
});
export type NavigationBooking = z.infer<typeof bookingRow>;
export const navigationService = {
  async bookings(query: Record<string, string | number>, signal?: AbortSignal) {
    const result = await axiosApiClient.get<{ data: unknown }>('/management/booking-page', {
      params: query,
      ...(signal ? { signal } : {}),
    });
    return bookingPage.parse(result.data.data);
  },
};
