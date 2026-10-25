'use client';

import type { ContractRevisionItem } from '../../services/contract.service';
import { formatVnd } from '../../lib/formatters';

export interface ContractLinesTableProps {
  lines: readonly {
    readonly category: 'MENU' | 'PRINT' | 'SERVICE';
    readonly name: string;
    readonly quantity: number;
    readonly unit: string;
    readonly unitPriceVnd: number;
    readonly lineTotalVnd: number;
    readonly description?: string | null;
    readonly note?: string | null;
    readonly sourceId?: string;
  }[];
  title?: string;
}

export function ContractLinesTable({ lines, title }: Readonly<ContractLinesTableProps>) {
  return (
    <div>
      <h4 style={{ fontSize: '0.95rem', color: 'var(--hy-wine, #7a1f3d)', marginBottom: '0.5rem' }}>
        {title ?? `Chi tiết dịch vụ trong hợp đồng (${lines.length})`}
      </h4>
      <div className="table-scroll" style={{ marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr
              style={{
                background: 'var(--hy-surface-container, #fdf6ee)',
                textAlign: 'left',
                borderBottom: '1px solid var(--hy-outline, #eadfd6)',
              }}
            >
              <th style={{ padding: '0.5rem', color: 'var(--hy-text, #2b1d22)' }}>Phân loại</th>
              <th style={{ padding: '0.5rem', color: 'var(--hy-text, #2b1d22)' }}>Hạng mục</th>
              <th style={{ padding: '0.5rem', color: 'var(--hy-text, #2b1d22)' }}>Số lượng</th>
              <th style={{ padding: '0.5rem', color: 'var(--hy-text, #2b1d22)' }}>Đơn giá</th>
              <th
                style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--hy-text, #2b1d22)' }}
              >
                Thành tiền
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr
                key={`${line.sourceId}-${idx}`}
                style={{ borderBottom: '1px solid var(--hy-outline, #eadfd6)' }}
              >
                <td style={{ padding: '0.5rem', fontWeight: 600 }}>{line.category}</td>
                <td style={{ padding: '0.5rem' }}>
                  <strong>{line.name}</strong>
                  {line.description || line.note ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--hy-text-muted, #6e5d63)' }}>
                      {line.description || line.note}
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
    </div>
  );
}
