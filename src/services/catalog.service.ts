import { axiosApiClient } from '../lib/api/axios-client';
import type { components, operations } from '../lib/api/generated/schema';

export type PublicRestaurant = components['schemas']['CatalogPublicRestaurant'];
export type PublicHall = components['schemas']['CatalogPublicHall'];
export type PublicMenu = components['schemas']['CatalogPublicMenuPackage'];
export type CatalogHallView = components['schemas']['CatalogHallView'];
export type CatalogDishAggregate = components['schemas']['CatalogDishAggregate'];
export type CatalogMenuAggregate = components['schemas']['CatalogMenuAggregate'];
export type CatalogTimelineAggregate = components['schemas']['CatalogTimelineAggregate'];
export type CatalogLayoutAggregate = components['schemas']['CatalogLayoutAggregate'];

export type ManagedServiceItem =
  operations['listManagedRestaurantServices']['responses'][200]['content']['application/json']['data']['items'][number];
export type ManagedPrintOfferingItem =
  operations['listManagedPrintOfferings']['responses'][200]['content']['application/json']['data']['items'][number];

export const catalogService = {
  async getRestaurant(): Promise<PublicRestaurant> {
    const response = await axiosApiClient.get<{ data: PublicRestaurant }>('/catalog/restaurant');
    return response.data.data;
  },

  async getPublicHalls(): Promise<readonly PublicHall[]> {
    const response = await axiosApiClient.get<{ data: { items: readonly PublicHall[] } }>(
      '/catalog/halls',
    );
    return response.data.data.items;
  },

  async getPublicMenus(): Promise<readonly PublicMenu[]> {
    const response = await axiosApiClient.get<{ data: { items: readonly PublicMenu[] } }>(
      '/catalog/menu-packages',
    );
    return response.data.data.items;
  },

  async getManagementHalls(): Promise<readonly CatalogHallView[]> {
    const response = await axiosApiClient.get<{ data: { items: readonly CatalogHallView[] } }>(
      '/management/catalog/halls',
    );
    return response.data.data.items;
  },

  async getManagementDishes(): Promise<readonly CatalogDishAggregate[]> {
    const response = await axiosApiClient.get<{ data: { items: readonly CatalogDishAggregate[] } }>(
      '/management/catalog/dishes',
    );
    return response.data.data.items;
  },

  async getManagementMenus(): Promise<readonly CatalogMenuAggregate[]> {
    const response = await axiosApiClient.get<{ data: { items: readonly CatalogMenuAggregate[] } }>(
      '/management/catalog/menu-packages',
    );
    return response.data.data.items;
  },

  async getTimelineTemplates(): Promise<readonly CatalogTimelineAggregate[]> {
    const response = await axiosApiClient.get<{
      data: { items: readonly CatalogTimelineAggregate[] };
    }>('/management/catalog/timeline-templates');
    return response.data.data.items;
  },

  async getLayoutTemplates(): Promise<readonly CatalogLayoutAggregate[]> {
    const response = await axiosApiClient.get<{
      data: { items: readonly CatalogLayoutAggregate[] };
    }>('/management/catalog/layout-templates');
    return response.data.data.items;
  },

  async getManagementServices(): Promise<readonly ManagedServiceItem[]> {
    const response = await axiosApiClient.get<{
      data: { items: readonly ManagedServiceItem[] };
    }>('/management/services');
    return response.data.data.items;
  },

  async createService(
    body: {
      name: string;
      unit: string;
      unitPriceVnd: number;
      description?: string | null;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post('/management/services', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async updateService(
    serviceId: string,
    body: {
      expectedRevision: number;
      name: string;
      unit: string;
      unitPriceVnd: number;
      active: boolean;
      description?: string | null;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.patch(`/management/services/${serviceId}`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async getManagementPrintOfferings(): Promise<readonly ManagedPrintOfferingItem[]> {
    const response = await axiosApiClient.get<{
      data: { items: readonly ManagedPrintOfferingItem[] };
    }>('/management/print-offerings');
    return response.data.data.items;
  },

  async createPrintOffering(
    body: {
      name: string;
      printType: string;
      material: string;
      templateId: string;
      unit: string;
      unitPriceVnd: number;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post('/management/print-offerings', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async updatePrintOffering(
    offeringId: string,
    body: {
      expectedRevision: number;
      name: string;
      printType: string;
      material: string;
      templateId: string;
      unit: string;
      unitPriceVnd: number;
      active: boolean;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.patch(`/management/print-offerings/${offeringId}`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
};
