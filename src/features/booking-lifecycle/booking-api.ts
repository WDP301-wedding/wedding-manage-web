import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
import { installCommandRetries } from './command-retries';

export type ProposalView = components['schemas']['BookingProposalResponse']['data'];
export type TimelineItemInput = components['schemas']['TimelineRevisionBody']['items'][number];
export type BookingSelections = Readonly<{
  halls: readonly Pick<components['schemas']['CatalogPublicHall'], 'id' | 'name' | 'maxGuests'>[];
  menus: readonly Pick<
    components['schemas']['CatalogPublicMenuPackage'],
    'versionId' | 'name' | 'versionNumber' | 'priceVndPerTable'
  >[];
  shifts: components['schemas']['CatalogPublicRestaurant']['shifts'];
}>;

export type WorkspaceInvitationResult = Readonly<{
  consultationId: string;
  invitationId: string;
  status: string;
  replayed?: boolean;
}>;

export interface ManagementBookingGateway {
  loadSelections(this: void, accessToken: string): Promise<BookingSelections>;
  createConsultation(
    this: void,
    accessToken: string,
    input: Readonly<{ intendedEmail: string; displayName: string; note?: string }>,
  ): Promise<Readonly<{ consultationId: string; revision: number }>>;
  invite(
    this: void,
    accessToken: string,
    input: Readonly<{ consultationId: string; expectedRevision: number }>,
  ): Promise<WorkspaceInvitationResult | void>;
  checkAvailability(
    this: void,
    accessToken: string,
    input: Readonly<{ hallId: string; eventDate: string; shiftCode: 'LUNCH' | 'DINNER' }>,
  ): Promise<Readonly<{ available: boolean; expiresAt: string | null }>>;
  createBooking(
    this: void,
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
  ): Promise<components['schemas']['BookingResponse']['data']>;
  loadProposal(this: void, accessToken: string, bookingId: string): Promise<ProposalView>;
  acquireHold(
    this: void,
    accessToken: string,
    bookingId: string,
    expectedRevision: number,
  ): Promise<void>;
  saveTimeline(
    this: void,
    accessToken: string,
    input: Readonly<{
      bookingId: string;
      expectedRevision: number;
      predecessorRevisionId: string | null;
      items: readonly TimelineItemInput[];
    }>,
  ): Promise<void>;
  approveTimeline(
    this: void,
    accessToken: string,
    input: Readonly<{ bookingId: string; revisionId: string; expectedRevision: number }>,
  ): Promise<void>;
  cancel(
    this: void,
    accessToken: string,
    input: Readonly<{ bookingId: string; expectedRevision: number; reason: string }>,
  ): Promise<void>;
  decideCancellation(
    this: void,
    accessToken: string,
    input: Readonly<{
      bookingId: string;
      requestId: string;
      expectedRevision: number;
      decision: 'APPROVE' | 'REJECT';
      reason: string;
    }>,
  ): Promise<void>;
  requestChange(
    this: void,
    accessToken: string,
    input: Readonly<{
      bookingId: string;
      expectedRevision: number;
      items: readonly TimelineItemInput[];
      reason: string;
    }>,
  ): Promise<void>;
  complete(
    this: void,
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

export function createManagementBookingGateway(client?: ApiClient): ManagementBookingGateway {
  let resolved = client === undefined ? undefined : installCommandRetries(client);
  const api = () => (resolved ??= installCommandRetries(createApiClient()));
  const auth = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

  return {
    async loadSelections(accessToken) {
      const headers = auth(accessToken);
      const halls: BookingSelections['halls'][number][] = [];
      const menus: BookingSelections['menus'][number][] = [];
      const readHalls = async () => {
        let cursor: string | null = null;
        do {
          const { data } = await api().GET('/catalog/halls', {
            headers,
            params: { query: { limit: 100, ...(cursor === null ? {} : { cursor }) } },
          });
          const page: Readonly<{
            items: ArrayLike<BookingSelections['halls'][number]>;
            nextCursor: string | null;
          }> = required(data, 'Không nhận được danh mục sảnh.').data;
          halls.push(
            ...Array.from(page.items, ({ id, name, maxGuests }) => ({ id, name, maxGuests })),
          );
          cursor = page.nextCursor;
        } while (cursor !== null);
      };
      const readMenus = async () => {
        let cursor: string | null = null;
        do {
          const { data } = await api().GET('/catalog/menu-packages', {
            headers,
            params: { query: { limit: 100, ...(cursor === null ? {} : { cursor }) } },
          });
          const page: Readonly<{
            items: ArrayLike<BookingSelections['menus'][number]>;
            nextCursor: string | null;
          }> = required(data, 'Không nhận được danh mục thực đơn.').data;
          menus.push(
            ...Array.from(page.items, ({ versionId, name, versionNumber, priceVndPerTable }) => ({
              versionId,
              name,
              versionNumber,
              priceVndPerTable,
            })),
          );
          cursor = page.nextCursor;
        } while (cursor !== null);
      };
      const [restaurant] = await Promise.all([
        api().GET('/catalog/restaurant', { headers }),
        readHalls(),
        readMenus(),
      ]);
      return {
        halls,
        menus,
        shifts: Array.from(required(restaurant.data, 'Không nhận được khung giờ.').data.shifts),
      };
    },
    async createConsultation(accessToken, input) {
      const { data } = await api().POST('/management/consultations', {
        body: input,
        headers: auth(accessToken),
        params: { header: { 'Idempotency-Key': intent('consultation') } },
      });
      return required(data, 'Không nhận được hồ sơ tư vấn.').data;
    },
    async invite(accessToken, input) {
      const { data } = await api().POST(
        '/management/consultations/{consultationId}/workspace-invitations',
        {
          params: {
            header: { 'Idempotency-Key': intent('workspace-invitation') },
            path: { consultationId: input.consultationId },
          },
          body: { expectedRevision: input.expectedRevision },
          headers: auth(accessToken),
        },
      );
      return data?.data;
    },
    async checkAvailability(accessToken, input) {
      const { data } = await api().GET('/management/availability', {
        params: {
          query: {
            hallId: input.hallId,
            eventDate: input.eventDate,
            shiftCode: input.shiftCode,
          },
        },
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
      const value = required(data, 'Không nhận được đề xuất.').data;
      const { cancellationRequests, ...proposalValue } = value;
      return {
        ...proposalValue,
        ...(cancellationRequests === undefined
          ? {}
          : { cancellationRequests: Array.from(cancellationRequests) }),
        timeline:
          value.timeline === null
            ? null
            : { ...value.timeline, items: Array.from(value.timeline.items) },
        effectiveTimeline:
          value.effectiveTimeline === null
            ? null
            : { ...value.effectiveTimeline, items: Array.from(value.effectiveTimeline.items) },
      };
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
          items: input.items,
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
    async decideCancellation(accessToken, input) {
      await api().POST(
        '/management/bookings/{bookingId}/cancellation-requests/{requestId}/decision',
        {
          params: {
            header: { 'Idempotency-Key': intent('cancellation-decision') },
            path: { bookingId: input.bookingId, requestId: input.requestId },
          },
          body: {
            expectedRevision: input.expectedRevision,
            decision: input.decision,
            reason: input.reason,
          },
          headers: auth(accessToken),
        },
      );
    },
    async requestChange(accessToken, input) {
      await api().POST('/bookings/{bookingId}/change-requests', {
        params: {
          header: { 'Idempotency-Key': intent('change-request') },
          path: { bookingId: input.bookingId },
        },
        body: {
          expectedRevision: input.expectedRevision,
          items: input.items,
          reason: input.reason,
        },
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
