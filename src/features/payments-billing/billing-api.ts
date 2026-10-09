import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components, operations } from '../../lib/api/generated/schema';

export type BillingView = components['schemas']['BookingBillingResponse']['data'];
export type AttemptView = components['schemas']['BillingAttemptResponse']['data'];
export type ManualPaymentBody = components['schemas']['BillingManualPaymentBody'];
export type RefundBody = components['schemas']['BillingRefundBody'];
export type RefundApprovalBody = components['schemas']['BillingRefundApprovalBody'];
export type BillingPageQuery = operations['getBookingBilling']['parameters']['query'];
export interface ManagementBillingGateway {
  approveRefund(
    this: void,
    token: string,
    body: RefundApprovalBody,
    key: string,
  ): Promise<components['schemas']['BillingRefundApprovalResponse']['data']>;
  load(
    this: void,
    token: string,
    bookingId: string,
    query?: BillingPageQuery,
  ): Promise<BillingView>;
  loadAttempt(
    this: void,
    token: string,
    bookingId: string,
    attemptId: string,
  ): Promise<AttemptView>;
  recordManual(
    this: void,
    token: string,
    body: ManualPaymentBody,
    key: string,
  ): Promise<components['schemas']['BillingPaymentResponse']['data']>;
  refund(
    this: void,
    token: string,
    body: RefundBody,
    key: string,
  ): Promise<components['schemas']['BillingRefundResponse']['data']>;
}
function required<T>(data: { readonly data: T } | undefined): T {
  if (data?.data === undefined || data.data === null)
    throw new Error('Không nhận được dữ liệu billing. Hãy giữ nguyên yêu cầu và thử lại.');
  return data.data;
}
export function createManagementBillingGateway(client?: ApiClient): ManagementBillingGateway {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async approveRefund(token, body, key) {
      const { data } = await api().POST('/management/billing/refund-approvals', {
        body,
        params: { header: { 'Idempotency-Key': key } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data);
    },
    async load(token, bookingId, query = {}) {
      const { data } = await api().GET('/bookings/{bookingId}/billing', {
        params: { path: { bookingId }, query: { limit: 25, ...query } },
        headers: headers(token),
        cache: 'no-store',
      });
      const value = required(data);
      return { ...value, history: Array.from(value.history) };
    },
    async loadAttempt(token, bookingId, attemptId) {
      const { data } = await api().GET('/bookings/{bookingId}/payments/{attemptId}', {
        params: { path: { bookingId, attemptId } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data);
    },
    async recordManual(token, body, key) {
      const { data } = await api().POST('/management/billing/payments/manual', {
        body,
        params: { header: { 'Idempotency-Key': key } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data);
    },
    async refund(token, body, key) {
      const { data } = await api().POST('/management/billing/refunds', {
        body,
        params: { header: { 'Idempotency-Key': key } },
        headers: headers(token),
        cache: 'no-store',
      });
      return required(data);
    },
  };
}
