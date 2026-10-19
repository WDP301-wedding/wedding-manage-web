import type { ApiClient } from '../../lib/api/client';
import type {
  CatalogMedia,
  CatalogMediaResource,
  CatalogMediaResourcePath,
  CatalogMediaResourceType,
  MediaCatalogGateway,
} from './catalog-types';

export type SharedCatalogFetcher = <T>(
  accessToken: string,
  endpoint: string,
  params: Record<string, unknown> | undefined,
  fetcher: () => Promise<T>,
) => Promise<T>;

type CatalogAggregateItem = {
  readonly id: string;
  readonly versions: readonly {
    readonly id: string;
    readonly name: string;
    readonly revision: number;
    readonly state: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
    readonly versionNumber: number | null;
  }[];
};

export function createMediaCatalogGateway(
  api: () => ApiClient,
  authorization: (token: string) => { Authorization: string },
  required: <T>(value: T | undefined, operation: string) => T,
  fetchShared?: SharedCatalogFetcher,
): MediaCatalogGateway {
  return {
    async loadMediaResources(accessToken) {
      const headers = authorization(accessToken);
      const read = <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
        const fetcher = () =>
          api().GET(
            endpoint as never,
            { headers, ...(params ? { params: { query: params } } : {}) } as never,
          ) as Promise<T>;
        return fetchShared ? fetchShared(accessToken, endpoint, params, fetcher) : fetcher();
      };

      const [restaurant, halls, dishes, menus, timelines, layouts] = await Promise.all([
        read<{ data?: { data: { id: string; displayName: string; revision: number } } }>(
          '/management/catalog/restaurant',
        ),
        read<{
          data?: {
            data: {
              items: readonly { id: string; name: string; revision: number; lifecycle: string }[];
            };
          };
        }>('/management/catalog/halls', { limit: 100 }),
        read<{ data?: { data: { items: readonly CatalogAggregateItem[] } } }>(
          '/management/catalog/dishes',
          { limit: 100 },
        ),
        read<{ data?: { data: { items: readonly CatalogAggregateItem[] } } }>(
          '/management/catalog/menu-packages',
          { limit: 100 },
        ),
        read<{ data?: { data: { items: readonly CatalogAggregateItem[] } } }>(
          '/management/catalog/timeline-templates',
          { limit: 100 },
        ),
        read<{ data?: { data: { items: readonly CatalogAggregateItem[] } } }>(
          '/management/catalog/layout-templates',
          { limit: 100 },
        ),
      ]);
      const profile = required(restaurant.data, 'Media restaurant read').data;
      const resources: CatalogMediaResource[] = [
        {
          path: 'restaurant-profile',
          type: 'RESTAURANT_PROFILE',
          id: profile.id,
          label: `Nhà hàng · ${profile.displayName}`,
          revision: profile.revision,
          mutableOrder: true,
        },
      ];
      resources.push(
        ...Array.from(
          required(halls.data, 'Media hall read').data.items,
          (hall): CatalogMediaResource => ({
            path: 'halls',
            type: 'HALL',
            id: hall.id,
            label: `Sảnh · ${hall.name}${hall.lifecycle === 'RETIRED' ? ' (đã ngừng)' : ''}`,
            revision: hall.revision,
            mutableOrder: true,
          }),
        ),
      );
      const appendVersions = (
        aggregates: readonly {
          readonly id: string;
          readonly versions: readonly {
            readonly id: string;
            readonly name: string;
            readonly revision: number;
            readonly state: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
            readonly versionNumber: number | null;
          }[];
        }[],
        path: CatalogMediaResourcePath,
        type: CatalogMediaResourceType,
        prefix: string,
      ) => {
        for (const aggregate of aggregates) {
          for (const version of aggregate.versions) {
            resources.push({
              path,
              type,
              id: version.id,
              label: `${prefix} · ${version.name} · ${version.state === 'DRAFT' ? 'bản nháp' : `v${version.versionNumber ?? '—'}`}`,
              revision: version.revision,
              mutableOrder: version.state === 'DRAFT',
            });
          }
        }
      };
      const normalizeVersions = <
        T extends {
          readonly id: string;
          readonly versions: ArrayLike<{
            readonly id: string;
            readonly name: string;
            readonly revision: number;
            readonly state: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
            readonly versionNumber: number | null;
          }>;
        },
      >(
        items: ArrayLike<T>,
      ) =>
        Array.from(items, (aggregate) => ({
          id: aggregate.id,
          versions: Array.from(aggregate.versions, (version) => ({ ...version })),
        }));
      appendVersions(
        normalizeVersions(required(dishes.data, 'Media dish read').data.items),
        'dish-versions',
        'DISH_VERSION',
        'Món',
      );
      appendVersions(
        normalizeVersions(required(menus.data, 'Media menu read').data.items),
        'menu-package-versions',
        'MENU_PACKAGE_VERSION',
        'Thực đơn',
      );
      appendVersions(
        normalizeVersions(required(timelines.data, 'Media timeline read').data.items),
        'timeline-template-versions',
        'TIMELINE_TEMPLATE_VERSION',
        'Kịch bản',
      );
      appendVersions(
        normalizeVersions(required(layouts.data, 'Media layout read').data.items),
        'layout-template-versions',
        'LAYOUT_TEMPLATE_VERSION',
        'Bố trí',
      );
      return resources;
    },

    async loadMedia(accessToken, input) {
      const result = await api().GET('/management/catalog/{resource}/{resourceId}/media', {
        headers: authorization(accessToken),
        params: { path: { resource: input.path, resourceId: input.id } },
      });
      return Array.from(required(result.data, 'Media read').data.items, (asset: CatalogMedia) => ({
        ...asset,
      }));
    },

    async uploadMedia(accessToken, input) {
      const body = new FormData();
      body.set('assetId', input.assetId);
      body.set('resourceType', input.resourceType);
      body.set('resourceId', input.resourceId);
      body.set('alternativeText', input.alternativeText);
      body.set('file', input.file);
      if (input.oldAssetId !== undefined) body.set('oldAssetId', input.oldAssetId);
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/media-assets', {
        headers: authorization(accessToken),
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: body as never,
      });
    },

    async reorderMedia(accessToken, input) {
      await api().PATCH('/management/catalog/{resource}/{resourceId}/media-order', {
        headers: authorization(accessToken),
        params: { path: { resource: input.path, resourceId: input.id } },
        body: { assetIds: [...input.assetIds], expectedRevision: input.revision },
      });
    },
  };
}
