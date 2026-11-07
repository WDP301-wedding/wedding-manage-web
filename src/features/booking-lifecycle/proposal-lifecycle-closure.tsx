'use client';

import { ChevronDown } from 'lucide-react';
import { field } from './booking-helpers';
import type { ManagementBookingGateway, ProposalView } from './booking-api';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { HySelect } from '../../components/ui/select-field';

export interface ProposalLifecycleClosureProps {
  proposal: ProposalView;
  disabled: boolean;
  gateway: ManagementBookingGateway;
  command: (
    label: string,
    success: string,
    operation: (token: string) => Promise<void>,
  ) => Promise<boolean>;
}

const fieldLabelClass = 'flex flex-col gap-1 text-xs font-semibold';

export function ProposalLifecycleClosure({
  proposal,
  disabled,
  gateway,
  command,
}: Readonly<ProposalLifecycleClosureProps>) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold text-hy-error">Hủy booking</h3>
        <p className="text-xs text-muted-foreground">
          Khu vực xử lý yêu cầu hủy từ khách hoặc hủy bỏ booking. Thao tác này không thể hoàn tác.
        </p>
      </div>
      {(proposal.cancellationRequests ?? []).map((request) => (
        <form
          key={request.requestId}
          className="flex flex-col gap-3 rounded-lg bg-hy-warning-bg p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const submitter = event.nativeEvent.submitter;
            const decision =
              submitter instanceof HTMLButtonElement && submitter.value === 'APPROVE'
                ? 'APPROVE'
                : 'REJECT';
            const reason = field(new FormData(form), 'decisionReason');
            void command(
              'cancellation-decision',
              decision === 'APPROVE' ? 'Đã chấp nhận yêu cầu hủy.' : 'Đã từ chối yêu cầu hủy.',
              (token) =>
                gateway.decideCancellation(token, {
                  bookingId: proposal.bookingId,
                  requestId: request.requestId,
                  expectedRevision: proposal.revision,
                  decision,
                  reason,
                }),
            );
          }}
        >
          <h4 className="font-semibold">Yêu cầu hủy từ cặp đôi</h4>
          <p>{request.reason}</p>
          <label className={fieldLabelClass}>
            Lý do quyết định
            <Textarea
              className="bg-card font-normal"
              name="decisionReason"
              required
              minLength={1}
              maxLength={500}
              rows={2}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="destructive" value="APPROVE" disabled={disabled}>
              Chấp nhận yêu cầu hủy
            </Button>
            <Button type="submit" variant="outline" value="REJECT" disabled={disabled}>
              Từ chối yêu cầu hủy
            </Button>
          </div>
        </form>
      ))}
      <details className="group rounded-lg border border-border">
        <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-4 font-semibold text-hy-error focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
          Hủy booking
        </summary>
        <form
          className="flex flex-col gap-3 border-t border-border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const reason = field(data, 'reason');
            const initiator = field(data, 'initiator');
            if (initiator !== 'COUPLE' && initiator !== 'RESTAURANT') return;
            void command('cancel', 'Booking đã được hủy.', (token) =>
              gateway.cancel(token, {
                bookingId: proposal.bookingId,
                expectedRevision: proposal.revision,
                initiator,
                reason,
              }),
            );
          }}
        >
          <label className={fieldLabelClass}>
            Bên yêu cầu hủy
            <HySelect name="initiator" required defaultValue="">
              <option value="" disabled>
                Chọn bên yêu cầu hủy
              </option>
              <option value="COUPLE">Khách yêu cầu hủy</option>
              <option value="RESTAURANT">Nhà hàng hủy (kể cả bất khả kháng)</option>
            </HySelect>
          </label>
          <p className="text-xs text-muted-foreground">
            Nhà hàng hủy: hệ thống hoàn tối đa 100% cọc thực nhận. Khoản bồi thường thêm xử lý bên
            ngoài; hợp đồng đã ký giữ nguyên. Nếu khách đã gửi yêu cầu, duyệt yêu cầu ở trên để giữ
            đúng thời điểm khách gửi.
          </p>
          <label className={fieldLabelClass}>
            Lý do hủy
            <Textarea
              className="font-normal"
              name="reason"
              required
              minLength={1}
              maxLength={500}
              rows={3}
            />
          </label>
          <Button
            variant="destructive"
            className="self-start"
            disabled={disabled || ['CANCELLED', 'COMPLETED'].includes(proposal.phase)}
            type="submit"
          >
            Hủy booking
          </Button>
        </form>
      </details>
    </article>
  );
}
