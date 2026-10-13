import { axiosApiClient, setAuthTokenProvider } from '../lib/api/axios-client';
import type { components, operations } from '../lib/api/generated/schema';

export type CurrentUser = components['schemas']['CurrentUserResponse']['data'];
export type WebSessionData =
  operations['createWebSession']['responses'][201]['content']['application/json']['data'];
export type Profile = components['schemas']['ProfileResponse']['data'];

let memoryAccessToken: string | null = null;
setAuthTokenProvider(() => memoryAccessToken);

export const authService = {
  setAccessToken(token: string | null): void {
    memoryAccessToken = token;
  },

  getAccessToken(): string | null {
    return memoryAccessToken;
  },

  async login(email: string, password: string): Promise<WebSessionData> {
    const response = await axiosApiClient.post<{ data: WebSessionData }>('/auth/web-sessions', {
      email,
      password,
    });
    memoryAccessToken = response.data.data.accessToken;
    return response.data.data;
  },

  async getCurrentUser(): Promise<CurrentUser> {
    const response = await axiosApiClient.get<{ data: CurrentUser }>('/auth/me');
    return response.data.data;
  },

  async refreshSession(): Promise<WebSessionData> {
    const response = await axiosApiClient.post<{ data: WebSessionData }>(
      '/auth/web-session-refreshes',
      {},
    );
    memoryAccessToken = response.data.data.accessToken;
    return response.data.data;
  },

  async logout(): Promise<void> {
    try {
      await axiosApiClient.delete('/auth/sessions/current');
    } finally {
      memoryAccessToken = null;
    }
  },

  async getProfile(): Promise<Profile> {
    const response = await axiosApiClient.get<{ data: Profile }>('/auth/profile');
    return response.data.data;
  },

  async updateProfile(displayName: string, expectedRevision: number): Promise<Profile> {
    const response = await axiosApiClient.patch<{ data: Profile }>('/auth/profile', {
      displayName,
      expectedRevision,
    });
    return response.data.data;
  },

  async requestPasswordChange(currentPassword: string): Promise<{ challengeId: string }> {
    const response = await axiosApiClient.post<{ data: { challengeId: string } }>(
      '/auth/password-change-otp-requests',
      { currentPassword },
    );
    return response.data.data;
  },

  async changePassword(challengeId: string, code: string, newPassword: string): Promise<void> {
    await axiosApiClient.post('/auth/password-changes', {
      challengeId,
      code,
      newPassword,
    });
    memoryAccessToken = null;
  },

  async requestPasswordOtp(email: string): Promise<{
    challengeId: string;
    expiresInSeconds: number;
    resendAfterSeconds: number;
  }> {
    const response = await axiosApiClient.post<{
      data: { challengeId: string; expiresInSeconds: number; resendAfterSeconds: number };
    }>('/auth/password-otp-requests', { email });
    return response.data.data;
  },

  async completePasswordOtp(
    challengeId: string,
    code: string,
    newPassword: string,
  ): Promise<void> {
    await axiosApiClient.post('/auth/password-otp-completions', {
      challengeId,
      code,
      newPassword,
    });
    memoryAccessToken = null;
  },
};
