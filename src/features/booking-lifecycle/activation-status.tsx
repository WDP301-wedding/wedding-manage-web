'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError, createApiClient } from '../../lib/api/client';
import { sharedManagementSession } from '../identity-access/session';
import { notify } from '../../design-system/notifications';
import {
  activationSchema,
  activationLabels,
  getActivationBadgeVariant,
  type Activation,
  type ActivationApiClient,
} from './activation-status.types';
import { ActivationConfirmDialog } from './activation-confirm-dialog';

const session = sharedManagementSession;

let api: ActivationApiClient | undefined;
const client = () => (api ??= createApiClient() as ActivationApiClient);

export function ActivationStatus({
  consultationId,
  disabled = false,
  reloadSignal = 0,
}: Readonly<{ consultationId: string; disabled?: boolean; reloadSignal?: number }>) {
  const [retrying, setRetrying] = useState(false);
  const [value, setValue] = useState<Activation | null>(null);
  const [pending, setPending] = useState(false);
  const sequence = useRef(0);
  const sending = useRef(false);
  const key = useRef<string | null>(null);
  const confirmation = useRef<HTMLDialogElement>(null);

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
      className="hy-activation-card"
      aria-label="Trạng thái kích hoạt tài khoản"
      aria-busy={pending}
    >
      <div className="hy-activation-header">
        <div className="hy-activation-header-info">
          <div>
            <h4 className="hy-activation-heading">Kích hoạt tài khoản khách hàng</h4>
            <span className="hy-activation-subheading">
              Cổng thông tin duyệt kịch bản &amp; theo dõi hợp đồng
            </span>
          </div>
        </div>

        <div className="hy-activation-actions">
          <button
            type="button"
            className="hy-action-btn-secondary"
            disabled={pending}
            onClick={() => void load()}
            title="Tải lại trạng thái mới nhất"
          >
            {pending ? (
              <span className="hy-button-spinner" aria-hidden="true" />
            ) : null}
            <span>Cập nhật trạng thái</span>
          </button>
          {value?.canSend ? (
            <button
              type="button"
              className="hy-action-btn-primary"
              disabled={disabled || pending}
              onClick={() => {
                if (key.current) void send();
                else confirmation.current?.showModal();
              }}
            >
              <span>
                {pending
                  ? 'Đang gửi…'
                  : retrying
                    ? 'Thử lại yêu cầu gửi'
                    : value.state === 'NOT_ISSUED'
                      ? 'Gửi lời mời kích hoạt'
                      : 'Gửi lại lời mời'}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {value ? (
        <div className="hy-activation-body">
          <div className="hy-activation-status-row">
            <div
              role="status"
              className={`hy-activation-badge hy-activation-badge-${getActivationBadgeVariant(value.state)}`}
            >
              <span className="hy-activation-status-dot" aria-hidden="true" />
              <strong>{activationLabels[value.state]}</strong>
            </div>
          </div>

          <div className="hy-activation-meta-grid">
            <div className="hy-activation-meta-item">
              <div className="hy-activation-meta-label">Email nhận</div>
              <div className="hy-activation-meta-value">{value.recipientEmail}</div>
            </div>

            {value.acceptedAt ? (
              <div className="hy-activation-meta-item">
                <div className="hy-activation-meta-label">Khách nhận lời mời</div>
                <div className="hy-activation-meta-value">
                  {new Date(value.acceptedAt).toLocaleString('vi-VN')}
                </div>
              </div>
            ) : null}

            {value.expiresAt && value.state !== 'ACTIVATED' ? (
              <div className="hy-activation-meta-item">
                <div className="hy-activation-meta-label">Hạn lời mời</div>
                <div className="hy-activation-meta-value">
                  {new Date(value.expiresAt).toLocaleString('vi-VN')}
                </div>
              </div>
            ) : null}

            <div className="hy-activation-meta-item">
              <div className="hy-activation-meta-label">Quyền truy cập</div>
              <div className="hy-activation-meta-value">Tự động phân quyền theo tiến độ tiệc</div>
            </div>
          </div>

          <div className="hy-activation-hint-box">
            <p className="hy-activation-hint">
              Không bắt buộc đặt cọc để kích hoạt tài khoản. Hệ thống tự động phân quyền truy cập
              theo từng giai đoạn của tiệc.
            </p>
          </div>
        </div>
      ) : null}

      <ActivationConfirmDialog
        dialogRef={confirmation}
        recipientEmail={value?.recipientEmail}
        onSend={() => void send()}
        onClose={() => confirmation.current?.close()}
      />
    </section>
  );
}
