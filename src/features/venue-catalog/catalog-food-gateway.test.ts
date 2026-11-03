import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../lib/api/client';
import { createFoodCatalogGateway } from './catalog-food-gateway';

function gateway(fetcher: (request: Request) => Promise<Response>) {
  const client = createApiClient({ baseUrl: 'https://catalog.example/api/v1', fetch: fetcher });
  return createFoodCatalogGateway(
    () => client,
    (token) => ({ Authorization: `Bearer ${token}` }),
    <T>(value: T | undefined) => {
      if (value === undefined) throw new Error('Missing response');
      return value;
    },
  );
}
const json = (data: unknown) =>
  new Response(JSON.stringify({ data }), { headers: { 'Content-Type': 'application/json' } });

describe('food catalog HTTP gateway', () => {
  it('reuses a clone intent key in the header without adding it to the strict API body', async () => {
    const requests: Request[] = [];
    const api = gateway((request) => {
      requests.push(request);
      return Promise.resolve(json({ versionId: 'new-version', revision: 1 }));
    });
    for (let retry = 0; retry < 2; retry++) {
      await api.cloneDish('manager-token', {
        dishId: 'dish',
        sourceVersionId: 'published',
        versionId: 'new-version',
        idempotencyKey: 'same-intent',
      });
      await api.cloneMenu('manager-token', {
        packageId: 'menu',
        sourceVersionId: 'published',
        versionId: 'new-version',
        idempotencyKey: 'same-menu-intent',
      });
    }
    expect(requests.map((request) => request.headers.get('Idempotency-Key'))).toEqual([
      'same-intent',
      'same-menu-intent',
      'same-intent',
      'same-menu-intent',
    ]);
    for (const request of requests)
      expect(await request.json()).toEqual({
        sourceVersionId: 'published',
        versionId: 'new-version',
      });
  });
  it('loads all cursor pages and preserves the version history needed by exact menu references', async () => {
    const urls: URL[] = [];
    const api = gateway((request) => {
      const url = new URL(request.url);
      urls.push(url);
      if (url.pathname.endsWith('/menu-packages'))
        return Promise.resolve(json({ items: [], nextCursor: null }));
      return Promise.resolve(
        url.searchParams.has('cursor')
          ? json({ items: [{ id: 'dish-2', versions: [] }], nextCursor: null })
          : json({
              items: [{ id: 'dish-1', versions: [{ id: 'v1' }, { id: 'v2' }] }],
              nextCursor: 'next-page',
            }),
      );
    });
    const result = await api.loadFood('manager-token');
    expect(result.dishes.map(({ id }) => id)).toEqual(['dish-1', 'dish-2']);
    expect(result.dishes[0]?.versions).toHaveLength(2);
    expect(urls.some((url) => url.searchParams.get('cursor') === 'next-page')).toBe(true);
  });

  it('sends revision-protected idempotent DELETE requests and reads the updated server revision', async () => {
    const requests: Request[] = [];
    const api = gateway((request) => {
      requests.push(request);
      return Promise.resolve(json({ revision: 7 }));
    });
    await api.deleteDish('manager-token', { id: 'dish-1', expectedRevision: 6 });
    await api.deleteMenu('manager-token', { id: 'menu-1', expectedRevision: 6 });
    expect(requests.map((request) => request.method)).toEqual(['DELETE', 'DELETE']);
    for (const request of requests) {
      expect(request.headers.get('Authorization')).toBe('Bearer manager-token');
      expect(request.headers.get('Idempotency-Key')).toMatch(/^[a-f0-9-]{36}$/u);
      expect(await request.json()).toEqual({ expectedRevision: 6 });
    }
    expect(
      await api.updateDishDraft('manager-token', {
        versionId: 'v1',
        expectedRevision: 6,
        name: 'Súp',
        description: '',
        categoryLabel: 'Khai vị',
        priceVnd: 100000,
      }),
    ).toBe(7);
  });
});
