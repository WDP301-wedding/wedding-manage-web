'use client';
import { useEffect, useState, useMemo } from 'react';
import {
  type BookingSortField,
  type SortOrder,
  getBookingPaymentInfo,
} from './dashboard-bookings-table';
import type { BookingAssignmentsRegistry } from './booking-assignments';
import type { AnalyticsBookingsData } from '../../services/analytics.service';
import {
  navigationService,
  type NavigationBooking,
} from '../../services/booking-navigation.service';
import { useLiveRefresh } from '../realtime/use-live-refresh';
import { describeApiError } from '../../lib/api/api-errors';
export type DashboardBookingItem = AnalyticsBookingsData['items'][number];
export function getBookingRecency(item: {
  bookingCode?: string | null | undefined;
  eventDate?: string | undefined;
  createdAt?: string | null | undefined;
}): number {
  if (item.createdAt) {
    const t = new Date(item.createdAt).getTime();
    if (!Number.isNaN(t) && t > 0) return t;
  }
  if (item.bookingCode) {
    const match = item.bookingCode.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (!Number.isNaN(num)) return num;
    }
  }
  if (item.eventDate) {
    const t = new Date(item.eventDate).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

export interface UseDashboardBookingsOptions {
  bookings: readonly DashboardBookingItem[];
  assignments: BookingAssignmentsRegistry;
  resolvedAccountId: string;
  enabled?: boolean;
}
export function useDashboardBookings({
  resolvedAccountId,
  enabled = true,
}: UseDashboardBookingsOptions) {
  const [bookingTab, setTab] = useState<'mine' | 'all'>('mine');
  const [searchQuery, setSearchQuery] = useState('');
  const [query, setQuery] = useState('');
  const [phaseFilter, setPhase] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'DEBT'>('ALL');
  const [sortField, setSortField] = useState<BookingSortField>('recency');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1),
    [pageSize, setSize] = useState(10);
  useEffect(() => {
    if (searchQuery.trim() === query) return;
    const timer = setTimeout(() => {
      setQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, query]);
  const scope = JSON.stringify([
    resolvedAccountId,
    bookingTab,
    query,
    phaseFilter,
    paymentFilter,
    sortField,
    sortOrder,
    currentPage,
    pageSize,
  ]);
  const [result, setResult] = useState<{
    scope: string;
    data: Awaited<ReturnType<typeof navigationService.bookings>>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const live = useLiveRefresh(
    async (isCurrent) => {
      setPending(true);
      setError(null);
      try {
        const data = await navigationService.bookings({
          scope: bookingTab,
          q: query,
          phase: phaseFilter,
          ...(paymentFilter !== 'ALL' ? { paymentStatus: paymentFilter } : {}),
          sort: sortField,
          order: sortOrder,
          page: currentPage,
          pageSize,
        });
        if (isCurrent()) setResult({ scope, data });
      } catch (e) {
        if (isCurrent()) setError(describeApiError(e).message);
      } finally {
        if (isCurrent()) setPending(false);
      }
    },
    {
      scope: 'booking-page:' + scope,
      initial: true,
      enabled: enabled && searchQuery.trim() === query,
      types: ['booking.updated', 'proposal.updated', 'deposit.received'],
    },
  );
  const data = result?.scope === scope ? result.data : null;
  const rawRows: NavigationBooking[] = data?.items ?? [];
  const rows = useMemo(() => {
    if (paymentFilter === 'ALL') return rawRows;
    return rawRows.filter((r) => getBookingPaymentInfo(r).status === paymentFilter);
  }, [rawRows, paymentFilter]);
  const serverAssignments: BookingAssignmentsRegistry = Object.fromEntries(
    rows.map((b) => [
      b.bookingId,
      {
        bookingId: b.bookingId,
        assignedAccountId: b.managerAccountId,
        assignedEmail: b.managerEmail ?? undefined,
        assignedAt: b.createdAt,
      },
    ]),
  );
  const reset = () => setCurrentPage(1);
  return {
    bookingTab,
    setBookingTab: (tab: 'mine' | 'all') => {
      setTab(tab);
      reset();
    },
    searchQuery,
    setSearchQuery,
    phaseFilter,
    setPhaseFilter: (value: string) => {
      setPhase(value);
      reset();
    },
    paymentFilter,
    setPaymentFilter: (value: 'ALL' | 'PAID' | 'DEBT') => {
      setPaymentFilter(value);
      reset();
    },
    sortField,
    sortOrder,
    handleSortChange: (field: BookingSortField) => {
      setSortField(field);
      setSortOrder(
        field === sortField
          ? sortOrder === 'asc'
            ? 'desc'
            : 'asc'
          : field === 'recency' || field === 'tableCount'
            ? 'desc'
            : 'asc',
      );
      reset();
    },
    handleQuickSortChange: (value: string) => {
      const [field, order] = value.split('-');
      if (
        (field === 'recency' ||
          field === 'eventDate' ||
          field === 'hallName' ||
          field === 'shiftCode' ||
          field === 'tableCount' ||
          field === 'phase') &&
        (order === 'asc' || order === 'desc')
      ) {
        setSortField(field);
        setSortOrder(order);
        reset();
      }
    },
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: (size: number) => {
      setSize(size);
      reset();
    },
    myBookingsCount: data?.counts.mine ?? 0,
    allBookingsCount: data?.counts.all ?? 0,
    currentTabBookings: rows,
    filteredBookings: rows,
    paginatedBookings: rows,
    total: data?.total ?? 0,
    totalPages: Math.max(1, data?.totalPages ?? 0),
    safeCurrentPage: data?.page ?? 1,
    startIndex: data ? (data.page - 1) * data.pageSize : 0,
    endIndex: data ? Math.min(data.page * data.pageSize, data.total) : 0,
    serverAssignments,
    loading: pending || (!data && !error) || searchQuery.trim() !== query,
    error,
    refresh: live.refresh,
  };
}
