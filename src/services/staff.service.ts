import { z } from 'zod';
import { axiosApiClient } from '../lib/api/axios-client';
import type { operations } from '../lib/api/generated/schema';

export type EventAssignmentItem =
  operations['listEventStaffAssignments']['responses'][200]['content']['application/json']['data'][number] & {
    readonly staffLabel?: string | null;
  };
export type ProvisionStaffAccountResponse =
  operations['provisionStaffAccount']['responses'][201]['content']['application/json']['data'];

const directoryPage = z.strictObject({
  items: z.array(
    z.strictObject({
      accountId: z.uuid(),
      email: z.string(),
      credentialSetupRequired: z.boolean(),
    }),
  ),
  nextAfterId: z.uuid().nullable(),
});
export type DirectoryStaff = z.infer<typeof directoryPage>['items'][number];

export const staffService = {
  async directory(q: string, afterId?: string) {
    const response = await axiosApiClient.get<{ data: unknown }>('/management/staff-accounts', {
      params: { q, afterId },
    });
    return directoryPage.parse(response.data.data);
  },
  async setOperationalAccess(accountId: string, enabled: boolean, reason: string, key: string) {
    await axiosApiClient.post(
      `/management/staff-accounts/${accountId}/operational-access`,
      { enabled, reason },
      { headers: { 'Idempotency-Key': key } },
    );
  },
  async provisionStaffAccount(
    input: {
      email: string;
      displayName?: string;
      phone?: string;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<ProvisionStaffAccountResponse> {
    const response = await axiosApiClient.post<{ data: ProvisionStaffAccountResponse }>(
      '/management/staff-accounts',
      { email: input.email.trim().toLowerCase() },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data.data;
  },

  /** Chỉ quản lý gọi được: đổi mã HY/tên khách thành bookingId. */
  async lookupBookings(
    query: string,
  ): Promise<readonly { bookingId: string; bookingCode: string }[]> {
    const response = await axiosApiClient.get<{
      data: readonly { bookingId: string; bookingCode: string }[];
    }>('/management/booking-lookups', { params: { q: query } });
    return response.data.data;
  },

  async getEventAssignments(bookingId: string): Promise<readonly EventAssignmentItem[]> {
    const response = await axiosApiClient.get<{ data: readonly EventAssignmentItem[] }>(
      `/management/events/${bookingId}/assignments`,
    );
    return response.data.data;
  },

  /** BE nhận staffAccountId + expectedRevision (0 khi phân công mới; revision hiện tại khi cấp lại). */
  async assignStaff(
    input: { bookingId: string; staffAccountId: string; expectedRevision: number },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<{ assignmentId: string }> {
    const response = await axiosApiClient.post<{ data: { assignmentId: string } }>(
      `/management/events/${input.bookingId}/assignments`,
      { staffAccountId: input.staffAccountId, expectedRevision: input.expectedRevision },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data.data;
  },

  async revokeAssignment(
    bookingId: string,
    assignmentId: string,
    expectedRevision: number,
    reason: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(
      `/management/events/${bookingId}/assignments/${assignmentId}/revocation`,
      { expectedRevision, reason },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },
};
