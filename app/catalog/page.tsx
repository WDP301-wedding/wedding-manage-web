import type { Metadata } from 'next';
import { VenueCatalogPage } from '../../src/features/venue-catalog/catalog-page';

export const metadata: Metadata = { title: 'Danh mục' };

export default function CatalogPage() {
  return <VenueCatalogPage />;
}
