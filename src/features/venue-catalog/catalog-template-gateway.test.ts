import { describe, expect, it } from 'vitest';
import { createApiClient } from '../../lib/api/client';
import { createLayoutCatalogGateway } from './catalog-layout-gateway';
import { createTimelineCatalogGateway } from './catalog-timeline-gateway';

describe('template command retries', () => {
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
    const authorization = (token: string) => ({ Authorization: `Bearer ${token}` });
    const required = <T>(value: T | undefined): T => {
      if (value === undefined) throw new Error('Missing response');
      return value;
    };
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
