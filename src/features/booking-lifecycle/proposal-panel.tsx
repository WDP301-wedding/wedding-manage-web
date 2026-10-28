'use client';

import { useState } from 'react';

import styles from './proposal-panel.module.css';

import { createVenueCatalogGateway } from '../venue-catalog/catalog-api';
import { formatDate, money } from './booking-helpers';
import { ContractPanel } from './contract-panel';
import type { Authorize, ManagementBookingGateway, ProposalView } from './booking-api';
import { TimelineEditor } from './timeline-editor';
import { ProposalLifecycleClosure } from './proposal-lifecycle-closure';

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

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

  return (
    <div className={`proposal-layout ${styles.workspace}`} data-view="proposal">
      <article className={`proposal-summary ${styles.summary}`}>
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
            aria-label="Mở thanh toán & Thu cọc tiệc này"
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
            <span>Thanh toán &amp; thu cọc</span>
          </a>
          <button
            className="booking-complete-button"
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
            <CheckIcon />
            <span>Đánh dấu hoàn thành</span>
          </button>
        </div>
      </article>
      <article className="proposal-timeline">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.6rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h3 style={{ margin: 0 }}>Kịch bản tiệc</h3>
            {proposal.timeline !== null && (
              <button
                type="button"
                className={styles.editTimelineBtn}
                aria-expanded={isEditingTimeline}
                onClick={() => setIsEditingTimeline((prev) => !prev)}
              >
                <EditIcon />
                <span>{isEditingTimeline ? 'Đóng chỉnh sửa' : 'Chỉnh sửa'}</span>
              </button>
            )}
          </div>
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
          <>
            <p>Chưa có kịch bản đã lưu. Chọn mẫu hoặc thêm mốc để bắt đầu.</p>
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
              key={proposal.bookingId + ':empty'}
              disabled={disabled || !proposal.capabilities.canEditTimeline}
              initialItems={[]}
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
          </>
        ) : (
          <>
            <ol className={styles.savedTimelineList}>
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
            <details open={isEditingTimeline} className={styles.timelineEditorDetails}>
              <summary style={{ display: 'none' }}>Chỉnh sửa</summary>
              <div className={styles.timelineEditorWrapper}>
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
                  onCancel={() => setIsEditingTimeline(false)}
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
                    setIsEditingTimeline(false);
                  }}
                />
              </div>
            </details>
          </>
        )}
        {proposal.timeline === null ? null : (
          <button
            className="booking-secondary"
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
          </button>
        )}
      </article>
      <div className={styles.documents}>
        <ContractPanel
          bookingId={proposal.bookingId}
          bookingRevision={proposal.revision}
          disabled={disabled}
          onRefresh={() => void refresh('Đã làm mới dữ liệu hợp đồng.')}
        />
      </div>
      <ProposalLifecycleClosure
        proposal={proposal}
        disabled={disabled}
        gateway={gateway}
        command={command}
      />
    </div>
  );
}
