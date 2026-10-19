'use client';

import { useEffect, useState } from 'react';
import {
  contractService,
  type ContractListData,
  type ContractRevisionItem,
} from '../../services/contract.service';
import { ApiServiceError } from '../../lib/api/axios-client';
import { ContractLinesTable } from './contract-lines-table';
import { formatVnd } from '../../lib/formatters';

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
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ContractListData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadContracts = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await contractService.getContracts(bookingId);
      setData(res);
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể tải thông tin hợp đồng tiệc.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContracts();
  }, [bookingId]);

  const currentRevision: ContractRevisionItem | null =
    data && data.currentRevisionId
      ? (data.revisions.find((r) => r.revisionId === data.currentRevisionId) ??
        data.revisions[0] ??
        null)
      : (data?.revisions[0] ?? null);

  const handleApprove = async () => {
    if (!currentRevision) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      await contractService.approveContract(bookingId, currentRevision.revisionId, bookingRevision);
      setActionMessage('Đã ghi nhận phê duyệt hợp đồng từ phía Quản lý.');
      await loadContracts();
      onRefresh();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể phê duyệt hợp đồng.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDraft = async () => {
    if (!currentRevision) return;
    setLoading(true);
    setError(null);
    setActionMessage(null);
    try {
      await contractService.submitContract(bookingId, currentRevision.revisionId, bookingRevision);
      setActionMessage('Đã gửi duyệt hợp đồng thành công. Chờ hai bên phê duyệt.');
      await loadContracts();
      onRefresh();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể gửi duyệt hợp đồng.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentRevision) return;
    setDownloadingPdf(true);
    setError(null);
    try {
      const blob = await contractService.downloadContractPdf(bookingId, currentRevision.revisionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hop-dong-tiec-${bookingId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError('Không thể tải file PDF hợp đồng.');
      }
    } finally {
      setDownloadingPdf(false);
    }
  };

  const managerApproved = currentRevision?.approvals.some((a) => a.party === 'MANAGER');
  const coupleApproved = currentRevision?.approvals.some((a) => a.party === 'COUPLE');

  return (
    <article
      className="proposal-summary"
      style={{
        marginTop: '2rem',
        background: '#ffffff',
        border: '1px solid var(--hy-outline, #eadfd6)',
        borderRadius: 8,
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <div>
          <span className="section-kicker">Pháp lý &amp; Cam kết</span>
          <h3
            style={{ margin: '0.25rem 0', fontSize: '1.25rem', color: 'var(--hy-wine, #7a1f3d)' }}
          >
            Hợp đồng tiệc cưới
          </h3>
        </div>
        {currentRevision ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '0.25rem 0.625rem',
                borderRadius: 9999,
                fontSize: '0.75rem',
                fontWeight: 600,
                background:
                  currentRevision.state === 'APPROVED'
                    ? 'var(--hy-status-success-bg, #e7f1ea)'
                    : currentRevision.state === 'AWAITING_APPROVAL'
                      ? 'var(--hy-status-info-bg, #e6eef2)'
                      : 'var(--hy-status-warning-bg, #fcefd6)',
                color:
                  currentRevision.state === 'APPROVED'
                    ? 'var(--hy-status-success, #2f6b4f)'
                    : currentRevision.state === 'AWAITING_APPROVAL'
                      ? 'var(--hy-status-info, #3f5b6b)'
                      : 'var(--hy-status-warning, #8a5300)',
                border: `1px solid ${
                  currentRevision.state === 'APPROVED'
                    ? 'var(--hy-status-success-border, #bbf7d0)'
                    : currentRevision.state === 'AWAITING_APPROVAL'
                      ? 'var(--hy-status-info-border, #cbd5e1)'
                      : 'var(--hy-status-warning-border, #fde68a)'
                }`,
              }}
            >
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
        <div
          role="status"
          style={{
            background: 'var(--hy-status-success-bg, #e7f1ea)',
            color: 'var(--hy-status-success, #2f6b4f)',
            border: '1px solid var(--hy-status-success-border, #bbf7d0)',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {actionMessage}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            background: 'var(--hy-status-error-bg, #fdecea)',
            color: 'var(--hy-status-error, #c62828)',
            border: '1px solid var(--hy-status-error-border, #fecaca)',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      ) : null}

      {loading && !currentRevision ? (
        <p style={{ color: 'var(--hy-text-muted, #6e5d63)', fontSize: '0.875rem' }}>
          Đang tải hợp đồng…
        </p>
      ) : !currentRevision ? (
        <div
          style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            background: 'var(--hy-surface-container, #fdf6ee)',
            borderRadius: 6,
            border: '1px dashed var(--hy-outline, #eadfd6)',
          }}
        >
          <p style={{ color: 'var(--hy-text-muted, #6e5d63)', margin: 0 }}>
            Tiệc này chưa có bản ghi hợp đồng chính thức.
          </p>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              background: 'var(--hy-surface-container, #fdf6ee)',
              border: '1px solid var(--hy-outline, #eadfd6)',
              padding: '1rem',
              borderRadius: 6,
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <small style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                Cô dâu &amp; Chú rể
              </small>
              <strong>
                {currentRevision.document.brideName || '—'} &amp;{' '}
                {currentRevision.document.groomName || '—'}
              </strong>
            </div>
            <div>
              <small style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                Sảnh &amp; Ngày tiệc
              </small>
              <strong>
                {currentRevision.document.hallName} ({currentRevision.document.eventDate})
              </strong>
            </div>
            <div>
              <small style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                Tổng giá trị hợp đồng
              </small>
              <strong style={{ color: 'var(--hy-wine, #7a1f3d)' }}>
                {formatVnd(currentRevision.document.contractTotalVnd)}
              </strong>
            </div>
            <div>
              <small style={{ color: 'var(--hy-text-muted, #6e5d63)', display: 'block' }}>
                Tiền cọc cam kết (30%)
              </small>
              <strong style={{ color: 'var(--hy-wine-bold, #5c1430)' }}>
                {formatVnd(currentRevision.document.depositAmountVnd)}
              </strong>
            </div>
          </div>

          <ContractLinesTable lines={currentRevision.document.lines} />

          {/* Trạng thái phê duyệt 2 bên */}
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              padding: '0.75rem',
              background: 'var(--hy-surface-container, #fdf6ee)',
              border: '1px solid var(--hy-outline, #eadfd6)',
              borderRadius: 6,
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
            }}
          >
            <div>
              <span>Quản lý (Manager): </span>
              <strong
                style={{
                  color: managerApproved
                    ? 'var(--hy-status-success, #2f6b4f)'
                    : 'var(--hy-status-warning, #8a5300)',
                }}
              >
                {managerApproved ? '✓ Đã phê duyệt' : 'Chưa duyệt'}
              </strong>
            </div>
            <div>
              <span>Cặp đôi (Couple): </span>
              <strong
                style={{
                  color: coupleApproved
                    ? 'var(--hy-status-success, #2f6b4f)'
                    : 'var(--hy-status-warning, #8a5300)',
                }}
              >
                {coupleApproved ? '✓ Đã phê duyệt' : 'Chưa duyệt'}
              </strong>
            </div>
          </div>

          {/* Các nút hành động */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={disabled || downloadingPdf}
              onClick={() => void handleDownloadPdf()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 6,
                border: '1px solid var(--hy-outline, #eadfd6)',
                background: '#ffffff',
                color: 'var(--hy-text, #2b1d22)',
                cursor: disabled || downloadingPdf ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              {downloadingPdf ? 'Đang tải PDF…' : '📄 Tải PDF hợp đồng'}
            </button>

            {currentRevision.state === 'DRAFT' ? (
              <button
                type="button"
                disabled={disabled || loading}
                onClick={() => void handleSubmitDraft()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--hy-wine, #7a1f3d)',
                  color: '#ffffff',
                  cursor: disabled || loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Gửi duyệt hợp đồng
              </button>
            ) : null}

            {currentRevision.state === 'AWAITING_APPROVAL' && !managerApproved ? (
              <button
                type="button"
                disabled={disabled || loading}
                onClick={() => void handleApprove()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--hy-status-success, #2f6b4f)',
                  color: '#ffffff',
                  cursor: disabled || loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
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
