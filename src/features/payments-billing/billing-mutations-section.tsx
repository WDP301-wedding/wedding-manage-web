'use client';

import { useEffect, useState } from 'react';
import type { BillingView, ManualPaymentBody, RefundBody, RefundApprovalBody } from './billing-api';
import { ManualPaymentForm, RefundForm, type CommandOutcome } from './payment-forms';
import { RefundApprovalForm } from './refund-approval-form';

export interface BillingMutationsSectionProps {
  view: BillingView;
  pending: boolean;
  uncertain: 'manual' | 'refund' | 'approval' | null;
  refundRevision: number | null;
  approvalRevision: number | null;
  onMutate: (
    kind: 'manual' | 'refund' | 'approval',
    body: ManualPaymentBody | RefundBody | RefundApprovalBody,
  ) => Promise<CommandOutcome>;
}

const tabClass =
  'inline-flex h-10 items-center justify-center rounded-md text-xs font-semibold text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-hy-1';

export function BillingMutationsSection({
  view,
  pending,
  uncertain,
  refundRevision,
  approvalRevision,
  onMutate,
}: Readonly<BillingMutationsSectionProps>) {
  const [activeTab, setActiveTab] = useState<'manual' | 'refund' | 'approval'>('manual');

  useEffect(() => {
    if (uncertain) {
      setActiveTab(uncertain);
    } else if (approvalRevision !== null) {
      setActiveTab('approval');
    } else if (refundRevision !== null) {
      setActiveTab('refund');
    }
  }, [uncertain, approvalRevision, refundRevision]);

  // Tab ẩn bằng class (không dùng thuộc tính hidden) để giữ hành vi cũ.
  const pane = (tab: typeof activeTab) =>
    activeTab === tab ? 'block motion-safe:animate-in motion-safe:fade-in-0' : 'hidden';

  return (
    <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-hy-1">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">Thao tác nghiệp vụ thanh toán</h2>
        <p className="text-xs text-muted-foreground">
          Chọn nghiệp vụ thu tiền, hoàn tiền hoặc phê duyệt theo chứng từ.
        </p>
      </div>

      <div
        className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1"
        role="tablist"
        aria-label="Nghiệp vụ thanh toán"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'manual'}
          className={tabClass}
          onClick={() => setActiveTab('manual')}
        >
          Thu tiền
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'refund'}
          className={tabClass}
          onClick={() => setActiveTab('refund')}
        >
          Hoàn tiền
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'approval'}
          className={tabClass}
          onClick={() => setActiveTab('approval')}
        >
          Duyệt hoàn
        </button>
      </div>

      <div className={pane('manual')}>
        <ManualPaymentForm
          key={`manual:${view.bookingId}`}
          bookingId={view.bookingId}
          disabled={pending || (uncertain !== null && uncertain !== 'manual')}
          onConfirm={(body) => onMutate('manual', body)}
        />
      </div>

      <div className={pane('refund')}>
        <RefundForm
          key={`refund:${view.bookingId}`}
          booking={refundRevision === null ? view : { ...view, billingRevision: refundRevision }}
          disabled={pending || (uncertain !== null && uncertain !== 'refund')}
          onConfirm={(body) => onMutate('refund', body)}
        />
      </div>

      <div className={pane('approval')}>
        <RefundApprovalForm
          key={`approval:${view.bookingId}`}
          booking={
            approvalRevision === null ? view : { ...view, billingRevision: approvalRevision }
          }
          disabled={pending || (uncertain !== null && uncertain !== 'approval')}
          onConfirm={(body) => onMutate('approval', body)}
        />
      </div>
    </div>
  );
}
