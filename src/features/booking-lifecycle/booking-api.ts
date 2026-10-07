import { createApiClient, type ApiClient } from '../../lib/api/client';

export type ProposalView = Readonly<{
  bookingId: string;
  consultationId: string;
  phase: 'DRAFT' | 'AWAITING_DEPOSIT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  revision: number;
  eventDate: string;
  planningHeadcount: number;
  proposal: Readonly<{
    hall: Readonly<{ id: string; name: string; description: string; maxGuests: number }>;
    shift: Readonly<{ code: 'LUNCH' | 'DINNER'; startTime: string; endTime: string }>;
    menu: Readonly<{
      versionId: string;
      packageId: string;
      versionNumber: number;
      name: string;
      description: string;
      priceVndPerTable: number;
    }>;
    tableCount: number;
    baseChargeVnd: number;
    depositAmountVnd: number;
  }>;
  timeline: null | Readonly<{
    revisionId: string;
    revisionNumber: number;
    predecessorRevisionId: string | null;
    managerApprovedAt: string | null;
    coupleApprovedAt: string | null;
    items: readonly Readonly<{
      itemId: string;
      order: number;
      startTime: string;
      title: string;
      description: string | null;
    }>[];
  }>;
  capabilities: Readonly<{
    accessLevel: 'RESTRICTED' | 'FULL';
    canEditTimeline: boolean;
    canApproveTimeline: boolean;
    canRequestCancellation: boolean;
  }>;
}>;

export interface ManagementBookingGateway {
  createConsultation(
    accessToken: string,
    input: Readonly<{ intendedEmail: string; displayName: string; note?: string }>,
  ): Promise<Readonly<{ consultationId: string; revision: number }>>;
  invite(
    accessToken: string,
    input: Readonly<{ consultationId: string; expectedRevision: number }>,
  ): Promise<void>;
  checkAvailability(
    accessToken: string,
    input: Readonly<{ hallId: string; eventDate: string; shiftCode: 'LUNCH' | 'DINNER' }>,
  ): Promise<Readonly<{ available: boolean; expiresAt: string | null }>>;
  createBooking(
    accessToken: string,
    input: Readonly<{
      consultationId: string;
      hallId: string;
      eventDate: string;
      shiftCode: 'LUNCH' | 'DINNER';
      menuPackageVersionId: string;
      tableCount: number;
      planningHeadcount: number;
      expectedRevision: number;
    }>,
  ): Promise<Readonly<{ bookingId: string; revision: number }>>;
  loadProposal(accessToken: string, bookingId: string): Promise<ProposalView>;
  acquireHold(accessToken: string, bookingId: string, expectedRevision: number): Promise<void>;
  saveTimeline(
    accessToken: string,
    input: Readonly<{
      bookingId: string;
      expectedRevision: number;
      predecessorRevisionId: string | null;
      startTime: string;
      title: string;
    }>,
  ): Promise<void>;
  approveTimeline(
    accessToken: string,
    input: Readonly<{ bookingId: string; revisionId: string; expectedRevision: number }>,
  ): Promise<void>;
  cancel(
    accessToken: string,
    input: Readonly<{ bookingId: string; expectedRevision: number; reason: string }>,
  ): Promise<void>;
  complete(
    accessToken: string,
    input: Readonly<{ bookingId: string; expectedRevision: number }>,
  ): Promise<void>;
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function intent(scope: string): string {
  return `${scope}:${crypto.randomUUID()}`;
}

function proposal(value: unknown): ProposalView {
  if (typeof value !== 'object' || value === null || !('bookingId' in value)) {
    throw new Error('Máy chủ trả về hồ sơ đề xuất không hợp lệ.');
  }
  return value as ProposalView;
}

export function createManagementBookingGateway(client?: ApiClient): ManagementBookingGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

  return {
    async createConsultation(accessToken, input) {
      const { data } = await api().POST('/management/consultations', {
        body: input,
        headers: auth(accessToken),
        params: { header: { 'Idempotency-Key': intent('consultation') } },
      });
      return required(data, 'Không nhận được hồ sơ tư vấn.').data;
    },
    async invite(accessToken, input) {
      await api().POST('/management/consultations/{consultationId}/workspace-invitations', {
        params: {
          header: { 'Idempotency-Key': intent('workspace-invitation') },
          path: { consultationId: input.consultationId },
        },
        body: { expectedRevision: input.expectedRevision },
        headers: auth(accessToken),
      });
    },
    async checkAvailability(accessToken, input) {
      const { data } = await api().GET('/management/availability', {
        params: { query: input },
        headers: auth(accessToken),
      });
      const result = required(data, 'Không nhận được tình trạng lịch.').data;
      return { available: result.available, expiresAt: result.activeHold?.expiresAt ?? null };
    },
    async createBooking(accessToken, input) {
      const { data } = await api().POST('/bookings', {
        body: input,
        headers: auth(accessToken),
        params: { header: { 'Idempotency-Key': intent('booking') } },
      });
      return required(data, 'Không nhận được hồ sơ đặt tiệc.').data;
    },
    async loadProposal(accessToken, bookingId) {
      const { data } = await api().GET('/bookings/{bookingId}/proposal', {
        params: { path: { bookingId } },
        headers: auth(accessToken),
      });
      return proposal(required(data, 'Không nhận được đề xuất.').data);
    },
    async acquireHold(accessToken, bookingId, expectedRevision) {
      await api().POST('/bookings/{bookingId}/slot-holds', {
        params: {
          header: { 'Idempotency-Key': intent('slot-hold') },
          path: { bookingId },
        },
        body: { expectedRevision },
        headers: auth(accessToken),
      });
    },
    async saveTimeline(accessToken, input) {
      await api().POST('/bookings/{bookingId}/timeline-revisions', {
        params: {
          header: { 'Idempotency-Key': intent('timeline') },
          path: { bookingId: input.bookingId },
        },
        body: {
          expectedRevision: input.expectedRevision,
          predecessorRevisionId: input.predecessorRevisionId,
          items: [{ order: 1, startTime: input.startTime, title: input.title }],
        },
        headers: auth(accessToken),
      });
    },
    async approveTimeline(accessToken, input) {
      await api().POST('/bookings/{bookingId}/timeline-revisions/{revisionId}/approvals', {
        params: {
          header: { 'Idempotency-Key': intent('timeline-approval') },
          path: { bookingId: input.bookingId, revisionId: input.revisionId },
        },
        body: { expectedRevision: input.expectedRevision },
        headers: auth(accessToken),
      });
    },
    async cancel(accessToken, input) {
      await api().POST('/management/bookings/{bookingId}/cancellation', {
        params: {
          header: { 'Idempotency-Key': intent('booking-cancellation') },
          path: { bookingId: input.bookingId },
        },
        body: { expectedRevision: input.expectedRevision, reason: input.reason },
        headers: auth(accessToken),
      });
    },
    async complete(accessToken, input) {
      await api().POST('/management/bookings/{bookingId}/completion', {
        params: {
          header: { 'Idempotency-Key': intent('booking-completion') },
          path: { bookingId: input.bookingId },
        },
        body: { expectedRevision: input.expectedRevision },
        headers: auth(accessToken),
      });
    },
  };
}
