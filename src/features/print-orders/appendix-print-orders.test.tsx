import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_PRINT_ORDERS } from './print-orders-fixtures';
import { PrintOrdersDetail } from './print-orders-detail';
import { PrintPurchasePreview } from './print-purchase-preview';
import {
  canCancelOrder,
  canProposeReplacement,
  canQuoteOrder,
  canStartProduction,
  type PrintOrderView,
} from './print-orders-types';

const order: PrintOrderView = {
  ...DEMO_PRINT_ORDERS[0]!,
  appendixSource: { requestId: 'request-1', appendixRevisionId: 'appendix-1' },
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('appendix-authorized print tracking', () => {
  it('blocks production while a changed print appendix awaits mutual approval', () => {
    const pendingOrder: PrintOrderView = {
      ...order,
      appendixSource: { ...order.appendixSource!, pendingAppendixRevisionId: 'pending-appendix' },
    };
    expect(canStartProduction(pendingOrder)).toBe(false);
    render(
      <PrintOrdersDetail
        selectedOrder={pendingOrder}
        isSubmitting={false}
        onStartProduction={vi.fn()}
        onMarkReady={vi.fn()}
        onOpenHandoverModal={vi.fn()}
        onOpenQuoteDrawer={vi.fn()}
        onOpenCancelModal={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Bắt đầu sản xuất' })).not.toBeInTheDocument();
    expect(screen.getByText(/Sản xuất tạm dừng.*phụ lục điều chỉnh/)).toBeVisible();
  });
  it('offers production without a second quotation, approval or direct cancellation', () => {
    expect(canQuoteOrder(order)).toBe(false);
    expect(canProposeReplacement(order)).toBe(false);
    expect(canCancelOrder(order)).toBe(false);
    render(
      <PrintOrdersDetail
        selectedOrder={order}
        isSubmitting={false}
        onStartProduction={vi.fn()}
        onMarkReady={vi.fn()}
        onOpenHandoverModal={vi.fn()}
        onOpenQuoteDrawer={vi.fn()}
        onOpenCancelModal={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Bắt đầu sản xuất' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /báo giá|Duyệt đơn|thay thế|Hủy đơn/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /phụ lục/i })).toHaveAttribute(
      'href',
      expect.stringContaining(order.bookingId),
    );
  });

  it('provides a separate retained preview for every design in an order', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:3001/api/v1');
    const fetchFile = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
    render(<PrintPurchasePreview order={order} authorize={(work) => work('token')} />);
    expect(screen.getAllByRole('button', { name: /Xem bản in/ })).toHaveLength(order.lines.length);
    expect(screen.getByText(order.lines[0]!.displayVariant!)).toBeVisible();
    expect(screen.getByText(order.lines[1]!.displayVariant!)).toBeVisible();
    fireEvent.click(screen.getAllByRole('button', { name: /Xem bản in/ })[1]!);
    expect(screen.getByRole('button', { name: /Đang tải/ })).toBeDisabled();
    await vi.waitFor(() =>
      expect(fetchFile).toHaveBeenCalledWith(
        expect.stringContaining(`/printable-revisions/${order.lines[1]!.printableRevisionId}/file`),
        expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
      ),
    );
  });
});
