'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiClientError, createApiClient } from '../../lib/api/client';
import { sharedManagementSession } from '../identity-access/session';
import { notify } from '../../design-system/notifications';
import {
  activationSchema,
  getActivationCopy,
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
  const accountDetailsSupported = useRef(true);
  const linkIntent = useRef<{
    key: string;
    expectedRevision: number;
    sourceConsultationId: string;
  } | null>(null);
  const copy = getActivationCopy(value);

  const load = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const fetchStatus = (includeAccountState: boolean) =>
        session.authorize((token: string) =>
          client().GET('/management/consultations/{consultationId}/activation-status', {
            headers: { Authorization: 'Bearer ' + token },
            params: {
              path: { consultationId },
              ...(includeAccountState ? { query: { includeAccountState: 'true' as const } } : {}),
            },
            cache: 'no-store',
          }),
        );
      let result;
      try {
        result = await fetchStatus(accountDetailsSupported.current);
      } catch (error) {
        // A still-deployed older backend rejects the additive query. Keep neutral
        // access wording until that backend can report account readiness.
        if (
          !(error instanceof ApiClientError) ||
          error.status !== 422 ||
          error.code !== 'VALIDATION_ERROR'
        )
          throw error;
        accountDetailsSupported.current = false;
        result = await fetchStatus(false);
      }
      if (current !== sequence.current) return;
      const parsed = activationSchema.safeParse(result.data?.data);
      if (!parsed.success) throw Error('Missing activation state');
      setValue(parsed.data);
    } catch (caught) {
      if (current === sequence.current) {
        setValue(null);
        notify.error(caught, {
          title: 'Quyền truy cập hồ sơ',
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
      notify.success(copy.success);
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

  const linkAccess = async () => {
    if (!value?.linkSourceConsultationId || sending.current || disabled) return;
    sending.current = true;
    setPending(true);
    linkIntent.current ??= {
      key: crypto.randomUUID(),
      expectedRevision: value.consultationRevision,
      sourceConsultationId: value.linkSourceConsultationId,
    };
    const intent = linkIntent.current;
    try {
      await session.authorize((token: string) =>
        client().POST('/management/consultations/{consultationId}/existing-customer-access', {
          headers: { Authorization: 'Bearer ' + token },
          params: { path: { consultationId }, header: { 'Idempotency-Key': intent.key } },
          body: {
            expectedRevision: intent.expectedRevision,
            sourceConsultationId: intent.sourceConsultationId,
          },
        }),
      );
      linkIntent.current = null;
      await load();
      notify.success(
        'Đã liên kết hồ sơ tiệc với tài khoản khách hiện có. Khách không cần nhận lại lời mời.',
      );
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.kind === 'api' && (caught.status ?? 500) < 500)
        linkIntent.current = null;
      await load();
      notify.error(caught, { title: 'Liên kết tài khoản khách' });
    } finally {
      sending.current = false;
      setPending(false);
    }
  };

  if (value?.state === 'ACTIVATED')
    return (
      <section className="hy-activation-card" aria-label="Tài khoản khách đã liên kết">
        <div className="hy-activation-header">
          <div>
            <h4 className="hy-activation-heading">Đã liên kết với tài khoản khách</h4>
            <p className="hy-activation-subheading">
              {value.recipientEmail} · Khách dùng tài khoản hiện có để mở tiệc trên web hoặc app.
            </p>
            <small>Các chức năng vẫn theo quyền và tiến độ riêng của tiệc này.</small>
          </div>
        </div>
      </section>
    );
  if (value?.accountState === 'ACTIVE' && value.linkSourceConsultationId)
    return (
      <section
        className="hy-activation-card"
        aria-label="Liên kết tài khoản khách hiện có"
        aria-busy={pending}
      >
        <div className="hy-activation-header">
          <div>
            <h4 className="hy-activation-heading">Khách đã có tài khoản</h4>
            <p className="hy-activation-subheading">
              {value.recipientEmail} · Hồ sơ này được tạo trước khi có cơ chế liên kết tự động.
            </p>
            <small>
              Liên kết trực tiếp để khách thấy tiệc mới; không gửi email kích hoạt hoặc thay đổi mật
              khẩu.
            </small>
          </div>
          <button
            type="button"
            className="hy-action-btn-primary"
            disabled={disabled || pending}
            onClick={() => void linkAccess()}
          >
            {pending ? 'Đang liên kết…' : 'Liên kết với khách này'}
          </button>
        </div>
      </section>
    );

  return (
    <section
      className="hy-activation-card"
      aria-label="Trạng thái tài khoản và quyền truy cập tiệc"
      aria-busy={pending}
    >
      <div className="hy-activation-header">
        <div className="hy-activation-header-info">
          <div>
            <h4 className="hy-activation-heading">{copy.heading}</h4>
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
            {pending ? <span className="hy-button-spinner" aria-hidden="true" /> : null}
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
                      ? copy.sendLabel
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
              <strong>{copy.statusLabel}</strong>
            </div>
          </div>

          <div className="hy-activation-meta-grid">
            {copy.accountLabel ? (
              <div className="hy-activation-meta-item">
                <div className="hy-activation-meta-label">Tài khoản khách</div>
                <div className="hy-activation-meta-value">{copy.accountLabel}</div>
              </div>
            ) : null}
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

            {value.expiresAt ? (
              <div className="hy-activation-meta-item">
                <div className="hy-activation-meta-label">Hạn lời mời</div>
                <div className="hy-activation-meta-value">
                  {new Date(value.expiresAt).toLocaleString('vi-VN')}
                </div>
              </div>
            ) : null}

            <div className="hy-activation-meta-item">
              <div className="hy-activation-meta-label">Quyền truy cập</div>
              <div className="hy-activation-meta-value">
                {value.accessState === 'GRANTED'
                  ? 'Đã có quyền · Chức năng theo tiến độ tiệc'
                  : value.accessState === 'NOT_GRANTED'
                    ? 'Chưa có quyền vào hồ sơ tiệc này'
                    : value.accessState === 'UNAVAILABLE'
                      ? 'Quyền truy cập cần được kiểm tra'
                      : 'Theo lời mời và tiến độ tiệc'}
              </div>
            </div>
          </div>

          <div className="hy-activation-hint-box">
            <p className="hy-activation-hint">{copy.hint}</p>
          </div>
        </div>
      ) : null}

      <ActivationConfirmDialog
        dialogRef={confirmation}
        recipientEmail={value?.recipientEmail}
        accountState={value?.accountState}
        onSend={() => void send()}
        onClose={() => confirmation.current?.close()}
      />
    </section>
  );
}
