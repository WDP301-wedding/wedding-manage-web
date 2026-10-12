import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../lib/api/client';
import type { ManagementIdentitySession } from '../identity-access/session';
import { DEMO_PRINT_ORDERS, createFixturePrintOrdersGateway } from './print-orders-fixtures';
import { ManagementPrintOrdersPage, PrintOrdersWorkspace } from './print-orders-page';

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

  it('supports real cursor pagination with next and prev actions', async () => {
    const gateway = createFixturePrintOrdersGateway();
    vi.spyOn(gateway, 'list')
      .mockResolvedValueOnce({
        items: [DEMO_PRINT_ORDERS[0]!, DEMO_PRINT_ORDERS[1]!],
        nextCursor: 'cursor-page-2',
      })
      .mockResolvedValueOnce({
        items: [DEMO_PRINT_ORDERS[2]!, DEMO_PRINT_ORDERS[3]!],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        items: [DEMO_PRINT_ORDERS[0]!, DEMO_PRINT_ORDERS[1]!],
        nextCursor: 'cursor-page-2',
      });

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
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    const nextBtn = screen.getByRole('button', { name: 'Trang sau' });
    expect(nextBtn).toBeEnabled();

    // Advance to next page
    fireEvent.click(nextBtn);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Trang trước' })).toBeEnabled();
    });
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled();

    // Return to previous page
    fireEvent.click(screen.getByRole('button', { name: 'Trang trước' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
    });
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeEnabled();
  });

  it('allows Manager to cancel an order with reason and expected revision', async () => {
    const gateway = createFixturePrintOrdersGateway();
    const cancelSpy = vi.spyOn(gateway, 'cancel');

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

    // Default order IN-2408-018 is APPROVED
    await screen.findByRole('button', { name: /Chọn đơn in IN-2408-018/ });
    const cancelBtn = screen.getByRole('button', { name: 'Hủy đơn in' });
    fireEvent.click(cancelBtn);

    // Cancel modal opens
    expect(screen.getByRole('dialog', { name: /Xác nhận hủy đơn in/ })).toBeVisible();
    expect(
      screen.getByText(
        /Hệ thống sẽ ghi nhận bút toán tín dụng \(Credit Adjustment \/ Credit Note\)/,
      ),
    ).toBeVisible();

    const reasonInput = screen.getByPlaceholderText(
      /Ghi rõ lý do hủy hoặc căn cứ thỏa thuận với Couple/,
    );
    fireEvent.change(reasonInput, {
      target: { value: 'Couple yêu cầu hủy theo thỏa thuận số 45' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hủy đơn in' }));

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith(
        'test-token',
        'IN-2408-018',
        {
          expectedRevision: 3,
          reason: 'Couple yêu cầu hủy theo thỏa thuận số 45',
        },
        expect.stringContaining('cancel-IN-2408-018-3'),
      );
    });

    expect(await screen.findByText(/Đã hủy đơn IN-2408-018/)).toBeVisible();
  });

  it('renders all design lines and calculates totals for multi-line order', async () => {
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

    // IN-2408-018 has 2 lines: line_18_1 (220 qty) and line_18_2 (220 qty)
    await screen.findByRole('button', { name: /Chọn đơn in IN-2408-018/ });
    expect(screen.getAllByText(/Thiệp gập · Ivory/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Thiệp cảm ơn đi kèm/)).toBeVisible();
    expect(screen.getByText('440 bản in')).toBeVisible();
    expect(screen.getByText('18.700.000 ₫')).toBeVisible();
  });

  it('displays pending replacement proposal warning and blocks production until approved', async () => {
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

    // Select IN-2408-020 which has pending proposal
    const row20 = await screen.findByRole('button', { name: /Chọn đơn in IN-2408-020/ });
    fireEvent.click(row20);

    expect(screen.getByText(/Chờ Couple phản hồi · Sản xuất đang bị tạm dừng\./)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Bắt đầu sản xuất' })).not.toBeInTheDocument();
  });

  it('gates anonymous users with login required screen', async () => {
    const fakeSession = {
      restore: vi.fn().mockResolvedValue({ status: 'anonymous', denial: null }),
      authorize: vi.fn(),
      logout: vi.fn(),
    } as unknown as ManagementIdentitySession;

    render(<ManagementPrintOrdersPage session={fakeSession} useFixtures={false} />);

    expect(await screen.findByText('Yêu cầu đăng nhập')).toBeVisible();
    expect(screen.getByText(/Bạn cần đăng nhập bằng tài khoản Quản lý \(Manager\)/)).toBeVisible();
  });

  it('denies access to Staff users and provides logout action', async () => {
    const logoutMock = vi.fn().mockResolvedValue(undefined);
    const fakeSession = {
      restore: vi.fn().mockResolvedValue({
        status: 'authenticated',
        actor: {
          accountId: 'staff-1',
          displayEmail: 'staff@example.com',
          roles: ['STAFF'] as const,
          sessionId: 's-1',
        },
        presentation: 'staff' as const,
        denial: null,
      }),
      authorize: vi.fn(),
      logout: logoutMock,
    } as unknown as ManagementIdentitySession;

    render(<ManagementPrintOrdersPage session={fakeSession} useFixtures={false} />);

    expect(await screen.findByText('Truy cập bị từ chối')).toBeVisible();
    expect(screen.getByText(/thuộc vai trò Nhân viên vận hành \(Staff\)/)).toBeVisible();

    const logoutBtn = screen.getByRole('button', { name: 'Đăng xuất' });
    fireEvent.click(logoutBtn);
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('disables action buttons while an async mutation is in progress', async () => {
    const gateway = createFixturePrintOrdersGateway();
    let resolveStart: (value: (typeof DEMO_PRINT_ORDERS)[number]) => void;
    const pendingPromise = new Promise<(typeof DEMO_PRINT_ORDERS)[number]>((resolve) => {
      resolveStart = resolve;
    });
    vi.spyOn(gateway, 'startProduction').mockImplementationOnce(() => pendingPromise);

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
    const startBtn = screen.getByRole('button', { name: 'Bắt đầu sản xuất' });
    fireEvent.click(startBtn);

    // Button should now be disabled
    expect(startBtn).toBeDisabled();

    // Resolve
    resolveStart!({
      ...DEMO_PRINT_ORDERS[0]!,
      status: 'IN_PRODUCTION',
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Bắt đầu sản xuất' })).not.toBeInTheDocument();
    });
  });

  it('validates unit prices strictly and rejects decimal/negative values', async () => {
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

    const row15 = await screen.findByRole('button', { name: /Chọn đơn in IN-2408-015/ });
    fireEvent.click(row15);

    fireEvent.click(await screen.findByRole('button', { name: 'Gửi báo giá mới' }));
    expect(screen.getByRole('dialog', { name: /Gửi báo giá mới/ })).toBeVisible();

    const firstPriceInput = screen.getByLabelText('Đơn giá dòng 1');

    // Enter negative price
    fireEvent.change(firstPriceInput, { target: { value: '-5000' } });
    expect(screen.getByText('Đơn giá không được là số âm.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Tạo revision/ })).toBeDisabled();

    // Enter decimal price
    fireEvent.change(firstPriceInput, { target: { value: '12.5' } });
    expect(
      screen.getByText('Đơn giá phải là số nguyên dương VND, không chứa phần thập phân.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /Tạo revision/ })).toBeDisabled();

    // Enter valid integer price
    fireEvent.change(firstPriceInput, { target: { value: '70000' } });
    expect(screen.queryByText('Đơn giá không được là số âm.')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Đơn giá phải là số nguyên dương VND, không chứa phần thập phân.'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tạo revision/ })).toBeEnabled();
  });

  it('requires cancellation reason for APPROVED orders and explains couple intent check', async () => {
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

    const row18 = await screen.findByRole('button', { name: /Chọn đơn in IN-2408-018/ });
    fireEvent.click(row18);

    fireEvent.click(await screen.findByRole('button', { name: 'Hủy đơn in' }));
    expect(screen.getByRole('dialog', { name: /Xác nhận hủy đơn in/ })).toBeVisible();

    // Verify explanation of Couple verification and billing credit
    expect(screen.getByText(/Đơn in này đã được Couple chấp thuận/)).toBeVisible();
    expect(
      screen.getByText(/Lý do hủy là bắt buộc đối với đơn in đã được phê duyệt/),
    ).toBeVisible();

    const confirmCancelBtn = screen.getByRole('button', { name: 'Xác nhận hủy đơn in' });
    expect(confirmCancelBtn).toBeDisabled();

    // Enter whitespace only -> still disabled
    const reasonInput = screen.getByPlaceholderText(/Ghi rõ lý do hủy hoặc căn cứ thỏa thuận/);
    fireEvent.change(reasonInput, { target: { value: '   ' } });
    expect(confirmCancelBtn).toBeDisabled();

    // Enter valid reason -> enables
    fireEvent.change(reasonInput, {
      target: { value: 'Couple yêu cầu hủy và hoàn credit theo biên bản #102' },
    });
    expect(confirmCancelBtn).toBeEnabled();
  });

  it('aborts mutation without silently acting when server revision has changed', async () => {
    const gateway = createFixturePrintOrdersGateway();
    // Simulate server having a newer revision (rev 4) when getting fresh order
    vi.spyOn(gateway, 'get').mockResolvedValueOnce({
      ...DEMO_PRINT_ORDERS[0]!,
      revision: 4,
    });
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
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu sản xuất' }));

    // Should detect revision mismatch and abort without calling startProduction
    expect(
      await screen.findByText(/Phiên bản đơn in đã thay đổi trên máy chủ \(từ Rev 3 sang Rev 4\)/),
    ).toBeVisible();
    expect(startSpy).not.toHaveBeenCalled();
  });

  it('discards in-flight fetch response arriving after user logs out', () => {
    let resolveOrders: (value: { items: typeof DEMO_PRINT_ORDERS; nextCursor: null }) => void;
    const delayedPromise = new Promise<{ items: typeof DEMO_PRINT_ORDERS; nextCursor: null }>(
      (resolve) => {
        resolveOrders = resolve;
      },
    );

    const gateway = createFixturePrintOrdersGateway();
    vi.spyOn(gateway, 'list').mockImplementationOnce(() => delayedPromise);

    const onLogoutMock = vi.fn();
    const { unmount } = render(
      <PrintOrdersWorkspace
        actorName="manager@example.com"
        actorRole="Manager"
        gateway={gateway}
        authorize={authorize}
        isFixtureMode={false}
        onLogout={onLogoutMock}
      />,
    );

    // Click logout
    const logoutBtn = screen.getByRole('button', { name: 'Đăng xuất' });
    fireEvent.click(logoutBtn);
    expect(onLogoutMock).toHaveBeenCalled();

    // Unmount simulated after logout
    unmount();

    // Resolve delayed response
    resolveOrders!({
      items: DEMO_PRINT_ORDERS,
      nextCursor: null,
    });

    // Should not throw any unhandled error or update unmounted state
  });
});
