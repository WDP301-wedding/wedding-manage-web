import { expect, it } from 'vitest';
import { createApiClient } from '../../lib/api/client';
import { installCommandRetries } from './command-retries';

const bookingId = '00000000-0000-4000-8000-000000000001';
const requestId = '00000000-0000-4000-8000-000000000002';

it('reuses a command key after an unknown response and starts a fresh intent after success', async () => {
  const keys: (string | null)[] = [];
  const client = installCommandRetries(
    createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: (request) => {
        keys.push(request.headers.get('Idempotency-Key'));
        if (keys.length === 1) return Promise.reject(new Error('connection lost'));
        return Promise.resolve(Response.json({ data: { phase: 'COMPLETED', bookingRevision: 2 } }));
      },
    }),
  );
  const send = (key: string) =>
    client.POST('/management/bookings/{bookingId}/completion', {
      params: { path: { bookingId }, header: { 'Idempotency-Key': key } },
      body: { expectedRevision: 1 },
      headers: { Authorization: 'Bearer test-token' },
    });
  await expect(send('first-key')).rejects.toMatchObject({ kind: 'network' });
  await send('retry-key');
  await send('new-key');
  expect(keys).toEqual(['first-key', 'first-key', 'new-key']);
});

it('starts a new HTTP intent after a known provider failure, while retaining in-progress reconciliation', async () => {
  const keys: (string | null)[] = [];
  const codes = ['PROVIDER_UNAVAILABLE', 'REQUEST_IN_PROGRESS', null];
  const client = installCommandRetries(
    createApiClient({
      baseUrl: 'http://localhost:4000/api/v1',
      fetch: (request) => {
        keys.push(request.headers.get('Idempotency-Key'));
        const code = codes.shift();
        return Promise.resolve(
          code
            ? Response.json(
                { error: { code, message: 'Retry', requestId } },
                { status: code === 'PROVIDER_UNAVAILABLE' ? 503 : 409 },
              )
            : Response.json({ data: {} }),
        );
      },
    }),
  );
  const send = (key: string) =>
    client.POST('/management/bookings/{bookingId}/completion', {
      params: { path: { bookingId }, header: { 'Idempotency-Key': key } },
      body: { expectedRevision: 1 },
    });
  await expect(send('first')).rejects.toMatchObject({ status: 503 });
  await expect(send('second')).rejects.toMatchObject({ code: 'REQUEST_IN_PROGRESS' });
  await send('third');
  expect(keys).toEqual(['first', 'second', 'second']);
});
