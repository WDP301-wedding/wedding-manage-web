'use client';

import { useCallback, useMemo, useState } from 'react';
import { useBookingSearch } from './use-booking-search';
const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('đ', 'd')
    .trim();
import type { AnalyticsBookingsData } from '../../services/analytics.service';
import type { BookingAssignmentsRegistry } from './booking-assignments';
import type { BookingSortField, SortOrder } from './dashboard-bookings-table';

export type DashboardBookingItem = AnalyticsBookingsData['items'][number];

export interface UseDashboardBookingsOptions {
  bookings: readonly DashboardBookingItem[];
  assignments: BookingAssignmentsRegistry;
  resolvedAccountId: string;
}

export function useDashboardBookings({
  bookings,
  assignments,
  resolvedAccountId,
}: UseDashboardBookingsOptions) {
  const [userSelectedTab, setUserSelectedTab] = useState<'mine' | 'all' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('ALL');
  const [sortField, setSortField] = useState<BookingSortField>('eventDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isMine = useCallback(
    (bId: string) => assignments[bId]?.assignedAccountId === resolvedAccountId,
    [assignments, resolvedAccountId],
  );

  const myBookings = useMemo(() => bookings.filter((b) => isMine(b.bookingId)), [bookings, isMine]);
  const myBookingsCount = myBookings.length;
  const bookingTab = userSelectedTab ?? (myBookingsCount > 0 ? 'mine' : 'all');
  const setBookingTab = useCallback((tab: 'mine' | 'all') => {
    setUserSelectedTab(tab);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((field: BookingSortField) => {
    setSortField((currentField) => {
      if (currentField === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return currentField;
      }
      setSortOrder(field === 'tableCount' ? 'desc' : 'asc');
      return field;
    });
    setCurrentPage(1);
  }, []);

  const handleQuickSortChange = useCallback((val: string) => {
    const [f, o] = val.split('-') as [BookingSortField, SortOrder];
    setSortField(f);
    setSortOrder(o);
    setCurrentPage(1);
  }, []);

  const normalizedQuery = useMemo(() => normalizeSearch(searchQuery), [searchQuery]);
  const serverSearch = useBookingSearch(normalizedQuery);
  const searchBookings = useMemo(() => {
    if (!normalizedQuery) return bookings;
    const matchesAssignedEmail = bookings.filter((b) =>
      (assignments[b.bookingId]?.assignedEmail ?? '').toLowerCase().includes(normalizedQuery),
    );
    return [
      ...new Map(
        [...(serverSearch.items ?? []), ...matchesAssignedEmail].map((b) => [b.bookingId, b]),
      ).values(),
    ];
  }, [assignments, bookings, normalizedQuery, serverSearch.items]);

  const currentTabBookings = useMemo(
    () =>
      bookingTab === 'mine' ? searchBookings.filter((b) => isMine(b.bookingId)) : searchBookings,
    [bookingTab, searchBookings, isMine],
  );

  const filteredBookings = useMemo(() => {
    if (phaseFilter === 'ALL' && !normalizedQuery) return currentTabBookings;
    return currentTabBookings.filter((b) => {
      if (phaseFilter !== 'ALL' && b.phase !== phaseFilter) return false;
      if (normalizedQuery) {
        const hallMatch = [
          b.hallNameSnapshot,
          b.bookingCode,
          b.customerName,
          b.alias,
          b.brideName,
          b.groomName,
          b.phone,
          b.email,
        ].some((value) => value != null && normalizeSearch(value).includes(normalizedQuery));
        const idMatch = b.bookingId.toLowerCase().includes(normalizedQuery);
        const emailMatch = (assignments[b.bookingId]?.assignedEmail || '')
          .toLowerCase()
          .includes(normalizedQuery);
        const serverMatch = (serverSearch.items ?? []).some((s) => s.bookingId === b.bookingId);
        return hallMatch || idMatch || emailMatch || serverMatch;
      }
      return true;
    });
  }, [assignments, currentTabBookings, normalizedQuery, phaseFilter]);

  const sortedBookings = useMemo(() => {
    if (filteredBookings.length <= 1) return filteredBookings;
    const items = [...filteredBookings];
    if (sortField === 'eventDate') {
      const timestamps = new Map<string, number>();
      for (const b of items) {
        timestamps.set(b.bookingId, new Date(b.eventDate).getTime());
      }
      items.sort((a, b) => {
        const timeA = timestamps.get(a.bookingId) ?? 0;
        const timeB = timestamps.get(b.bookingId) ?? 0;
        const cmp = timeA !== timeB ? timeA - timeB : a.shiftCode.localeCompare(b.shiftCode);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    } else {
      items.sort((a, b) => {
        let cmp = 0;
        if (sortField === 'hallName') {
          cmp = (a.hallNameSnapshot || '').localeCompare(b.hallNameSnapshot || '', 'vi');
        } else if (sortField === 'tableCount') {
          cmp = (a.tableCount || 0) - (b.tableCount || 0);
        } else if (sortField === 'shiftCode') {
          cmp = a.shiftCode.localeCompare(b.shiftCode);
        } else if (sortField === 'phase') {
          cmp = a.phase.localeCompare(b.phase);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }
    return items;
  }, [filteredBookings, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedBookings.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedBookings.length);
  const paginatedBookings = useMemo(
    () => sortedBookings.slice(startIndex, endIndex),
    [sortedBookings, startIndex, endIndex],
  );

  return {
    serverSearch,
    bookingTab,
    setBookingTab,
    searchQuery,
    setSearchQuery,
    phaseFilter,
    setPhaseFilter,
    sortField,
    sortOrder,
    handleSortChange,
    handleQuickSortChange,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    myBookingsCount,
    currentTabBookings,
    filteredBookings,
    totalPages,
    safeCurrentPage,
    startIndex,
    endIndex,
    paginatedBookings,
  };
}
