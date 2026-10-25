'use client';

import { formatVnd } from '../../lib/formatters';
import { formatDate } from './booking-helpers';
import { ContractLinesTable } from './contract-lines-table';
import { contractStyles } from './contract.styles';
import { useContractPanel } from './use-contract-panel';

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

  return (
    <article className="proposal-summary" style={contractStyles.panelArticle}>
      <div style={contractStyles.header}>
        <div>
          <span className="section-kicker">Pháp lý &amp; Cam kết</span>
          <h3 style={contractStyles.heading}>Hợp đồng tiệc cưới</h3>
        </div>
        {currentRevision ? (
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
    </article>
  );
}
