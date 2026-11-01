'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link2, LoaderCircle } from 'lucide-react';
import { cn } from 'cn';
import { ApiClientError, createApiClient } from '../../lib/api/client';
import { sharedManagementSession } from '../identity-access/session';
import { notify } from '../../design-system/notifications';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
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
  compact = false,
  hideIfActivated = false,
  inset = false,
}: Readonly<{
  consultationId: string;
  disabled?: boolean;
  reloadSignal?: number;
  compact?: boolean;
  hideIfActivated?: boolean;
  /** Nằm trong một thẻ khác: dùng nền phụ thay cho thẻ lồng thẻ. */
  inset?: boolean;
}>) {
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

  const box = cn(
    'flex gap-4 rounded-xl p-5',
    inset ? 'bg-muted' : 'border border-border bg-card shadow-hy-1',
  );

  if (value?.state === 'ACTIVATED') {
    if (hideIfActivated) return null;
    if (compact) {
      return (
        <div
          data-ui-v3
          className="inline-flex items-center gap-2 rounded-full border border-hy-success/30 bg-hy-success-bg px-3 py-1 text-xs text-hy-success shadow-xs"
          aria-label="Tài khoản khách đã liên kết"
          title={`${value.recipientEmail} · Khách dùng tài khoản hiện có để mở tiệc trên web hoặc app.`}
        >
          <span className="size-2 rounded-full bg-hy-success" aria-hidden="true" />
          <span>Đã liên kết với tài khoản khách:</span>
          <strong className="font-semibold">{value.recipientEmail}</strong>
        </div>
      );
    }
    return (
      <section
        data-ui-v3
        className={cn(box, 'flex-wrap items-start')}
        aria-label="Tài khoản khách đã liên kết"
      >
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-hy-success-bg text-hy-success"
        >
          <Link2 className="size-5" />
        </span>
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
          <h4 className="text-base font-semibold">Đã liên kết với tài khoản khách</h4>
          <p className="[overflow-wrap:anywhere]">
            {value.recipientEmail} · Khách dùng tài khoản hiện có để mở tiệc trên web hoặc app.
          </p>
          <small className="text-xs text-muted-foreground">
            Các chức năng vẫn theo quyền và tiến độ riêng của tiệc này.
          </small>
        </div>
      </section>
    );
  }

  if (compact) return null;
  if (value?.accountState === 'ACTIVE' && value.linkSourceConsultationId)
    return (
      <section
        data-ui-v3
        className={cn(box, 'flex-wrap items-start justify-between')}
        aria-label="Liên kết tài khoản khách hiện có"
        aria-busy={pending}
      >
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
          <h4 className="text-base font-semibold">Khách đã có tài khoản</h4>
          <p className="[overflow-wrap:anywhere]">
            {value.recipientEmail} · Hồ sơ này được tạo trước khi có cơ chế liên kết tự động.
          </p>
          <small className="text-xs text-muted-foreground">
            Liên kết trực tiếp để khách thấy tiệc mới; không gửi email kích hoạt hoặc thay đổi mật
            khẩu.
          </small>
        </div>
        <Button type="button" disabled={disabled || pending} onClick={() => void linkAccess()}>
          {pending ? 'Đang liên kết…' : 'Liên kết với khách này'}
        </Button>
      </section>
    );

  const badgeVariant = value ? getActivationBadgeVariant(value.state) : 'neutral';

  return (
    <section
      data-ui-v3
      className={cn(box, 'flex-col')}
      aria-label="Trạng thái tài khoản và quyền truy cập tiệc"
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h4 className="text-base font-semibold">{copy.heading}</h4>
          <span className="text-xs text-muted-foreground">
            Cổng thông tin duyệt kịch bản &amp; theo dõi hợp đồng
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => void load()}
            title="Tải lại trạng thái mới nhất"
          >
            {pending ? <LoaderCircle aria-hidden className="motion-safe:animate-spin" /> : null}
            <span>Cập nhật trạng thái</span>
          </Button>
          {value?.canSend ? (
            <Button
              type="button"
              size="sm"
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
            </Button>
          ) : null}
        </div>
      </div>

      {value ? (
        <>
          <Badge
            role="status"
            variant={badgeVariant === 'danger' ? 'error' : badgeVariant}
            className="h-auto text-left whitespace-normal"
          >
            <strong className="font-semibold">{copy.statusLabel}</strong>
          </Badge>

          <dl
            className={cn(
              'grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-3 rounded-lg p-4',
              inset ? 'bg-card' : 'bg-muted',
            )}
          >
            {copy.accountLabel ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Tài khoản khách</dt>
                <dd>{copy.accountLabel}</dd>
              </div>
            ) : null}
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Email nhận</dt>
              <dd className="[overflow-wrap:anywhere]">{value.recipientEmail}</dd>
            </div>

            {value.acceptedAt ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Khách nhận lời mời</dt>
                <dd className="tabular-nums">
                  {new Date(value.acceptedAt).toLocaleString('vi-VN')}
                </dd>
              </div>
            ) : null}

            {value.expiresAt ? (
              <div className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Hạn lời mời</dt>
                <dd className="tabular-nums">
                  {new Date(value.expiresAt).toLocaleString('vi-VN')}
                </dd>
              </div>
            ) : null}

            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">Quyền truy cập</dt>
              <dd>
                {value.accessState === 'GRANTED'
                  ? 'Đã có quyền · Chức năng theo tiến độ tiệc'
                  : value.accessState === 'NOT_GRANTED'
                    ? 'Chưa có quyền vào hồ sơ tiệc này'
                    : value.accessState === 'UNAVAILABLE'
                      ? 'Quyền truy cập cần được kiểm tra'
                      : 'Theo lời mời và tiến độ tiệc'}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-muted-foreground">{copy.hint}</p>
        </>
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
