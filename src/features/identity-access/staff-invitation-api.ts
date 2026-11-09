import { z } from 'zod';
import { readPublicEnv } from '../../lib/env';

export const invitationSummarySchema = z.strictObject({
  invitationId: z.uuid(),
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']),
  deliveryStatus: z.enum(['UNKNOWN', 'ACCEPTED', 'FAILED']),
  expiresAt: z.iso.datetime(),
});
const detailsSchema = z.strictObject({
  maskedEmail: z.string(),
  hasExistingPassword: z.boolean(),
  expiresAt: z.iso.datetime(),
});
const acceptedSchema = z.strictObject({
  accepted: z.literal(true),
  email: z.email(),
  requiresLogin: z.literal(true),
});
export type StaffInvitationDetails = z.infer<typeof detailsSchema>;

export class StaffInvitationError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
// Public token endpoints must not restore or attach a different signed-in account.
async function post<T>(path: string, body: unknown, schema: z.ZodType<T>) {
  const base = readPublicEnv().NEXT_PUBLIC_API_BASE_URL.replace(/\/$/u, '');
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ code: z.string() }) })
      .safeParse(await response.json());
    throw new StaffInvitationError(error.success ? error.data.error.code : 'UNKNOWN');
  }
  return z.object({ data: schema }).parse(await response.json()).data;
}
export const staffInvitationApi = {
  details: (invitationToken: string) =>
    post('/auth/staff-invitation-details', { invitationToken }, detailsSchema),
  accept: (invitationToken: string, password: string) =>
    post('/auth/staff-invitation-acceptances', { invitationToken, password }, acceptedSchema),
};

export function invitationDeliveryMessage(status: string | undefined) {
  if (status === 'ACCEPTED')
    return 'Nhà cung cấp đã tiếp nhận email lời mời. Nhân viên hãy kiểm tra hộp thư và thư rác.';
  if (status === 'FAILED')
    return 'Email lời mời bị từ chối. Hãy kiểm tra cấu hình gửi thư rồi gửi lại lời mời.';
  return 'Chưa xác nhận được kết quả gửi email. Hãy kiểm tra hộp thư trước khi gửi lại lời mời.';
}
