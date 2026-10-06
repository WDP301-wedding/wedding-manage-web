import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';

export type CatalogHall = components['schemas']['CatalogHallView'];

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

function authorization(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

function required<T>(value: T | undefined, operation: string): T {
  if (value === undefined) throw new Error(`${operation} returned no data.`);
  return value;
}

export function createVenueCatalogGateway(client?: ApiClient): VenueCatalogGateway {
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
  };
}
