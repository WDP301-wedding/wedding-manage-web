import { Check } from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/button';
import type { ProposalView } from './booking-api';

export function BookingCompletionActions({
  proposal,
  disabled,
  onComplete,
}: Readonly<{
  proposal: Pick<ProposalView, 'bookingId' | 'phase' | 'completion'>;
  disabled: boolean;
  onComplete: () => void;
}>) {
  const completion = proposal.completion;
  const pendingParties = [
    !completion?.managerApproved ? 'nhà hàng' : null,
    !completion?.coupleApproved ? 'cặp đôi' : null,
  ]
    .filter(Boolean)
    .join(' và ');
  return (
    <div className="flex w-full flex-col items-start gap-2">
      {proposal.phase === 'CONFIRMED' ? (
        <>
          <Button
            size="sm"
            type="button"
            disabled={disabled || !completion?.canComplete}
            aria-describedby={!completion?.canComplete ? 'completion-reason' : undefined}
            onClick={onComplete}
          >
            <Check aria-hidden />
            Đánh dấu tiệc đã tổ chức xong
          </Button>
          {!completion?.canComplete ? (
            <p id="completion-reason" role="status" className="text-xs text-muted-foreground">
              {completion?.pending
                ? `Phụ lục phiên bản ${completion.appendixRevisionNumber} chưa hoàn tất duyệt hai bên${pendingParties ? `; đang chờ ${pendingParties}` : ''}.`
                : 'Chưa xác nhận được điều kiện hoàn thành tiệc. Hãy cập nhật lại hồ sơ.'}{' '}
              <a className="font-semibold text-primary underline" href="#booking-contract">
                Kiểm tra hợp đồng và phụ lục
              </a>
            </p>
          ) : null}
        </>
      ) : null}
      {proposal.phase === 'COMPLETED' ? (
        <a
          href={`/billing?bookingId=${proposal.bookingId}`}
          aria-label="Mở thanh toán & quyết toán tiệc này"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Thanh toán &amp; quyết toán
        </a>
      ) : (
        <>
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled
            aria-describedby="settlement-reason"
          >
            Thanh toán &amp; quyết toán
          </Button>
          <p id="settlement-reason" className="text-xs text-muted-foreground">
            Chỉ mở tất toán phần còn lại sau khi đánh dấu tiệc đã tổ chức xong.
          </p>
        </>
      )}
    </div>
  );
}
