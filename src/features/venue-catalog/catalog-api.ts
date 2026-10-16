import { createApiClient, type ApiClient } from '../../lib/api/client';
import { createMediaCatalogGateway } from './catalog-media-gateway';
export * from './catalog-types';
import type {
  CatalogDish,
  CatalogGateway,
  CatalogHall,
  CatalogLayout,
  CatalogMenu,
  CatalogTimeline,
  ManagerShift,
} from './catalog-types';

function authorization(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

function required<T>(value: T | undefined, operation: string): T {
  if (value === undefined) throw new Error(`${operation} returned no data.`);
  return value;
}

export function createVenueCatalogGateway(client?: ApiClient): CatalogGateway {
  let resolvedClient = client;
  const api = () => (resolvedClient ??= createApiClient());
  const mediaGateway = createMediaCatalogGateway(api, authorization, required);

  return {
    async loadVenue(accessToken) {
      const headers = authorization(accessToken);
      const [restaurant, shifts, halls] = await Promise.all([
        api().GET('/management/catalog/restaurant', { headers }),
        api().GET('/management/catalog/shifts', { headers }),
        api().GET('/management/catalog/halls', {
          headers,
          params: { query: { limit: 100 } },
        }),
      ]);
      return {
        restaurant: required(restaurant.data, 'Restaurant read').data,
        shifts: Array.from(
          required(shifts.data, 'Shift read').data.items,
          (shift): ManagerShift => ({ ...shift }),
        ),
        halls: Array.from(required(halls.data, 'Hall read').data.items, (hall): CatalogHall => ({
          ...hall,
        })),
      };
    },

    async updateRestaurant(accessToken, input) {
      await api().PATCH('/management/catalog/restaurant', {
        headers: authorization(accessToken),
        body: input,
      });
    },

    async updateShift(accessToken, { code, ...body }) {
      await api().PATCH('/management/catalog/shifts/{shiftCode}', {
        headers: authorization(accessToken),
        params: { path: { shiftCode: code } },
        body,
      });
    },

    async createHall(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/halls', {
        headers: authorization(accessToken),
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: input,
      });
    },

    async updateHall(accessToken, { id, ...body }) {
      await api().PATCH('/management/catalog/halls/{hallId}', {
        headers: authorization(accessToken),
        params: { path: { hallId: id } },
        body,
      });
    },

    async changeHallLifecycle(accessToken, input) {
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
        await api().POST('/management/catalog/halls/{id}/retirement', options);
      } else {
        await api().POST('/management/catalog/halls/{id}/restoration', options);
      }
    },

    async loadFood(accessToken) {
      const headers = authorization(accessToken);
      const [dishes, menus] = await Promise.all([
        api().GET('/management/catalog/dishes', {
          headers,
          params: { query: { limit: 100 } },
        }),
        api().GET('/management/catalog/menu-packages', {
          headers,
          params: { query: { limit: 100 } },
        }),
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
    },

    async updateDishDraft(accessToken, { versionId, ...body }) {
      await api().PATCH('/management/catalog/dish-versions/{versionId}', {
        headers: authorization(accessToken),
        params: { path: { versionId } },
        body,
      });
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
    },

    async createMenu(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/menu-packages', {
        headers: authorization(accessToken),
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: { ...input, items: [...input.items] },
      });
    },

    async updateMenuDraft(accessToken, { versionId, ...body }) {
      await api().PATCH('/management/catalog/menu-package-versions/{versionId}', {
        headers: authorization(accessToken),
        params: { path: { versionId } },
        body: { ...body, items: [...body.items] },
      });
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
    },

    async loadTimelines(accessToken) {
      const headers = authorization(accessToken);
      const timelines = await api().GET('/management/catalog/timeline-templates', {
        headers,
        params: { query: { limit: 100 } },
      });
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
    },

    async updateTimelineDraft(accessToken, { versionId, ...body }) {
      await api().PATCH('/management/catalog/timeline-template-versions/{versionId}', {
        headers: authorization(accessToken),
        params: { path: { versionId } },
        body: { ...body, items: [...body.items] },
      });
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
    },

    async loadLayouts(accessToken) {
      const headers = authorization(accessToken);
      const [halls, layouts] = await Promise.all([
        api().GET('/management/catalog/halls', {
          headers,
          params: { query: { limit: 100 } },
        }),
        api().GET('/management/catalog/layout-templates', {
          headers,
          params: { query: { limit: 100 } },
        }),
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
    },

    async updateLayoutDraft(accessToken, { versionId, ...body }) {
      await api().PATCH('/management/catalog/layout-template-versions/{versionId}', {
        headers: authorization(accessToken),
        params: { path: { versionId } },
        body: { ...body, tables: [...body.tables] },
      });
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
    },

    loadMediaResources: (token) => mediaGateway.loadMediaResources(token),
    loadMedia: (token, input) => mediaGateway.loadMedia(token, input),
    uploadMedia: (token, input) => mediaGateway.uploadMedia(token, input),
    reorderMedia: (token, input) => mediaGateway.reorderMedia(token, input),
  };
}
