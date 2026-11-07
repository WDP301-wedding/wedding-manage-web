'use client';

import { useEffect, useState } from 'react';
import type {
  BillingView,
  ManualPaymentBody,
  RefundBody,
  RefundApprovalBody,
  RecordingContext,
} from './billing-api';
import { ManualPaymentForm, RefundForm, type CommandOutcome } from './payment-forms';

export interface BillingMutationsSectionProps {
  view: BillingView;
  archiveMode?: boolean;
  pending: boolean;
  uncertain: 'manual' | 'refund' | 'approval' | null;
  refundRevision: number | null;
  approvalRevision: number | null;
  formEpoch?: number;
  recording?: RecordingContext | null | undefined;
  onEditingChange?: (value: boolean) => void;
  onLoadMoreSources?: (() => void) | undefined;
  onMutate: (
    kind: 'manual' | 'refund' | 'approval',
    body: ManualPaymentBody | RefundBody | RefundApprovalBody,
  ) => Promise<CommandOutcome>;
}

const tabClass =
  'inline-flex h-10 items-center justify-center rounded-md text-xs font-semibold text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-hy-1';

export function BillingMutationsSection({
  view,
  archiveMode = false,
  pending,
  uncertain,
  refundRevision,
  recording,
  formEpoch = 0,
  onEditingChange,
  onLoadMoreSources,
  onMutate,
}: Readonly<BillingMutationsSectionProps>) {
  const [activeTab, setActiveTab] = useState<'manual' | 'refund'>(
    archiveMode ? 'refund' : 'manual',
  );

  const [manualDirty, setManualDirty] = useState(false);
  const [refundDirty, setRefundDirty] = useState(false);
  useEffect(() => {
    onEditingChange?.(manualDirty || refundDirty);
  }, [manualDirty, refundDirty, onEditingChange]);
  useEffect(() => {
    if (uncertain === 'manual' || uncertain === 'refund') {
      setActiveTab(uncertain);
    } else if (refundRevision !== null) {
      setActiveTab('refund');
    }
  }, [uncertain, refundRevision]);

  // Tab ẩn bằng class (không dùng thuộc tính hidden) để giữ hành vi cũ.
  const pane = (tab: typeof activeTab) =>
    activeTab === tab ? 'block motion-safe:animate-in motion-safe:fade-in-0' : 'hidden';

  return (
    <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-hy-1">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-lg font-semibold">Thao tác nghiệp vụ thanh toán</h2>
        <p className="text-xs text-muted-foreground">
          Ghi nhận khoản đã thu hoặc đã hoàn bên ngoài hệ thống. Các khoản này hiển thị trong lịch
          sử giao dịch.
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1"
        role="tablist"
        aria-label="Nghiệp vụ thanh toán"
      >
        {(!archiveMode || uncertain === 'manual') && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'manual'}
            disabled={pending || (activeTab !== 'manual' && (manualDirty || refundDirty))}
            className={tabClass}
            onClick={() => setActiveTab('manual')}
          >
            {archiveMode ? 'Đối chiếu khoản thu chưa rõ kết quả' : 'Thu tiền'}
          </button>
        )}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'refund'}
          disabled={pending || (activeTab !== 'refund' && (manualDirty || refundDirty))}
          className={tabClass}
          onClick={() => setActiveTab('refund')}
        >
          Hoàn tiền
        </button>
      </div>

      {(!archiveMode || uncertain === 'manual') && (
        <div className={pane('manual')}>
          <ManualPaymentForm
            key={`manual:${view.bookingId}:${formEpoch}`}
            bookingId={view.bookingId}
            recording={
              recording && recording.bookingPhase !== 'COMPLETED'
                ? {
                    ...recording,
                    balance: {
                      ...recording.balance,
                      canRecord: false,
                      reasonCode: 'BALANCE_NOT_ELIGIBLE',
                    },
                  }
                : recording
            }
            onEditingChange={setManualDirty}
            disabled={pending || (uncertain !== null && uncertain !== 'manual')}
            onConfirm={(body) => onMutate('manual', body)}
          />
        </div>
      )}

      <div className={pane('refund')}>
        <RefundForm
          key={`refund:${view.bookingId}:${formEpoch}`}
          recording={recording}
          onEditingChange={setRefundDirty}
          onLoadMore={onLoadMoreSources}
          booking={refundRevision === null ? view : { ...view, billingRevision: refundRevision }}
          disabled={pending || (uncertain !== null && uncertain !== 'refund')}
          onConfirm={(body) => onMutate('refund', body)}
        />
      </div>
    </div>
  );
}
