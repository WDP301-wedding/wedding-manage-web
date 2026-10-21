import { createApiClient, type ApiClient } from '../../lib/api/client';
import {
  clearCatalogCache,
  fetchSharedCatalogResource,
  invalidateCatalogResource,
} from './catalog-cache';
import { createFoodCatalogGateway } from './catalog-food-gateway';
import { createLayoutCatalogGateway } from './catalog-layout-gateway';
import { createMediaCatalogGateway } from './catalog-media-gateway';
import { createTimelineCatalogGateway } from './catalog-timeline-gateway';
import type {
  CatalogGateway,
  CatalogHall,
  ManagerShift,
} from './catalog-types';

export * from './catalog-types';
export {
  clearCatalogCache,
  invalidateCatalogResource,
  fetchSharedCatalogResource,
};

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

  const foodGateway = createFoodCatalogGateway(
    api,
    authorization,
    required,
    fetchSharedCatalogResource,
  );
  const timelineGateway = createTimelineCatalogGateway(
    api,
    authorization,
    required,
    fetchSharedCatalogResource,
  );
  const layoutGateway = createLayoutCatalogGateway(
    api,
    authorization,
    required,
    fetchSharedCatalogResource,
  );
  const mediaGateway = createMediaCatalogGateway(
    api,
    authorization,
    required,
    fetchSharedCatalogResource,
  );

  return {
    async loadVenue(accessToken) {
      const headers = authorization(accessToken);
      const [restaurant, shifts, halls] = await Promise.all([
        fetchSharedCatalogResource(accessToken, '/management/catalog/restaurant', undefined, () =>
          api().GET('/management/catalog/restaurant', { headers }),
        ),
        fetchSharedCatalogResource(accessToken, '/management/catalog/shifts', undefined, () =>
          api().GET('/management/catalog/shifts', { headers }),
        ),
        fetchSharedCatalogResource(accessToken, '/management/catalog/halls', { limit: 100 }, () =>
          api().GET('/management/catalog/halls', {
            headers,
            params: { query: { limit: 100 } },
          }),
        ),
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
      invalidateCatalogResource(accessToken, '/management/catalog/restaurant');
    },

    async updateShift(accessToken, { code, ...body }) {
      await api().PATCH('/management/catalog/shifts/{shiftCode}', {
        headers: authorization(accessToken),
        params: { path: { shiftCode: code } },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/shifts');
    },

    async createHall(accessToken, input) {
      const idempotencyKey = crypto.randomUUID();
      await api().POST('/management/catalog/halls', {
        headers: authorization(accessToken),
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body: input,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/halls');
    },

    async updateHall(accessToken, { id, ...body }) {
      await api().PATCH('/management/catalog/halls/{hallId}', {
        headers: authorization(accessToken),
        params: { path: { hallId: id } },
        body,
      });
      invalidateCatalogResource(accessToken, '/management/catalog/halls');
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
      invalidateCatalogResource(accessToken, '/management/catalog/halls');
    },

    // Food domain methods delegated to FoodCatalogGateway
    loadFood: (token) => foodGateway.loadFood(token),
    createDish: (token, input) => foodGateway.createDish(token, input),
    updateDishDraft: (token, input) => foodGateway.updateDishDraft(token, input),
    publishDish: (token, input) => foodGateway.publishDish(token, input),
    cloneDish: (token, input) => foodGateway.cloneDish(token, input),
    changeDishLifecycle: (token, input) => foodGateway.changeDishLifecycle(token, input),
    createMenu: (token, input) => foodGateway.createMenu(token, input),
    updateMenuDraft: (token, input) => foodGateway.updateMenuDraft(token, input),
    publishMenu: (token, input) => foodGateway.publishMenu(token, input),
    cloneMenu: (token, input) => foodGateway.cloneMenu(token, input),
    changeMenuLifecycle: (token, input) => foodGateway.changeMenuLifecycle(token, input),

    // Timeline domain methods delegated to TimelineCatalogGateway
    loadTimelines: (token) => timelineGateway.loadTimelines(token),
    createTimeline: (token, input) => timelineGateway.createTimeline(token, input),
    updateTimelineDraft: (token, input) => timelineGateway.updateTimelineDraft(token, input),
    publishTimeline: (token, input) => timelineGateway.publishTimeline(token, input),
    cloneTimeline: (token, input) => timelineGateway.cloneTimeline(token, input),
    changeTimelineLifecycle: (token, input) => timelineGateway.changeTimelineLifecycle(token, input),

    // Layout domain methods delegated to LayoutCatalogGateway
    loadLayouts: (token) => layoutGateway.loadLayouts(token),
    createLayout: (token, input) => layoutGateway.createLayout(token, input),
    updateLayoutDraft: (token, input) => layoutGateway.updateLayoutDraft(token, input),
    publishLayout: (token, input) => layoutGateway.publishLayout(token, input),
    cloneLayout: (token, input) => layoutGateway.cloneLayout(token, input),
    changeLayoutLifecycle: (token, input) => layoutGateway.changeLayoutLifecycle(token, input),
    registerLayoutTable: (token, input) => layoutGateway.registerLayoutTable(token, input),
    retireLayoutTable: (token, input) => layoutGateway.retireLayoutTable(token, input),

    // Media domain methods delegated to MediaCatalogGateway
    loadMediaResources: (token) => mediaGateway.loadMediaResources(token),
    loadMedia: (token, input) => mediaGateway.loadMedia(token, input),
    uploadMedia: (token, input) => mediaGateway.uploadMedia(token, input),
    reorderMedia: (token, input) => mediaGateway.reorderMedia(token, input),
  };
}
