'use client';
import { useState } from 'react';
import type { ProposalView } from '@/src/features/booking-lifecycle/api/booking-api';
import type { useContractPanel } from '@/src/features/booking-lifecycle/hooks/use-contract-panel';
import { useAppendixPanel } from '@/src/features/booking-lifecycle/hooks/use-appendix-panel';
export const revisionStates = {
  APPROVED: { tone: 'success', label: 'Đã duyệt 2 bên' },
  AWAITING_APPROVAL: { tone: 'info', label: 'Đang chờ duyệt' },
  SUPERSEDED: { tone: 'neutral', label: 'Đã thay thế' },
} as const;

export const subTabClass =
  'inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-hy-1';
export type ContractPanelProps = Readonly<{
  panelState: ReturnType<typeof useContractPanel>;
  proposal: ProposalView;
  bookingId: string;
  bookingRevision: number;
  disabled: boolean;
  onRefresh: () => void;
}>;
export function useContractViewState({
  panelState,
  proposal,
  bookingId,
  bookingRevision,
  disabled,
  onRefresh,
}: ContractPanelProps) {
  const [subTab, setSubTab] = useState<'contract' | 'appendix'>(() =>
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('appendixRevisionId')
      ? 'appendix'
      : 'contract',
  );
  const [isCustomerSelectionExpanded, setIsCustomerSelectionExpanded] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [previewRevisionId, setPreviewRevisionId] = useState<string | null>(null);
  const {
    editing,
    setEditing,
    data: rawData,
    loading,
    error,
    actionMessage,
    currentRevision,
    managerApproved,
    coupleApproved,
    handleApprove,
    handleSubmitDraft,
  } = panelState;
  const data = rawData?.bookingId === bookingId ? rawData : null;
  const standard = currentRevision?.document.standardTerms;
  const isLocked = currentRevision?.state === 'APPROVED' && Boolean(standard);
  const showComposer = editing && Boolean(data?.capabilities?.canManageDraft);
  const commandsDisabled =
    disabled || loading || Boolean(error) || data?.bookingRevision !== bookingRevision;
  const appendixState = useAppendixPanel({ bookingId, bookingRevision, onRefresh });
  const revisionState =
    currentRevision?.state && currentRevision.state in revisionStates
      ? revisionStates[currentRevision.state as keyof typeof revisionStates]
      : { tone: 'neutral' as const, label: 'Bản nháp' };
  return {
    panelState,
    proposal,
    bookingId,
    bookingRevision,
    disabled,
    onRefresh,
    subTab,
    setSubTab,
    isCustomerSelectionExpanded,
    setIsCustomerSelectionExpanded,
    showWithdrawForm,
    setShowWithdrawForm,
    previewRevisionId,
    setPreviewRevisionId,
    editing,
    setEditing,
    loading,
    error,
    currentRevision,
    managerApproved,
    coupleApproved,
    handleApprove,
    handleSubmitDraft,
    data,
    standard,
    isLocked,
    showComposer,
    commandsDisabled,
    appendixState,
    revisionState,
    subTabClass,
  };
}
