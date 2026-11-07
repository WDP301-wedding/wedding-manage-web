'use client';

import { useState } from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { formatVnd } from '../../lib/formatters';
import { formatDate } from './booking-helpers';
import { ApprovalStatus, ContractLinesTable } from './contract-lines-table';
import { ContractDraftComposer } from './contract-draft-composer';
import type { ProposalView } from './booking-api';
import type { useContractPanel } from './use-contract-panel';
import { useAppendixPanel } from './use-appendix-panel';
import { AppendixPanel } from './appendix-panel';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { ContractPdfDialog } from './contract-pdf-dialog';

const revisionStates = {
  APPROVED: { tone: 'success', label: 'Đã duyệt 2 bên' },
  AWAITING_APPROVAL: { tone: 'info', label: 'Đang chờ duyệt' },
  SUPERSEDED: { tone: 'neutral', label: 'Đã thay thế' },
} as const;
const subTabClass =
  'inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-hy-1';

export function ContractPanel({
  panelState,
  proposal,
  bookingId,
  bookingRevision,
  disabled,
  onRefresh,
}: Readonly<{
  panelState: ReturnType<typeof useContractPanel>;
  proposal: ProposalView;
  bookingId: string;
  bookingRevision: number;
  disabled: boolean;
  onRefresh: () => void;
}>) {
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

  return (
    <article className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6 shadow-hy-1">
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
          onRefresh={onRefresh}
          panelState={appendixState}
        />
      ) : showComposer ? null : (
        <>
          {appendixState.pendingApprovalsCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-hy-warning-bg px-4 py-3">
              <span className="text-xs text-hy-warning">
                Đang có {appendixState.pendingApprovalsCount} phụ lục hợp đồng chờ Quản lý phê
                duyệt.
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0"
                onClick={() => setSubTab('appendix')}
              >
                Xem và phê duyệt phụ lục
                <ChevronRight aria-hidden />
              </Button>
            </div>
          ) : null}

          {loading && !currentRevision ? (
            <p className="text-muted-foreground">Đang tải hợp đồng…</p>
          ) : !currentRevision ? (
            <p className="rounded-lg border border-dashed border-input p-4 text-muted-foreground">
              Chưa có hợp đồng. Quản lý lập hợp đồng từ đề xuất, kiểm tra các khoản phí rồi gửi
              khách duyệt.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              <dl className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Cô dâu &amp; Chú rể</dt>
                  <dd className="font-semibold">
                    {currentRevision.document.brideName || '—'} &amp;{' '}
                    {currentRevision.document.groomName || '—'}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Sảnh &amp; Ngày tiệc</dt>
                  <dd className="font-semibold">
                    {currentRevision.document.hallName} (
                    {formatDate(currentRevision.document.eventDate)})
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">Tổng giá trị hợp đồng</dt>
                  <dd className="text-lg font-bold text-primary tabular-nums">
                    {formatVnd(currentRevision.document.contractTotalVnd)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    Tiền cọc cam kết (
                    {(currentRevision.document as any).depositRate ??
                      (currentRevision.document.contractTotalVnd > 0
                        ? Math.round(
                            (currentRevision.document.depositAmountVnd /
                              currentRevision.document.contractTotalVnd) *
                              100,
                          )
                        : 30)}
                    % theo hợp đồng)
                  </dt>
                  <dd className="text-lg font-bold tabular-nums">
                    {formatVnd(currentRevision.document.depositAmountVnd)}
                  </dd>
                </div>
                {standard ? (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs text-muted-foreground">Tất toán sau tiệc (tạm tính)</dt>
                    <dd className="text-lg font-bold tabular-nums">
                      {formatVnd(
                        currentRevision.document.contractTotalVnd -
                          currentRevision.document.depositAmountVnd,
                      )}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {standard ? (
                <p className="text-sm text-muted-foreground">
                  Giá đã bao gồm thuế GTGT. Tối đa 02 bàn dự phòng miễn phí kèm thực đơn{' '}
                  <strong>{standard.reserveMenu.name}</strong>.
                </p>
              ) : null}
              {isLocked ? (
                <p className="text-sm text-muted-foreground">
                  Hai bên đã duyệt và khóa hợp đồng. Bản PDF chính thức có hai ô ký tay ở Điều 10.
                </p>
              ) : null}

              <ContractLinesTable lines={currentRevision.document.lines} />

              <ApprovalStatus
                managerApproved={Boolean(managerApproved)}
                coupleApproved={Boolean(coupleApproved)}
              />

              {data?.capabilities?.canWithdrawApproval ? (
                showWithdrawForm ? (
                  <form
                    className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const reason = String(
                        new FormData(event.currentTarget).get('reason') ?? '',
                      ).trim();
                      if (reason) {
                        void panelState.handleWithdraw(reason);
                        setShowWithdrawForm(false);
                      }
                    }}
                  >
                    <label className="flex flex-col gap-1 text-xs font-semibold">
                      <span>
                        Lý do cần thay đổi sau khi đã duyệt{' '}
                        <span className="text-destructive">*</span>
                      </span>
                      <Textarea
                        className="font-normal"
                        name="reason"
                        required
                        maxLength={500}
                        placeholder="Nhập lý do rút duyệt để chuẩn bị phiên bản hợp đồng mới..."
                        autoFocus
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={commandsDisabled}
                        type="submit"
                      >
                        Xác nhận rút duyệt
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => setShowWithdrawForm(false)}
                      >
                        Hủy
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="outline"
                    className="self-start text-destructive hover:bg-destructive/10"
                    disabled={commandsDisabled}
                    type="button"
                    onClick={() => setShowWithdrawForm(true)}
                  >
                    Rút duyệt để chuẩn bị bản mới
                  </Button>
                )
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                {currentRevision.state === 'DRAFT' &&
                data?.capabilities?.canManageDraft &&
                !editing ? (
                  <Button
                    type="button"
                    disabled={commandsDisabled}
                    onClick={() => void handleSubmitDraft()}
                  >
                    Gửi duyệt hợp đồng
                  </Button>
                ) : null}

                {currentRevision.state === 'AWAITING_APPROVAL' &&
                !managerApproved &&
                data?.capabilities?.canApprove ? (
                  <Button
                    type="button"
                    disabled={commandsDisabled}
                    onClick={() => void handleApprove()}
                  >
                    Phê duyệt hợp đồng (Quản lý)
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </>
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
