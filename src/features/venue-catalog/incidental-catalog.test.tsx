import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../design-system/notifications';
import { axiosApiClient } from '../../lib/api/axios-client';
import { IncidentalCatalog } from './incidental-catalog';

vi.mock('../../lib/api/axios-client', () => ({
  axiosApiClient: { get: vi.fn(), request: vi.fn() },
}));
const authorize = <T,>(operation: (token: string) => Promise<T>) => operation('manager-token');
const beer = {
  offeringId: 'beer',
  revision: 3,
  name: 'Bia Tiger',
  description: 'Thùng 24 lon',
  unit: 'thùng',
  unitPriceVnd: 400000,
  chargingRule: 'Tính theo thùng đã mở',
  active: true,
};
const water = { ...beer, offeringId: 'water', name: 'Nước suối', active: false };
function mount() {
  return render(<IncidentalCatalog authorize={authorize} />, { wrapper: NotificationProvider });
}
function filter(value: string) {
  fireEvent.change(screen.getByRole('combobox', { name: 'Lọc trạng thái hạng mục' }), {
    target: { value },
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(axiosApiClient.get).mockResolvedValue({
    data: { data: { items: [beer, water], nextCursor: null } },
  });
  vi.mocked(axiosApiClient.request).mockResolvedValue({
    data: { data: { ...beer, revision: 4, active: false } },
  });
});
describe('incidental catalog lifecycle', () => {
  it('defaults to active items and exposes archived items through the filter', async () => {
    mount();
    await screen.findByText('Bia Tiger');
    expect(screen.queryByText('Nước suối')).not.toBeInTheDocument();
    filter('INACTIVE');
    expect(screen.getByText('Nước suối')).toBeVisible();
    expect(screen.queryByText('Bia Tiger')).not.toBeInTheDocument();
    filter('ALL');
    expect(screen.getByText('Bia Tiger')).toBeVisible();
    expect(screen.getByText('Nước suối')).toBeVisible();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it('confirms before archiving and sends the exact item revision and frozen pricing facts', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Ngừng sử dụng Bia Tiger' }));
    const confirmation = screen.getByRole('group', { name: 'Xác nhận thay đổi trạng thái' });
    expect(confirmation).toHaveTextContent('Booking đã có vẫn giữ nguyên bảng giá');
    expect(axiosApiClient.request).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Hủy' }));
    expect(axiosApiClient.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ngừng sử dụng Bia Tiger' }));
    vi.mocked(axiosApiClient.get).mockResolvedValue({
      data: { data: { items: [{ ...beer, revision: 4, active: false }, water], nextCursor: null } },
    });
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Xác nhận thay đổi trạng thái' })).getByRole(
        'button',
        { name: 'Xác nhận ngừng' },
      ),
    );
    await waitFor(() =>
      expect(axiosApiClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: '/management/incidental-offerings/beer',
          data: {
            name: beer.name,
            description: beer.description,
            unit: beer.unit,
            unitPriceVnd: beer.unitPriceVnd,
            chargingRule: beer.chargingRule,
            active: false,
            expectedRevision: 3,
          },
          headers: { Authorization: 'Bearer manager-token', 'Idempotency-Key': expect.any(String) },
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByText('Bia Tiger')).not.toBeInTheDocument());
    filter('INACTIVE');
    expect(screen.getByRole('button', { name: 'Khôi phục Bia Tiger' })).toBeVisible();
  });
  it('keeps a failed intent retryable with the same idempotency key and no optimistic state change', async () => {
    vi.mocked(axiosApiClient.request).mockRejectedValue(new Error('offline'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Ngừng sử dụng Bia Tiger' }));
    const confirm = () => screen.getByRole('button', { name: 'Xác nhận ngừng' });
    fireEvent.click(confirm());
    await waitFor(() => expect(confirm()).toBeEnabled());
    expect(screen.getByRole('button', { name: 'Ngừng sử dụng Bia Tiger' })).toBeVisible();
    fireEvent.click(confirm());
    await waitFor(() => expect(axiosApiClient.request).toHaveBeenCalledTimes(2));
    expect(vi.mocked(axiosApiClient.request).mock.calls[0]?.[0]).toEqual(
      vi.mocked(axiosApiClient.request).mock.calls[1]?.[0],
    );
  });
  it('does not clear an unsaved form on a status change to the edited item', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa Bia Tiger' }));
    fireEvent.change(screen.getByLabelText('Tên hạng mục'), { target: { value: 'Bia Tiger mới' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ngừng sử dụng Bia Tiger' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận ngừng' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu hạng mục' })).toBeEnabled());
    expect(screen.getByLabelText('Tên hạng mục')).toHaveValue('Bia Tiger mới');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hạng mục' }));
    await waitFor(() =>
      expect(axiosApiClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Bia Tiger mới',
            active: false,
            expectedRevision: 4,
          }),
        }),
      ),
    );
  });
});
