'use client';

import type { FinalInvoicesResponse } from '../../services/billing.service';
import { formatVnd } from '../../lib/formatters';

export function FinalInvoicesList({
  finalInvoices,
}: Readonly<{
  finalInvoices: FinalInvoicesResponse | null;
}>) {
  return (
    <div style={{ marginTop: '2rem' }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.05rem',
          fontWeight: 600,
          color: 'var(--hy-ink)',
          marginBottom: '0.75rem',
        }}
      >
        Hoá đơn quyết toán cuối ({finalInvoices?.revisions?.length ?? 0})
      </h3>

      {!finalInvoices || finalInvoices.revisions.length === 0 ? (
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
          {finalInvoices.revisions.map((inv) => (
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
                  <strong style={{ fontSize: '1rem', color: 'var(--hy-ink)' }}>
                    Hoá đơn {inv.invoiceNumber} · Bản {inv.revisionNumber}
                  </strong>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--hy-ink-muted)',
                      marginTop: '2px',
                    }}
                  >
                    Chốt lúc: {new Date(inv.issuedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <strong
                  style={{
                    fontSize: '1.2rem',
                    color: 'var(--hy-success)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {formatVnd(inv.document.totalVnd)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
