import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';

export type CatalogHall = components['schemas']['CatalogHallView'];
export type CatalogDish = components['schemas']['CatalogDishAggregate'];
export type CatalogMenu = components['schemas']['CatalogMenuAggregate'];

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

export type CatalogGateway = VenueCatalogGateway & FoodCatalogGateway;

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
  };
}
