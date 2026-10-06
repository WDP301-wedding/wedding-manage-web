import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';

export type CatalogHall = components['schemas']['CatalogHallView'];
export type CatalogDish = components['schemas']['CatalogDishAggregate'];
export type CatalogMenu = components['schemas']['CatalogMenuAggregate'];
export type CatalogTimeline = components['schemas']['CatalogTimelineAggregate'];
export type CatalogLayout = components['schemas']['CatalogLayoutAggregate'];
export type CatalogMedia = components['schemas']['CatalogMediaView'];

export type ManagerRestaurant = Readonly<{
  id: string;
  displayName: string;
  description: string;
  address: string;
  publicPhone: string | null;
  publicEmail: string | null;
  revision: number;
}>;

export type ManagerShift = Readonly<{
  code: 'LUNCH' | 'DINNER';
  startTime: string;
  endTime: string;
  isActive: boolean;
  revision: number;
}>;

export type VenueCatalogSnapshot = Readonly<{
  restaurant: ManagerRestaurant;
  shifts: readonly ManagerShift[];
  halls: readonly CatalogHall[];
}>;

export type RestaurantUpdate = Omit<ManagerRestaurant, 'id' | 'revision'> &
  Readonly<{ expectedRevision: number }>;
export type ShiftUpdate = Omit<ManagerShift, 'code' | 'revision'> &
  Readonly<{ code: ManagerShift['code']; expectedRevision: number }>;
export type HallWrite = Readonly<{
  id: string;
  name: string;
  description: string;
  maxGuests: number;
  displayOrder: number;
}>;

export interface VenueCatalogGateway {
  loadVenue(accessToken: string): Promise<VenueCatalogSnapshot>;
  updateRestaurant(accessToken: string, input: RestaurantUpdate): Promise<void>;
  updateShift(accessToken: string, input: ShiftUpdate): Promise<void>;
  createHall(accessToken: string, input: HallWrite): Promise<void>;
  updateHall(
    accessToken: string,
    input: Omit<HallWrite, 'id'> & Readonly<{ id: string; expectedRevision: number }>,
  ): Promise<void>;
  changeHallLifecycle(
    accessToken: string,
    input: Readonly<{
      id: string;
      expectedRevision: number;
      transition: 'RESTORE' | 'RETIRE';
    }>,
  ): Promise<void>;
}

export type FoodCatalogSnapshot = Readonly<{
  dishes: readonly CatalogDish[];
  menus: readonly CatalogMenu[];
}>;

export type DishWrite = Readonly<{
  name: string;
  description: string;
  categoryLabel: string;
  priceVnd: number | null;
}>;
export type MenuItemWrite = Readonly<{ dishVersionId: string; displayOrder: number }>;
export type MenuWrite = Readonly<{
  name: string;
  description: string;
  priceVndPerTable: number;
  items: readonly MenuItemWrite[];
}>;

export interface FoodCatalogGateway {
  loadFood(accessToken: string): Promise<FoodCatalogSnapshot>;
  createDish(
    accessToken: string,
    input: DishWrite & Readonly<{ dishId: string; versionId: string; displayOrder: number }>,
  ): Promise<void>;
  updateDishDraft(
    accessToken: string,
    input: DishWrite & Readonly<{ versionId: string; expectedRevision: number }>,
  ): Promise<void>;
  publishDish(
    accessToken: string,
    input: Readonly<{ versionId: string; expectedRevision: number }>,
  ): Promise<void>;
  cloneDish(
    accessToken: string,
    input: Readonly<{ dishId: string; sourceVersionId: string; versionId: string }>,
  ): Promise<void>;
  changeDishLifecycle(
    accessToken: string,
    input: Readonly<{ id: string; expectedRevision: number; transition: 'RESTORE' | 'RETIRE' }>,
  ): Promise<void>;
  createMenu(
    accessToken: string,
    input: MenuWrite & Readonly<{ menuPackageId: string; versionId: string; displayOrder: number }>,
  ): Promise<void>;
  updateMenuDraft(
    accessToken: string,
    input: MenuWrite & Readonly<{ versionId: string; expectedRevision: number }>,
  ): Promise<void>;
  publishMenu(
    accessToken: string,
    input: Readonly<{ versionId: string; expectedRevision: number }>,
  ): Promise<void>;
  cloneMenu(
    accessToken: string,
    input: Readonly<{ packageId: string; sourceVersionId: string; versionId: string }>,
  ): Promise<void>;
  changeMenuLifecycle(
    accessToken: string,
    input: Readonly<{ id: string; expectedRevision: number; transition: 'RESTORE' | 'RETIRE' }>,
  ): Promise<void>;
}

export type TimelineItemWrite = Readonly<{
  id: string;
  title: string;
  description: string | null;
  offsetMinutes: number;
  durationMinutes: number | null;
  displayOrder: number;
}>;
export type TimelineWrite = Readonly<{
  name: string;
  description: string;
  items: readonly TimelineItemWrite[];
}>;
export type TimelineCatalogSnapshot = Readonly<{ timelines: readonly CatalogTimeline[] }>;

export interface TimelineCatalogGateway {
  loadTimelines(accessToken: string): Promise<TimelineCatalogSnapshot>;
  createTimeline(
    accessToken: string,
    input: TimelineWrite &
      Readonly<{ templateId: string; versionId: string; displayOrder: number }>,
  ): Promise<void>;
  updateTimelineDraft(
    accessToken: string,
    input: TimelineWrite & Readonly<{ versionId: string; expectedRevision: number }>,
  ): Promise<void>;
  publishTimeline(
    accessToken: string,
    input: Readonly<{ versionId: string; expectedRevision: number }>,
  ): Promise<void>;
  cloneTimeline(
    accessToken: string,
    input: Readonly<{ templateId: string; sourceVersionId: string; versionId: string }>,
  ): Promise<void>;
  changeTimelineLifecycle(
    accessToken: string,
    input: Readonly<{ id: string; expectedRevision: number; transition: 'RESTORE' | 'RETIRE' }>,
  ): Promise<void>;
}

export type LayoutTableWrite = Readonly<{
  tableId: string;
  label: string;
  shape: 'ROUND' | 'RECTANGLE';
  seatCapacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDegrees: number;
  displayOrder: number;
}>;
export type LayoutWrite = Readonly<{
  name: string;
  description: string;
  minGuests: number;
  maxGuests: number;
  tables: readonly LayoutTableWrite[];
}>;
export type LayoutCatalogSnapshot = Readonly<{
  halls: readonly CatalogHall[];
  layouts: readonly CatalogLayout[];
}>;

export interface LayoutCatalogGateway {
  loadLayouts(accessToken: string): Promise<LayoutCatalogSnapshot>;
  createLayout(
    accessToken: string,
    input: LayoutWrite &
      Readonly<{ templateId: string; versionId: string; hallId: string; displayOrder: number }>,
  ): Promise<void>;
  updateLayoutDraft(
    accessToken: string,
    input: LayoutWrite & Readonly<{ versionId: string; expectedRevision: number }>,
  ): Promise<void>;
  publishLayout(
    accessToken: string,
    input: Readonly<{ versionId: string; expectedRevision: number }>,
  ): Promise<void>;
  cloneLayout(
    accessToken: string,
    input: Readonly<{ templateId: string; sourceVersionId: string; versionId: string }>,
  ): Promise<void>;
  changeLayoutLifecycle(
    accessToken: string,
    input: Readonly<{ id: string; expectedRevision: number; transition: 'RESTORE' | 'RETIRE' }>,
  ): Promise<void>;
  registerLayoutTable(
    accessToken: string,
    input: Readonly<{ templateId: string; tableId: string }>,
  ): Promise<void>;
  retireLayoutTable(
    accessToken: string,
    input: Readonly<{ templateId: string; tableId: string }>,
  ): Promise<void>;
}

export type CatalogMediaResourceType = CatalogMedia['resourceType'];
export type CatalogMediaResourcePath =
  | 'restaurant-profile'
  | 'halls'
  | 'dish-versions'
  | 'menu-package-versions'
  | 'timeline-template-versions'
  | 'layout-template-versions';
export type CatalogMediaResource = Readonly<{
  path: CatalogMediaResourcePath;
  type: CatalogMediaResourceType;
  id: string;
  label: string;
  revision: number;
  mutableOrder: boolean;
}>;
export interface MediaCatalogGateway {
  loadMediaResources(accessToken: string): Promise<readonly CatalogMediaResource[]>;
  loadMedia(
    accessToken: string,
    input: Pick<CatalogMediaResource, 'path' | 'id'>,
  ): Promise<readonly CatalogMedia[]>;
  uploadMedia(
    accessToken: string,
    input: Readonly<{
      assetId: string;
      resourceType: CatalogMediaResourceType;
      resourceId: string;
      alternativeText: string;
      file: File;
      oldAssetId?: string;
    }>,
  ): Promise<void>;
  reorderMedia(
    accessToken: string,
    input: Pick<CatalogMediaResource, 'path' | 'id' | 'revision'> &
      Readonly<{ assetIds: readonly string[] }>,
  ): Promise<void>;
}

export type CatalogGateway = VenueCatalogGateway &
  FoodCatalogGateway &
  TimelineCatalogGateway &
  LayoutCatalogGateway &
  MediaCatalogGateway;

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
      const result = await api().GET('/management/catalog/timeline-templates', {
        headers: authorization(accessToken),
        params: { query: { limit: 100 } },
      });
      return {
        timelines: Array.from(
          required(result.data, 'Timeline read').data.items,
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
      const [layouts, halls] = await Promise.all([
        api().GET('/management/catalog/layout-templates', {
          headers,
          params: { query: { limit: 100 } },
        }),
        api().GET('/management/catalog/halls', {
          headers,
          params: { query: { limit: 100 } },
        }),
      ]);
      return {
        halls: Array.from(required(halls.data, 'Layout hall read').data.items, (hall) => ({
          ...hall,
        })),
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

    async loadMediaResources(accessToken) {
      const headers = authorization(accessToken);
      const [restaurant, halls, dishes, menus, timelines, layouts] = await Promise.all([
        api().GET('/management/catalog/restaurant', { headers }),
        api().GET('/management/catalog/halls', {
          headers,
          params: { query: { limit: 100 } },
        }),
        api().GET('/management/catalog/dishes', {
          headers,
          params: { query: { limit: 100 } },
        }),
        api().GET('/management/catalog/menu-packages', {
          headers,
          params: { query: { limit: 100 } },
        }),
        api().GET('/management/catalog/timeline-templates', {
          headers,
          params: { query: { limit: 100 } },
        }),
        api().GET('/management/catalog/layout-templates', {
          headers,
          params: { query: { limit: 100 } },
        }),
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
      const normalizeVersions = <T extends { readonly id: string; readonly versions: ArrayLike<{
        readonly id: string;
        readonly name: string;
        readonly revision: number;
        readonly state: 'DRAFT' | 'PUBLISHED' | 'SUPERSEDED';
        readonly versionNumber: number | null;
      }> }>(items: ArrayLike<T>) =>
        Array.from(items, (aggregate) => ({
          id: aggregate.id,
          versions: Array.from(aggregate.versions, (version) => ({ ...version })),
        }));
      appendVersions(normalizeVersions(required(dishes.data, 'Media dish read').data.items), 'dish-versions', 'DISH_VERSION', 'Món');
      appendVersions(normalizeVersions(required(menus.data, 'Media menu read').data.items), 'menu-package-versions', 'MENU_PACKAGE_VERSION', 'Thực đơn');
      appendVersions(normalizeVersions(required(timelines.data, 'Media timeline read').data.items), 'timeline-template-versions', 'TIMELINE_TEMPLATE_VERSION', 'Kịch bản');
      appendVersions(normalizeVersions(required(layouts.data, 'Media layout read').data.items), 'layout-template-versions', 'LAYOUT_TEMPLATE_VERSION', 'Bố trí');
      return resources;
    },

    async loadMedia(accessToken, input) {
      const result = await api().GET('/management/catalog/{resource}/{resourceId}/media', {
        headers: authorization(accessToken),
        params: { path: { resource: input.path, resourceId: input.id } },
      });
      return Array.from(required(result.data, 'Media read').data.items, (asset) => ({ ...asset }));
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
