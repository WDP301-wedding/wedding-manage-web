'use client';

import { type Client } from 'openapi-fetch';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { ApiClientError, createApiClient, type ApiClient } from '../../lib/api/client';
import { sharedManagementSession } from '../identity-access/session';
import { notify } from '../../design-system/notifications';

const session = sharedManagementSession;

const activationSchema = z.strictObject({
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
type Activation = z.infer<typeof activationSchema>;
type ActivationPaths = {
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
let api: (ApiClient & Client<ActivationPaths>) | undefined;
const client = () => (api ??= createApiClient() as ApiClient & Client<ActivationPaths>);
const labels: Record<Activation['state'], string> = {
  NOT_ISSUED: 'Chưa phát hành lời mời',
  DELIVERY_PENDING: 'Chưa xác nhận phát hành',
  AWAITING_ACCEPTANCE: 'Đã phát hành · Chờ khách nhận lời mời vào hồ sơ',
  EXPIRED: 'Lời mời đã hết hạn',
  REVOKED: 'Lời mời đã bị thu hồi',
  ACTIVATED: 'Tài khoản đã kích hoạt',
  ACCOUNT_UNAVAILABLE: 'Tài khoản hiện bị khóa hoặc vô hiệu hóa',
  ACCESS_UNAVAILABLE: 'Đã nhận lời mời nhưng quyền truy cập cần kiểm tra',
};
export function ActivationStatus({
  consultationId,
  disabled = false,
  reloadSignal = 0,
}: Readonly<{ consultationId: string; disabled?: boolean; reloadSignal?: number }>) {
  const [retrying, setRetrying] = useState(false);
  const [value, setValue] = useState<Activation | null>(null),
    [pending, setPending] = useState(false);
  const sequence = useRef(0),
    sending = useRef(false),
    key = useRef<string | null>(null),
    confirmation = useRef<HTMLDialogElement>(null);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const result = await session.authorize((token: string) =>
        client().GET('/management/consultations/{consultationId}/activation-status', {
          headers: { Authorization: 'Bearer ' + token },
          params: { path: { consultationId } },
          cache: 'no-store',
        }),
      );
      if (current !== sequence.current) return;
      const parsed = activationSchema.safeParse(result.data?.data);
      if (!parsed.success) throw Error('Missing activation state');
      setValue(parsed.data);
    } catch (caught) {
      if (current === sequence.current) {
        setValue(null);
        notify.error(caught, {
          title: 'Trạng thái kích hoạt',
        });
      }
    }
  }, [consultationId]);
  useEffect(() => {
    void load();
    const focus = () => {
      if (!sending.current) void load();
    };
    window.addEventListener('focus', focus);
    return () => {
      sequence.current++;
      window.removeEventListener('focus', focus);
    };
  }, [load, reloadSignal]);
  const send = async () => {
    confirmation.current?.close();
    if (!value || !value.canSend || sending.current || disabled) return;
    sending.current = true;
    setPending(true);
    key.current ??= crypto.randomUUID();
    try {
      await session.authorize((token: string) =>
        client().POST('/management/consultations/{consultationId}/activation-invitations', {
          headers: { Authorization: 'Bearer ' + token },
          params: { path: { consultationId }, header: { 'Idempotency-Key': key.current! } },
          body: { expectedRevision: value.consultationRevision },
        }),
      );
      key.current = null;
      setRetrying(false);
      await load();
      notify.success(
        'Đã phát hành lời mời kích hoạt thành công. Khách cần mở email và tự đặt hoặc xác nhận mật khẩu.',
      );
    } catch (caught) {
      const unknown =
        !(caught instanceof ApiClientError) ||
        caught.kind !== 'api' ||
        (caught.status ?? 500) >= 500;
      if (!unknown) key.current = null;
      setRetrying(unknown);
      await load();
      notify.error(caught);
    } finally {
      sending.current = false;
      setPending(false);
    }
  };
  return (
    <section
      className="booking-result"
      aria-label="Trạng thái kích hoạt tài khoản"
      aria-busy={pending}
    >
      <h4>Kích hoạt tài khoản khách hàng</h4>
      {value ? (
        <>
          <p role="status">
            <strong>{labels[value.state]}</strong>
          </p>
          <p>Email nhận: {value.recipientEmail}</p>
          {value.expiresAt && value.state !== 'ACTIVATED' ? (
            <p>Hạn lời mời: {new Date(value.expiresAt).toLocaleString('vi-VN')}</p>
          ) : null}
          {value.acceptedAt ? (
            <p>Khách nhận lời mời lúc {new Date(value.acceptedAt).toLocaleString('vi-VN')}</p>
          ) : null}
          <p>
            Không bắt buộc đặt cọc để kích hoạt tài khoản. Hệ thống tự động phân quyền truy cập theo từng giai đoạn của tiệc.
          </p>
          {value.canSend ? (
            <button
              type="button"
              disabled={disabled || pending}
              onClick={() => {
                if (key.current) void send();
                else confirmation.current?.showModal();
              }}
            >
              {pending
                ? 'Đang gửi…'
                : retrying
                  ? 'Thử lại yêu cầu gửi'
                  : value.state === 'NOT_ISSUED'
                    ? 'Gửi lời mời kích hoạt'
                    : 'Gửi lại lời mời'}
            </button>
          ) : null}
        </>
      ) : null}
      <button type="button" disabled={pending} onClick={() => void load()}>
        Cập nhật trạng thái
      </button>
      <dialog ref={confirmation} aria-labelledby="activation-confirm-title">
        <h3 id="activation-confirm-title">Phát hành lời mời kích hoạt?</h3>
        <p>
          Gửi tới {value?.recipientEmail}. Nếu đang có lời mời còn hiệu lực, liên kết cũ sẽ hết hiệu
          lực. Không tạo mật khẩu hoặc thay đổi quyền sau đặt cọc.
        </p>
        <button type="button" onClick={() => confirmation.current?.close()}>
          Quay lại
        </button>
        <button type="button" onClick={() => void send()}>
          Xác nhận gửi
        </button>
      </dialog>
    </section>
  );
}
