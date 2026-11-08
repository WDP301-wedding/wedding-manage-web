import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CompletedEventsDashboard } from './completed-events-dashboard';
import {
  getCompletedEvents,
  type CompletedEventsData,
} from '../../services/completed-events.service';
import { useCompletedEvents, currentVietnamMonth } from './use-completed-events';
import { selectOption } from '../../test/select-option';

vi.mock('../../services/completed-events.service', () => ({ getCompletedEvents: vi.fn() }));
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const fixture: CompletedEventsData = {
  meta: {
    definitionVersion: 'COMPLETED_INVOICE_V1',
    dateFrom: '2026-11-01',
    dateTo: '2026-11-30',
    generatedAt: '2026-11-08T00:00:00.000Z',
    status: 'READY',
    sourceSequences: { booking: 1, billing: 1 },
  },
  summary: {
    completedCount: 3,
    finalizedCount: 2,
    provisionalCount: 1,
    unknownCount: 0,
    revenueVnd: 190000000,
    provisionalTotalVnd: 50000000,
    netPaidVnd: 125000000,
    outstandingVnd: 115000000,
    creditVnd: 0,
    unallocatedRevenueVnd: 10000000,
  },
  halls: [
    {
      hallId: id(1),
      hallName: 'Sảnh A',
      bookingCount: 2,
      finalizedCount: 1,
      revenueVnd: 80000000,
      netPaidVnd: 95000000,
      outstandingVnd: 35000000,
    },
    {
      hallId: id(2),
      hallName: 'Sảnh B',
      bookingCount: 1,
      finalizedCount: 1,
      revenueVnd: 110000000,
      netPaidVnd: 30000000,
      outstandingVnd: 80000000,
    },
  ],
  offerings: [
    {
      category: 'MENU',
      sourceId: id(3),
      name: 'Menu Sen',
      unit: 'bàn',
      bookingCount: 3,
      finalizedBookingCount: 2,
      quantity: 30,
      revenueVnd: 140000000,
    },
    {
      category: 'SERVICE',
      sourceId: id(4),
      name: 'MC tiệc cưới',
      unit: 'buổi',
      bookingCount: 2,
      finalizedBookingCount: 2,
      quantity: 2,
      revenueVnd: 40000000,
    },
  ],
  page: 1,
  pageSize: 10,
  total: 2,
  totalPages: 1,
  items: [
    {
      bookingId: id(5),
      bookingCode: 'HY-000001',
      customerName: 'Lan & Minh',
      eventDate: '2026-11-08',
      hallId: id(1),
      hallName: 'Sảnh A',
      invoiceRevisionId: id(9),
      invoiceState: 'FINALIZED',
      totalVnd: 80000000,
      netPaidVnd: 80000000,
      outstandingVnd: 0,
      creditVnd: 0,
      paymentStatus: 'PAID',
    },
    {
      bookingId: id(6),
      bookingCode: 'HY-000002',
      customerName: 'Mai & An',
      eventDate: '2026-11-08',
      hallId: id(1),
      hallName: 'Sảnh A',
      invoiceRevisionId: null,
      invoiceState: 'PROVISIONAL',
      totalVnd: 50000000,
      netPaidVnd: 15000000,
      outstandingVnd: 35000000,
      creditVnd: 0,
      paymentStatus: 'DEBT',
    },
  ],
};
beforeEach(() => {
  vi.mocked(getCompletedEvents).mockReset();
  vi.mocked(getCompletedEvents).mockImplementation((q) =>
    Promise.resolve({
      ...fixture,
      items: q.paymentStatus === 'PAID' ? fixture.items.slice(0, 1) : fixture.items,
      total: q.paymentStatus === 'PAID' ? 1 : 2,
    }),
  );
});
describe('completed event dashboard', () => {
  it('shows separate hall leaders, item value and provisional debt; sends payment filters to the server', async () => {
    render(<CompletedEventsDashboard />);
    expect(await screen.findByText('Sử dụng nhiều nhất: Sảnh A.')).toBeInTheDocument();
    expect(screen.getByText('Doanh thu cao nhất: Sảnh B.')).toBeInTheDocument();
    expect(screen.getByText('Tạm tính — chưa chốt hóa đơn')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'HY-000001' })).toHaveAttribute(
      'href',
      `/billing?bookingId=${id(5)}`,
    );
    await selectOption('Xếp hạng sảnh theo', 'Doanh thu cao nhất');
    const halls = screen.getByRole('table', { name: 'Hiệu quả từng sảnh' });
    await waitFor(() => expect(within(halls).getAllByRole('row')[1]).toHaveTextContent('Sảnh B'));
    await selectOption('Lọc công nợ tiệc hoàn tất', 'Đã thanh toán');
    await waitFor(() =>
      expect(getCompletedEvents).toHaveBeenLastCalledWith(
        expect.objectContaining({ paymentStatus: 'PAID', page: 1 }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'HY-000002' })).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Doanh thu cao nhất: Sảnh B.')).toBeInTheDocument();
  });
  it('does not let a late response replace a different financial filter', async () => {
    let oldResolve!: (data: CompletedEventsData) => void;
    vi.mocked(getCompletedEvents)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          oldResolve = resolve;
        }),
      )
      .mockResolvedValueOnce({ ...fixture, items: [] });
    const { result, rerender } = renderHook(
      ({ status }) =>
        useCompletedEvents({ dateFrom: '2026-11-01', dateTo: '2026-11-30', paymentStatus: status }),
      { initialProps: { status: 'ALL' as 'ALL' | 'PAID' } },
    );
    await waitFor(() => expect(getCompletedEvents).toHaveBeenCalled());
    rerender({ status: 'PAID' });
    await waitFor(() => expect(result.current.data?.items).toEqual([]));
    await act(async () => {
      oldResolve(fixture);
      await Promise.resolve();
    });
    expect(result.current.data?.items).toEqual([]);
  });
  it('uses Vietnam month boundaries', () => {
    expect(currentVietnamMonth(new Date('2026-10-31T18:00:00Z'))).toEqual({
      dateFrom: '2026-11-01',
      dateTo: '2026-11-30',
    });
  });
  it('rejects an invalid date range without sending a financial query', async () => {
    render(<CompletedEventsDashboard />);
    await screen.findByText('Doanh thu cao nhất: Sảnh B.');
    fireEvent.change(screen.getByLabelText('Từ ngày tiệc'), { target: { value: '2027-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xem thống kê' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chọn khoảng ngày hợp lệ');
    expect(getCompletedEvents).toHaveBeenCalledTimes(1);
  });
});
