import type { ApiClient } from '../../lib/api/client';
import { invalidateCatalogResource } from './catalog-cache';
import type {
  CatalogHall,
  CatalogLayout,
  LayoutCatalogGateway,
} from './catalog-types';

export type SharedCatalogFetcher = <T>(
  accessToken: string,
  endpoint: string,
  params: Record<string, unknown> | undefined,
  fetcher: () => Promise<T>,
) => Promise<T>;

export function createLayoutCatalogGateway(
  api: () => ApiClient,
  authorization: (token: string) => { Authorization: string },
  required: <T>(value: T | undefined, operation: string) => T,
  fetchShared?: SharedCatalogFetcher,
): LayoutCatalogGateway {
  const read = <T>(accessToken: string, endpoint: string, params?: Record<string, unknown>): Promise<T> => {
    const headers = authorization(accessToken);
    const fetcher = () =>
      api().GET(
        endpoint as never,
        { headers, ...(params ? { params: { query: params } } : {}) } as never,
      ) as Promise<T>;
    return fetchShared ? fetchShared(accessToken, endpoint, params, fetcher) : fetcher();
  };

  return {
    async loadLayouts(accessToken) {
      const [halls, layouts] = await Promise.all([
        read<{ data?: { data: { items: readonly CatalogHall[] } } }>(
          accessToken,
          '/management/catalog/halls',
          { limit: 100 },
        ),
        read<{ data?: { data: { items: readonly CatalogLayout[] } } }>(
          accessToken,
          '/management/catalog/layout-templates',
          { limit: 100 },
        ),
      ]);
      return {
        halls: Array.from(
          required(halls.data, 'Layout halls read').data.items,
          (hall): CatalogHall => ({
            ...hall,
          }),
        ),
        layouts: Array.from(
          required(layouts.data, 'Layout read').data.items,
          (layout): CatalogLayout => ({
            ...layout,
            tables: Array.from(layout.tables, (table) => ({ ...table })),
            versions: Array.from(layout.versions, (version) => ({
              ...version,
              tables: Array.from(version.tables, (table) => ({ ...table })),
            })),
          }),
        ),
      };
    },

    async createLayout(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/layout-templates', {
        headers: authorization(accessToken),
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: { ...input, tables: [...input.tables] },
      });
      invalidateCatalogResource(accessToken, '/management/catalog/layout-templates');
    },

    async updateLayoutDraft(accessToken, { versionId, ...body }) {
      await api().PATCH('/management/catalog/layout-template-versions/{versionId}', {
        headers: authorization(accessToken),
        params: { path: { versionId } },
        body: { ...body, tables: [...body.tables] },
      });
      invalidateCatalogResource(accessToken, '/management/catalog/layout-templates');
    },

    async publishLayout(accessToken, { versionId, ...body }) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/layout-template-versions/{versionId}/publication', {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { versionId },
        },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/layout-templates');
    },

    async cloneLayout(accessToken, { templateId, ...body }) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/layout-templates/{templateId}/versions', {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { templateId },
        },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/layout-templates');
    },

    async changeLayoutLifecycle(accessToken, input) {
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
        await api().POST('/management/catalog/layout-templates/{id}/retirement', options);
      } else {
        await api().POST('/management/catalog/layout-templates/{id}/restoration', options);
      }
      invalidateCatalogResource(accessToken, '/management/catalog/layout-templates');
    },

    async registerLayoutTable(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/layout-templates/{templateId}/tables', {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { templateId: input.templateId },
        },
        body: { tableId: input.tableId },
      });
      invalidateCatalogResource(accessToken, '/management/catalog/layout-templates');
    },

    async retireLayoutTable(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST(
        '/management/catalog/layout-templates/{templateId}/tables/{tableId}/retirement',
        {
          headers: authorization(accessToken),
          params: {
            header: { 'Idempotency-Key': idempotencyKey },
            path: { templateId: input.templateId, tableId: input.tableId },
          },
          body: {},
        },
      );
      invalidateCatalogResource(accessToken, '/management/catalog/layout-templates');
    },
  };
}
