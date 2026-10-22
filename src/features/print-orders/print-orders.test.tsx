import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import type { ManagementIdentitySession } from '../identity-access/session';
import { DEMO_PRINT_ORDERS, createFixturePrintOrdersGateway } from './print-orders-fixtures';
import { ManagementPrintOrdersPage, PrintOrdersWorkspace } from './print-orders-page';
import type { PrintOrderView } from './print-orders-types';

afterEach(() => {
  vi.restoreAllMocks();
});

const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('test-token');

describe('Management Print Orders Workspace (M09–M14)', () => {
  it('renders the queue summary, filters, and orders table from authoritative gateway', async () => {
    const gateway = createFixturePrintOrdersGateway();
    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Hàng đợi đơn in' })).toBeVisible();
    expect(screen.getByText('Tổng đơn đang theo dõi')).toBeVisible();

    // Verify orders are rendered
    expect((await screen.findAllByText('IN-2408-018')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('IN-2408-017')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('IN-2408-016')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('IN-2408-015')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('IN-2408-014')).length).toBeGreaterThan(0);

    // Verify detail section for default selected order (IN-2408-018)
    expect(screen.getByRole('heading', { level: 2, name: /IN-2408-018/ })).toBeVisible();
    expect(screen.getByText('Dòng thiết kế đã chốt')).toBeVisible();
    expect(screen.getByText('Tóm tắt thương mại')).toBeVisible();
    expect(screen.getByText('Dòng thời gian đơn in')).toBeVisible();
  });

  it('filters table rows by text search query', async () => {
    const gateway = createFixturePrintOrdersGateway();
    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    await screen.findByRole('heading', { level: 1, name: 'Hàng đợi đơn in' });
    const searchInput = screen.getByLabelText('Tìm kiếm đơn in');

    // Search for "Minh Anh"
    fireEvent.change(searchInput, { target: { value: 'Minh Anh' } });
    expect(screen.getByRole('button', { name: /Chọn đơn in IN-2408-018/ })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Chọn đơn in IN-2408-017/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Chọn đơn in IN-2408-016/ }),
    ).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByRole('button', { name: /Chọn đơn in IN-2408-017/ })).toBeVisible();
  });

  it('filters table rows by status tab', async () => {
    const gateway = createFixturePrintOrdersGateway();
    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    await screen.findByRole('heading', { level: 1, name: 'Hàng đợi đơn in' });

    // Click "Đang sản xuất"
    fireEvent.click(screen.getByRole('button', { name: /Đang sản xuất/ }));
    expect(screen.getByRole('button', { name: /Chọn đơn in IN-2408-016/ })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Chọn đơn in IN-2408-018/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Chọn đơn in IN-2408-017/ }),
    ).not.toBeInTheDocument();

    // Click "Sẵn sàng"
    fireEvent.click(screen.getByRole('button', { name: /Sẵn sàng/ }));
    expect(screen.getByRole('button', { name: /Chọn đơn in IN-2408-014/ })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Chọn đơn in IN-2408-016/ }),
    ).not.toBeInTheDocument();
  });

  it('selects a different order row to view its details and commercial terms', async () => {
    const gateway = createFixturePrintOrdersGateway();
    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    const row17 = await screen.findByRole('button', { name: /Chọn đơn in IN-2408-017/ });
    fireEvent.click(row17);

    // Check detail updates
    expect(screen.getByRole('heading', { level: 2, name: /IN-2408-017/ })).toBeVisible();
    expect(screen.getAllByText(/Thanh Vy & Đức Huy/).length).toBeGreaterThan(0);
  });

  it('allows Manager to transition an APPROVED order to IN_PRODUCTION with expectedRevision', async () => {
    const gateway = createFixturePrintOrdersGateway();
    const startSpy = vi.spyOn(gateway, 'startProduction');

    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    await screen.findByRole('button', { name: /Chọn đơn in IN-2408-018/ });
    const startButton = screen.getByRole('button', { name: 'Bắt đầu sản xuất' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalledWith(
        'test-token',
        'IN-2408-018',
        { expectedRevision: 3 },
        expect.stringContaining('start-prod-IN-2408-018-3'),
      );
    });

    expect(
      await screen.findByText(/Đã chuyển đơn IN-2408-018 sang trạng thái Đang sản xuất/),
    ).toBeVisible();
  });

  it('allows Manager to mark IN_PRODUCTION order as READY_FOR_HANDOVER', async () => {
    const gateway = createFixturePrintOrdersGateway();
    const readySpy = vi.spyOn(gateway, 'markReady');

    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    const row16 = await screen.findByRole('button', { name: /Chọn đơn in IN-2408-016/ });
    fireEvent.click(row16);

    const readyButton = await screen.findByRole('button', { name: 'Sẵn sàng bàn giao' });
    fireEvent.click(readyButton);

    await waitFor(() => {
      expect(readySpy).toHaveBeenCalledWith(
        'test-token',
        'IN-2408-016',
        { expectedRevision: 4 },
        expect.stringContaining('mark-ready-IN-2408-016-4'),
      );
    });

    expect(await screen.findByText(/Đơn IN-2408-016 đã sẵn sàng bàn giao/)).toBeVisible();
  });

  it('allows Manager to handover a READY_FOR_HANDOVER order with evidence reference', async () => {
    const gateway = createFixturePrintOrdersGateway();
    const handoverSpy = vi.spyOn(gateway, 'markHandedOver');

    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    const row14 = await screen.findByRole('button', { name: /Chọn đơn in IN-2408-014/ });
    fireEvent.click(row14);

    const handoverBtn = await screen.findByRole('button', { name: 'Bàn giao đơn in' });
    fireEvent.click(handoverBtn);

    // Modal dialog opens
    expect(screen.getByRole('dialog', { name: /Xác nhận bàn giao/ })).toBeVisible();

    const input = screen.getByPlaceholderText('Ví dụ: BG-2408-014-KHO');
    fireEvent.change(input, { target: { value: 'BG-2026-XUONG-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận bàn giao' }));

    await waitFor(() => {
      expect(handoverSpy).toHaveBeenCalledWith(
        'test-token',
        'IN-2408-014',
        {
          expectedRevision: 3,
          evidenceReference: 'BG-2026-XUONG-01',
        },
        expect.stringContaining('handover-IN-2408-014-3'),
      );
    });

    expect(await screen.findByText(/Đã bàn giao đơn IN-2408-014 thành công/)).toBeVisible();
  });

  it('opens Quote Drawer for expired quote and submits new revision', async () => {
    const gateway = createFixturePrintOrdersGateway();
    const quoteSpy = vi.spyOn(gateway, 'quote');

    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    // Select order IN-2408-015 which has expired quote
    const row15 = await screen.findByRole('button', { name: /Chọn đơn in IN-2408-015/ });
    fireEvent.click(row15);

    const quoteBtn = await screen.findByRole('button', { name: 'Gửi báo giá mới' });
    fireEvent.click(quoteBtn);

    // Drawer should open
    expect(screen.getByRole('dialog', { name: /Gửi báo giá mới/ })).toBeVisible();
    expect(screen.getByText('Báo giá cũ đã hết hạn')).toBeVisible();

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Tạo revision 2' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(quoteSpy).toHaveBeenCalledTimes(1);
    });
    const quoteCall = quoteSpy.mock.calls[0];
    expect(quoteCall).toBeDefined();
    if (!quoteCall) throw new Error('quoteSpy was not called');
    expect(quoteCall[0]).toBe('test-token');
    expect(quoteCall[1]).toBe('IN-2408-015');
    expect(quoteCall[2].expectedRevision).toBe(1);
    expect(quoteCall[2].lines[0]?.lineId).toBe('line_15_1');
    expect(quoteCall[2].lines[0]?.unitPriceVnd).toBe(65000);
    expect(quoteCall[3]).toContain('quote-IN-2408-015-1');

    expect(await screen.findByText(/Đã tạo báo giá Rev 2/)).toBeVisible();
  });

  it('displays "Tạo revision 1" for a newly requested order without existing quote', async () => {
    const gateway = createFixturePrintOrdersGateway();
    const quoteSpy = vi.spyOn(gateway, 'quote');

    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    // Select order IN-2408-019 which is in REQUESTED state
    const row19 = await screen.findByRole('button', { name: /Chọn đơn in IN-2408-019/ });
    fireEvent.click(row19);

    const quoteBtn = await screen.findByRole('button', { name: 'Lập báo giá' });
    fireEvent.click(quoteBtn);

    expect(screen.getByRole('dialog', { name: /Lập báo giá thương mại/ })).toBeVisible();

    const submitBtn = screen.getByRole('button', { name: 'Tạo revision 1' });
    expect(submitBtn).toBeVisible();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(quoteSpy).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(/Đã tạo báo giá Rev 1/)).toBeVisible();
  });

  it('handles 409 stale revision conflict gracefully without breaking', async () => {
    const gateway = createFixturePrintOrdersGateway();
    vi.spyOn(gateway, 'startProduction').mockRejectedValueOnce(
      new ApiClientError({
        kind: 'api',
        code: 'PRINT_ORDER_CONFLICT',
        message: 'Stale revision conflict',
        requestId: 'req-409',
        status: 409,
      }),
    );

    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    await screen.findByRole('button', { name: /Chọn đơn in IN-2408-018/ });
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu sản xuất' }));

    expect(
      await screen.findByText(/Dữ liệu đã thay đổi trên máy chủ \(409 conflict\)/),
    ).toBeVisible();
  });

  it('explains the business rule that Manager cannot create orders on behalf of Couple', async () => {
    const gateway = createFixturePrintOrdersGateway();
    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    await screen.findByRole('heading', { level: 1, name: 'Hàng đợi đơn in' });
    fireEvent.click(screen.getByRole('button', { name: /Tạo đơn in/ }));

    expect(screen.getByRole('dialog', { name: 'Quy trình khởi tạo đơn in' })).toBeVisible();
    expect(
      screen.getByText(
        /Theo quy định nghiệp vụ hệ thống, đơn in ấn vật lý do Couple khởi tạo trực tiếp/,
      ),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));
    expect(
      screen.queryByRole('dialog', { name: 'Quy trình khởi tạo đơn in' }),
    ).not.toBeInTheDocument();
  });

  it('closes modals with Escape key', async () => {
    const gateway = createFixturePrintOrdersGateway();
    render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={vi.fn()}
      />,
    );

    await screen.findByRole('heading', { level: 1, name: 'Hàng đợi đơn in' });
    fireEvent.click(screen.getByRole('button', { name: 'Xem lịch sử' }));

    expect(screen.getByRole('dialog', { name: /Lịch sử đơn in/ })).toBeVisible();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /Lịch sử đơn in/ })).not.toBeInTheDocument();
  });
});
