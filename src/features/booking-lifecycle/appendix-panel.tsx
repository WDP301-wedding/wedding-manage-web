'use client';

import { Button } from '../../components/ui/button';
import { useAppendixPanel, type AppendixPanelState } from './use-appendix-panel';
import { AppendixDetailView } from './appendix-detail-view';

export interface AppendixPanelProps {
  bookingId: string;
  bookingRevision: number;
  disabled: boolean;
  onRefresh: () => void;
  panelState?: AppendixPanelState;
}

export const appendixStateLabels: Record<string, string> = {
  DRAFT: 'Bản nháp',
  AWAITING_APPROVAL: 'Đang chờ hai bên duyệt',
  APPROVED: 'Đã duyệt (Có hiệu lực)',
  SUPERSEDED: 'Đã thay thế',
};

export function AppendixPanel(props: Readonly<AppendixPanelProps>) {
  return props.panelState ? (
    <AppendixPanelView disabled={props.disabled} panelState={props.panelState} />
  ) : (
    <ConnectedAppendixPanel {...props} />
  );
}

function ConnectedAppendixPanel(props: Readonly<AppendixPanelProps>) {
  const panelState = useAppendixPanel(props);
  return <AppendixPanelView disabled={props.disabled} panelState={panelState} />;
}

function AppendixPanelView({
  disabled,
  panelState,
}: Readonly<{
  disabled: boolean;
  panelState: AppendixPanelState;
}>) {
  const {
    loading,
    data,
    activeAppendix,
    setSelectedRevisionId,
    managerApproved,
    coupleApproved,
    handleApproveAppendix,
    handleSubmitAppendix,
    refreshAppendices,
    canAdjustPrint,
    handleAdjustPrint,
    error,
    actionMessage,
  } = panelState;

  const revisions = data?.revisions ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">Phụ lục điều chỉnh</span>
          <h4 className="text-base font-semibold">Phụ lục hợp đồng tiệc cưới</h4>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          onClick={refreshAppendices}
        >
          {loading ? 'Đang tải…' : 'Làm mới phụ lục'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {actionMessage ? (
        <p role="status" className="text-sm text-hy-success">
          {actionMessage}
        </p>
      ) : null}

      {loading && revisions.length === 0 ? (
        <p className="text-muted-foreground">Đang tải danh sách phụ lục…</p>
      ) : revisions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input p-4 text-xs text-muted-foreground">
          Chưa có phụ lục hợp đồng nào được tạo cho tiệc này. Phụ lục được lập khi cần điều chỉnh
          thực đơn, số bàn, dịch vụ hoặc số lượng thiệp in sau khi hợp đồng chính đã ký và đặt cọc.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Danh sách các phiên bản phụ lục nếu có nhiều hơn 1 */}
          {revisions.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {revisions.map((rev) => {
                const isSelected = rev.revisionId === activeAppendix?.revisionId;
                const isPendingManager =
                  rev.state === 'AWAITING_APPROVAL' &&
                  !rev.approvals.some((a) => a.party === 'MANAGER');
                return (
                  <button
                    key={rev.revisionId}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedRevisionId(rev.revisionId)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:font-semibold aria-pressed:text-primary"
                  >
                    <span>Phụ lục số {rev.revisionNumber}</span>
                    {isPendingManager ? (
                      <>
                        <span
                          aria-hidden
                          className="size-2 rounded-full bg-primary"
                          title="Chờ Quản lý duyệt"
                        />
                        <span className="sr-only">Chờ Quản lý duyệt</span>
                      </>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {activeAppendix ? (
            <AppendixDetailView
              key={`${activeAppendix.revisionId}:${activeAppendix.documentDigest}`}
              activeAppendix={activeAppendix}
              disabled={disabled}
              loading={loading}
              managerApproved={Boolean(managerApproved)}
              coupleApproved={Boolean(coupleApproved)}
              appendixStateLabels={appendixStateLabels}
              handleApproveAppendix={handleApproveAppendix}
              handleSubmitAppendix={handleSubmitAppendix}
              canAdjustPrint={canAdjustPrint}
              onAdjustPrint={handleAdjustPrint}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
