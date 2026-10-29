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

  return (
    <div className="billing-mutations-wrapper">
      <div className="billing-mutations-header">
        <h2>Thao tác nghiệp vụ thanh toán</h2>
        <p>Chọn nghiệp vụ thu tiền, hoàn tiền hoặc phê duyệt theo chứng từ.</p>
      </div>

      <div className="billing-tabs-nav" role="tablist" aria-label="Nghiệp vụ thanh toán">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'manual'}
          className={`billing-tab-btn ${activeTab === 'manual' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          💵 Thu tiền
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'refund'}
          className={`billing-tab-btn ${activeTab === 'refund' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('refund')}
        >
          ↩️ Hoàn tiền
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'approval'}
          className={`billing-tab-btn ${activeTab === 'approval' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('approval')}
        >
          ⚖️ Duyệt hoàn
        </button>
      </div>

      <div className={`billing-tab-pane ${activeTab === 'manual' ? 'is-active' : ''}`}>
        <ManualPaymentForm
          key={`manual:${view.bookingId}`}
          bookingId={view.bookingId}
          disabled={pending || (uncertain !== null && uncertain !== 'manual')}
          onConfirm={(body) => onMutate('manual', body)}
        />
      </div>

      <div className={`billing-tab-pane ${activeTab === 'refund' ? 'is-active' : ''}`}>
        <RefundForm
          key={`refund:${view.bookingId}`}
          booking={refundRevision === null ? view : { ...view, billingRevision: refundRevision }}
          disabled={pending || (uncertain !== null && uncertain !== 'refund')}
          onConfirm={(body) => onMutate('refund', body)}
        />
      </div>

      <div className={`billing-tab-pane ${activeTab === 'approval' ? 'is-active' : ''}`}>
        <RefundApprovalForm
          key={`approval:${view.bookingId}`}
          booking={approvalRevision === null ? view : { ...view, billingRevision: approvalRevision }}
          disabled={pending || (uncertain !== null && uncertain !== 'approval')}
          onConfirm={(body) => onMutate('approval', body)}
        />
      </div>
    </div>
  );
}
