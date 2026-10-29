import { z } from 'zod';
import { customerSelectionSchema, selectionLineSchema } from './selection-wire';
import { axiosApiClient } from '../lib/api/axios-client';
import type { operations } from '../lib/api/generated/schema';

const capabilityEnvelope = z.object({
  customerSelection: customerSelectionSchema.optional(),
  draftSeed: z.array(selectionLineSchema).optional(),
  capabilities: z
    .object({
      canManageDraft: z.boolean(),
      canEditSelections: z.boolean().optional(),
      canApprove: z.boolean(),
      canWithdrawApproval: z.boolean(),
    })
    .optional(),
});
export type ContractListData = z.infer<typeof capabilityEnvelope> &
  operations['listCommercialContracts']['responses'][200]['content']['application/json']['data'];
export type ContractRevisionItem = ContractListData['revisions'][number];
export type ContractLineItem = ContractRevisionItem['document']['lines'][number];

export type AppendixListData =
  operations['listCommercialAppendices']['responses'][200]['content']['application/json']['data'];
export type AppendixRevisionItem = AppendixListData['revisions'][number];
export type AppendixLineItem = AppendixRevisionItem['document']['afterLines'][number];

export type ContractDraftBody =
  operations['createCommercialContractRevision']['requestBody']['content']['application/json'];
export type ContractPreview =
  operations['previewCommercialContract']['responses'][200]['content']['application/json']['data'];
export const contractService = {
  async withdrawTimeline(
    bookingId: string,
    revisionId: string,
    expectedRevision: number,
    reason: string,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<void> {
    await axiosApiClient.post(
      `/bookings/${bookingId}/timeline-revisions/${revisionId}/withdrawals`,
      { expectedRevision, reason },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  },
  async previewContract(bookingId: string, body: ContractDraftBody): Promise<ContractPreview> {
    const response = await axiosApiClient.post<{ data: ContractPreview }>(
      `/bookings/${bookingId}/contracts/preview`,
      body,
    );
    return response.data.data;
  },
  async getContracts(bookingId: string, query?: { cursor?: string }): Promise<ContractListData> {
    const response = await axiosApiClient.get<{ data: ContractListData }>(
      `/bookings/${bookingId}/contracts`,
      { params: query },
    );
    return { ...response.data.data, ...capabilityEnvelope.parse(response.data.data) };
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
    body: ContractDraftBody,
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
