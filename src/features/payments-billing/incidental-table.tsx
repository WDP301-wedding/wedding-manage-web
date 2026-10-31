'use client';

import { Trash2 } from 'lucide-react';
import type { IncidentalExpensesResponse } from '../../services/billing.service';
import { formatVnd } from '../../lib/formatters';
import { Button } from '../../components/ui/button';

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
      <div className="rounded-lg border border-dashed border-input p-6 text-center text-xs text-muted-foreground">
        Chưa có dòng chi phí phát sinh nào được ghi nhận cho tiệc này.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] border-collapse text-left">
        <thead className="bg-muted text-xs">
          <tr>
            <th className="px-3 py-2 font-semibold">Hạng mục</th>
            <th className="px-3 py-2 font-semibold">Số lượng</th>
            <th className="px-3 py-2 font-semibold">Đơn giá</th>
            <th className="px-3 py-2 text-right font-semibold">Thành tiền</th>
            <th className="px-3 py-2 text-center font-semibold">Xoá</th>
          </tr>
        </thead>
        <tbody>
          {incidentals.lines.map((line) => (
            <tr key={line.id} className="border-t border-border align-top">
              <td className="px-3 py-2">
                <strong className="block font-semibold">{line.name}</strong>
                <small className="text-2xs text-muted-foreground">
                  <span className="sr-only">Ghi chú: </span>
                  {line.note || '—'}
                </small>
              </td>
              <td className="px-3 py-2 tabular-nums">
                {line.quantity} {line.unit}
              </td>
              <td className="px-3 py-2 tabular-nums">{formatVnd(line.unitPriceVnd)}</td>
              <td className="px-3 py-2 text-right font-semibold text-primary tabular-nums">
                {formatVnd(line.totalVnd)}
              </td>
              <td className="px-3 py-1.5 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-hy-error hover:bg-hy-error-bg"
                  disabled={disabled || loading}
                  onClick={() => void onDeleteLine(line.id)}
                  aria-label={`Xoá ${line.name}`}
                  title={`Xoá ${line.name}`}
                >
                  <Trash2 aria-hidden />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
