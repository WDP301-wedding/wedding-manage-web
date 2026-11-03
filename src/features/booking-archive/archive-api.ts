import { z } from 'zod';
import type { Client } from 'openapi-fetch';
import { createApiClient, type ApiClient } from '../../lib/api/client';
import { sharedManagementSession as session } from '../identity-access/session';
type ReadPaths = {
  [path: string]: {
    get: {
      parameters: { query?: Record<string, string | number> };
      responses: { 200: { content: { 'application/json': { data: unknown } } } };
    };
  };
};
const client = createApiClient() as ApiClient & Client<ReadPaths>;
export async function archiveRead<T>(
  path: string,
  schema: z.ZodType<T>,
  query: Record<string, string | number> = {},
) {
  await session.restore();
  return session.authorize(async (token) => {
    const response = await client.GET(path, {
      headers: { Authorization: 'Bearer ' + token },
      params: { query },
      cache: 'no-store',
    });
    return schema.parse(response.data?.data);
  });
}
export const archiveRow = z.object({
  bookingId: z.uuid(),
  bookingCode: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  alias: z.string().nullable().optional(),
  eventDate: z.iso.date(),
  hallNameSnapshot: z.string(),
  phase: z.literal('CANCELLED'),
  shiftCode: z.enum(['LUNCH', 'DINNER']),
  cancelledAt: z.iso.datetime().nullable(),
});
export const archivePageSchema = z.object({
  items: z.array(archiveRow),
  total: z.int().nonnegative(),
  totalPages: z.int().nonnegative(),
  page: z.int().positive(),
  pageSize: z.int().positive(),
});
export const archiveDetailSchema = z.object({
  booking: archiveRow,
  cancellationReason: z.string().nullable(),
  contract: z
    .object({ state: z.string(), totalVnd: z.int(), depositVnd: z.int(), document: z.unknown() })
    .nullable(),
});
export const navigationSchema = z.object({ bookingId: z.uuid(), phase: z.string() });
export const billingSchema = z.object({
  totals: z.record(z.string(), z.number()),
  history: z.array(
    z.object({
      ledgerEntryId: z.uuid(),
      kind: z.string(),
      amountVnd: z.number(),
      occurredAt: z.iso.datetime(),
    }),
  ),
  nextCursor: z.string().nullable(),
  billingRevision: z.int(),
});
