import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BookingCompletionActions } from './booking-completion-actions';

const proposal = {
  bookingId: 'booking',
  phase: 'CONFIRMED' as const,
  completion: {
    canComplete: true,
    pending: false,
    appendixRevisionNumber: null,
    managerApproved: false,
    coupleApproved: false,
  },
};
describe('event completion before settlement', () => {
  it('places completion first and keeps settlement locked until completion', () => {
    const complete = vi.fn();
    render(<BookingCompletionActions proposal={proposal} disabled={false} onComplete={complete} />);
    expect(screen.getAllByRole('button')[0]).toHaveTextContent('Đánh dấu tiệc đã tổ chức xong');
    expect(screen.getByRole('button', { name: 'Thanh toán & quyết toán' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button')[0]!);
    expect(complete).toHaveBeenCalledOnce();
  });
  it.each([
    [false, false, 'nhà hàng và cặp đôi'],
    [true, false, 'cặp đôi'],
    [false, true, 'nhà hàng'],
  ] as const)(
    'shows missing approval parties (%s, %s)',
    (managerApproved, coupleApproved, waiting) => {
      const complete = vi.fn();
      render(
        <BookingCompletionActions
          proposal={{
            ...proposal,
            completion: {
              canComplete: false,
              pending: true,
              appendixRevisionNumber: 3,
              managerApproved,
              coupleApproved,
            },
          }}
          disabled={false}
          onComplete={complete}
        />,
      );
      const button = screen.getByRole('button', { name: 'Đánh dấu tiệc đã tổ chức xong' });
      expect(button).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent(`đang chờ ${waiting}`);
      fireEvent.click(button);
      expect(complete).not.toHaveBeenCalled();
    },
  );
  it('fails closed when completion evidence is unavailable', () => {
    render(
      <BookingCompletionActions
        proposal={{ bookingId: 'booking', phase: 'CONFIRMED' }}
        disabled={false}
        onComplete={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Đánh dấu tiệc đã tổ chức xong' })).toBeDisabled();
  });
  it('enables settlement after completion without offering completion again', () => {
    render(
      <BookingCompletionActions
        proposal={{ ...proposal, phase: 'COMPLETED' }}
        disabled={false}
        onComplete={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('link', { name: 'Mở thanh toán & quyết toán tiệc này' }),
    ).toHaveAttribute('href', '/billing?bookingId=booking');
    expect(
      screen.queryByRole('button', { name: 'Đánh dấu tiệc đã tổ chức xong' }),
    ).not.toBeInTheDocument();
  });
});
