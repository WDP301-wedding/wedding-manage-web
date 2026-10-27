import type { ApiClient } from '../../lib/api/client';
import { invalidateCatalogResource } from './catalog-cache';
import type { CatalogDish, CatalogMenu, FoodCatalogGateway } from './catalog-types';

export type SharedCatalogFetcher = <T>(
  accessToken: string,
  endpoint: string,
  params: Record<string, unknown> | undefined,
  fetcher: () => Promise<T>,
) => Promise<T>;

export function createFoodCatalogGateway(
  api: () => ApiClient,
  authorization: (token: string) => { Authorization: string },
  required: <T>(value: T | undefined, operation: string) => T,
  fetchShared?: SharedCatalogFetcher,
): FoodCatalogGateway {
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
    async loadFood(accessToken) {
      const [dishes, menus] = await Promise.all([
        read<{ data?: { data: { items: readonly CatalogDish[] } } }>(
          accessToken,
          '/management/catalog/dishes',
          { limit: 100 },
        ),
        read<{ data?: { data: { items: readonly CatalogMenu[] } } }>(
          accessToken,
          '/management/catalog/menu-packages',
          { limit: 100 },
        ),
      ]);
      return {
        dishes: Array.from(required(dishes.data, 'Dish read').data.items, (dish): CatalogDish => ({
          ...dish,
          versions: Array.from(dish.versions, (version) => ({ ...version })),
        })),
        menus: Array.from(required(menus.data, 'Menu read').data.items, (menu): CatalogMenu => ({
          ...menu,
          versions: Array.from(menu.versions, (version) => ({
            ...version,
            items: Array.from(version.items, (item) => ({ ...item })),
          })),
        })),
      };
    },

    async createDish(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/dishes', {
        headers: authorization(accessToken),
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: input,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/dishes');
    },

    async updateDishDraft(accessToken, { versionId, ...body }) {
      await api().PATCH('/management/catalog/dish-versions/{versionId}', {
        headers: authorization(accessToken),
        params: { path: { versionId } },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/dishes');
    },

    async publishDish(accessToken, { versionId, ...body }) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/dish-versions/{versionId}/publication', {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { versionId },
        },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/dishes');
    },

    async cloneDish(accessToken, { dishId, ...body }) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/dishes/{dishId}/versions', {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { dishId },
        },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/dishes');
    },

    async changeDishLifecycle(accessToken, input) {
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
        await api().POST('/management/catalog/dishes/{id}/retirement', options);
      } else {
        await api().POST('/management/catalog/dishes/{id}/restoration', options);
      }
      invalidateCatalogResource(accessToken, '/management/catalog/dishes');
    },

    async createMenu(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/menu-packages', {
        headers: authorization(accessToken),
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: { ...input, items: [...input.items] },
      });
      invalidateCatalogResource(accessToken, '/management/catalog/menu-packages');
    },

    async updateMenuDraft(accessToken, { versionId, ...body }) {
      await api().PATCH('/management/catalog/menu-package-versions/{versionId}', {
        headers: authorization(accessToken),
        params: { path: { versionId } },
        body: { ...body, items: [...body.items] },
      });
      invalidateCatalogResource(accessToken, '/management/catalog/menu-packages');
    },

    async publishMenu(accessToken, { versionId, ...body }) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/menu-package-versions/{versionId}/publication', {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { versionId },
        },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/menu-packages');
    },

    async cloneMenu(accessToken, { packageId, ...body }) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/menu-packages/{packageId}/versions', {
        headers: authorization(accessToken),
        params: {
          header: { 'Idempotency-Key': idempotencyKey },
          path: { packageId },
        },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/menu-packages');
    },

    async changeMenuLifecycle(accessToken, input) {
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
        await api().POST('/management/catalog/menu-packages/{id}/retirement', options);
      } else {
        await api().POST('/management/catalog/menu-packages/{id}/restoration', options);
      }
      invalidateCatalogResource(accessToken, '/management/catalog/menu-packages');
    },
  };
}
