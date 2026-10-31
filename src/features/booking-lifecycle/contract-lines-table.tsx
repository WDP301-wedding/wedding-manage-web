'use client';

import { Check } from 'lucide-react';
import { cn } from 'cn';
import { formatVnd } from '../../lib/formatters';
import { Badge } from '../../components/ui/badge';

export const categoryLabels = { MENU: 'Thực đơn', SERVICE: 'Dịch vụ', PRINT: 'Thiệp in' } as const;
const categoryTones = { MENU: 'warning', SERVICE: 'info', PRINT: 'brand' } as const;

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

const cellClass = 'px-3 py-2 align-top';

export function ContractLinesTable({ lines, title }: Readonly<ContractLinesTableProps>) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="font-semibold">
        {title ?? `Chi tiết dịch vụ trong hợp đồng (${lines.length})`}
      </h4>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead className="bg-muted text-xs">
            <tr>
              <th className={cn(cellClass, 'font-semibold')}>Phân loại</th>
              <th className={cn(cellClass, 'font-semibold')}>Hạng mục</th>
              <th className={cn(cellClass, 'font-semibold')}>Số lượng</th>
              <th className={cn(cellClass, 'font-semibold')}>Đơn giá</th>
              <th className={cn(cellClass, 'text-right font-semibold')}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={`${line.sourceId}-${idx}`} className="border-t border-border">
                <td className={cellClass}>
                  <Badge variant={categoryTones[line.category]}>
                    {categoryLabels[line.category]}
                  </Badge>
                </td>
                <td className={cellClass}>
                  <strong className="font-semibold">{line.name}</strong>
                  {line.description || line.note ? (
                    <div className="text-xs text-muted-foreground">
                      {line.description || line.note}
                    </div>
                  ) : null}
                </td>
                <td className={cn(cellClass, 'tabular-nums')}>
                  {line.quantity} {line.unit}
                </td>
                <td className={cn(cellClass, 'tabular-nums')}>{formatVnd(line.unitPriceVnd)}</td>
                <td className={cn(cellClass, 'text-right font-semibold tabular-nums')}>
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

/** Trạng thái duyệt của hai bên, dùng chung cho hợp đồng và phụ lục. */
export function ApprovalStatus({
  managerApproved,
  coupleApproved,
}: Readonly<{ managerApproved: boolean; coupleApproved: boolean }>) {
  const pill = (party: string, approved: boolean) => (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
        approved ? 'bg-hy-success-bg text-hy-success' : 'bg-secondary',
      )}
    >
      <span>{party}</span>
      <strong
        className={cn(
          'inline-flex items-center gap-1 font-semibold',
          approved ? undefined : 'text-muted-foreground',
        )}
      >
        {approved ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : null}
        {approved ? 'Đã phê duyệt' : 'Chưa duyệt'}
      </strong>
    </span>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {pill('Quản lý', managerApproved)}
      {pill('Cặp đôi', coupleApproved)}
    </div>
  );
}
