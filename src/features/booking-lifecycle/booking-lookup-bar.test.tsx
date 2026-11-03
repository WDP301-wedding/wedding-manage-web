import { render, screen, fireEvent, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BookingLookupBar } from './booking-lookup-bar';
import type { BookingIdentity } from './use-booking-lookup';

const mockAuthorize = vi.fn();

describe('BookingLookupBar', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:4000/api/v1');
    mockAuthorize.mockReset();
  });

  it('renders search input and opens floating overlay without pushing layout', () => {
    const setBookingId = vi.fn();
    const onLoadProposal = vi.fn();

    render(
      <BookingLookupBar
        bookingId=""
        setBookingId={setBookingId}
        onLoadProposal={onLoadProposal}
        pending={null}
        recentBookingIds={[]}
        authorize={mockAuthorize}
      />,
    );

    const input = screen.getByLabelText('Tìm hồ sơ tiệc');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'search');

    // Type query
    fireEvent.change(input, { target: { value: 'HY-001' } });
    expect(input).toHaveValue('HY-001');

    // Popover overlay is rendered
    expect(screen.getByLabelText('Kết quả tìm hồ sơ')).toBeInTheDocument();
  });

  it('closes popovers when Escape is pressed', () => {
    const setBookingId = vi.fn();
    const onLoadProposal = vi.fn();

    render(
      <BookingLookupBar
        bookingId=""
        setBookingId={setBookingId}
        onLoadProposal={onLoadProposal}
        pending={null}
        recentBookingIds={[]}
        authorize={mockAuthorize}
      />,
    );

    const input = screen.getByLabelText('Tìm hồ sơ tiệc');
    fireEvent.change(input, { target: { value: 'HY-001' } });
    expect(screen.getByLabelText('Kết quả tìm hồ sơ')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByLabelText('Kết quả tìm hồ sơ')).not.toBeInTheDocument();
  });

  it('closes popovers when clicking outside', () => {
    const setBookingId = vi.fn();
    const onLoadProposal = vi.fn();

    render(
      <div>
        <div data-testid="outside">Outside area</div>
        <BookingLookupBar
          bookingId=""
          setBookingId={setBookingId}
          onLoadProposal={onLoadProposal}
          pending={null}
          recentBookingIds={[]}
          authorize={mockAuthorize}
        />
      </div>,
    );

    const input = screen.getByLabelText('Tìm hồ sơ tiệc');
    fireEvent.change(input, { target: { value: 'HY-001' } });
    expect(screen.getByLabelText('Kết quả tìm hồ sơ')).toBeInTheDocument();

    // Click outside
    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(screen.queryByLabelText('Kết quả tìm hồ sơ')).not.toBeInTheDocument();
  });
});
