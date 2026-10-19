'use client';

import type { IncidentalExpensesResponse } from '../../services/billing.service';
import { formatVnd } from '../../lib/formatters';

export function IncidentalTable({
  incidentals,
  disabled = false,
  loading = false,
  onDeleteLine,
}: Readonly<{
  incidentals: IncidentalExpensesResponse | null;
  disabled?: boolean;
  loading?: boolean;
  onDeleteLine: (lineId: string) => Promise<void>;
}>) {
  if (!incidentals || incidentals.lines.length === 0) {
    return (
      <div
        style={{
          color: 'var(--hy-ink-muted)',
          fontSize: '0.875rem',
          padding: '1.5rem',
          background: 'var(--hy-surface-warm)',
          borderRadius: 'var(--hy-radius-sm)',
          textAlign: 'center',
          border: '1px dashed var(--hy-outline)',
        }}
      >
        Chưa có dòng chi phí phát sinh nào được ghi nhận cho tiệc này.
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
          background: 'var(--hy-surface)',
          borderRadius: 'var(--hy-radius-sm)',
          overflow: 'hidden',
          border: '1px solid var(--hy-outline)',
        }}
      >
        <thead>
          <tr
            style={{
              background: 'var(--hy-surface-container)',
              textAlign: 'left',
              borderBottom: '1px solid var(--hy-outline)',
            }}
          >
            <th style={{ padding: '0.75rem 1rem', color: 'var(--hy-ink-muted)', fontWeight: 600 }}>
              Hạng mục
            </th>
            <th style={{ padding: '0.75rem 1rem', color: 'var(--hy-ink-muted)', fontWeight: 600 }}>
              Ghi chú
            </th>
            <th style={{ padding: '0.75rem 1rem', color: 'var(--hy-ink-muted)', fontWeight: 600 }}>
              Số lượng
            </th>
            <th style={{ padding: '0.75rem 1rem', color: 'var(--hy-ink-muted)', fontWeight: 600 }}>
              Đơn giá
            </th>
            <th
              style={{
                padding: '0.75rem 1rem',
                textAlign: 'right',
                color: 'var(--hy-ink-muted)',
                fontWeight: 600,
              }}
            >
              Thành tiền
            </th>
            <th
              style={{
                padding: '0.75rem 1rem',
                textAlign: 'center',
                color: 'var(--hy-ink-muted)',
                fontWeight: 600,
              }}
            >
              Xoá
            </th>
          </tr>
        </thead>
        <tbody>
          {incidentals.lines.map((line) => (
            <tr
              key={line.id}
              style={{
                borderBottom: '1px solid var(--hy-outline)',
                transition: 'background-color 150ms ease',
              }}
            >
              <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--hy-ink)' }}>
                {line.name}
              </td>
              <td style={{ padding: '0.75rem 1rem', color: 'var(--hy-ink-muted)' }}>
                {line.note || '—'}
              </td>
              <td style={{ padding: '0.75rem 1rem' }}>
                {line.quantity} {line.unit}
              </td>
              <td style={{ padding: '0.75rem 1rem' }}>{formatVnd(line.unitPriceVnd)}</td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: 'var(--hy-wine)',
                }}
              >
                {formatVnd(line.totalVnd)}
              </td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  disabled={disabled || loading}
                  onClick={() => void onDeleteLine(line.id)}
                  aria-label={`Xoá ${line.name}`}
                  title={`Xoá ${line.name}`}
                  style={{
                    color: 'var(--hy-error)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '4px 8px',
                    borderRadius: '4px',
                  }}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
