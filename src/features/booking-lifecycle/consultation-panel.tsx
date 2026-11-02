'use client';

import { Check, CircleCheck, Clock, Plus, X } from 'lucide-react';
import { cn } from 'cn';
import { ActivationStatus } from './activation-status';
import type { FormEvent } from 'react';
import type { BookingPrefill, InviteLogEntry } from './booking-helpers';
import { field } from './booking-helpers';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

export interface ConsultationPanelProps {
  activationVisible?: boolean;
  consultation: { id: string; revision: number } | null;
  disabled: boolean;
  logs?: readonly InviteLogEntry[] | undefined;
  onClearLogs?: (() => void) | undefined;
  onCreate: (input: {
    intendedEmail: string;
    displayName: string;
    note?: string;
    sourceConsultationId?: string;
  }) => Promise<void>;
  onInvite?: (() => Promise<void>) | undefined;
  onReset?: (() => void) | undefined;
  prefill?: BookingPrefill | undefined;
  customerPicker?: React.ReactNode | undefined;
}

const fieldLabelClass = 'flex flex-col gap-1 text-xs font-semibold';
const fieldInputClass =
  'font-normal read-only:border-border read-only:bg-secondary read-only:text-muted-foreground';

const logTone = {
  success: { box: 'bg-hy-success-bg text-hy-success', Icon: Check, label: 'Đã gửi thành công' },
  error: { box: 'bg-hy-error-bg text-hy-error', Icon: X, label: 'Gửi thất bại' },
  pending: { box: 'bg-hy-warning-bg text-hy-warning', Icon: Clock, label: 'Đang xử lý...' },
} as const;

export function ConsultationPanel({
  consultation,
  activationVisible = true,
  disabled,
  logs,
  onClearLogs,
  onCreate,
  onReset,
  prefill,
  customerPicker,
}: Readonly<ConsultationPanelProps>) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const note = field(data, 'note').trim();
    void onCreate({
      ...(prefill?.sourceConsultationId
        ? { sourceConsultationId: prefill.sourceConsultationId }
        : {}),
      intendedEmail: field(data, 'email'),
      displayName: field(data, 'displayName'),
      ...(note === '' ? {} : { note }),
    });
  };
  const showPrefill = Boolean(prefill?.displayName || prefill?.email);
  const showReset = Boolean(prefill?.sourceConsultationId && consultation === null && onReset);

  return (
    <article className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-hy-1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-xl flex-col gap-1">
          <h2 className="text-lg font-semibold">Hồ sơ tư vấn</h2>
          <p className="text-xs text-muted-foreground">
            {consultation ? (
              'Hồ sơ tư vấn đã được lưu. Tiếp tục xử lý hoặc chọn khách cũ cho tiệc khác.'
            ) : (
              <>
                Nhập thông tin khách và bấm{' '}
                <strong className="text-foreground">&quot;Tạo hồ sơ tư vấn&quot;</strong> để chuyển
                sang Bước 02.
              </>
            )}
          </p>
        </div>
        <Badge>Bước 01</Badge>
      </div>

      {customerPicker ? <div>{customerPicker}</div> : null}

      {showPrefill || showReset ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
          {showPrefill ? (
            <span className="flex min-w-0 flex-[1_1_320px] items-start gap-2 text-xs">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-hy-success" />
              {prefill?.sourceConsultationId
                ? 'Đã chọn khách cũ. Email được giữ cố định để liên kết đúng tài khoản; có thể chọn lại khách ở danh sách bên cạnh.'
                : 'Đã điền sẵn thông tin khách cho hồ sơ này.'}
            </span>
          ) : null}
          {showReset ? (
            <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onReset}>
              Bỏ chọn khách cũ
            </Button>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <label className={fieldLabelClass}>
            <span>Tên khách</span>
            <Input
              key={`displayName-${prefill?.displayName ?? ''}`}
              className={fieldInputClass}
              name="displayName"
              readOnly={consultation !== null}
              required
              minLength={1}
              maxLength={120}
              defaultValue={prefill?.displayName ?? ''}
              placeholder="VD: Lã Gia Huy"
            />
          </label>
          <label className={fieldLabelClass}>
            <span>Email liên hệ</span>
            <Input
              key={`email-${prefill?.email ?? ''}`}
              className={fieldInputClass}
              name="email"
              readOnly={consultation !== null || Boolean(prefill?.sourceConsultationId)}
              type="email"
              required
              defaultValue={prefill?.email ?? ''}
              placeholder="email@example.com"
            />
          </label>
        </div>
        <label className={fieldLabelClass}>
          <span>Ghi chú</span>
          <Textarea
            key={`note-${prefill?.note ?? ''}`}
            className={fieldInputClass}
            name="note"
            readOnly={consultation !== null}
            maxLength={2000}
            rows={3}
            defaultValue={prefill?.note ?? ''}
            placeholder="Yêu cầu riêng, ngày dự kiến, số khách ước tính..."
          />
        </label>
        <Button className="self-end" disabled={disabled || consultation !== null} type="submit">
          {consultation ? 'Đã tạo hồ sơ tư vấn' : 'Tạo hồ sơ tư vấn'}
        </Button>
      </form>

      {consultation === null ? null : (
        <div className="flex flex-col gap-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-xs text-muted-foreground">
              Mã hồ sơ tư vấn · phiên bản {consultation.revision}
            </span>
            <code className="rounded-md bg-secondary px-2 py-1 font-mono text-xs break-all">
              {consultation.id}
            </code>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-hy-success-bg px-4 py-3 text-hy-success">
            <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col gap-0.5 text-xs">
              <strong className="text-sm font-semibold">Đã lưu hồ sơ tư vấn ban đầu.</strong>
              <p>
                Kiểm tra quyền truy cập khách hoặc chuyển sang{' '}
                <strong>Bước 02: Khảo sát sảnh &amp; Đặt tiệc</strong>.
              </p>
            </div>
          </div>
          {activationVisible ? (
            <ActivationStatus
              key={consultation.id}
              consultationId={consultation.id}
              disabled={disabled}
              reloadSignal={logs?.length ?? 0}
              inset
            />
          ) : null}
          {onReset ? (
            <Button
              disabled={disabled}
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={onReset}
            >
              <Plus aria-hidden />
              Lập hồ sơ tư vấn cho tiệc khác
            </Button>
          ) : null}
          {logs && logs.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">Nhật ký gửi lời mời</span>
                {onClearLogs ? (
                  <Button
                    type="button"
                    variant="link"
                    size="xs"
                    className="text-muted-foreground"
                    onClick={onClearLogs}
                  >
                    Xóa log
                  </Button>
                ) : null}
              </div>
              {logs.map((item) => {
                const tone = logTone[item.type];
                return (
                  <div
                    key={item.id}
                    className={cn('flex flex-col gap-1 rounded-lg p-3 text-xs', tone.box)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <tone.Icon aria-hidden className="size-4" />
                        {tone.label}
                      </span>
                      <small className="text-2xs tabular-nums">{item.time}</small>
                    </div>
                    <div className="text-foreground">{item.message}</div>
                    {item.invitationId ? (
                      <div className="text-2xs">
                        <span>Mã lời mời: </span>
                        <code className="font-mono break-all">{item.invitationId}</code>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}
