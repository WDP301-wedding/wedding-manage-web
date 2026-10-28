'use client';

import { useEffect, useState } from 'react';

import { createVenueCatalogGateway } from '../venue-catalog/catalog-api';
import { formatDate, money } from './booking-helpers';
import { ContractPanel } from './contract-panel';
import type { Authorize, ManagementBookingGateway, ProposalView } from './booking-api';
import { TimelineEditor } from './timeline-editor';
import { ProposalLifecycleClosure } from './proposal-lifecycle-closure';

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
          <span
            className={`proposal-status-phase ${proposal.phase === 'CONFIRMED' ? 'is-confirmed' : ''}`}
          >
            {proposal.phase.replaceAll('_', ' ')}
          </span>
          <span className="proposal-status-revision">REV {proposal.revision}</span>
        </div>
        <h3>{proposal.proposal.hall.name}</h3>
        <p className="proposal-summary-subtitle">
          {formatDate(proposal.eventDate)} · {proposal.proposal.shift.startTime}–
          {proposal.proposal.shift.endTime}
        </p>
        <dl className="hy-proposal-metrics-grid">
          <div className="hy-proposal-metric-card">
            <dt className="hy-proposal-metric-label">Thực đơn</dt>
            <dd className="hy-proposal-metric-value">{proposal.proposal.menu.name}</dd>
          </div>
          <div className="hy-proposal-metric-card">
            <dt className="hy-proposal-metric-label">Số bàn</dt>
            <dd className="hy-proposal-metric-value">{proposal.proposal.tableCount} bàn</dd>
          </div>
          <div className="hy-proposal-metric-card">
            <dt className="hy-proposal-metric-label">
              {isConfirmedOrLater || proposal.phase === 'AWAITING_DEPOSIT'
                ? 'Tổng giá trị'
                : 'Tạm tính'}
            </dt>
            <dd className="hy-proposal-metric-value is-wine">
              {money(proposal.proposal.baseChargeVnd)}
            </dd>
          </div>
          <div className="hy-proposal-metric-card">
            <dt className="hy-proposal-metric-label">
              {isConfirmedOrLater || proposal.phase === 'AWAITING_DEPOSIT'
                ? 'Tiền cọc cam kết'
                : 'Tiền cọc'}
            </dt>
            <dd className="hy-proposal-metric-value">
              {money(proposal.proposal.depositAmountVnd)}
            </dd>
          </div>
        </dl>
        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
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
                borderRadius: '6px',
                padding: '4px 10px',
                width: 'fit-content',
              }}
            >
              ✓ Đã xác nhận &amp; hoàn tất cọc
            </span>
          )}
          <a
            href={`/billing?bookingId=${proposal.bookingId}`}
            style={{
              padding: '6px 12px',
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
              transition: 'background-color 0.15s ease',
            }}
          >
            <span>Mở thanh toán &amp; Thu cọc tiệc này →</span>
          </a>
        </div>
      </article>
      <article className="proposal-timeline">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.4rem',
          }}
        >
          <h3>Kịch bản tiệc</h3>
          {proposal.timeline !== null ? (
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--hy-ink-muted, #6e5d63)',
                fontWeight: 600,
              }}
            >
              {proposal.timeline.items.length} mốc chương trình
            </span>
          ) : null}
        </div>
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
        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--hy-ink-muted, #6e5d63)',
            margin: '0 0 0.75rem',
            lineHeight: 1.4,
          }}
        >
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
      <ProposalLifecycleClosure
        proposal={proposal}
        disabled={disabled}
        gateway={gateway}
        command={command}
      />
    </div>
  );
}
