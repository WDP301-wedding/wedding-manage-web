'use client';
import { ChevronRight } from 'lucide-react';
import { formatUnitLabel, formatVnd } from '@/src/lib/formatting/formatters';
import { contractDepositRate } from '@/src/lib/domain/deposit-policy';
import { formatDate } from '@/src/features/booking-lifecycle/utils/booking-helpers';
import { ApprovalStatus, ContractLinesTable } from './contract-lines-table';
import { Button } from '@/src/components/ui/button';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Textarea } from '@/src/components/ui/textarea';
import type { useContractViewState } from '@/src/features/booking-lifecycle/hooks/use-contract-view-state';
export function ContractPanelContent({
  model,
}: Readonly<{ model: ReturnType<typeof useContractViewState> }>) {
  const {
    panelState,
    disabled,
    setSubTab,
    showWithdrawForm,
    setShowWithdrawForm,
    editing,
    loading,
    currentRevision,
    managerApproved,
    coupleApproved,
    handleApprove,
    handleSubmitDraft,
    data,
    standard,
    isLocked,
    commandsDisabled,
    appendixState,
  } = model;
  return (
    <>
      {appendixState.pendingApprovalsCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-hy-warning-bg px-4 py-3">
          <span className="text-xs text-hy-warning">
            Đang có {appendixState.pendingApprovalsCount} phụ lục hợp đồng chờ Quản lý phê duyệt.
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
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải hợp đồng">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-6 gap-y-3 rounded-lg border border-border p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-36" />
              </div>
            ))}
          </div>
        </div>
      ) : !currentRevision ? (
        <p className="rounded-lg border border-dashed border-input p-4 text-muted-foreground">
          Chưa có hợp đồng. Quản lý lập hợp đồng từ đề xuất, kiểm tra các khoản phí rồi gửi khách
          duyệt.
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
                Tiền cọc cam kết ({contractDepositRate(currentRevision.document)}%)
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
          {currentRevision.document.incidentalPricing ? (
            <section className="flex flex-col gap-2 text-sm">
              <h3 className="font-semibold">Bảng đơn giá áp dụng khi phát sinh</h3>
              <p>
                Không cộng vào hợp đồng hoặc tiền cọc. Sau tiệc, hai bên duyệt bảng phát sinh trước
                khi tất toán; Manager có thể xác nhận không phát sinh.
              </p>
              <ul>
                {currentRevision.document.incidentalPricing.map((item) => (
                  <li key={item.offeringId}>
                    {item.name} · {formatVnd(item.unitPriceVnd)}/{formatUnitLabel(item.unit)}
                    <p>
                      {item.description} · {item.chargingRule}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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
                    Lý do cần thay đổi sau khi đã duyệt <span className="text-destructive">*</span>
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
                  <Button variant="destructive" size="sm" disabled={commandsDisabled} type="submit">
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
            {currentRevision.state === 'DRAFT' && data?.capabilities?.canManageDraft && !editing ? (
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
  );
}
