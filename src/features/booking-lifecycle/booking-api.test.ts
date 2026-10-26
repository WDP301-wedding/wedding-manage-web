import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../lib/api/client';
import { createManagementBookingGateway } from './booking-api';

const token = 'test-token';
const bookingId = 'booking';
const revisionId = 'timeline';
const timeline = {
  bookingId,
  expectedRevision: 7,
  predecessorRevisionId: revisionId,
  items: [{ order: 0, startTime: '18:00', title: 'Welcome' }],
};
function response(data: unknown): Promise<Response> {
  return Promise.resolve(Response.json({ data }));
}
function harness(data: unknown = {}) {
  const requests: Request[] = [];
  const fetch = vi.fn((request: Request) => {
    requests.push(request.clone());
    return response(data);
  });
  const client = createApiClient({ baseUrl: 'http://localhost:4000/api/v1', fetch });
  return { requests, fetch, client };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('management booking HTTP adapter', () => {
  it('reads all catalog pages and keeps only booking selection fields', async () => {
    const h = harness();
    h.fetch.mockImplementation((request) => {
      h.requests.push(request.clone());
      const url = new URL(request.url);
      if (url.pathname.endsWith('/restaurant'))
        return response({ shifts: [{ code: 'DINNER', startTime: '18:00', endTime: '22:00' }] });
      const second = url.searchParams.has('cursor');
      if (url.pathname.endsWith('/halls'))
        return response({
          items: [
            { id: second ? 'hall2' : 'hall1', name: 'Hall', maxGuests: 100, privateField: 'omit' },
          ],
          nextCursor: second ? null : 'next',
        });
      return response({
        items: [
          {
            versionId: second ? 'menu2' : 'menu1',
            name: 'Menu',
            versionNumber: 2,
            priceVndPerTable: 1000,
            privateField: 'omit',
          },
        ],
        nextCursor: second ? null : 'next',
      });
    });
    const selections = await createManagementBookingGateway(h.client).loadSelections(token);
    expect(selections.halls.map((hall) => hall.id)).toEqual(['hall1', 'hall2']);
    expect(selections.menus.map((menu) => menu.versionId)).toEqual(['menu1', 'menu2']);
    expect(selections.halls[0]).not.toHaveProperty('privateField');
    expect(selections.menus[0]).not.toHaveProperty('privateField');
    expect(selections.shifts[0]?.code).toBe('DINNER');
    expect(
      h.requests.filter((r) => new URL(r.url).searchParams.get('cursor') === 'next'),
    ).toHaveLength(2);
  });
  it.each(['halls', 'menu-packages', 'restaurant'])(
    'rejects missing %s catalog data',
    async (path) => {
      const h = harness();
      h.fetch.mockImplementation((request) =>
        new URL(request.url).pathname.endsWith('/' + path)
          ? Promise.resolve(new Response(null, { status: 204 }))
          : response({ items: [], nextCursor: null, shifts: [] }),
      );
      await expect(createManagementBookingGateway(h.client).loadSelections(token)).rejects.toThrow(
        'Không nhận được',
      );
    },
  );
  it.each([
    { proposal: { menus: [] }, timeline: null, effectiveTimeline: null },
    {
      proposal: { menus: [] },
      timeline: { items: [{ title: 'Draft' }] },
      effectiveTimeline: { items: [{ title: 'Effective' }] },
      cancellationRequests: [{ requestId: 'request' }],
    },
  ])('preserves proposal data: %j', async (data) => {
    const h = harness(data);
    expect(await createManagementBookingGateway(h.client).loadProposal(token, bookingId)).toEqual(
      data,
    );
  });
  it('rejects missing proposal, consultation and booking response data', async () => {
    const h = harness();
    h.fetch.mockResolvedValue(new Response(null, { status: 204 }));
    const gateway = createManagementBookingGateway(h.client);
    await expect(gateway.loadProposal(token, bookingId)).rejects.toThrow('đề xuất');
    await expect(
      gateway.createConsultation(token, {
        intendedEmail: 'couple@example.com',
        displayName: 'Couple',
      }),
    ).rejects.toThrow('tư vấn');
    await expect(
      gateway.createBooking(token, {
        consultationId: 'consultation',
        hallId: 'hall',
        eventDate: '2026-12-20',
        shiftCode: 'DINNER',
        menuPackageVersionId: 'menu',
        tableCount: 10,
        planningHeadcount: 100,
        expectedRevision: 7,
      }),
    ).rejects.toThrow('đặt tiệc');
  });
  it.each([null, { expiresAt: '2026-12-20T00:00:00Z' }])(
    'uses server availability and hold expiry: %j',
    async (activeHold) => {
      const h = harness({ available: activeHold === null, activeHold });
      expect(
        await createManagementBookingGateway(h.client).checkAvailability(token, {
          hallId: 'hall',
          eventDate: '2026-12-20',
          shiftCode: 'DINNER',
        }),
      ).toEqual({ available: activeHold === null, expiresAt: activeHold?.expiresAt ?? null });
    },
  );
  it('sends only availability fields when given a complete booking form', async () => {
    const h = harness({ available: true, activeHold: null });
    const bookingForm = {
      consultationId: 'consultation',
      hallId: 'hall',
      eventDate: '2026-12-21',
      shiftCode: 'LUNCH' as const,
      menuPackageVersionId: 'menu',
      tableCount: 20,
      planningHeadcount: 200,
      expectedRevision: 1,
    };
    await createManagementBookingGateway(h.client).checkAvailability(token, bookingForm);
    const sent = h.requests[0]!;
    expect(Object.fromEntries(new URL(sent.url).searchParams)).toEqual({
      hallId: 'hall',
      eventDate: '2026-12-21',
      shiftCode: 'LUNCH',
    });
    expect(sent.method).toBe('GET');
    expect(sent.headers.get('Authorization')).toBe('Bearer test-token');
  });
  it('creates and reuses the default client lazily', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:4000/api/v1');
    const fetch = vi.fn(() =>
      response({ proposal: { menus: [] }, timeline: null, effectiveTimeline: null }),
    );
    vi.stubGlobal('fetch', fetch);
    const gateway = createManagementBookingGateway();
    await gateway.loadProposal(token, bookingId);
    await gateway.loadProposal(token, bookingId);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('sends exact command bodies and separate idempotency intents', async () => {
    const h = harness({
      consultationId: 'consultation',
      revision: 7,
      bookingId,
      consultationRevision: 9,
    });
    const gateway = createManagementBookingGateway(h.client);
    const consultation = {
      intendedEmail: 'couple@example.com',
      displayName: 'Couple',
      note: 'Note',
    };
    const booking = {
      consultationId: 'consultation',
      hallId: 'hall',
      eventDate: '2026-12-20',
      shiftCode: 'DINNER' as const,
      menuPackageVersionId: 'menu',
      tableCount: 10,
      planningHeadcount: 100,
      expectedRevision: 7,
    };
    expect(await gateway.createConsultation(token, consultation)).toHaveProperty('revision', 7);
    await gateway.invite(token, { consultationId: 'consultation', expectedRevision: 7 });
    expect(await gateway.createBooking(token, booking)).toHaveProperty('consultationRevision', 9);
    await gateway.acquireHold(token, bookingId, 7);
    await gateway.saveTimeline(token, timeline);
    await gateway.approveTimeline(token, { bookingId, revisionId, expectedRevision: 7 });
    await gateway.cancel(token, { bookingId, expectedRevision: 7, reason: 'Cancel' });
    await gateway.decideCancellation(token, {
      bookingId,
      requestId: 'request',
      expectedRevision: 7,
      decision: 'REJECT',
      reason: 'Continue',
    });
    await gateway.requestChange(token, { ...timeline, reason: 'Change' });
    await gateway.complete(token, { bookingId, expectedRevision: 7 });
    const expected = [
      ['/management/consultations', consultation],
      ['/management/consultations/consultation/workspace-invitations', { expectedRevision: 7 }],
      ['/bookings', booking],
      ['/bookings/booking/slot-holds', { expectedRevision: 7 }],
      [
        '/bookings/booking/timeline-revisions',
        { expectedRevision: 7, predecessorRevisionId: revisionId, items: timeline.items },
      ],
      ['/bookings/booking/timeline-revisions/timeline/approvals', { expectedRevision: 7 }],
      ['/management/bookings/booking/cancellation', { expectedRevision: 7, reason: 'Cancel' }],
      [
        '/management/bookings/booking/cancellation-requests/request/decision',
        { expectedRevision: 7, decision: 'REJECT', reason: 'Continue' },
      ],
      [
        '/bookings/booking/change-requests',
        { expectedRevision: 7, items: timeline.items, reason: 'Change' },
      ],
      ['/management/bookings/booking/completion', { expectedRevision: 7 }],
    ] as const;
    for (const [index, [path, body]] of expected.entries()) {
      const sent = h.requests[index]!;
      expect(sent.url).toBe('http://localhost:4000/api/v1' + path);
      expect(sent.method).toBe('POST');
      expect(await sent.json()).toEqual(body);
      expect(sent.headers.get('Authorization')).toBe('Bearer test-token');
      expect(sent.headers.get('Idempotency-Key')).toMatch(/:[0-9a-f-]{36}$/);
    }
    expect(new Set(h.requests.map((r) => r.headers.get('Idempotency-Key'))).size).toBe(10);
  });
});
