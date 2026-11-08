import type { z } from 'zod';
import { axiosApiClient } from '../lib/api/axios-client';
import {
  completedEventsQuerySchema,
  completedEventsResponseSchema,
} from './completed-events.schemas';

// Additive local runtime contract; released OpenAPI pins remain unchanged.
export type CompletedEventsData = z.infer<typeof completedEventsResponseSchema>['data'];
export type CompletedEventsFilters = Omit<
  z.input<typeof completedEventsQuerySchema>,
  'page' | 'pageSize'
> & {
  page?: number;
  pageSize?: number;
};
export async function getCompletedEvents(
  query: CompletedEventsFilters,
): Promise<CompletedEventsData> {
  const params = completedEventsQuerySchema.parse(query);
  const response = await axiosApiClient.get<unknown>('/management/analytics/completed-events', {
    params,
  });
  return completedEventsResponseSchema.parse(response.data).data;
}
