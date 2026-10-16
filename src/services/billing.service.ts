import { axiosApiClient } from '../lib/api/axios-client';
import type { components, operations } from '../lib/api/generated/schema';

export type BookingBilling = components['schemas']['BookingBillingResponse']['data'];
export type BillingAttempt = components['schemas']['BillingAttemptResponse']['data'];
export type ManualPaymentBody = components['schemas']['BillingManualPaymentBody'];
export type RefundBody = components['schemas']['BillingRefundBody'];
export type RefundApprovalBody = components['schemas']['BillingRefundApprovalBody'];

export type IncidentalExpensesResponse =
  operations['getManagementIncidentalExpenses']['responses'][200]['content']['application/json']['data'];
export type IncidentalExpenseItem = IncidentalExpensesResponse['lines'][number];

export type FinalInvoicesResponse =
  operations['listCommercialInvoices']['responses'][200]['content']['application/json']['data'];
export type FinalInvoiceItem = FinalInvoicesResponse['revisions'][number];

export const billingService = {
  async getBillingSummary(
    bookingId: string,
    query?: { limit?: number; cursor?: string },
  ): Promise<BookingBilling> {
    const response = await axiosApiClient.get<{ data: BookingBilling }>(
      `/bookings/${bookingId}/billing`,
      { params: query },
    );
    return response.data.data;
  },

  async getAttemptDetails(bookingId: string, attemptId: string): Promise<BillingAttempt> {
    const response = await axiosApiClient.get<{ data: BillingAttempt }>(
      `/bookings/${bookingId}/payments/${attemptId}`,
    );
    return response.data.data;
  },

  async recordManualPayment(
    body: ManualPaymentBody,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<components['schemas']['BillingPaymentResponse']['data']> {
    const response = await axiosApiClient.post<{
      data: components['schemas']['BillingPaymentResponse']['data'];
    }>('/management/billing/payments/manual', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data.data;
  },

  async requestRefund(
    body: RefundBody,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<components['schemas']['BillingRefundResponse']['data']> {
    const response = await axiosApiClient.post<{
      data: components['schemas']['BillingRefundResponse']['data'];
    }>('/management/billing/refunds', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data.data;
  },

  async approveRefund(
    body: RefundApprovalBody,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<components['schemas']['BillingRefundApprovalResponse']['data']> {
    const response = await axiosApiClient.post<{
      data: components['schemas']['BillingRefundApprovalResponse']['data'];
    }>('/management/billing/refund-approvals', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return response.data.data;
  },

  async getIncidentals(bookingId: string): Promise<IncidentalExpensesResponse> {
    const response = await axiosApiClient.get<{ data: IncidentalExpensesResponse }>(
      `/management/bookings/${bookingId}/incidental-expenses`,
    );
    return response.data.data;
  },

  async createIncidental(
    bookingId: string,
    body: {
      expectedRevision: number;
      name: string;
      quantity: number;
      unit: string;
      unitPriceVnd: number;
      note?: string | null;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(`/management/bookings/${bookingId}/incidental-expenses`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async updateIncidental(
    bookingId: string,
    lineId: string,
    body: {
      expectedRevision: number;
      name?: string;
      quantity?: number;
      unit?: string;
      unitPriceVnd?: number;
      note?: string | null;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.patch(
      `/management/bookings/${bookingId}/incidental-expenses/${lineId}`,
      body,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },

  async deleteIncidental(
    bookingId: string,
    lineId: string,
    expectedRevision: number,
  ): Promise<void> {
    await axiosApiClient.delete(`/management/bookings/${bookingId}/incidental-expenses/${lineId}`, {
      data: { expectedRevision },
    });
  },

  async getFinalInvoices(bookingId: string): Promise<FinalInvoicesResponse> {
    const response = await axiosApiClient.get<{ data: FinalInvoicesResponse }>(
      `/bookings/${bookingId}/final-invoices`,
    );
    return response.data.data;
  },

  async finalizeInvoice(
    bookingId: string,
    body: {
      expectedBillingRevision: number;
      expectedCommercialRevisionId: string;
      expectedDraftRevision: number;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(`/management/bookings/${bookingId}/final-invoices`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async adjustInvoice(
    bookingId: string,
    body: {
      expectedBillingRevision: number;
      expectedInvoiceRevisionId: string;
      lines: readonly {
        kind: 'DEBIT' | 'CREDIT';
        name: string;
        quantity: number;
        unit: string;
        unitPriceVnd: number;
        note?: string | null;
      }[];
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(`/management/bookings/${bookingId}/invoice-adjustments`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
};
