'use client';

import { useState } from 'react';
import { formatVnd } from '../../lib/formatters';
import { formatDate } from './booking-helpers';
import { ContractLinesTable } from './contract-lines-table';
import { contractStyles } from './contract.styles';
import { ContractDraftComposer } from './contract-draft-composer';
import type { ProposalView } from './booking-api';
import type { useContractPanel } from './use-contract-panel';
import { useAppendixPanel } from './use-appendix-panel';
import { AppendixPanel } from './appendix-panel';

export function ContractPanel({
  panelState,
  proposal,
  bookingId,
  bookingRevision,
  disabled,
  onRefresh,
}: Readonly<{
  panelState: ReturnType<typeof useContractPanel>;
  proposal: ProposalView;
  bookingId: string;
  bookingRevision: number;
  disabled: boolean;
  onRefresh: () => void;
}>) {
  const [subTab, setSubTab] = useState<'contract' | 'appendix'>('contract');
  const {
    editing,
    setEditing,
    data: rawData,
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
  } = panelState;

  const data = rawData?.bookingId === bookingId ? rawData : null;

  const commandsDisabled =
    disabled || loading || Boolean(error) || data?.bookingRevision !== bookingRevision;

  const appendixState = useAppendixPanel({ bookingId, bookingRevision, onRefresh });

  return (
    <article className="proposal-summary" style={contractStyles.panelArticle}>
      <div style={contractStyles.header}>
        <div>
          <span className="section-kicker">Pháp lý &amp; Cam kết</span>
          <h3 style={contractStyles.heading}>Hồ sơ hợp đồng &amp; Phụ lục</h3>
        </div>
        {subTab === 'contract' && currentRevision ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
            <button
              type="button"
              disabled={disabled || downloadingPdf}
              onClick={() => void handleDownloadPdf()}
              style={{
                marginLeft: '0.25rem',
                padding: '0.3rem 0.75rem',
                borderRadius: 6,
                border: '1px solid var(--hy-outline, #eadfd6)',
                background: '#ffffff',
                color: 'var(--hy-wine, #7a1f3d)',
                cursor: disabled || downloadingPdf ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
              title="Tải tệp PDF hợp đồng"
            >
              <span>{downloadingPdf ? 'Đang tải PDF…' : 'Tải PDF'}</span>
            </button>
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

      {error ? (
        <p role="alert" className="booking-error">
          {error}
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void panelState.loadContracts();
              onRefresh();
            }}
          >
            Tải lại hợp đồng
          </button>
        </p>
      ) : null}
      {actionMessage ? <p role="status">{actionMessage}</p> : null}
      {subTab === 'contract' && data?.capabilities?.canManageDraft && !editing ? (
        <div className="booking-actions">
          <button
            type="button"
            className="primary-button"
            disabled={commandsDisabled || !proposal.timeline}
            onClick={() => setEditing(true)}
          >
            {currentRevision ? 'Chỉnh sửa bản hợp đồng' : 'Lập hợp đồng từ đề xuất'}
          </button>
          {!proposal.timeline ? <p>Cần lưu kịch bản tiệc trước khi lập hợp đồng.</p> : null}
        </div>
      ) : null}
      {subTab === 'contract' && editing && data?.capabilities?.canManageDraft ? (
        <ContractDraftComposer
          key={bookingId + ':' + (currentRevision?.revisionId ?? 'new')}
          proposal={proposal}
          current={currentRevision}
          bookingRevision={data.bookingRevision}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onRefresh();
          }}
        />
      ) : null}
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
                Đang có {appendixState.pendingApprovalsCount} phụ lục hợp đồng chờ Quản lý phê
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

          {loading && !currentRevision ? (
            <p style={{ color: 'var(--hy-text-muted, #6e5d63)', fontSize: '0.875rem' }}>
              Đang tải hợp đồng…
            </p>
          ) : !currentRevision ? (
            <div style={contractStyles.emptyBox}>
              <p style={{ color: 'var(--hy-text-muted, #6e5d63)', margin: 0 }}>
                Chưa có hợp đồng. Quản lý lập hợp đồng từ đề xuất, kiểm tra các khoản phí rồi gửi
                khách duyệt.
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
                    {currentRevision.document.hallName} (
                    {formatDate(currentRevision.document.eventDate)})
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

              {data?.capabilities?.canWithdrawApproval ? (
                <form
                  className="booking-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const reason = String(
                      new FormData(event.currentTarget).get('reason') ?? '',
                    ).trim();
                    if (reason) void panelState.handleWithdraw(reason);
                  }}
                >
                  <label>
                    Lý do cần thay đổi sau khi đã duyệt
                    <textarea name="reason" required maxLength={500} />
                  </label>
                  <button
                    className="primary-button booking-secondary"
                    disabled={commandsDisabled}
                    type="submit"
                  >
                    Rút duyệt để chuẩn bị bản mới
                  </button>
                </form>
              ) : null}
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

                {currentRevision.state === 'DRAFT' &&
                data?.capabilities?.canManageDraft &&
                !editing ? (
                  <button
                    type="button"
                    disabled={commandsDisabled}
                    onClick={() => void handleSubmitDraft()}
                    style={contractStyles.submitDraftButton(disabled || loading)}
                  >
                    Gửi duyệt hợp đồng
                  </button>
                ) : null}

                {currentRevision.state === 'AWAITING_APPROVAL' &&
                !managerApproved &&
                data?.capabilities?.canApprove ? (
                  <button
                    type="button"
                    disabled={commandsDisabled}
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
