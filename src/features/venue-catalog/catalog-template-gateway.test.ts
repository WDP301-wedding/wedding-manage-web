import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../lib/api/client';
import { createLayoutCatalogGateway } from './catalog-layout-gateway';
import { createTimelineCatalogGateway } from './catalog-timeline-gateway';

const authorization = (token: string) => ({ Authorization: `Bearer ${token}` });
const required = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('Missing response');
  return value;
};

describe('template gateways', () => {
  it('loads layouts from every page for the status filters and newly created drafts', async () => {
    const cursors: (string | null)[] = [];
    const client = createApiClient({
      baseUrl: 'https://catalog.example/api/v1',
      fetch: (request) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');
        const isLayout = url.pathname.endsWith('/layout-templates');
        if (isLayout) cursors.push(cursor);
        const items = isLayout
          ? [{ id: cursor ? 'new-draft' : 'existing-layout', versions: [], tables: [] }]
          : [];
        return Promise.resolve(
          Response.json({
            data: { items, nextCursor: isLayout && !cursor ? 'existing-layout' : null },
          }),
        );
      },
    });
    const gateway = createLayoutCatalogGateway(() => client, authorization, required);

    const { layouts } = await gateway.loadLayouts('token');

    expect(layouts.map(({ id }) => id)).toEqual(['existing-layout', 'new-draft']);
    expect(cursors).toEqual([null, 'existing-layout']);
  });

  it('reuses command keys in headers and preserves the strict HTTP bodies', async () => {
    const requests: Request[] = [];
    const client = createApiClient({
      baseUrl: 'https://catalog.example/api/v1',
      fetch: (request) => {
        requests.push(request);
        return Promise.resolve(
          new Response(JSON.stringify({ data: {} }), {
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      },
    });
    const layout = createLayoutCatalogGateway(() => client, authorization, required);
    const timeline = createTimelineCatalogGateway(() => client, authorization, required);
    for (let attempt = 0; attempt < 2; attempt++) {
      await timeline.cloneTimeline('token', {
        templateId: 'timeline',
        sourceVersionId: 'old',
        versionId: 'new',
        idempotencyKey: 'timeline-intent',
      });
      await layout.cloneLayout('token', {
        templateId: 'layout',
        sourceVersionId: 'old',
        versionId: 'new',
        idempotencyKey: 'layout-intent',
      });
      await layout.registerLayoutTable('token', {
        templateId: 'layout',
        tableId: 'table',
        idempotencyKey: 'register-intent',
      });
      await layout.retireLayoutTable('token', {
        templateId: 'layout',
        tableId: 'table',
        idempotencyKey: 'retire-intent',
      });
    }
    expect(requests.map((request) => request.headers.get('Idempotency-Key'))).toEqual([
      'timeline-intent',
      'layout-intent',
      'register-intent',
      'retire-intent',
      'timeline-intent',
      'layout-intent',
      'register-intent',
      'retire-intent',
    ]);
    expect(await Promise.all(requests.map((request) => request.json()))).toEqual([
      { sourceVersionId: 'old', versionId: 'new' },
      { sourceVersionId: 'old', versionId: 'new' },
      { tableId: 'table' },
      {},
      { sourceVersionId: 'old', versionId: 'new' },
      { sourceVersionId: 'old', versionId: 'new' },
      { tableId: 'table' },
      {},
    ]);
  });
});
