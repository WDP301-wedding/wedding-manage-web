import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';

export type Profile = components['schemas']['ProfileResponse']['data'];
const required = <T>(value: T | undefined) => {
  if (value === undefined) throw new Error('Thiếu dữ liệu phản hồi.');
  return value;
};
export function createAccountGateway(client?: ApiClient) {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async profile(this: void, token: string): Promise<Profile> {
      return required((await api().GET('/auth/profile', { headers: headers(token) })).data).data;
    },
    async updateProfile(
      this: void,
      token: string,
      displayName: string,
      expectedRevision: number,
    ): Promise<Profile> {
      return required(
        (
          await api().PATCH('/auth/profile', {
            headers: headers(token),
            body: { displayName, expectedRevision },
          })
        ).data,
      ).data;
    },
    async requestPasswordChange(this: void, token: string, currentPassword: string) {
      return required(
        (
          await api().POST('/auth/password-change-otp-requests', {
            headers: headers(token),
            body: { currentPassword },
          })
        ).data,
      ).data;
    },
    async changePassword(
      this: void,
      token: string,
      challengeId: string,
      code: string,
      newPassword: string,
    ) {
      await api().POST('/auth/password-changes', {
        credentials: 'include',
        headers: headers(token),
        body: { challengeId, code, newPassword },
      });
    },
  };
}
