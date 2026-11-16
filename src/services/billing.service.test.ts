import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { axiosApiClient } from '../lib/api/axios-client';
import { billingService } from './billing.service';

const originalAdapter = axiosApiClient.defaults.adapter;

afterEach(() => {
  if (originalAdapter === undefined) delete axiosApiClient.defaults.adapter;
  else axiosApiClient.defaults.adapter = originalAdapter;
});

describe('deleting a draft incidental expense', () => {
  it('sends the selected line, expected revision, and an idempotency key', async () => {
    const adapter = vi.fn<AxiosAdapter>((config) =>
      Promise.resolve({ config, data: {}, headers: {}, status: 200, statusText: 'OK' }),
    );
    axiosApiClient.defaults.adapter = adapter;

    await billingService.deleteIncidental('booking', 'line', 3);

    const request = adapter.mock.calls[0]![0];
    expect(request.method).toBe('delete');
    expect(request.url).toBe('/management/bookings/booking/incidental-expenses/line');
    expect(request.data).toBe(JSON.stringify({ expectedRevision: 3 }));
    expect(request.headers.get('Idempotency-Key')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
