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
  accountState: z.enum(['NOT_REGISTERED', 'ACTIVE', 'UNAVAILABLE']).optional(),
  accessState: z.enum(['NOT_GRANTED', 'GRANTED', 'UNAVAILABLE']).optional(),
});

export type Activation = z.infer<typeof activationSchema>;

export type ActivationPaths = {
  '/management/consultations/{consultationId}/activation-status': {
    get: {
      parameters: { path: { consultationId: string }; query?: { includeAccountState?: 'true' } };
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
  ACTIVATED: 'Khách đã có quyền truy cập tiệc',
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

export function getActivationCopy(value: Activation | null) {
  const existing = value?.accountState === 'ACTIVE';
  const newAccount = value?.accountState === 'NOT_REGISTERED';
  const unavailable = value?.accountState === 'UNAVAILABLE';
  return {
    heading:
      value?.state === 'ACTIVATED'
        ? 'Quyền truy cập tiệc của khách'
        : unavailable
          ? 'Tài khoản khách chưa thể truy cập'
          : existing
            ? 'Mời khách truy cập tiệc này'
            : newAccount
              ? 'Kích hoạt tài khoản và truy cập tiệc'
              : 'Quyền truy cập hồ sơ tiệc',
    sendLabel: existing
      ? 'Gửi lời mời vào tiệc'
      : newAccount
        ? 'Gửi lời mời kích hoạt'
        : 'Gửi lời mời truy cập',
    accountLabel: existing
      ? 'Đã có tài khoản · Dùng mật khẩu hiện tại'
      : newAccount
        ? 'Chưa có tài khoản · Khách thiết lập khi nhận lời mời'
        : unavailable
          ? 'Tài khoản bị khóa, vô hiệu hóa hoặc chưa sẵn sàng đăng nhập'
          : null,
    hint: existing
      ? 'Khách sử dụng tài khoản và mật khẩu hiện có để xác nhận lời mời vào tiệc này. Không tạo lại tài khoản hoặc đổi mật khẩu. Các chức năng sau cọc vẫn theo quyền riêng của từng tiệc.'
      : newAccount
        ? 'Khách mở email, thiết lập mật khẩu và nhận quyền truy cập tiệc. Không bắt buộc đặt cọc để đăng nhập web hoặc app; chức năng sau cọc vẫn theo tiến độ tiệc.'
        : unavailable
          ? 'Cần xử lí trạng thái tài khoản trước khi gửi lời mời. Không tạo tài khoản trùng hoặc dùng lời mời để bỏ qua việc khóa tài khoản.'
          : 'Lời mời xác nhận quyền truy cập hồ sơ tiệc này. Khách đã có tài khoản sử dụng mật khẩu hiện tại; khách mới thiết lập tài khoản khi nhận lời mời.',
    statusLabel:
      value?.state === 'NOT_ISSUED'
        ? existing
          ? 'Chưa mời khách vào tiệc này'
          : newAccount
            ? 'Chưa gửi lời mời tạo tài khoản'
            : 'Chưa gửi lời mời vào hồ sơ'
        : value
          ? activationLabels[value.state]
          : '',
    success: existing
      ? 'Đã phát hành lời mời vào tiệc. Khách mở email và xác nhận bằng tài khoản, mật khẩu hiện có.'
      : newAccount
        ? 'Đã phát hành lời mời. Khách mở email để thiết lập tài khoản và truy cập tiệc.'
        : 'Đã phát hành lời mời truy cập hồ sơ. Khách mở email để xác nhận.',
  };
}
