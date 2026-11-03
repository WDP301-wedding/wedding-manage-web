import { useEffect, useState } from 'react';
import { z } from 'zod';
import { axiosApiClient } from '../../lib/api/axios-client';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { describeApiError } from '../../lib/api/api-errors';
import type { ConsultationRequestItem } from '../../services/consultation.service';
export type ConsultationSortField = 'createdAt' | 'displayName' | 'preferredDate' | 'status';
export type SortOrder = 'asc' | 'desc';
const row = z.object({
  id: z.uuid(),
  displayName: z.string(),
  brideName: z.string().nullable(),
  groomName: z.string().nullable(),
  email: z.string(),
  phone: z.string(),
  preferredDate: z.iso.date().nullable(),
  expectedGuests: z.int().nullable(),
  message: z.string(),
  status: z.enum(['NEW', 'CONVERTED', 'CLOSED']),
  consultationId: z.uuid().nullable(),
  consultationRevision: z.int().nullable(),
  bookingId: z.uuid().nullable().optional().default(null),
  bookingPhase: z.string().nullable().optional().default(null),
  createdAt: z.iso.datetime(),
  preferredHallId: z.uuid().nullable().optional().default(null),
  preferredMenuVersionId: z.uuid().nullable().optional().default(null),
  preferredShift: z.enum(['LUNCH', 'DINNER']).nullable().optional().default(null),
});
export type DashboardConsultationItem = z.infer<typeof row>;

const pageSchema = z.object({
  page: z.int().positive(),
  pageSize: z.int().positive(),
  total: z.int().nonnegative(),
  totalPages: z.int().nonnegative(),
  items: z.array(row),
  counts: z.object({ total: z.int(), pending: z.int() }),
});
export function useDashboardConsultations(
  _consultations: readonly ConsultationRequestItem[],
  enabled = true,
) {
  const [searchQuery, setSearchQuery] = useState(''),
    [query, setQuery] = useState('');
  const [statusFilter, setStatus] = useState('ALL');
  const [sortField, setSort] = useState<ConsultationSortField>('createdAt'),
    [sortOrder, setOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1),
    [pageSize, setSize] = useState(5);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const scope = JSON.stringify([query, statusFilter, sortField, sortOrder, currentPage, pageSize]);
  const [result, setResult] = useState<{ scope: string; data: z.infer<typeof pageSchema> } | null>(
      null,
    ),
    [error, setError] = useState<string | null>(null),
    [pending, setPending] = useState(false);
  const live = useLiveRefresh(
    async (isCurrent) => {
      setPending(true);
      setError(null);
      try {
        const res = await axiosApiClient.get<{ data: unknown }>('/management/consultation-page', {
          params: {
            q: query,
            status: statusFilter,
            sort: sortField,
            order: sortOrder,
            page: currentPage,
            pageSize,
          },
        });
        const data = pageSchema.parse(res.data.data);
        if (isCurrent()) setResult({ scope, data });
      } catch (e) {
        if (isCurrent()) setError(describeApiError(e).message);
      } finally {
        if (isCurrent()) setPending(false);
      }
    },
    {
      scope: 'consultation-page:' + scope,
      enabled: enabled && searchQuery.trim() === query,
      initial: true,
      types: ['booking.updated'],
    },
  );
  const data = result?.scope === scope ? result.data : null,
    items = data?.items ?? [];
  const reset = () => setCurrentPage(1);
  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter: (status: string) => {
      setStatus(status);
      reset();
    },
    sortField,
    sortOrder,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: (size: number) => {
      setSize(size);
      reset();
    },
    handleSortChange: (field: ConsultationSortField) => {
      setSort(field);
      setOrder(
        field === sortField
          ? sortOrder === 'asc'
            ? 'desc'
            : 'asc'
          : field === 'createdAt'
            ? 'desc'
            : 'asc',
      );
      reset();
    },
    handleQuickSortChange: (value: string) => {
      const [field, order] = value.split('-');
      if (
        (field === 'createdAt' ||
          field === 'displayName' ||
          field === 'preferredDate' ||
          field === 'status') &&
        (order === 'asc' || order === 'desc')
      ) {
        setSort(field);
        setOrder(order);
        reset();
      }
    },
    sortedConsultations: items,
    paginatedConsultations: items,
    total: data?.total ?? 0,
    totalPages: Math.max(1, data?.totalPages ?? 0),
    safeCurrentPage: data?.page ?? 1,
    startIndex: data ? (data.page - 1) * data.pageSize : 0,
    endIndex: data ? Math.min(data.page * data.pageSize, data.total) : 0,
    counts: data?.counts,
    loading: pending || (!data && !error) || searchQuery.trim() !== query,
    error,
    retry: live.refresh,
  };
}
/** Link mở bước Đặt tiệc với thông tin khách đã điền sẵn từ yêu cầu tư vấn đã chuyển đổi. */
export function consultationBookingHref(item: ConsultationRequestItem): string | null {
  if (item.status !== 'CONVERTED' || !item.consultationId) return null;
  const params = new URLSearchParams({
    consultationId: item.consultationId,
    consultationRevision: String(item.consultationRevision ?? 1),
  });
  if (item.displayName) params.set('displayName', item.displayName);
  if (item.email) params.set('email', item.email);
  if (item.preferredDate) params.set('preferredDate', item.preferredDate);
  if (item.expectedGuests !== undefined && item.expectedGuests !== null) {
    params.set('expectedGuests', String(item.expectedGuests));
  }
  if (item.preferredShift) params.set('preferredShift', item.preferredShift);
  if (item.preferredHallId) params.set('preferredHall', item.preferredHallId);
  if (item.preferredMenuVersionId) params.set('preferredMenu', item.preferredMenuVersionId);
  if (item.message) params.set('note', item.message);
  return `/bookings?${params.toString()}`;
}
