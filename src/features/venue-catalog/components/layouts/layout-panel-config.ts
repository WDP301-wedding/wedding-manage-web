import type { CatalogLayout } from '@/src/features/venue-catalog/types/catalog-types';
import { type LayoutVersion } from './layout-draft-editor';

export const layoutFilters = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang hoạt động' },
  { value: 'unpublished', label: 'Chưa công bố' },
] as const;

export type LayoutFilter = (typeof layoutFilters)[number]['value'];

export type NewLayoutDraft = Readonly<{ layout: CatalogLayout; version: LayoutVersion }>;
