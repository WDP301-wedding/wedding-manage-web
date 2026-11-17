'use client';
import { ContractPanelContent } from './contract-panel-content';

import { ChevronRight, FileText } from 'lucide-react';
import { formatUnitLabel, formatVnd } from '@/src/lib/formatting/formatters';
import { contractDepositRate } from '@/src/lib/domain/deposit-policy';
import { formatDate } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import { ApprovalStatus, ContractLinesTable } from './contract-lines-table';
import { ContractDraftComposer } from './contract-draft-composer';
import { AppendixPanel } from '@/src/features/booking-lifecycle/components/appendices/appendix-panel';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Textarea } from '@/src/components/ui/textarea';
import { ContractPdfDialog } from './contract-pdf-dialog';
import {
  useContractViewState,
  type ContractPanelProps,
} from '@/src/features/booking-lifecycle/hooks/use-contract-view-state';

export function ContractPanel(props: ContractPanelProps) {
  const model = useContractViewState(props);
  const {
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
    previewRevisionId,
    setPreviewRevisionId,
    editing,
    setEditing,
    loading,
    error,
    currentRevision,
    data,
    showComposer,
    commandsDisabled,
    appendixState,
    revisionState,
    subTabClass,
  } = model;
  return (
    <article
      id="booking-contract"
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-hy-1"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Pháp lý &amp; Cam kết</span>
          <h3 className="text-lg font-semibold">Hồ sơ hợp đồng &amp; Phụ lục</h3>
        </div>
        {subTab === 'contract' && currentRevision ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={revisionState.tone}>{revisionState.label}</Badge>
            <small className="text-2xs text-muted-foreground">
              Phiên bản {currentRevision.revisionNumber}
            </small>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewRevisionId(currentRevision.revisionId)}
            >
              <FileText aria-hidden />
              <span>
                {currentRevision.state === 'APPROVED'
                  ? 'Xem PDF đã duyệt'
                  : 'Xem trước hợp đồng (PDF)'}
              </span>
            </Button>
          </div>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Phân hệ hợp đồng và phụ lục"
        className="flex flex-wrap gap-1 self-start rounded-lg bg-secondary p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'contract'}
          onClick={() => setSubTab('contract')}
          className={subTabClass}
        >
          Hợp đồng chính {currentRevision ? `(Bản ${currentRevision.revisionNumber})` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'appendix'}
          onClick={() => setSubTab('appendix')}
          className={subTabClass}
        >
          <span>
            Phụ lục hợp đồng
            {appendixState.data?.revisions && appendixState.data.revisions.length > 0
              ? ` (${appendixState.data.revisions.length})`
              : ''}
          </span>
          {appendixState.pendingApprovalsCount > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-2xs font-medium text-primary-foreground">
              {appendixState.pendingApprovalsCount} chờ duyệt
            </span>
          ) : null}
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-lg bg-hy-error-bg px-4 py-3 text-xs text-hy-error"
        >
          {error}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => {
              void panelState.loadContracts();
              onRefresh();
            }}
          >
            Tải lại hợp đồng
          </Button>
        </p>
      ) : null}
      {subTab === 'contract' && data?.changeRequestReason ? (
        <div className="rounded-lg border border-border bg-muted p-4" role="status">
          <p className="text-sm font-semibold">Cặp đôi yêu cầu chỉnh sửa</p>
          <p className="mt-1 break-words whitespace-pre-wrap text-sm text-muted-foreground">
            {data.changeRequestReason}
          </p>
        </div>
      ) : null}
      {subTab === 'contract' && editing && data?.capabilities?.canManageDraft ? (
        <ContractDraftComposer
          key={
            bookingId +
            ':' +
            (currentRevision?.revisionId ?? data.customerSelection?.revisionId ?? 'new')
          }
          proposal={proposal}
          current={currentRevision}
          seed={
            data.draftSeed ??
            currentRevision?.document.lines ??
            proposal.proposal.menus.map((menu) => ({
              category: 'MENU' as const,
              sourceId: menu.packageId,
              sourceRevisionId: menu.versionId,
              quantity: menu.tableCount,
              name: menu.name,
              description: menu.description,
              unit: 'bàn',
              unitPriceVnd: menu.priceVndPerTable,
              lineTotalVnd: menu.lineTotalVnd,
            }))
          }
          seedTotalVnd={
            currentRevision?.document.contractTotalVnd ??
            data.customerSelection?.totalVnd ??
            proposal.proposal.baseChargeVnd
          }
          bookingRevision={data.bookingRevision}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            setIsCustomerSelectionExpanded(false);
            onRefresh();
          }}
        />
      ) : null}
      {subTab === 'contract' && !showComposer && data?.customerSelection ? (
        <section className="flex flex-col gap-2 rounded-lg bg-muted p-4">
          <h4 className="flex flex-wrap items-center gap-2 font-semibold">
            Lựa chọn của khách
            <Badge
              variant={
                data.customerSelection.status === 'SUBMITTED'
                  ? 'success'
                  : data.customerSelection.status === 'DRAFT'
                    ? 'warning'
                    : 'neutral'
              }
            >
              {data.customerSelection.status === 'SUBMITTED'
                ? 'Đã gửi, khách không tự sửa'
                : data.customerSelection.status === 'DRAFT'
                  ? 'Khách đang chọn, chưa gửi'
                  : 'Khách chưa gửi lựa chọn'}
            </Badge>
          </h4>
          <details
            className="group"
            open={isCustomerSelectionExpanded}
            onToggle={(event) => setIsCustomerSelectionExpanded(event.currentTarget.open)}
          >
            <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg text-xs font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <ChevronRight
                aria-hidden
                className="size-4 transition-transform group-open:rotate-90"
              />
              Xem các hạng mục và số bàn
            </summary>
            <div className="flex flex-col gap-2 pt-2">
              <ContractLinesTable
                lines={data.customerSelection.lines}
                title="Thông tin từ phía khách"
              />
              <p>
                Tổng lựa chọn:{' '}
                <strong className="tabular-nums">
                  {formatVnd(data.customerSelection.totalVnd)}
                </strong>
              </p>
            </div>
          </details>
          {data.customerSelection.status !== 'SUBMITTED' && !currentRevision ? (
            <p className="text-xs text-muted-foreground">
              Chờ khách lưu nháp và gửi lựa chọn ở mục Thoả thuận, thẻ Hợp đồng. Sau khi gửi, hệ
              thống mới mở lập hợp đồng và điền sẵn toàn bộ các hạng mục.
            </p>
          ) : null}
        </section>
      ) : null}
      {subTab === 'contract' && data?.capabilities?.canManageDraft && !showComposer ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={commandsDisabled || !proposal.timeline}
            onClick={() => setEditing(true)}
          >
            {currentRevision ? 'Chỉnh sửa bản hợp đồng' : 'Lập hợp đồng từ lựa chọn khách'}
          </Button>
          {!proposal.timeline ? (
            <p className="text-xs text-muted-foreground">
              Cần lưu kịch bản tiệc trước khi lập hợp đồng.
            </p>
          ) : null}
        </div>
      ) : null}
      {subTab === 'appendix' ? (
        <AppendixPanel
          bookingId={bookingId}
          bookingRevision={bookingRevision}
          disabled={disabled}
          canEdit={proposal.phase === 'CONFIRMED'}
          onRefresh={onRefresh}
          panelState={appendixState}
        />
      ) : showComposer ? null : (
        <ContractPanelContent model={model} />
      )}
      {subTab === 'contract' &&
      currentRevision &&
      previewRevisionId === currentRevision.revisionId ? (
        <ContractPdfDialog
          key={currentRevision.revisionId + ':' + currentRevision.state}
          bookingId={bookingId}
          revision={currentRevision}
          onClose={() => setPreviewRevisionId(null)}
        />
      ) : null}
    </article>
  );
}
