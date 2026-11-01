'use client';

import { useState } from 'react';
import { Check, Lock, Pencil } from 'lucide-react';

import { createVenueCatalogGateway } from '../venue-catalog/catalog-api';
import { bookingPhaseLabel, bookingPhaseTone, formatDate, money } from './booking-helpers';
import { contractService } from '../../services/contract.service';
import type { useContractPanel } from './use-contract-panel';
import { ContractPanel } from './contract-panel';
import type {
  Authorize,
  ManagementBookingGateway,
  ProposalView,
  TimelineItemInput,
} from './booking-api';
import { TimelineEditor } from './timeline-editor';
import { ProposalLifecycleClosure } from './proposal-lifecycle-closure';
import { Badge } from '../../components/ui/badge';
import { Button, buttonVariants } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';

const catalogGateway = createVenueCatalogGateway();

const cardClass =
  'flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-hy-1';

export interface ProposalPanelProps {
  contractState: ReturnType<typeof useContractPanel>;
  authorize: Authorize;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  proposal: ProposalView;
  refresh: (message: string) => Promise<void>;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
}

export function ProposalPanel({
  contractState,
  authorize,
  disabled,
  gateway,
  proposal,
  refresh,
  run,
}: Readonly<ProposalPanelProps>) {
  const [isEditingTimeline, setIsEditingTimeline] = useState(false);
  const command = async (
    label: string,
    success: string,
    operation: (token: string) => Promise<void>,
  ): Promise<boolean> => {
    if ((await run(label, () => authorize(operation))) !== null) {
      await refresh(success);
      return true;
    }
    return false;
  };

  const isConfirmedOrLater = proposal.phase === 'CONFIRMED' || proposal.phase === 'COMPLETED';
  const templateSource = {
    load: async () => {
      const result = await run('templates', () =>
        authorize((token) => catalogGateway.loadTimelines(token)),
      );
      if (result === null) throw new Error('Timeline template loading failed.');
      return result;
    },
    shift: proposal.proposal.shift,
  };
  const saveTimeline = (items: readonly TimelineItemInput[], reason: string) =>
    command('timeline', 'Đã lưu revision kịch bản mới.', (token) =>
      proposal.phase === 'CONFIRMED'
        ? gateway.requestChange(token, {
            bookingId: proposal.bookingId,
            expectedRevision: proposal.revision,
            items,
            reason,
          })
        : gateway.saveTimeline(token, {
            bookingId: proposal.bookingId,
            expectedRevision: proposal.revision,
            predecessorRevisionId: proposal.timeline?.revisionId ?? null,
            items,
          }),
    );
  const shiftHint = (
    <p className="text-xs text-muted-foreground">
      Giờ bắt đầu mỗi mốc phải từ {proposal.proposal.shift.startTime} đến trước{' '}
      {proposal.proposal.shift.endTime} theo ca tiệc đã chọn.
    </p>
  );

  return (
    <div className="flex flex-col gap-6" data-view="proposal">
      <div className="flex flex-wrap items-start gap-6">
        <article className={`${cardClass} flex-[1_1_340px]`}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={bookingPhaseTone(proposal.phase)}>
              {bookingPhaseLabel(proposal.phase)}
            </Badge>
            <span className="text-2xs text-muted-foreground">Phiên bản {proposal.revision}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-lg font-semibold">{proposal.proposal.hall.name}</h3>
            <p className="text-muted-foreground tabular-nums">
              {formatDate(proposal.eventDate)} · {proposal.proposal.shift.startTime}–
              {proposal.proposal.shift.endTime}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Thực đơn</dt>
              <dd className="font-semibold">{proposal.proposal.menu.name}</dd>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted p-3">
              <dt className="text-xs text-muted-foreground">Số bàn</dt>
              <dd className="font-semibold tabular-nums">{proposal.proposal.tableCount} bàn</dd>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted p-3">
              <dt className="text-xs text-muted-foreground">
                {isConfirmedOrLater || proposal.phase === 'AWAITING_DEPOSIT'
                  ? 'Tổng giá trị'
                  : 'Tạm tính'}
              </dt>
              <dd className="font-bold text-primary tabular-nums">
                {money(proposal.proposal.baseChargeVnd)}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 rounded-lg bg-muted p-3">
              <dt className="text-xs text-muted-foreground">
                {isConfirmedOrLater || proposal.phase === 'AWAITING_DEPOSIT'
                  ? 'Tiền cọc cam kết'
                  : 'Tiền cọc'}
              </dt>
              <dd className="font-semibold tabular-nums">
                {money(proposal.proposal.depositAmountVnd)}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            {proposal.phase === 'CONFIRMED' && (
              <Badge variant="success">
                <Check aria-hidden />
                Đã xác nhận &amp; hoàn tất cọc
              </Badge>
            )}
            <a
              href={`/billing?bookingId=${proposal.bookingId}`}
              aria-label="Mở thanh toán & Thu cọc tiệc này"
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <span>Thanh toán &amp; thu cọc</span>
            </a>
            <Button
              size="sm"
              disabled={disabled || proposal.phase !== 'CONFIRMED'}
              type="button"
              onClick={() =>
                void command('complete', 'Booking đã hoàn thành.', (token) =>
                  gateway.complete(token, {
                    bookingId: proposal.bookingId,
                    expectedRevision: proposal.revision,
                  }),
                )
              }
            >
              <Check aria-hidden />
              <span>Đánh dấu hoàn thành</span>
            </Button>
          </div>
        </article>

        <article className={`${cardClass} flex-[2_1_480px]`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Kịch bản tiệc</h3>
              {proposal.timeline !== null && proposal.capabilities.canEditTimeline && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="aria-expanded:bg-accent"
                  aria-expanded={isEditingTimeline}
                  onClick={() => setIsEditingTimeline((prev) => !prev)}
                >
                  <Pencil aria-hidden />
                  <span>{isEditingTimeline ? 'Đóng chỉnh sửa' : 'Chỉnh sửa'}</span>
                </Button>
              )}
            </div>
            {proposal.timeline !== null ? (
              <span className="text-xs text-muted-foreground">
                {proposal.timeline.items.length} mốc chương trình
              </span>
            ) : null}
          </div>
          {proposal.timeline === null ? (
            <>
              <p>Chưa có kịch bản đã lưu. Chọn mẫu hoặc thêm mốc để bắt đầu.</p>
              {shiftHint}
              <TimelineEditor
                key={proposal.bookingId + ':empty'}
                disabled={disabled || !proposal.capabilities.canEditTimeline}
                initialItems={[]}
                templateSource={templateSource}
                needsReason={proposal.phase === 'CONFIRMED'}
                onSave={async (items, reason) => {
                  await saveTimeline(items, reason);
                }}
              />
            </>
          ) : (
            <>
              <ol className="flex flex-col">
                {proposal.timeline.items.map((item) => (
                  <li
                    key={item.itemId}
                    className="grid grid-cols-[3.5rem_1rem_minmax(0,1fr)] gap-3 pb-3 last:pb-0"
                  >
                    <time className="font-semibold tabular-nums">{item.startTime}</time>
                    <span aria-hidden className="flex flex-col items-center gap-1 pt-2">
                      <span className="size-2 rounded-full bg-primary" />
                      <span className="w-0.5 flex-1 bg-border" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <strong className="font-semibold">{item.title}</strong>
                      {item.description ? (
                        <small className="text-xs text-muted-foreground">{item.description}</small>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
              {!proposal.capabilities.canEditTimeline ? (
                <p className="flex items-start gap-2 rounded-lg bg-secondary px-4 py-3 text-xs">
                  <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  Kịch bản đang được giữ nguyên theo phê duyệt hoặc giao dịch cọc. Muốn thay đổi
                  trước cọc, rút phê duyệt trước; giao dịch đang xử lý cần được xác minh kết quả.
                </p>
              ) : null}
              {proposal.capabilities.canWithdrawApproval && proposal.timeline?.managerApprovedAt ? (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const reason = String(
                      new FormData(event.currentTarget).get('reason') ?? '',
                    ).trim();
                    if (reason)
                      void command('withdraw-timeline', 'Đã rút phê duyệt kịch bản.', () =>
                        contractService.withdrawTimeline(
                          proposal.bookingId,
                          proposal.timeline!.revisionId,
                          proposal.revision,
                          reason,
                        ),
                      );
                  }}
                >
                  <label className="flex flex-col gap-1 text-xs font-semibold">
                    Lý do thay đổi kịch bản
                    <Textarea className="font-normal" name="reason" required maxLength={500} />
                  </label>
                  <Button
                    type="submit"
                    variant="outline"
                    className="self-start"
                    disabled={disabled}
                  >
                    Rút phê duyệt kịch bản
                  </Button>
                </form>
              ) : null}
              {proposal.capabilities.canEditTimeline ? (
                <details open={isEditingTimeline}>
                  <summary className="hidden">Chỉnh sửa</summary>
                  <div className="flex flex-col gap-3 border-t border-border pt-4">
                    {shiftHint}
                    <TimelineEditor
                      key={proposal.bookingId + ':' + (proposal.timeline?.revisionId ?? 'empty')}
                      disabled={disabled || !proposal.capabilities.canEditTimeline}
                      initialItems={proposal.timeline?.items ?? []}
                      templateSource={templateSource}
                      needsReason={proposal.phase === 'CONFIRMED'}
                      onCancel={() => setIsEditingTimeline(false)}
                      onSave={async (items, reason) => {
                        await saveTimeline(items, reason);
                        setIsEditingTimeline(false);
                      }}
                    />
                  </div>
                </details>
              ) : null}
            </>
          )}
          {proposal.timeline === null ? null : (
            <Button
              variant="outline"
              className="self-start"
              disabled={disabled || !proposal.capabilities.canApproveTimeline}
              type="button"
              aria-label="Phê duyệt revision hiện tại"
              onClick={() =>
                void command('approval', 'Đã ghi nhận phê duyệt của Quản lý.', (token) =>
                  gateway.approveTimeline(token, {
                    bookingId: proposal.bookingId,
                    revisionId: proposal.timeline!.revisionId,
                    expectedRevision: proposal.revision,
                  }),
                )
              }
            >
              Phê duyệt kịch bản đã lưu
            </Button>
          )}
        </article>
      </div>
      <ContractPanel
        panelState={contractState}
        proposal={proposal}
        bookingId={proposal.bookingId}
        bookingRevision={proposal.revision}
        disabled={disabled}
        onRefresh={() => void refresh('Đã làm mới dữ liệu hợp đồng.')}
      />
      <ProposalLifecycleClosure
        proposal={proposal}
        disabled={disabled}
        gateway={gateway}
        command={command}
      />
    </div>
  );
}
