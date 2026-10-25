import { axiosApiClient } from '../lib/api/axios-client';
import type { operations } from '../lib/api/generated/schema';

export type ContractListData =
  operations['listCommercialContracts']['responses'][200]['content']['application/json']['data'];
export type ContractRevisionItem = ContractListData['revisions'][number];
export type ContractLineItem = ContractRevisionItem['document']['lines'][number];

export type AppendixListData =
  operations['listCommercialAppendices']['responses'][200]['content']['application/json']['data'];
export type AppendixRevisionItem = AppendixListData['revisions'][number];
export type AppendixLineItem = AppendixRevisionItem['document']['afterLines'][number];

export const contractService = {
  async getContracts(bookingId: string, query?: { cursor?: string }): Promise<ContractListData> {
    const response = await axiosApiClient.get<{ data: ContractListData }>(
      `/bookings/${bookingId}/contracts`,
      { params: query },
    );
    return response.data.data;
  },

  async getAppendices(bookingId: string, query?: { cursor?: string }): Promise<AppendixListData> {
    const response = await axiosApiClient.get<{ data: AppendixListData }>(
      `/bookings/${bookingId}/contract-appendices`,
      { params: query },
    );
    return response.data.data;
  },

  async createContractDraft(
    bookingId: string,
    body: {
      expectedRevision: number;
      predecessorRevisionId: string | null;
      lines: readonly {
        category: 'MENU' | 'PRINT' | 'SERVICE';
        sourceId: string;
        sourceRevisionId: string;
        quantity: number;
      }[];
      incidentalClause?: string;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(`/bookings/${bookingId}/contracts`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async submitContract(
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(
      `/bookings/${bookingId}/contracts/${revisionId}/submissions`,
      { expectedRevision },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },

  async approveContract(
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(
      `/bookings/${bookingId}/contracts/${revisionId}/approvals`,
      { expectedRevision },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },

  async withdrawContract(
    bookingId: string,
    revisionId: string,
    body: { expectedRevision: number; reason: string },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(`/bookings/${bookingId}/contracts/${revisionId}/withdrawals`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async downloadContractPdf(bookingId: string, revisionId: string): Promise<Blob> {
    const response = await axiosApiClient.get(
      `/bookings/${bookingId}/contracts/${revisionId}/pdf`,
      { responseType: 'blob' },
    );
    return response.data;
  },

  async getCoupleProfile(consultationId: string): Promise<{
    brideName: string | null;
    groomName: string | null;
  }> {
    const response = await axiosApiClient.get<{
      data: { brideName: string | null; groomName: string | null };
    }>(`/consultations/${consultationId}/couple-profile`);
    return response.data.data;
  },

  async updateCoupleProfile(
    consultationId: string,
    body: {
      brideName: string;
      groomName: string;
      expectedRevision: number;
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.patch(`/consultations/${consultationId}/couple-profile`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async createAppendix(
    bookingId: string,
    body: {
      expectedRevision: number;
      reason: string;
      lines: readonly {
        category: 'MENU' | 'PRINT' | 'SERVICE';
        sourceId: string;
        sourceRevisionId: string;
        quantity: number;
      }[];
    },
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(`/bookings/${bookingId}/contract-appendices`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  async submitAppendix(
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(
      `/bookings/${bookingId}/contract-appendices/${revisionId}/submissions`,
      { expectedRevision },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },

  async approveAppendix(
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(
      `/bookings/${bookingId}/contract-appendices/${revisionId}/approvals`,
      { expectedRevision },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },
};
