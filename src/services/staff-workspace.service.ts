import { axiosApiClient } from '../lib/api/axios-client';
import {
  eventPage,
  staffWorkspace,
  workPage,
  workItem,
  historyPage,
  type WorkCreate,
  type WorkUpdate,
} from './staff-workspace.contracts';
const eventPath = (bookingId: string) => `/staff/events/${encodeURIComponent(bookingId)}`;
// Runtime-validated additive API hand-off; keep the existing released OpenAPI pin intact.
export const staffWorkspaceService = {
  async events(q = '', afterId?: string, phase: 'CONFIRMED' | 'COMPLETED' = 'CONFIRMED') {
    const result = await axiosApiClient.get<{ data: unknown }>('/staff/events', {
      params: { q, afterId, phase },
    });
    return eventPage.parse(result.data.data);
  },
  async read(bookingId: string) {
    const result = await axiosApiClient.get<{ data: unknown }>(`${eventPath(bookingId)}/workspace`);
    return staffWorkspace.parse(result.data.data);
  },
  async work(bookingId: string, kind: WorkCreate['kind'], afterId?: string) {
    const result = await axiosApiClient.get<{ data: unknown }>(
      `${eventPath(bookingId)}/work-items`,
      { params: { kind, afterId } },
    );
    return workPage.parse(result.data.data);
  },
  async create(bookingId: string, body: WorkCreate, key: string) {
    const result = await axiosApiClient.post<{ data: unknown }>(
      `${eventPath(bookingId)}/work-items`,
      body,
      { headers: { 'Idempotency-Key': key } },
    );
    return workItem.parse(result.data.data);
  },
  async update(bookingId: string, itemId: string, body: WorkUpdate, key: string) {
    const result = await axiosApiClient.patch<{ data: unknown }>(
      `${eventPath(bookingId)}/work-items/${itemId}`,
      body,
      { headers: { 'Idempotency-Key': key } },
    );
    return workItem.parse(result.data.data);
  },
  async history(bookingId: string, itemId: string, afterRevision = 0) {
    const result = await axiosApiClient.get<{ data: unknown }>(
      `${eventPath(bookingId)}/work-items/${itemId}/history`,
      { params: { afterRevision } },
    );
    return historyPage.parse(result.data.data);
  },
};
