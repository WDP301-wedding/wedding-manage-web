'use client';

import { useEffect, useState } from 'react';
import {
  contractService,
  type ContractListData,
  type ContractRevisionItem,
} from '../../services/contract.service';
import { ApiServiceError } from '../../lib/api/axios-client';

function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ`;
}

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
        background: '#fff',
        border: '1px solid #e5e7eb',
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
          <h3 style={{ margin: '0.25rem 0', fontSize: '1.25rem' }}>Hợp đồng tiệc cưới</h3>
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
                    ? '#d1fae5'
                    : currentRevision.state === 'AWAITING_APPROVAL'
                      ? '#dbeafe'
                      : '#fef3c7',
                color:
                  currentRevision.state === 'APPROVED'
                    ? '#065f46'
                    : currentRevision.state === 'AWAITING_APPROVAL'
                      ? '#1e40af'
                      : '#92400e',
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
            <small style={{ color: '#6b7280' }}>REV {currentRevision.revisionNumber}</small>
          </div>
        ) : null}
      </div>

      {actionMessage ? (
        <div
          role="status"
          style={{
            background: '#ecfdf5',
            color: '#065f46',
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
            background: '#fef2f2',
            color: '#991b1b',
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
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Đang tải hợp đồng…</p>
      ) : !currentRevision ? (
        <div
          style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            background: '#f9fafb',
            borderRadius: 6,
          }}
        >
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
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
              background: '#f9fafb',
              padding: '1rem',
              borderRadius: 6,
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <small style={{ color: '#6b7280', display: 'block' }}>Cô dâu &amp; Chú rể</small>
              <strong>
                {currentRevision.document.brideName || '—'} &amp;{' '}
                {currentRevision.document.groomName || '—'}
              </strong>
            </div>
            <div>
              <small style={{ color: '#6b7280', display: 'block' }}>Sảnh &amp; Ngày tiệc</small>
              <strong>
                {currentRevision.document.hallName} ({currentRevision.document.eventDate})
              </strong>
            </div>
            <div>
              <small style={{ color: '#6b7280', display: 'block' }}>Tổng giá trị hợp đồng</small>
              <strong style={{ color: '#111827' }}>
                {formatVnd(currentRevision.document.contractTotalVnd)}
              </strong>
            </div>
            <div>
              <small style={{ color: '#6b7280', display: 'block' }}>Tiền cọc cam kết (30%)</small>
              <strong style={{ color: '#2563eb' }}>
                {formatVnd(currentRevision.document.depositAmountVnd)}
              </strong>
            </div>
          </div>

          {/* Dòng dịch vụ cam kết */}
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Chi tiết dịch vụ trong hợp đồng ({currentRevision.document.lines.length})
          </h4>
          <div className="table-scroll" style={{ marginBottom: '1.25rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr
                  style={{
                    background: '#f3f4f6',
                    textAlign: 'left',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  <th style={{ padding: '0.5rem' }}>Phân loại</th>
                  <th style={{ padding: '0.5rem' }}>Hạng mục</th>
                  <th style={{ padding: '0.5rem' }}>Số lượng</th>
                  <th style={{ padding: '0.5rem' }}>Đơn giá</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {currentRevision.document.lines.map((line, idx) => (
                  <tr key={`${line.sourceId}-${idx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600 }}>{line.category}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <strong>{line.name}</strong>
                      {line.description ? (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {line.description}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '0.5rem' }}>
                      {line.quantity} {line.unit}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{formatVnd(line.unitPriceVnd)}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 600 }}>
                      {formatVnd(line.lineTotalVnd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Trạng thái phê duyệt 2 bên */}
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              padding: '0.75rem',
              background: '#f9fafb',
              borderRadius: 6,
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
            }}
          >
            <div>
              <span>Quản lý (Manager): </span>
              <strong style={{ color: managerApproved ? '#16a34a' : '#ea580c' }}>
                {managerApproved ? '✓ Đã phê duyệt' : 'Chưa duyệt'}
              </strong>
            </div>
            <div>
              <span>Cặp đôi (Couple): </span>
              <strong style={{ color: coupleApproved ? '#16a34a' : '#ea580c' }}>
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
                border: '1px solid #d1d5db',
                background: '#fff',
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
                  background: '#2563eb',
                  color: '#fff',
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
                  background: '#16a34a',
                  color: '#fff',
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
