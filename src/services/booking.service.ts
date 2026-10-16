import { axiosApiClient } from '../lib/api/axios-client';
import type { components } from '../lib/api/generated/schema';

export type BookingProposal = components['schemas']['BookingProposalResponse']['data'];
export type BookingCreationData = components['schemas']['BookingResponse']['data'];
export type TimelineItem = components['schemas']['TimelineRevisionBody']['items'][number];

export const bookingService = {
  async checkAvailability(params: {
    hallId: string;
    eventDate: string;
    shiftCode: 'LUNCH' | 'DINNER';
  }): Promise<{ available: boolean; expiresAt: string | null }> {
    const response = await axiosApiClient.get<{
      data: { available: boolean; expiresAt: string | null };
    }>('/management/availability', { params });
    return response.data.data;
  },

  async createBooking(input: {
    consultationId: string;
    hallId: string;
    eventDate: string;
    shiftCode: 'LUNCH' | 'DINNER';
    menuPackageVersionId: string;
    tableCount: number;
    planningHeadcount: number;
    expectedRevision: number;
  }): Promise<BookingCreationData> {
    const response = await axiosApiClient.post<{ data: BookingCreationData }>('/bookings', input);
    return response.data.data;
  },

  async getProposal(bookingId: string): Promise<BookingProposal> {
    const response = await axiosApiClient.get<{ data: BookingProposal }>(
      `/bookings/${bookingId}/proposal`,
    );
    return response.data.data;
  },

  async holdSlot(bookingId: string, expectedRevision: number): Promise<void> {
    await axiosApiClient.post(`/bookings/${bookingId}/slot-holds`, { expectedRevision });
  },

  async saveTimeline(input: {
    bookingId: string;
    expectedRevision: number;
    predecessorRevisionId: string | null;
    items: readonly TimelineItem[];
  }): Promise<void> {
    await axiosApiClient.post(`/bookings/${input.bookingId}/timeline-revisions`, {
      expectedRevision: input.expectedRevision,
      predecessorRevisionId: input.predecessorRevisionId,
      items: input.items,
    });
  },

  async approveTimeline(input: {
    bookingId: string;
    revisionId: string;
    expectedRevision: number;
  }): Promise<void> {
    await axiosApiClient.post(
      `/bookings/${input.bookingId}/timeline-revisions/${input.revisionId}/approvals`,
      { expectedRevision: input.expectedRevision },
    );
  },

  async cancelBooking(input: {
    bookingId: string;
    expectedRevision: number;
    reason: string;
  }): Promise<void> {
    await axiosApiClient.post(`/management/bookings/${input.bookingId}/cancellation`, {
      expectedRevision: input.expectedRevision,
      reason: input.reason,
    });
  },

  async decideCancellation(input: {
    bookingId: string;
    requestId: string;
    expectedRevision: number;
    decision: 'APPROVE' | 'REJECT';
    reason: string;
  }): Promise<void> {
    await axiosApiClient.post(
      `/management/bookings/${input.bookingId}/cancellation-requests/${input.requestId}/decision`,
      {
        expectedRevision: input.expectedRevision,
        decision: input.decision,
        reason: input.reason,
      },
    );
  },

  async completeBooking(bookingId: string, expectedRevision: number): Promise<void> {
    await axiosApiClient.post(`/management/bookings/${bookingId}/completion`, { expectedRevision });
  },
};
