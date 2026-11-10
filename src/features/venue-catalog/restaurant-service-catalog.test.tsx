import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../design-system/notifications';
import { axiosApiClient } from '../../lib/api/axios-client';
import { ApiClientError } from '../../lib/api/client';
import { OfferingCatalog } from './offering-catalog';

vi.mock('../../lib/api/axios-client', () => ({
  axiosApiClient: { get: vi.fn(), request: vi.fn() },
}));
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('manager-token');
const mc = {
  serviceId: 'mc',
  sourceRevisionId: 'mc-v3',
  restaurantId: 'restaurant',
  revision: 3,
  name: 'MC tiệc cưới',
  description: 'Dẫn chương trình trọn buổi',
  unit: 'buổi',
  unitPriceVnd: 2000000,
  active: true,
};
const lion = { ...mc, serviceId: 'lion', name: 'Múa lân', active: false };
const page = (items: unknown[], nextCursor: string | null = null) => ({
  data: { data: { items, nextCursor } },
});
function mount() {
  return render(<OfferingCatalog kind="services" authorize={authorize} />, {
    wrapper: NotificationProvider,
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(axiosApiClient.get).mockResolvedValue(page([mc, lion]));
  vi.mocked(axiosApiClient.request).mockResolvedValue({ data: { data: { ...mc, revision: 4 } } });
});
describe('restaurant service catalog', () => {
  it('creates an active service with the strict API fields and integer VND', async () => {
    mount();
    await screen.findByText(mc.name);
    fireEvent.change(screen.getByLabelText('Tên dịch vụ'), { target: { value: '  Ban nhạc  ' } });
    fireEvent.change(screen.getByLabelText('Đơn vị tính'), { target: { value: 'tiết mục' } });
    fireEvent.change(screen.getByLabelText('Đơn giá (VND)'), { target: { value: '3500000' } });
    expect(screen.queryByLabelText('Quy tắc tính phí')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu dịch vụ' }));
    await waitFor(() =>
      expect(axiosApiClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/management/services',
          data: {
            name: 'Ban nhạc',
            description: '',
            unit: 'tiết mục',
            unitPriceVnd: 3500000,
            active: true,
          },
        }),
      ),
    );
    await waitFor(() => expect(screen.getByLabelText('Tên dịch vụ')).toHaveValue(''));
  });
  it('loads all pages and restores an archived service only after confirmation', async () => {
    vi.mocked(axiosApiClient.get)
      .mockResolvedValueOnce(page([mc], 'next'))
      .mockResolvedValue(page([lion]));
    mount();
    await screen.findByText(mc.name);
    expect(axiosApiClient.get).toHaveBeenCalledWith(
      '/management/services',
      expect.objectContaining({ params: { limit: 50, cursor: 'next' } }),
    );
    fireEvent.change(screen.getByLabelText('Lọc trạng thái dịch vụ'), {
      target: { value: 'INACTIVE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Khôi phục Múa lân' }));
    expect(screen.getByRole('group', { name: 'Xác nhận thay đổi trạng thái' })).toHaveTextContent(
      'Hợp đồng và phụ lục đã chốt giữ nguyên',
    );
    expect(axiosApiClient.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận khôi phục' }));
    await waitFor(() =>
      expect(axiosApiClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: '/management/services/lion',
          data: {
            expectedRevision: 3,
            name: lion.name,
            description: lion.description,
            unit: lion.unit,
            unitPriceVnd: lion.unitPriceVnd,
            active: true,
          },
        }),
      ),
    );
  });
  it('editing an archived service does not restore it', async () => {
    mount();
    await screen.findByText(mc.name);
    fireEvent.change(screen.getByLabelText('Lọc trạng thái dịch vụ'), {
      target: { value: 'INACTIVE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Múa lân' }));
    fireEvent.change(screen.getByLabelText('Đơn giá (VND)'), { target: { value: '5000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu dịch vụ' }));
    await waitFor(() =>
      expect(axiosApiClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            active: false,
            expectedRevision: 3,
            unitPriceVnd: 5000000,
          }),
        }),
      ),
    );
  });
  it('preserves a stale edit on conflict and permits an explicit reload without rebasing the draft', async () => {
    vi.mocked(axiosApiClient.request).mockRejectedValue(
      new ApiClientError({
        kind: 'api',
        status: 409,
        code: 'COMMERCIAL_PRICE_REVISION_STALE',
        message: 'stale',
        requestId: 'test',
      }),
    );
    mount();
    fireEvent.click(await screen.findByRole('button', { name: `Sửa ${mc.name}` }));
    fireEvent.change(screen.getByLabelText('Tên dịch vụ'), { target: { value: 'Tên đang sửa' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu dịch vụ' }));
    const catalog = within(screen.getByRole('region', { name: 'Dịch vụ nhà hàng' }));
    const alert = await catalog.findByRole('alert');
    expect(alert).toHaveTextContent('Dữ liệu đã thay đổi');
    vi.mocked(axiosApiClient.get).mockResolvedValue(page([{ ...mc, revision: 4 }]));
    fireEvent.click(within(alert).getByRole('button', { name: 'Tải lại' }));
    await waitFor(() => expect(catalog.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Tên dịch vụ')).toHaveValue('Tên đang sửa');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu dịch vụ' }));
    await waitFor(() => expect(axiosApiClient.request).toHaveBeenCalledTimes(2));
    expect(vi.mocked(axiosApiClient.request).mock.calls[1]?.[0].data).toEqual(
      expect.objectContaining({ expectedRevision: 3 }),
    );
  });
  it('shows a retryable load error and prevents creating from an incomplete paginated read', async () => {
    vi.mocked(axiosApiClient.get).mockResolvedValue(page([mc], 'loop'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa tải được danh mục');
    expect(screen.getByRole('button', { name: 'Lưu dịch vụ' })).toBeDisabled();
    vi.mocked(axiosApiClient.get).mockResolvedValue(page([]));
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu dịch vụ' })).toBeEnabled());
    expect(screen.getByRole('status')).toHaveTextContent('Không có dịch vụ');
  });
});
