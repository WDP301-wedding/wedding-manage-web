import { axiosApiClient } from '../lib/api/axios-client';
import type { components } from '../lib/api/generated/schema';

export type ConsultationRequestList = components['schemas']['ConsultationRequestList'];
export type ConsultationRequestItem = ConsultationRequestList['data'][number];

export const consultationService = {
  async getConsultationRequests(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<ConsultationRequestList> {
    const response = await axiosApiClient.get<ConsultationRequestList>(
      '/management/consultation-requests',
      { params },
    );
    return response.data;
  },

  async convertRequest(id: string): Promise<void> {
    await axiosApiClient.post(`/management/consultation-requests/${id}/conversion`);
  },

  async closeRequest(id: string): Promise<void> {
    await axiosApiClient.post(`/management/consultation-requests/${id}/closure`);
  },

  async createDirectConsultation(input: {
    intendedEmail: string;
    displayName: string;
    note?: string;
  }): Promise<{ consultationId: string; revision: number }> {
    const response = await axiosApiClient.post<{
      data: { consultationId: string; revision: number };
    }>('/management/consultations', input);
    return response.data.data;
  },

  async inviteCoupleToWorkspace(consultationId: string, expectedRevision: number): Promise<void> {
    await axiosApiClient.post(`/management/consultations/${consultationId}/workspace-invitations`, {
      expectedRevision,
    });
  },
};
