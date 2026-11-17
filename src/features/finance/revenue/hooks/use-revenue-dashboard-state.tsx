'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { completedEventsQuerySchema } from '@/src/services/analytics/completed-events.schemas';
import type {
  CompletedEventsData,
  CompletedEventsFilters,
} from '@/src/services/analytics/completed-events.service';
import {
  useCompletedEvents,
  currentVietnamMonth,
} from '@/src/features/finance/revenue/hooks/use-completed-events';
import {
  type HallSortOption,
  type OfferingCategoryOption,
  type OfferingSortOption,
} from '@/src/features/finance/revenue/components/completed-rankings';

export type RevenueSubTab = 'debts' | 'halls' | 'offerings';

export type PeriodPreset = 'this-month' | 'last-month' | 'quarter' | 'custom';

export function getVietnamDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === 'year')!.value),
    month: Number(parts.find((p) => p.type === 'month')!.value),
  };
}

export function formatIsoMonthRange(year: number, startMonth: number, endMonth: number) {
  const pad = (m: number) => String(m).padStart(2, '0');
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  return {
    dateFrom: `${year}-${pad(startMonth)}-01`,
    dateTo: `${year}-${pad(endMonth)}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function getPeriodRange(preset: Exclude<PeriodPreset, 'custom'>) {
  if (preset === 'this-month') return currentVietnamMonth();
  const { year, month } = getVietnamDateParts();
  if (preset === 'last-month') {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return formatIsoMonthRange(prevYear, prevMonth, prevMonth);
  }
  const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
  return formatIsoMonthRange(year, quarterStart, quarterStart + 2);
}

export type CompletedEventsDashboardProps = Readonly<{
  onOpenBilling?: (bookingId: string) => void;
  refreshToken?: number;
}>;

export function useRevenueDashboardState({
  onOpenBilling,
  refreshToken = 0,
}: CompletedEventsDashboardProps) {
  const [preset, setPreset] = useState<PeriodPreset>('this-month');
  const [dates, setDates] = useState(currentVietnamMonth);
  const [query, setQuery] = useState<CompletedEventsFilters>(() => ({
    ...currentVietnamMonth(),
    page: 1,
    pageSize: 10,
    paymentStatus: 'ALL',
  }));
  const [subTab, setSubTab] = useState<RevenueSubTab>('debts');
  const [hallSort, setHallSort] = useState<HallSortOption>('revenue');
  const [offeringCategory, setOfferingCategory] = useState<OfferingCategoryOption>('ALL');
  const [offeringSort, setOfferingSort] = useState<OfferingSortOption>('revenue');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastData, setLastData] = useState<CompletedEventsData | null>(null);
  const view = useCompletedEvents(query);
  if (view.data && view.data !== lastData) {
    setLastData(view.data);
  }
  const displayData = view.data ?? lastData;
  const refresh = useRef(view.refresh);
  useEffect(() => {
    refresh.current = view.refresh;
  }, [view.refresh]);
  useEffect(() => {
    if (refreshToken > 0) void refresh.current();
  }, [refreshToken]);
  const applyPreset = (nextPreset: Exclude<PeriodPreset, 'custom'>) => {
    const range = getPeriodRange(nextPreset);
    setPreset(nextPreset);
    setDates(range);
    setValidationError(null);
    setQuery((prev) => ({
      ...prev,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      page: 1,
    }));
  };
  const applyDates = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = {
      ...query,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      page: 1,
    };
    if (!completedEventsQuerySchema.safeParse(candidate).success) {
      setValidationError('Chọn khoảng ngày hợp lệ, tối đa 366 ngày.');
      return;
    }
    setValidationError(null);
    setQuery(candidate);
  };
  const isFilteringDebt = subTab === 'debts' && query.paymentStatus === 'DEBT';
  const toggleDebtQuickFilter = () => {
    if (isFilteringDebt) {
      setQuery((prev) => ({ ...prev, paymentStatus: 'ALL', page: 1 }));
    } else {
      setSubTab('debts');
      setQuery((prev) => ({ ...prev, paymentStatus: 'DEBT', page: 1 }));
    }
  };
  const collectionRate =
    displayData &&
    displayData.summary.revenueVnd !== null &&
    displayData.summary.revenueVnd > 0 &&
    displayData.summary.netPaidVnd !== null
      ? Math.round((displayData.summary.netPaidVnd / displayData.summary.revenueVnd) * 1000) / 10
      : null;
  const hasOutstanding =
    displayData !== null &&
    displayData.summary.outstandingVnd !== null &&
    displayData.summary.outstandingVnd > 0;
  return {
    onOpenBilling,
    preset,
    setPreset,
    dates,
    setDates,
    query,
    setQuery,
    subTab,
    setSubTab,
    hallSort,
    setHallSort,
    offeringCategory,
    setOfferingCategory,
    offeringSort,
    setOfferingSort,
    validationError,
    view,
    displayData,
    refresh,
    applyPreset,
    applyDates,
    isFilteringDebt,
    toggleDebtQuickFilter,
    collectionRate,
    hasOutstanding,
  };
}
