import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import { RetainedPrintPreview } from './retained-print-preview';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it('lets the session refresh an expired bearer before loading the retained PDF', async () => {
  vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.test/api/v1');
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('{}', { status: 401 }))
    .mockResolvedValueOnce(
      new Response(new Blob(['%PDF'], { type: 'application/pdf' }), {
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal(
    'URL',
    class extends URL {
      static override createObjectURL() {
        return 'blob:retained-print';
      }
      static override revokeObjectURL() {}
    },
  );
  let expiredStatus: number | undefined;
  const authorize = async <T,>(work: (token: string) => Promise<T>) => {
    try {
      return await work('expired');
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401) throw error;
      expiredStatus = error.status;
      return work('refreshed');
    }
  };
  render(
    <RetainedPrintPreview
      bookingId="booking"
      printableRevisionId="revision"
      title="Thiệp"
      authorize={authorize}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Xem bản in: Thiệp' }));
  expect(await screen.findByTitle('Bản in: Thiệp')).toHaveAttribute(
    'src',
    'blob:retained-print#view=FitH',
  );
  expect(expiredStatus).toBe(401);
  expect(fetch.mock.calls[1]?.[1]?.headers.Authorization).toBe('Bearer refreshed');
});
