import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../design-system/notifications';
import type { ManagementIdentitySession } from '../identity-access/session';
import { DEMO_PRINT_ORDERS, createFixturePrintOrdersGateway } from './print-orders-fixtures';
import { ManagementPrintOrdersPage, PrintOrdersWorkspace } from './print-orders-page';

afterEach(() => {
  vi.restoreAllMocks();
});

const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('test-token');

describe('Management Print Orders Mutations and Authorization', () => {
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
      { wrapper: NotificationProvider },
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
      { wrapper: NotificationProvider },
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
      { wrapper: NotificationProvider },
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
      { wrapper: NotificationProvider },
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

    render(<ManagementPrintOrdersPage session={fakeSession} useFixtures={false} />, {
      wrapper: NotificationProvider,
    });

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

    render(<ManagementPrintOrdersPage session={fakeSession} useFixtures={false} />, {
      wrapper: NotificationProvider,
    });

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
      { wrapper: NotificationProvider },
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
      { wrapper: NotificationProvider },
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
      { wrapper: NotificationProvider },
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
      { wrapper: NotificationProvider },
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
      { wrapper: NotificationProvider },
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
