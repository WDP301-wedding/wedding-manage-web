import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axiosApiClient } from '../../lib/api/axios-client';
import { navigationService } from '../../services/booking-navigation.service';
import { useDashboardBookings } from './use-dashboard-bookings';
import { useDashboardConsultations } from './use-dashboard-consultations';

vi.mock('../../lib/api/axios-client', () => ({ axiosApiClient: { get: vi.fn() } }));
vi.mock('../../services/booking-navigation.service', () => ({
  navigationService: { bookings: vi.fn() },
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(axiosApiClient.get).mockResolvedValue({
    data: {
      data: {
        items: [],
        page: 1,
        pageSize: 5,
        total: 0,
        totalPages: 0,
        counts: { total: 0, pending: 0 },
      },
    },
  });
  vi.mocked(navigationService.bookings).mockResolvedValue({
    items: [],
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
    counts: { all: 0, mine: 0 },
  });
});
afterEach(() => vi.useRealTimers());

describe('dashboard search debounce and pagination', () => {
  it('preserves the chosen consultation page when the initial empty search settles', async () => {
    const { result } = renderHook(() => useDashboardConsultations([]));
    await act(async () => {
      result.current.setCurrentPage(2);
      await Promise.resolve();
    });
    expect(result.current.currentPage).toBe(2);
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(result.current.currentPage).toBe(2);
  });

  it('preserves the chosen booking page when the initial empty search settles', async () => {
    const { result } = renderHook(() =>
      useDashboardBookings({
        bookings: [],
        assignments: {},
        resolvedAccountId: '00000000-0000-4000-8000-000000000001',
      }),
    );
    await act(async () => {
      result.current.setCurrentPage(2);
      await Promise.resolve();
    });
    expect(result.current.currentPage).toBe(2);
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(result.current.currentPage).toBe(2);
  });
});
