'use client';

import { cn } from 'cn';
import { Button } from '../../components/ui/button';
import { ActivationStatus } from './activation-status';
import type { InviteLogEntry } from './booking-helpers';

export interface CoupleAccountCardProps {
  consultationId?: string | undefined;
  email?: string | undefined;
  canInvite: boolean;
  pending: boolean;
  inviteLogs: readonly InviteLogEntry[];
  onInvite: () => void;
  onClearLogs: () => void;
  hideIfActivated?: boolean;
}

const logTone = {
  success: 'bg-hy-success-bg text-hy-success',
  error: 'bg-hy-error-bg text-hy-error',
  pending: 'bg-hy-warning-bg text-hy-warning',
} as const;

export function CoupleAccountCard({
  consultationId,
  email,
  canInvite,
  pending,
  inviteLogs,
  onInvite,
  onClearLogs,
  hideIfActivated = false,
}: Readonly<CoupleAccountCardProps>) {
  if (consultationId)
    return (
      <div id="couple-account-card">
        <ActivationStatus
          key={consultationId}
          consultationId={consultationId}
          disabled={pending}
          reloadSignal={inviteLogs.length}
          hideIfActivated={hideIfActivated}
        />
      </div>
    );
  return (
    <article
      id="couple-account-card"
      data-ui-v3
      className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-hy-1"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
          <h3 className="text-base font-semibold text-primary">
            Tài khoản &amp; Quyền truy cập hồ sơ tiệc
          </h3>
          <p className="text-xs text-muted-foreground">
            Mỗi tiệc có quyền truy cập riêng. Khách đã có tài khoản nhận lời mời vào tiệc mới bằng
            tài khoản hiện có; khách mới thiết lập tài khoản khi nhận lời mời. Quyền sử dụng các
            chức năng vẫn theo tiến độ của từng tiệc.
            {email ? (
              <>
                {' '}
                · Email:{' '}
                <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-foreground">
                  {email}
                </span>
              </>
            ) : null}
          </p>
        </div>
        {canInvite ? (
          <Button type="button" disabled={pending} onClick={onInvite}>
            <span>
              {inviteLogs.some((l) => l.type === 'success')
                ? 'Gửi lại lời mời truy cập'
                : 'Gửi lời mời cộng tác'}
            </span>
          </Button>
        ) : null}
      </div>

      {inviteLogs.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Nhật ký gửi lời mời</span>
            <Button
              type="button"
              variant="link"
              size="xs"
              className="text-muted-foreground"
              onClick={onClearLogs}
            >
              Xóa log
            </Button>
          </div>
          {inviteLogs.map((item) => (
            <div key={item.id} className={cn('rounded-lg px-3 py-2 text-xs', logTone[item.type])}>
              <span className="tabular-nums">[{item.time}] </span>
              <span>{item.message}</span>
              {item.invitationId && item.invitationId !== 'Đã phát hành (ISSUED)' ? (
                <span className="ml-1.5 opacity-80">(ID: {item.invitationId})</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
