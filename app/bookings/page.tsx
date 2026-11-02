import type { Metadata } from 'next';
import { ManagementBookingPage } from '../../src/features/booking-lifecycle/booking-page';

export const metadata: Metadata = { title: 'Điều phối đặt tiệc' };

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const identity = JSON.stringify([query.consultationId, query.bookingId]);
  return <ManagementBookingPage key={identity} autoLoadCatalog />;
}
