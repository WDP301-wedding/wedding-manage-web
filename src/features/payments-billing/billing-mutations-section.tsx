'use client';

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
  return (
    <div className="billing-forms">
      <ManualPaymentForm
        key={`manual:${view.bookingId}`}
        bookingId={view.bookingId}
        disabled={pending || (uncertain !== null && uncertain !== 'manual')}
        onConfirm={(body) => onMutate('manual', body)}
      />
      <RefundForm
        key={`refund:${view.bookingId}`}
        booking={refundRevision === null ? view : { ...view, billingRevision: refundRevision }}
        disabled={pending || (uncertain !== null && uncertain !== 'refund')}
        onConfirm={(body) => onMutate('refund', body)}
      />
      <RefundApprovalForm
        key={`approval:${view.bookingId}`}
        booking={approvalRevision === null ? view : { ...view, billingRevision: approvalRevision }}
        disabled={pending || (uncertain !== null && uncertain !== 'approval')}
        onConfirm={(body) => onMutate('approval', body)}
      />
    </div>
  );
}
