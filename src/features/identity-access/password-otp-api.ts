import { createApiClient, type ApiClient } from '../../lib/api/client';
import type { components } from '../../lib/api/generated/schema';
export type OtpChallenge = components['schemas']['PasswordOtpRequestResponse']['data'];
export function createPasswordOtpGateway(client?: ApiClient) {
  let resolved = client;
  const api = () => (resolved ??= createApiClient());
  return {
    async request(this: void, email: string): Promise<OtpChallenge> {
      const result = await api().POST('/auth/password-otp-requests', { body: { email } });
      if (!result.data) throw new Error('Thiếu dữ liệu xác nhận.');
      return result.data.data;
    },
    async complete(this: void, challengeId: string, code: string, newPassword: string) {
      await api().POST('/auth/password-otp-completions', {
        body: { challengeId, code, newPassword },
      });
    },
  };
}
