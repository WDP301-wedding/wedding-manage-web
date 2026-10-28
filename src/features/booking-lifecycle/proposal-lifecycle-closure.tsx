'use client';

import { field } from './booking-helpers';
import type { ManagementBookingGateway, ProposalView } from './booking-api';

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

export function ProposalLifecycleClosure({
  proposal,
  disabled,
  gateway,
  command,
}: Readonly<ProposalLifecycleClosureProps>) {
  return (
    <article className="proposal-danger" style={{ gridColumn: '1 / -1' }}>
      <div className="proposal-danger-header">
        <h3>Hủy booking</h3>
        <p className="proposal-danger-desc">
          Khu vực xử lý yêu cầu hủy từ khách hoặc hủy bỏ booking. Thao tác này không thể hoàn tác.
        </p>
      </div>
      {(proposal.cancellationRequests ?? []).map((request) => (
        <form
          key={request.requestId}
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
          <h4>Yêu cầu hủy từ cặp đôi</h4>
          <p>{request.reason}</p>
          <label>
            Lý do quyết định
            <textarea name="decisionReason" required minLength={1} maxLength={500} rows={2} />
          </label>
          <div className="booking-actions">
            <button type="submit" value="APPROVE" disabled={disabled}>
              Chấp nhận yêu cầu hủy
            </button>
            <button type="submit" value="REJECT" disabled={disabled}>
              Từ chối yêu cầu hủy
            </button>
          </div>
        </form>
      ))}
      <details className="proposal-cancel-details">
        <summary>Hủy booking</summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const reason = field(new FormData(event.currentTarget), 'reason');
            void command('cancel', 'Booking đã được hủy.', (token) =>
              gateway.cancel(token, {
                bookingId: proposal.bookingId,
                expectedRevision: proposal.revision,
                reason,
              }),
            );
          }}
        >
          <label>
            Lý do hủy
            <textarea name="reason" required minLength={1} maxLength={500} rows={3} />
          </label>
          <button
            disabled={disabled || ['CANCELLED', 'COMPLETED'].includes(proposal.phase)}
            type="submit"
          >
            Hủy booking
          </button>
        </form>
      </details>
    </article>
  );
}
