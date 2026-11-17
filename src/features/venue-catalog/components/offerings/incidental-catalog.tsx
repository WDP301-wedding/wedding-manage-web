'use client';
import type { Authorize } from '@/src/features/venue-catalog/components/shared/catalog-tabs';
import { OfferingCatalog } from './offering-catalog';

export function IncidentalCatalog({ authorize }: { authorize: Authorize }) {
  return <OfferingCatalog kind="incidentals" authorize={authorize} />;
}
