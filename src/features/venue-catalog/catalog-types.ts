import type { components } from '../../lib/api/generated/schema';

export type CatalogHall = components['schemas']['CatalogHallView'];
export type CatalogDish = components['schemas']['CatalogDishAggregate'];
export type CatalogMenu = components['schemas']['CatalogMenuAggregate'];
export type CatalogTimeline = components['schemas']['CatalogTimelineAggregate'];
export type CatalogLayout = components['schemas']['CatalogLayoutAggregate'];
export type CatalogMedia = components['schemas']['CatalogMediaView'];
export type Authorize = <T>(operation: (accessToken: string) => Promise<T>) => Promise<T>;

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
