'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import type { FinalInvoicesResponse } from '../../services/billing.service';
import { formatVnd } from '../../lib/formatters';
import { formatDateTime } from '../booking-lifecycle/booking-helpers';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export function FinalInvoicesList({
  finalInvoices,
  onAdjust,
  disabled = false,
}: Readonly<{
  finalInvoices: FinalInvoicesResponse | null;
  onAdjust?: (() => void) | undefined;
  disabled?: boolean;
}>) {
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const revisions = finalInvoices?.revisions ?? [];

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-semibold">Hoá đơn quyết toán cuối ({revisions.length})</h3>

      {revisions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-input p-5 text-center text-xs text-muted-foreground">
          Chưa có hoá đơn cuối nào được chốt cho tiệc này.
        </div>
      ) : (
        <div className="grid gap-3">
          {revisions.map((inv) => {
            const isCurrent = inv.invoiceRevisionId === finalInvoices?.currentRevisionId;
            const isExpanded = expandedInvoiceId === inv.invoiceRevisionId;
            const incidentalLines = inv.document.incidentalLines ?? [];
            return (
              <div
                key={inv.invoiceRevisionId}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-hy-1"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-base font-semibold">
                        Hoá đơn quyết toán · Bản {inv.revisionNumber}
                      </strong>
                      <Badge variant={isCurrent ? 'success' : 'neutral'}>
                        <Lock aria-hidden />
                        {isCurrent ? 'Bản hiện hành · Bất biến' : 'Bản lịch sử · Bất biến'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      Chốt lúc: {formatDateTime(inv.issuedAt)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <small className="text-2xs text-muted-foreground">Tổng tiền quyết toán</small>
                    <strong className="text-lg font-bold text-hy-success tabular-nums">
                      {formatVnd(inv.document.totalVnd)}
                    </strong>
                  </div>
                </div>

                {/* Chi tiết tài chính thành phần */}
                <dl className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 rounded-lg bg-muted px-4 py-3">
                  <div className="flex flex-col">
                    <dt className="text-2xs text-muted-foreground">Thoả thuận thương mại:</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatVnd(inv.document.commercialTotalVnd)}
                    </dd>
                  </div>

                  <div className="flex flex-col">
                    <dt className="text-2xs text-muted-foreground">Chi phí phát sinh đã chốt:</dt>
                    <dd className="font-semibold tabular-nums">
                      {formatVnd(inv.document.incidentalTotalVnd)}
                    </dd>
                    <small className="text-2xs text-muted-foreground">
                      ({incidentalLines.length} khoản)
                    </small>
                  </div>

                  <div className="flex flex-col">
                    <dt className="text-2xs text-muted-foreground">Điều chỉnh được ghi nhận:</dt>
                    <dd className="font-semibold text-primary">
                      {inv.document.adjustments.length} lần
                    </dd>
                  </div>
                </dl>

                <details className="text-xs">
                  <summary className="cursor-pointer">Thông tin đối chiếu hóa đơn</summary>
                  <p>{inv.invoiceNumber}</p>
                </details>
                {isCurrent && onAdjust ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                    disabled={disabled}
                    onClick={onAdjust}
                  >
                    Lập điều chỉnh hóa đơn
                  </Button>
                ) : null}
                {inv.document.adjustments.map((adjustment) => (
                  <details
                    key={adjustment.id}
                    className="rounded-lg border border-border p-3 text-xs"
                  >
                    <summary className="cursor-pointer font-semibold">
                      Điều chỉnh {formatDateTime(adjustment.occurredAt)} ·{' '}
                      {adjustment.deltaVnd >= 0 ? '+' : ''}
                      {formatVnd(adjustment.deltaVnd)}
                    </summary>
                    <p className="mt-2">{adjustment.reason}</p>
                    {adjustment.lines.map((line) => (
                      <p key={line.id}>
                        {line.kind === 'DEBIT' ? 'Tăng' : 'Giảm'}: {line.name} · {line.quantity}{' '}
                        {line.unit} × {formatVnd(line.unitPriceVnd)} = {formatVnd(line.totalVnd)}
                      </p>
                    ))}
                  </details>
                ))}
                {/* Xem chi tiết phát sinh trong hoá đơn nếu có */}
                {incidentalLines.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto self-start px-0"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        setExpandedInvoiceId(isExpanded ? null : inv.invoiceRevisionId)
                      }
                    >
                      {isExpanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
                      {isExpanded
                        ? 'Thu gọn danh sách phát sinh đã chốt'
                        : `Xem chi tiết ${incidentalLines.length} khoản phát sinh đã chốt`}
                    </Button>

                    {isExpanded ? (
                      <div
                        className="overflow-x-auto focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        tabIndex={0}
                        role="region"
                        aria-label="Chi tiết hoá đơn"
                      >
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="px-2 py-1.5 font-semibold">Hạng mục</th>
                              <th className="px-2 py-1.5 font-semibold">Số lượng</th>
                              <th className="px-2 py-1.5 font-semibold">Đơn vị</th>
                              <th className="px-2 py-1.5 text-right font-semibold">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody>
                            {incidentalLines.map((line, idx) => (
                              <tr key={line.id ?? `line-${idx}`} className="border-t border-border">
                                <td className="px-2 py-1.5 font-medium">{line.name}</td>
                                <td className="px-2 py-1.5 tabular-nums">{line.quantity}</td>
                                <td className="px-2 py-1.5">{line.unit}</td>
                                <td className="px-2 py-1.5 text-right font-semibold tabular-nums">
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
