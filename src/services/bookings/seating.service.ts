import { createApiClient } from '@/src/lib/api/client';
import type { operations } from '@/src/lib/api/generated/schema';

type CurrentPlan =
  operations['readCurrentSeatingPlan']['responses'][200]['content']['application/json']['data'];

export type BookingSeatingPlan = NonNullable<CurrentPlan>;

export async function readBookingSeatingPlan(
  accessToken: string,
  bookingId: string,
  signal: AbortSignal,
): Promise<CurrentPlan> {
  const { data } = await createApiClient().GET('/bookings/{bookingId}/seating-plans/current', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { path: { bookingId } },
    cache: 'no-store',
    signal,
  });
  const plan = data?.data;
  if (plan === null) return null;
  if (plan?.bookingId !== bookingId) throw new Error('Invalid current seating plan response.');
  return {
    ...plan,
    droppedTableIds: Array.from(plan.droppedTableIds),
    labels: Array.from(plan.labels),
    renderSnapshot: Array.from(plan.renderSnapshot),
    warnings: Array.from(plan.warnings),
  };
}
