'use client';
import Link from 'next/link';

import { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { cn } from 'cn';
import { formatVnd } from '../../lib/formatters';
import { formatDate } from './booking-helpers';
import { ApprovalStatus, ContractLinesTable } from './contract-lines-table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import type { AppendixRevisionItem } from '../../services/contract.service';

export interface AppendixDetailViewProps {
  activeAppendix: AppendixRevisionItem;
  disabled: boolean;
  loading: boolean;
  managerApproved: boolean;
  coupleApproved: boolean;
  appendixStateLabels: Record<string, string>;
  handleApproveAppendix: (revisionId: string) => Promise<void>;
  handleSubmitAppendix: (revisionId: string) => Promise<void>;
}

const stateTone: Record<string, 'neutral' | 'info' | 'success'> = {
  AWAITING_APPROVAL: 'info',
  APPROVED: 'success',
};

export function AppendixDetailView({
  activeAppendix,
  disabled,
  loading,
  managerApproved,
  coupleApproved,
  appendixStateLabels,
  handleApproveAppendix,
  handleSubmitAppendix,
}: Readonly<AppendixDetailViewProps>) {
  const [confirmingApproval, setConfirmingApproval] = useState(false);
  const delta = activeAppendix.document.deltaVnd;
  const signedDelta = (
    <>
      {delta > 0 ? '+' : ''}
      {formatVnd(delta)}
    </>
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="text-base font-semibold">Phụ lục số {activeAppendix.revisionNumber}</h5>
            <Badge variant={stateTone[activeAppendix.state] ?? 'neutral'}>
              {appendixStateLabels[activeAppendix.state] ?? activeAppendix.state}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Lý do điều chỉnh:{' '}
            <strong className="text-foreground">{activeAppendix.document.reason}</strong>
          </p>
        </div>

        <div className="flex flex-col items-end">
          <small className="text-2xs text-muted-foreground">Chênh lệch thoả thuận</small>
          <strong
            className={cn(
              'text-lg font-bold tabular-nums',
              delta > 0 ? 'text-primary' : delta < 0 ? 'text-hy-success' : undefined,
            )}
          >
            {signedDelta}
          </strong>
        </div>
      </div>

      {/* Thông số tài chính phụ lục */}
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 rounded-lg bg-card px-4 py-3">
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Tổng trước điều chỉnh:</dt>
          <dd className="font-semibold tabular-nums">
            {formatVnd(activeAppendix.document.beforeTotalVnd)}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Tổng sau điều chỉnh:</dt>
          <dd className="font-bold text-primary tabular-nums">
            {formatVnd(activeAppendix.document.afterTotalVnd)}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-xs text-muted-foreground">Ngày lập phụ lục:</dt>
          <dd className="tabular-nums">{formatDate(activeAppendix.createdAt)}</dd>
        </div>
      </dl>

      {/* Chi tiết bảng dịch vụ sau điều chỉnh */}
      <ContractLinesTable
        lines={activeAppendix.document.afterLines}
        title={`Chi tiết các hạng mục sau điều chỉnh (${activeAppendix.document.afterLines.length})`}
      />

      <ApprovalStatus managerApproved={managerApproved} coupleApproved={coupleApproved} />

      {/* Hộp xác nhận phê duyệt nếu đang bấm nút */}
      {confirmingApproval ? (
        <div
          role="group"
          aria-labelledby="appendix-approval-title"
          className="flex flex-col gap-3 rounded-lg border-2 border-primary bg-card p-4"
        >
          <h6 id="appendix-approval-title" className="font-semibold text-primary">
            Xác nhận phê duyệt phụ lục số {activeAppendix.revisionNumber}
          </h6>
          <p className="text-xs">
            Bạn đang đồng ý thay đổi tổng thoả thuận tiệc từ{' '}
            <strong>{formatVnd(activeAppendix.document.beforeTotalVnd)}</strong> thành{' '}
            <strong>{formatVnd(activeAppendix.document.afterTotalVnd)}</strong> (chênh lệch:{' '}
            <strong>{signedDelta}</strong>). Thao tác phê duyệt mang tính pháp lý và không thể thu
            hồi.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={disabled || loading}
              onClick={() => setConfirmingApproval(false)}
            >
              Huỷ bỏ
            </Button>
            <Button
              type="button"
              disabled={disabled || loading}
              onClick={async () => {
                await handleApproveAppendix(activeAppendix.revisionId);
                setConfirmingApproval(false);
              }}
            >
              {loading ? 'Đang duyệt…' : 'Xác nhận duyệt phụ lục'}
            </Button>
          </div>
        </div>
      ) : null}

      {activeAppendix.printOrderId ? (
        <p className="text-sm text-muted-foreground">
          Phụ lục đặt in được duyệt cùng đơn in; Couple đã xác nhận chi phí lúc đặt.{' '}
          <Link href="/print-orders" className="text-primary underline">
            Mở Thiệp và in ấn để xử lý đơn
          </Link>
        </p>
      ) : null}
      {/* Các nút hành động cho phụ lục */}
      <div className="flex flex-wrap justify-end gap-2">
        {!activeAppendix.printOrderId && activeAppendix.state === 'DRAFT' ? (
          <Button
            type="button"
            disabled={disabled || loading}
            onClick={() => void handleSubmitAppendix(activeAppendix.revisionId)}
          >
            {loading ? 'Đang gửi…' : 'Gửi duyệt phụ lục'}
          </Button>
        ) : null}

        {!activeAppendix.printOrderId &&
        activeAppendix.state === 'AWAITING_APPROVAL' &&
        !managerApproved &&
        !confirmingApproval ? (
          <Button
            type="button"
            disabled={disabled || loading}
            onClick={() => setConfirmingApproval(true)}
          >
            Phê duyệt phụ lục (Quản lý)
          </Button>
        ) : null}

        {activeAppendix.state === 'APPROVED' ? (
          <span className="flex items-center gap-1.5 font-semibold text-hy-success">
            <CircleCheck aria-hidden className="size-4" />
            Phụ lục đã có hiệu lực thi hành đầy đủ giữa hai bên.
          </span>
        ) : null}
      </div>
    </div>
  );
}
