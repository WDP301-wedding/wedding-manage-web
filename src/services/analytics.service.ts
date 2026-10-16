import { axiosApiClient } from '../lib/api/axios-client';
import type { operations } from '../lib/api/generated/schema';

export type AnalyticsOverviewData =
  operations['getAnalyticsOverview']['responses'][200]['content']['application/json']['data'];
export type AnalyticsBookingsData =
  operations['getAnalyticsBookings']['responses'][200]['content']['application/json']['data'];
export type AnalyticsAttendanceData =
  operations['getAnalyticsAttendance']['responses'][200]['content']['application/json']['data'];
export type AnalyticsPrintOrdersData =
  operations['getAnalyticsPrintOrders']['responses'][200]['content']['application/json']['data'];

export interface AnalyticsQuery {
  dateFrom: string;
  dateTo: string;
  hallId?: string;
  menuPackageId?: string;
  phase?: 'DRAFT' | 'AWAITING_DEPOSIT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  pageSize?: number;
  cursor?: string;
}

export const analyticsService = {
  async getOverview(query: AnalyticsQuery): Promise<AnalyticsOverviewData> {
    const response = await axiosApiClient.get<{ data: AnalyticsOverviewData }>(
      '/management/analytics/overview',
      { params: query },
    );
    return response.data.data;
  },

  async getBookings(query: AnalyticsQuery): Promise<AnalyticsBookingsData> {
    const response = await axiosApiClient.get<{ data: AnalyticsBookingsData }>(
      '/management/analytics/bookings',
      { params: query },
    );
    return response.data.data;
  },

  async getAttendance(query: {
    dateFrom: string;
    dateTo: string;
    hallId?: string;
    pageSize?: number;
    cursor?: string;
  }): Promise<AnalyticsAttendanceData> {
    const response = await axiosApiClient.get<{ data: AnalyticsAttendanceData }>(
      '/management/analytics/attendance',
      { params: query },
    );
    return response.data.data;
  },

  async getPrintOrders(query: {
    dateFrom: string;
    dateTo: string;
    status?:
      | 'DRAFT'
      | 'QUOTED'
      | 'APPROVED'
      | 'IN_PRODUCTION'
      | 'READY_FOR_HANDOVER'
      | 'HANDED_OVER'
      | 'CANCELLED';
    pageSize?: number;
    cursor?: string;
  }): Promise<AnalyticsPrintOrdersData> {
    const response = await axiosApiClient.get<{ data: AnalyticsPrintOrdersData }>(
      '/management/analytics/print-orders',
      { params: query },
    );
    return response.data.data;
  },

  async exportOverview(query: { dateFrom: string; dateTo: string }): Promise<unknown> {
    const response = await axiosApiClient.get('/management/analytics/exports/overview', {
      params: query,
    });
    return response.data;
  },
};
