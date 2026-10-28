import { z } from 'zod';
import type { Client } from 'openapi-fetch';
import type { ApiClient } from '../../lib/api/client';

export const activationSchema = z.strictObject({
  consultationId: z.string().uuid(),
  consultationRevision: z.number().int().positive(),
  recipientEmail: z.string().email(),
  state: z.enum([
    'NOT_ISSUED',
    'DELIVERY_PENDING',
    'AWAITING_ACCEPTANCE',
    'EXPIRED',
    'REVOKED',
    'ACTIVATED',
    'ACCOUNT_UNAVAILABLE',
    'ACCESS_UNAVAILABLE',
  ]),
  expiresAt: z.string().nullable(),
  acceptedAt: z.string().nullable(),
  canSend: z.boolean(),
});

export type Activation = z.infer<typeof activationSchema>;

export type ActivationPaths = {
  '/management/consultations/{consultationId}/activation-status': {
    get: {
      parameters: { path: { consultationId: string } };
      responses: { 200: { content: { 'application/json': { data: Activation } } } };
    };
  };
  '/management/consultations/{consultationId}/activation-invitations': {
    post: {
      parameters: { path: { consultationId: string }; header: { 'Idempotency-Key': string } };
      requestBody: { content: { 'application/json': { expectedRevision: number } } };
      responses: {
        202: {
          content: { 'application/json': { data: { invitationId: string; state: 'ISSUED' } } };
        };
      };
    };
  };
};

export type ActivationApiClient = ApiClient & Client<ActivationPaths>;

export const activationLabels: Record<Activation['state'], string> = {
  NOT_ISSUED: 'Chưa phát hành lời mời',
  DELIVERY_PENDING: 'Chưa xác nhận phát hành',
  AWAITING_ACCEPTANCE: 'Đã phát hành · Chờ khách nhận lời mời vào hồ sơ',
  EXPIRED: 'Lời mời đã hết hạn',
  REVOKED: 'Lời mời đã bị thu hồi',
  ACTIVATED: 'Tài khoản đã kích hoạt',
  ACCOUNT_UNAVAILABLE: 'Tài khoản hiện bị khóa hoặc vô hiệu hóa',
  ACCESS_UNAVAILABLE: 'Đã nhận lời mời nhưng quyền truy cập cần kiểm tra',
};

export function getActivationBadgeVariant(
  state: Activation['state'],
): 'success' | 'info' | 'warning' | 'danger' | 'neutral' {
  switch (state) {
    case 'ACTIVATED':
      return 'success';
    case 'AWAITING_ACCEPTANCE':
      return 'info';
    case 'DELIVERY_PENDING':
      return 'warning';
    case 'EXPIRED':
    case 'REVOKED':
    case 'ACCOUNT_UNAVAILABLE':
    case 'ACCESS_UNAVAILABLE':
      return 'danger';
    case 'NOT_ISSUED':
    default:
      return 'neutral';
  }
}
