'use client';

import { useState } from 'react';
import { formatVnd } from '../../lib/formatters';
import { formatDate } from './booking-helpers';
import { ContractLinesTable } from './contract-lines-table';
import { contractStyles } from './contract.styles';
import { useContractPanel } from './use-contract-panel';
import { useAppendixPanel } from './use-appendix-panel';
import { AppendixPanel } from './appendix-panel';

export function ContractPanel({
  bookingId,
  bookingRevision,
  disabled,
  onRefresh,
}: Readonly<{
  bookingId: string;
  bookingRevision: number;
  disabled: boolean;
  onRefresh: () => void;
}>) {
  const [subTab, setSubTab] = useState<'contract' | 'appendix'>('contract');
  const {
    loading,
    error,
    actionMessage,
    downloadingPdf,
    currentRevision,
    managerApproved,
    coupleApproved,
    handleApprove,
    handleSubmitDraft,
    handleDownloadPdf,
  } = useContractPanel({ bookingId, bookingRevision, onRefresh });

  const appendixState = useAppendixPanel({ bookingId, bookingRevision, onRefresh });

  return (
    <article className="proposal-summary" style={contractStyles.panelArticle}>
      <div style={contractStyles.header}>
        <div>
          <span className="section-kicker">Pháp lý &amp; Cam kết</span>
          <h3 style={contractStyles.heading}>Hồ sơ hợp đồng &amp; Phụ lục</h3>
        </div>
        {subTab === 'contract' && currentRevision ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={contractStyles.statusBadge(currentRevision.state)}>
              {currentRevision.state === 'APPROVED'
                ? 'Đã duyệt 2 bên'
                : currentRevision.state === 'AWAITING_APPROVAL'
                  ? 'Đang chờ duyệt'
                  : currentRevision.state === 'SUPERSEDED'
                    ? 'Đã thay thế'
                    : 'Bản nháp (Draft)'}
            </span>
            <small style={{ color: 'var(--hy-text-muted, #6e5d63)' }}>
              REV {currentRevision.revisionNumber}
            </small>
          </div>
        ) : null}
      </div>

      {/* Phân hệ Tab: Hợp đồng chính vs Phụ lục */}
      <div
        role="tablist"
        aria-label="Phân hệ hợp đồng và phụ lục"
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--hy-outline, #eadfd6)',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'contract'}
          onClick={() => setSubTab('contract')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: subTab === 'contract' ? 600 : 500,
            border: 'none',
            background: subTab === 'contract' ? 'var(--hy-wine, #7a1f3d)' : 'transparent',
            color: subTab === 'contract' ? '#ffffff' : 'var(--hy-text, #2b1d22)',
            cursor: 'pointer',
          }}
        >
          Hợp đồng chính {currentRevision ? `(Bản ${currentRevision.revisionNumber})` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'appendix'}
          onClick={() => setSubTab('appendix')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 6,
            fontSize: '0.875rem',
            fontWeight: subTab === 'appendix' ? 600 : 500,
            border: 'none',
            background: subTab === 'appendix' ? 'var(--hy-wine, #7a1f3d)' : 'transparent',
            color: subTab === 'appendix' ? '#ffffff' : 'var(--hy-text, #2b1d22)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>
            Phụ lục hợp đồng
            {appendixState.data?.revisions && appendixState.data.revisions.length > 0
              ? ` (${appendixState.data.revisions.length})`
              : ''}
          </span>
          {appendixState.pendingApprovalsCount > 0 ? (
            <span
              style={{
                padding: '2px 7px',
                borderRadius: 9999,
                background: subTab === 'appendix' ? '#ffffff' : 'var(--hy-wine, #7a1f3d)',
                color: subTab === 'appendix' ? 'var(--hy-wine, #7a1f3d)' : '#ffffff',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {appendixState.pendingApprovalsCount} chờ duyệt
            </span>
          ) : null}
        </button>
      </div>

      {subTab === 'appendix' ? (
        <AppendixPanel
          bookingId={bookingId}
          bookingRevision={bookingRevision}
          disabled={disabled}
          onRefresh={onRefresh}
          panelState={appendixState}
        />
      ) : (
        <>
          {appendixState.pendingApprovalsCount > 0 ? (
            <div
              style={{
                background: 'var(--hy-status-warning-bg, #fcefd6)',
                border: '1px solid var(--hy-status-warning-border, #fde68a)',
                borderRadius: 6,
                padding: '0.6rem 0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--hy-status-warning, #8a5300)',
                  fontWeight: 500,
                }}
              >
                🔔 Đang có {appendixState.pendingApprovalsCount} phụ lục hợp đồng chờ Quản lý phê
                duyệt.
              </span>
              <button
                type="button"
                onClick={() => setSubTab('appendix')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--hy-wine, #7a1f3d)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Xem và phê duyệt phụ lục →
              </button>
            </div>
          ) : null}
      {actionMessage ? (
        <div role="status" style={contractStyles.actionMessage}>
          {actionMessage}
        </div>
      ) : null}

      {error ? (
        <div role="alert" style={contractStyles.errorMessage}>
          {error}
        </div>
      ) : null}

      {loading && !currentRevision ? (
        <p style={{ color: 'var(--hy-text-muted, #6e5d63)', fontSize: '0.875rem' }}>
          Đang tải hợp đồng…
        </p>
      ) : !currentRevision ? (
        <div style={contractStyles.emptyBox}>
          <p style={{ color: 'var(--hy-text-muted, #6e5d63)', margin: 0 }}>
            Tiệc này chưa có bản ghi hợp đồng chính thức.
          </p>
        </div>
      ) : (
        <div>
          <div style={contractStyles.metaGrid}>
            <div>
              <small style={contractStyles.metaSmall}>Cô dâu &amp; Chú rể</small>
              <strong>
                {currentRevision.document.brideName || '—'} &amp;{' '}
                {currentRevision.document.groomName || '—'}
              </strong>
            </div>
            <div>
              <small style={contractStyles.metaSmall}>Sảnh &amp; Ngày tiệc</small>
              <strong>
                {currentRevision.document.hallName} ({formatDate(currentRevision.document.eventDate)})
              </strong>
            </div>
            <div>
              <small style={contractStyles.metaSmall}>Tổng giá trị hợp đồng</small>
              <strong style={{ color: 'var(--hy-wine, #7a1f3d)' }}>
                {formatVnd(currentRevision.document.contractTotalVnd)}
              </strong>
            </div>
            <div>
              <small style={contractStyles.metaSmall}>Tiền cọc cam kết (30%)</small>
              <strong style={{ color: 'var(--hy-wine-bold, #5c1430)' }}>
                {formatVnd(currentRevision.document.depositAmountVnd)}
              </strong>
            </div>
          </div>

          <ContractLinesTable lines={currentRevision.document.lines} />

          {/* Trạng thái phê duyệt 2 bên */}
          <div style={contractStyles.approvalStatusBox}>
            <div>
              <span>Quản lý (Manager): </span>
              <strong style={contractStyles.approvalStatusText(Boolean(managerApproved))}>
                {managerApproved ? '✓ Đã phê duyệt' : 'Chưa duyệt'}
              </strong>
            </div>
            <div>
              <span>Cặp đôi (Couple): </span>
              <strong style={contractStyles.approvalStatusText(Boolean(coupleApproved))}>
                {coupleApproved ? '✓ Đã phê duyệt' : 'Chưa duyệt'}
              </strong>
            </div>
          </div>

          {/* Các nút hành động */}
          <div style={contractStyles.actionsRow}>
            <button
              type="button"
              disabled={disabled || downloadingPdf}
              onClick={() => void handleDownloadPdf()}
              style={contractStyles.downloadButton(disabled || downloadingPdf)}
            >
              {downloadingPdf ? 'Đang tải PDF…' : 'Tải PDF hợp đồng'}
            </button>

            {currentRevision.state === 'DRAFT' ? (
              <button
                type="button"
                disabled={disabled || loading}
                onClick={() => void handleSubmitDraft()}
                style={contractStyles.submitDraftButton(disabled || loading)}
              >
                Gửi duyệt hợp đồng
              </button>
            ) : null}

            {currentRevision.state === 'AWAITING_APPROVAL' && !managerApproved ? (
              <button
                type="button"
                disabled={disabled || loading}
                onClick={() => void handleApprove()}
                style={contractStyles.approveButton(disabled || loading)}
              >
                Phê duyệt hợp đồng (Quản lý)
              </button>
            ) : null}
          </div>
        </div>
      )}
        </>
      )}
    </article>
  );
}
