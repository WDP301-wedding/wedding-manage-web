import { axiosApiClient } from '../lib/api/axios-client';
import type {
  CancelOrderBody,
  HandoverOrderBody,
  ManagementPrintOrderListQuery,
  PrintOrderListResult,
  PrintOrderView,
  QuotePrintOrderBody,
  TransitionOrderBody,
} from '../features/print-orders/print-orders-types';

export const printOrderService = {
  async listOrders(query?: ManagementPrintOrderListQuery): Promise<PrintOrderListResult> {
    const response = await axiosApiClient.get<PrintOrderListResult>('/management/print-orders', {
      params: query,
    });
    return response.data;
  },

  async getOrder(orderId: string): Promise<PrintOrderView> {
    const response = await axiosApiClient.get<{ data: PrintOrderView }>(
      `/management/print-orders/${orderId}`,
    );
    return response.data.data;
  },

  async quoteOrder(
    orderId: string,
    body: QuotePrintOrderBody,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<PrintOrderView> {
    const response = await axiosApiClient.post<{ data: PrintOrderView }>(
      `/management/print-orders/${orderId}/quotations`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data.data;
  },

  async startProduction(
    orderId: string,
    body: TransitionOrderBody,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<PrintOrderView> {
    const response = await axiosApiClient.post<{ data: PrintOrderView }>(
      `/management/print-orders/${orderId}/production`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data.data;
  },

  async markReady(
    orderId: string,
    body: TransitionOrderBody,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<PrintOrderView> {
    const response = await axiosApiClient.post<{ data: PrintOrderView }>(
      `/management/print-orders/${orderId}/ready`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data.data;
  },

  async markHandedOver(
    orderId: string,
    body: HandoverOrderBody,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<PrintOrderView> {
    const response = await axiosApiClient.post<{ data: PrintOrderView }>(
      `/management/print-orders/${orderId}/handover`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data.data;
  },

  async cancelOrder(
    orderId: string,
    body: CancelOrderBody,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<PrintOrderView> {
    const response = await axiosApiClient.post<{ data: PrintOrderView }>(
      `/management/print-orders/${orderId}/cancellation`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data.data;
  },
};
