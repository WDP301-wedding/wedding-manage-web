'use client';

import { useState } from 'react';
import type { FinalInvoicesResponse } from '../../services/billing.service';
import { formatVnd } from '../../lib/formatters';

export function FinalInvoicesList({
  finalInvoices,
}: Readonly<{
  finalInvoices: FinalInvoicesResponse | null;
}>) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const revisions = finalInvoices?.revisions ?? [];

  return (
    <div style={{ marginTop: '2rem' }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.05rem',
          fontWeight: 600,
          color: 'var(--hy-ink)',
          marginBottom: '0.75rem',
          lineHeight: 1.3,
        }}
      >
        Hoá đơn quyết toán cuối ({revisions.length})
      </h3>

      {revisions.length === 0 ? (
        <div
          style={{
            color: 'var(--hy-ink-muted)',
            fontSize: '0.875rem',
            padding: '1.25rem',
            background: 'var(--hy-surface-warm)',
            borderRadius: 'var(--hy-radius-sm)',
            border: '1px dashed var(--hy-outline)',
            textAlign: 'center',
          }}
        >
          Chưa có hoá đơn cuối nào được chốt cho tiệc này.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {revisions.map((inv) => {
            const isExpanded = expandedInvoiceId === inv.invoiceRevisionId;
            const incidentalLines = inv.document.incidentalLines ?? [];
            return (
              <div
                key={inv.invoiceRevisionId}
                style={{
                  background: 'var(--hy-surface)',
                  padding: '1.25rem',
                  borderRadius: 'var(--hy-radius-md)',
                  border: '1px solid var(--hy-outline)',
                  boxShadow: 'var(--hy-shadow-1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--hy-ink)' }}>
                        Hoá đơn {inv.invoiceNumber} · Bản {inv.revisionNumber}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--hy-success)',
                          background: 'var(--hy-success-bg)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          border: '1px solid var(--hy-success)',
                        }}
                      >
                        ✓ Bất biến &amp; Đã khoá sổ
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--hy-ink-muted)',
                        marginTop: '4px',
                      }}
                    >
                      Chốt lúc: {new Date(inv.issuedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <small style={{ fontSize: '0.75rem', color: 'var(--hy-ink-muted)', display: 'block' }}>
                      Tổng tiền quyết toán
                    </small>
                    <strong
                      style={{
                        fontSize: '1.25rem',
                        color: 'var(--hy-success)',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      {formatVnd(inv.document.totalVnd)}
                    </strong>
                  </div>
                </div>

                {/* Chi tiết tài chính thành phần */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                    background: 'var(--hy-surface-warm)',
                    padding: '0.75rem 1rem',
                    borderRadius: 6,
                    marginTop: '1rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--hy-ink-muted)', display: 'block' }}>
                      Thoả thuận thương mại:
                    </span>
                    <strong>{formatVnd(inv.document.commercialTotalVnd)}</strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--hy-ink-muted)', display: 'block' }}>
                      Chi phí phát sinh đã chốt:
                    </span>
                    <strong>{formatVnd(inv.document.incidentalTotalVnd)}</strong>
                    <small style={{ color: 'var(--hy-ink-muted)', display: 'block' }}>
                      ({incidentalLines.length} khoản)
                    </small>
                  </div>

                  <div>
                    <span style={{ color: 'var(--hy-ink-muted)', display: 'block' }}>
                      Số dư công nợ:
                    </span>
                    <strong style={{ color: 'var(--hy-wine)' }}>
                      Căn cứ tất toán cuối cùng
                    </strong>
                  </div>
                </div>

                {/* Xem chi tiết phát sinh trong hoá đơn nếu có */}
                {incidentalLines.length > 0 ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedInvoiceId(isExpanded ? null : inv.invoiceRevisionId)
                      }
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--hy-wine)',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      {isExpanded
                        ? '▲ Thu gọn danh sách phát sinh đã chốt'
                        : `▼ Xem chi tiết ${incidentalLines.length} khoản phát sinh đã chốt`}
                    </button>

                    {isExpanded ? (
                      <div
                        style={{
                          marginTop: '0.5rem',
                          borderTop: '1px solid var(--hy-outline)',
                          paddingTop: '0.5rem',
                        }}
                      >
                        <table style={{ width: '100%', fontSize: '0.825rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--hy-ink-muted)' }}>
                              <th style={{ padding: '4px 6px' }}>Hạng mục</th>
                              <th style={{ padding: '4px 6px' }}>Số lượng</th>
                              <th style={{ padding: '4px 6px' }}>Đơn vị</th>
                              <th style={{ padding: '4px 6px', textAlign: 'right' }}>Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {incidentalLines.map((line, idx) => (
                              <tr
                                key={line.id ?? `line-${idx}`}
                                style={{ borderTop: '1px dashed var(--hy-outline)' }}
                              >
                                <td style={{ padding: '4px 6px', fontWeight: 500 }}>{line.name}</td>
                                <td style={{ padding: '4px 6px' }}>{line.quantity}</td>
                                <td style={{ padding: '4px 6px' }}>{line.unit}</td>
                                <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>
                                  {formatVnd(line.totalVnd)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
