import { axiosApiClient } from '../lib/api/axios-client';
import type { operations } from '../lib/api/generated/schema';

export type EventAssignmentItem =
  operations['listEventStaffAssignments']['responses'][200]['content']['application/json']['data'][number];
export type GuestSearchResultItem =
  operations['searchStaffEventGuests']['responses'][200]['content']['application/json']['data']['items'][number];
export type ProvisionStaffAccountResponse =
  operations['provisionStaffAccount']['responses'][201]['content']['application/json']['data'];

export const staffService = {
  async provisionStaffAccount(
    input: {
      email: string;
      displayName: string;
      phone?: string;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<ProvisionStaffAccountResponse> {
    const response = await axiosApiClient.post<{ data: ProvisionStaffAccountResponse }>(
      '/management/staff-accounts',
      input,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data.data;
  },

  async setOperationalAccess(
    accountId: string,
    active: boolean,
    expectedRevision: number,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(
      `/management/staff-accounts/${accountId}/operational-access`,
      { active, expectedRevision },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },

  async getEventAssignments(bookingId: string): Promise<readonly EventAssignmentItem[]> {
    const response = await axiosApiClient.get<{ data: readonly EventAssignmentItem[] }>(
      `/management/events/${bookingId}/assignments`,
    );
    return response.data.data;
  },

  async assignStaff(
    input: {
      bookingId: string;
      staffAccountId: string;
      roleCode: 'CHECK_IN' | 'COORDINATOR' | 'GENERAL_SUPPORT';
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<{ assignmentId: string }> {
    const response = await axiosApiClient.post<{ data: { assignmentId: string } }>(
      `/management/events/${input.bookingId}/assignments`,
      {
        staffAccountId: input.staffAccountId,
        roleCode: input.roleCode,
      },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data.data;
  },

  async revokeAssignment(
    bookingId: string,
    assignmentId: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(
      `/management/events/${bookingId}/assignments/${assignmentId}/revocation`,
      {},
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },

  async searchGuests(
    bookingId: string,
    query: string,
    cursor?: string,
  ): Promise<{ items: readonly GuestSearchResultItem[]; nextCursor: string | null }> {
    const response = await axiosApiClient.get<{
      data: { items: readonly GuestSearchResultItem[]; nextCursor: string | null };
    }>(`/staff/events/${bookingId}/guests/search`, {
      params: { query, cursor },
    });
    return response.data.data;
  },

  async checkInGuest(bookingId: string, guestId: string): Promise<void> {
    await axiosApiClient.post(`/staff/events/${bookingId}/guests/${guestId}/check-ins`);
  },

  async undoCheckIn(bookingId: string, guestId: string): Promise<void> {
    await axiosApiClient.post(`/staff/events/${bookingId}/guests/${guestId}/check-in-undos`);
  },
};
