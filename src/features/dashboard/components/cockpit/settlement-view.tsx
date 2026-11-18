'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Printer } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import type { NavigationBooking } from '@/src/services/bookings/booking-navigation.service';
import { billingService, type BookingBilling } from '@/src/services/billing/billing.service';
import {
  contractService,
  type ContractRevisionItem,
} from '@/src/services/bookings/contract.service';
import {
  categoryLabels,
  lineDescription,
} from '@/src/features/booking-lifecycle/components/contracts/contract-lines-table';
import { formatDateTime } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import {
  formatUnitLabel,
  formatVnd,
  formatVndNullable,
} from '@/src/lib/formatting/formatters';

const entryKindLabels: Record<string, string> = {
  CHARGE: 'Khoản phải thu',
  PAYMENT: 'Thanh toán đã ghi nhận',
  REFUND: 'Hoàn tiền',
  CREDIT_ADJUSTMENT: 'Điều chỉnh giảm',
};

export function RealSettlementView({
  booking,
}: Readonly<{
  booking: NavigationBooking;
}>) {
  const [billing, setBilling] = useState<BookingBilling | null>(null);
  const [contract, setContract] = useState<ContractRevisionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.allSettled([
      billingService.getBillingSummary(booking.bookingId),
      contractService.getContracts(booking.bookingId),
    ])
      .then(([billingRes, contractRes]) => {
        if (!active) return;
        if (billingRes.status === 'fulfilled') {
          setBilling(billingRes.value);
        } else {
          setBilling(null);
          setError('Không thể tải dữ liệu sổ cái thanh toán từ máy chủ.');
        }

        if (contractRes.status === 'fulfilled') {
          const revisions = contractRes.value.revisions;
          const approved = revisions.find((r) => r.state === 'APPROVED');
          setContract(approved ?? revisions[0] ?? null);
        } else {
          setContract(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [booking.bookingId]);

  const coupleName =
    [booking.groomName, booking.brideName].filter(Boolean).join(' & ') ||
    booking.customerName ||
    booking.alias ||
    'Hồ sơ tiệc';
  const contractCode = booking.bookingCode || booking.bookingId.slice(0, 8);
  const hallName = booking.hallNameSnapshot || 'Chưa gán sảnh';

  const overview = billing?.financialOverview;
  const settlement = overview?.settlementSummary;
  const totals = billing?.totals;

  const totalChargeVnd =
    settlement?.payableVnd ??
    overview?.totalVnd ??
    totals?.acceptedChargesVnd ??
    contract?.document.contractTotalVnd ??
    null;
  const netPaidVnd = settlement?.netReceivedVnd ?? totals?.netPaidVnd ?? null;
  const outstandingVnd = settlement?.outstandingVnd ?? totals?.outstandingVnd ?? null;
  const creditVnd = settlement?.creditVnd ?? totals?.creditVnd ?? 0;

  const contractLines = contract?.document.lines ?? [];
  const paymentEntries = (billing?.history ?? []).filter(
    (entry) =>
      entry.kind === 'PAYMENT' ||
      entry.kind === 'REFUND' ||
      entry.kind === 'CREDIT_ADJUSTMENT',
  );

  if (loading) {
    return (
      <div className="settlement-cockpit-grid" aria-busy="true">
        <div className="settlement-folio-card flex flex-col gap-4">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-44 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="vietqr-folio-card flex flex-col gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="settlement-cockpit-grid">
      {/* Left: Real Contract & Folio Summary */}
      <div className="settlement-folio-card">
        <div className="folio-header-bar">
          <div>
            <span className="strip-sub-code">Chi Tiết Hợp Đồng &amp; Nghĩa Vụ Tài Chính</span>
            <h2
              style={{
                fontSize: '17.5px',
                fontWeight: 700,
                color: 'var(--ck-text-main)',
                marginTop: '3px',
              }}
            >
              Hôn Lễ: {coupleName}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mã hồ sơ: #{contractCode} · {hallName}
              {contract ? ` · Hợp đồng phiên bản #${contract.revisionNumber}` : ''}
            </p>
          </div>

          <button
            type="button"
            className="btn-action btn-action-secondary"
            onClick={() => {
              if (typeof window !== 'undefined') window.print();
            }}
          >
            <Printer className="size-3.5" />
            In Bảng Kê
          </button>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-hy-error-bg px-4 py-3 text-xs text-hy-error">
            {error}
          </p>
        ) : null}

        {contractLines.length > 0 ? (
          <table className="folio-line-table">
            <thead>
              <tr>
                <th>Hạng Mục Hợp Đồng</th>
                <th>Số Lượng</th>
                <th style={{ textAlign: 'right' }}>Đơn Giá</th>
                <th style={{ textAlign: 'right' }}>Thành Tiền</th>
              </tr>
            </thead>
            <tbody>
              {contractLines.map((line, index) => (
                <tr key={`${line.sourceId}-${index}`}>
                  <td>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="neutral">{categoryLabels[line.category]}</Badge>
                      <strong>{line.name}</strong>
                    </div>
                    {line.description ? (
                      <small className="mt-0.5 block text-2xs text-muted-foreground">
                        {lineDescription(line.description)}
                      </small>
                    ) : null}
                  </td>
                  <td className="tabular-nums">
                    {line.quantity.toLocaleString('vi-VN')} {formatUnitLabel(line.unit)}
                  </td>
                  <td style={{ textAlign: 'right' }} className="tabular-nums">
                    {formatVnd(line.unitPriceVnd)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                    {formatVnd(line.lineTotalVnd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              Chưa có chi tiết dòng hợp đồng cho hồ sơ này
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Khi hợp đồng được lập hoặc phê duyệt trong hồ sơ đặt tiệc, các hạng mục thực tế sẽ
              hiển thị tại đây.
            </p>
          </div>
        )}

        {/* Real Financial Totals */}
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tổng nghĩa vụ phải thu</span>
            <strong className="tabular-nums text-foreground">
              {formatVndNullable(totalChargeVnd)}
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Đã thu ròng (trừ hoàn tiền)</span>
            <strong className="tabular-nums text-hy-success">
              {formatVndNullable(netPaidVnd)}
            </strong>
          </div>
          {creditVnd > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tiền thu thừa (dư có)</span>
              <strong className="tabular-nums text-foreground">{formatVnd(creditVnd)}</strong>
            </div>
          ) : null}
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2.5">
            <span className="font-semibold text-foreground">Còn phải thu</span>
            <strong className="text-base font-bold tabular-nums text-primary">
              {formatVndNullable(outstandingVnd)}
            </strong>
          </div>
        </div>
      </div>

      {/* Right: Real Ledger History & Billing Action */}
      <div className="vietqr-folio-card" style={{ alignItems: 'stretch', textAlign: 'left' }}>
        <div>
          <span className="strip-sub-code" style={{ color: 'var(--ck-brand-wine)' }}>
            Sổ Cái Thanh Toán Thực Tế
          </span>
          <h3
            style={{
              fontSize: '15.5px',
              fontWeight: 700,
              color: 'var(--ck-text-main)',
              marginTop: '4px',
            }}
          >
            Lịch Sử Thu · Hoàn Tiền ({paymentEntries.length})
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Dữ liệu đối soát trực tiếp từ hệ thống thanh toán
          </p>
        </div>

        <div className="spec-items-list w-full rounded-lg border border-border bg-muted/30 p-3.5">
          <div className="spec-line">
            <span className="spec-label">Cọc yêu cầu:</span>
            <span className="spec-val tabular-nums">
              {formatVndNullable(overview?.requiredDepositVnd ?? contract?.document.depositAmountVnd ?? null)}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Đã nhận cọc:</span>
            <span className="spec-val tabular-nums text-hy-success">
              {overview ? formatVnd(overview.depositReceivedVnd) : '—'}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Đã hoàn tiền:</span>
            <span className="spec-val tabular-nums">
              {totals ? formatVnd(totals.refundedVnd) : '—'}
            </span>
          </div>
          <div className="spec-line">
            <span className="spec-label">Còn phải thu:</span>
            <span className="spec-val tabular-nums" style={{ color: 'var(--ck-brand-wine)' }}>
              {formatVndNullable(outstandingVnd)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {paymentEntries.length > 0 ? (
            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {paymentEntries.slice(0, 8).map((entry) => (
                <li
                  key={entry.ledgerEntryId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <span className="block font-semibold text-foreground">
                      {entryKindLabels[entry.kind] ?? entry.kind}
                    </span>
                    <span className="block text-2xs text-muted-foreground tabular-nums">
                      {formatDateTime(entry.occurredAt)}
                    </span>
                  </div>
                  <strong className="shrink-0 tabular-nums text-foreground">
                    {formatVnd(entry.amountVnd)}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
              Chưa có giao dịch thu hoặc hoàn tiền nào được ghi nhận.
            </p>
          )}
        </div>

        <Link
          href={`/finance?tab=payments&bookingId=${encodeURIComponent(booking.bookingId)}`}
          className="btn-action btn-action-primary w-full justify-center no-underline"
        >
          Mở Sổ Thanh Toán &amp; Ghi Nhận Thu
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
