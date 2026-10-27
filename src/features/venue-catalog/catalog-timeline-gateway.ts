import type { ApiClient } from '../../lib/api/client';
import { invalidateCatalogResource } from './catalog-cache';
import type { CatalogTimeline, TimelineCatalogGateway } from './catalog-types';

export type SharedCatalogFetcher = <T>(
  accessToken: string,
  endpoint: string,
  params: Record<string, unknown> | undefined,
  fetcher: () => Promise<T>,
) => Promise<T>;

export function createTimelineCatalogGateway(
  api: () => ApiClient,
  authorization: (token: string) => { Authorization: string },
  required: <T>(value: T | undefined, operation: string) => T,
  fetchShared?: SharedCatalogFetcher,
): TimelineCatalogGateway {
  const read = <T>(
    accessToken: string,
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<T> => {
    const headers = authorization(accessToken);
    const fetcher = () =>
      api().GET(
        endpoint as never,
        { headers, ...(params ? { params: { query: params } } : {}) } as never,
      ) as Promise<T>;
    return fetchShared ? fetchShared(accessToken, endpoint, params, fetcher) : fetcher();
  };

  return {
    async loadTimelines(accessToken) {
      const timelines = await read<{ data?: { data: { items: readonly CatalogTimeline[] } } }>(
        accessToken,
        '/management/catalog/timeline-templates',
        { limit: 100 },
      );
      return {
        timelines: Array.from(
          required(timelines.data, 'Timeline read').data.items,
          (timeline): CatalogTimeline => ({
            ...timeline,
            versions: Array.from(timeline.versions, (version) => ({
              ...version,
              items: Array.from(version.items, (item) => ({ ...item })),
            })),
          }),
        ),
      };
    },

    async createTimeline(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/timeline-templates', {
        headers: authorization(accessToken),
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: { ...input, items: [...input.items] },
      });
      invalidateCatalogResource(accessToken, '/management/catalog/timeline-templates');
    },

    async updateTimelineDraft(accessToken, { versionId, ...body }) {
      await api().PATCH('/management/catalog/timeline-template-versions/{versionId}', {
        headers: authorization(accessToken),
        params: { path: { versionId } },
        body: { ...body, items: [...body.items] },
      });
      invalidateCatalogResource(accessToken, '/management/catalog/timeline-templates');
    },

    async publishTimeline(accessToken, { versionId, ...body }) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/timeline-template-versions/{versionId}/publication', {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { versionId },
        },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/timeline-templates');
    },

    async cloneTimeline(accessToken, { templateId, ...body }) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/timeline-templates/{templateId}/versions', {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { templateId },
        },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/timeline-templates');
    },

    async changeTimelineLifecycle(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      const options = {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { id: input.id },
        },
        body: { expectedRevision: input.expectedRevision },
      } as const;
      if (input.transition === 'RETIRE') {
        await api().POST('/management/catalog/timeline-templates/{id}/retirement', options);
      } else {
        await api().POST('/management/catalog/timeline-templates/{id}/restoration', options);
      }
      invalidateCatalogResource(accessToken, '/management/catalog/timeline-templates');
    },
  };
}
