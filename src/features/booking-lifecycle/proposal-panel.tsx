'use client';

import { useEffect, useState } from 'react';

import { createVenueCatalogGateway } from '../venue-catalog/catalog-api';
import { field, formatDate, money } from './booking-helpers';
import { ContractPanel } from './contract-panel';
import type { Authorize, ManagementBookingGateway, ProposalView } from './booking-api';
import { TimelineEditor } from './timeline-editor';

const catalogGateway = createVenueCatalogGateway();

export interface ProposalPanelProps {
  authorize: Authorize;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  proposal: ProposalView;
  refresh: (message: string) => Promise<void>;
  run: <T>(label: string, operation: () => Promise<T>) => Promise<T | null>;
}

export function ProposalPanel({
  authorize,
  disabled,
  gateway,
  proposal,
  refresh,
  run,
}: Readonly<ProposalPanelProps>) {

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

  const isConfirmedOrLater =
    proposal.phase === 'CONFIRMED' || proposal.phase === 'COMPLETED';

  return (
    <div className="proposal-layout">
      <article className="proposal-summary">
        <div className="proposal-status">
          <span>{proposal.phase.replaceAll('_', ' ')}</span>
          <small>REV {proposal.revision}</small>
        </div>
        <h3>{proposal.proposal.hall.name}</h3>
        <p>
          {formatDate(proposal.eventDate)} · {proposal.proposal.shift.startTime}–
          {proposal.proposal.shift.endTime}
        </p>
        <dl>
          <div>
            <dt>Thực đơn</dt>
            <dd>{proposal.proposal.menu.name}</dd>
          </div>
          <div>
            <dt>Số bàn</dt>
            <dd>{proposal.proposal.tableCount}</dd>
          </div>
          <div>
            <dt>
              {isConfirmedOrLater || proposal.phase === 'AWAITING_DEPOSIT'
                ? 'Tổng giá trị'
                : 'Tạm tính'}
            </dt>
            <dd>{money(proposal.proposal.baseChargeVnd)}</dd>
          </div>
          <div>
            <dt>
              {isConfirmedOrLater || proposal.phase === 'AWAITING_DEPOSIT'
                ? 'Tiền cọc cam kết'
                : 'Tiền cọc'}
            </dt>
            <dd>{money(proposal.proposal.depositAmountVnd)}</dd>
          </div>
        </dl>
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginTop: '0.75rem',
          }}
        >
          {proposal.phase === 'CONFIRMED' && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--hy-status-success, #2f6b4f)',
                background: 'var(--hy-status-success-bg, #e7f1ea)',
                border: '1px solid var(--hy-status-success-border, #bbf7d0)',
                borderRadius: 4,
                padding: '3px 8px',
                width: 'fit-content',
              }}
            >
              ✓ Đã xác nhận &amp; hoàn tất cọc
            </span>
          )}
          <a
            href={`/billing?bookingId=${proposal.bookingId}`}
            style={{
              padding: '7px 12px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--hy-wine, #7a1f3d)',
              background: 'var(--hy-surface-container, #fdf6ee)',
              border: '1px solid var(--hy-outline, #eadfd6)',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              width: 'fit-content',
            }}
          >
            <span>Mở thanh toán &amp; Thu cọc tiệc này →</span>
          </a>
        </div>
      </article>
      <article className="proposal-timeline">
        <h3>Kịch bản tiệc</h3>
        {proposal.timeline === null ? (
          <p>Chưa có mốc chương trình.</p>
        ) : (
          <ol>
            {proposal.timeline.items.map((item) => (
              <li key={item.itemId}>
                <time>{item.startTime}</time>
                <span>
                  <strong>{item.title}</strong>
                  {item.description ? <small>{item.description}</small> : null}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p style={{ fontSize: '0.82rem', color: 'var(--hy-text-muted, #6e5d63)' }}>
          Giờ bắt đầu mỗi mốc phải từ {proposal.proposal.shift.startTime} đến trước{' '}
          {proposal.proposal.shift.endTime} theo ca tiệc đã chọn.
        </p>
        <TimelineEditor
          key={proposal.bookingId + ':' + (proposal.timeline?.revisionId ?? 'empty')}
          disabled={disabled || !proposal.capabilities.canEditTimeline}
          initialItems={proposal.timeline?.items ?? []}
          templateSource={{
            load: async () => {
              const result = await run('templates', () =>
                authorize((token) => catalogGateway.loadTimelines(token)),
              );
              if (result === null) throw new Error('Timeline template loading failed.');
              return result;
            },
            shift: proposal.proposal.shift,
          }}
          needsReason={proposal.phase === 'CONFIRMED'}
          onSave={async (items, reason) => {
            await command('timeline', 'Đã lưu revision kịch bản mới.', (token) =>
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
          }}
        />
        {proposal.timeline === null ? null : (
          <button
            className="booking-secondary"
            disabled={disabled || !proposal.capabilities.canApproveTimeline}
            type="button"
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
            Phê duyệt revision hiện tại
          </button>
        )}
      </article>
      <ContractPanel
        bookingId={proposal.bookingId}
        bookingRevision={proposal.revision}
        disabled={disabled}
        onRefresh={() => void refresh('Đã làm mới dữ liệu hợp đồng.')}
      />
      <article className="proposal-danger" style={{ gridColumn: '1 / -1' }}>
        <h3>Kết thúc vòng đời</h3>
        {(proposal.cancellationRequests ?? []).map((request) => (
          <form
            key={request.requestId}
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const submitter = event.nativeEvent.submitter;
              const decision =
                submitter instanceof HTMLButtonElement && submitter.value === 'APPROVE'
                  ? 'APPROVE'
                  : 'REJECT';
              const reason = field(new FormData(form), 'decisionReason');
              void command(
                'cancellation-decision',
                decision === 'APPROVE' ? 'Đã chấp nhận yêu cầu hủy.' : 'Đã từ chối yêu cầu hủy.',
                (token) =>
                  gateway.decideCancellation(token, {
                    bookingId: proposal.bookingId,
                    requestId: request.requestId,
                    expectedRevision: proposal.revision,
                    decision,
                    reason,
                  }),
              );
            }}
          >
            <h4>Yêu cầu hủy từ cặp đôi</h4>
            <p>{request.reason}</p>
            <label>
              Lý do quyết định
              <textarea name="decisionReason" required minLength={1} maxLength={500} rows={2} />
            </label>
            <div className="booking-actions">
              <button type="submit" value="APPROVE" disabled={disabled}>
                Chấp nhận yêu cầu hủy
              </button>
              <button type="submit" value="REJECT" disabled={disabled}>
                Từ chối yêu cầu hủy
              </button>
            </div>
          </form>
        ))}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const reason = field(new FormData(event.currentTarget), 'reason');
            void command('cancel', 'Booking đã được hủy.', (token) =>
              gateway.cancel(token, {
                bookingId: proposal.bookingId,
                expectedRevision: proposal.revision,
                reason,
              }),
            );
          }}
        >
          <label>
            Lý do hủy
            <textarea name="reason" required minLength={1} maxLength={500} rows={3} />
          </label>
          <button
            disabled={disabled || ['CANCELLED', 'COMPLETED'].includes(proposal.phase)}
            type="submit"
          >
            Hủy booking
          </button>
        </form>
        <button
          className="booking-secondary"
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
          Đánh dấu hoàn thành
        </button>
      </article>
    </div>
  );
}
