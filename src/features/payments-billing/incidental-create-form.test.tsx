import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IncidentalCreateForm } from './incidental-create-form';

const price = {
  offeringId: 'beer',
  revision: 1,
  name: 'Bia A',
  description: '24 lon 330 ml',
  unit: 'thùng',
  unitPriceVnd: 300000,
  chargingRule: 'Thùng đã mở',
};
describe('booking-frozen incidental selection', () => {
  it('locks catalog name/unit/price and sends quantity with source identity', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<IncidentalCreateForm pricing={[price]} onSubmit={submit} onCancel={() => undefined} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'beer' } });
    expect(screen.getByLabelText('Đơn giá (VND) *')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Tên hạng mục *')).toHaveValue('Bia A');
    fireEvent.change(screen.getByLabelText('Số lượng *'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu phát sinh' }));
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          offeringId: 'beer',
          sourceType: 'CATALOG',
          quantity: 5,
          unitPriceVnd: 300000,
        }),
      ),
    );
  });
  it('requires a specific OTHER reason with no upload flow', () => {
    render(
      <IncidentalCreateForm pricing={[price]} onSubmit={vi.fn()} onCancel={() => undefined} />,
    );
    expect(screen.getByLabelText('Lý do phát sinh *')).toBeRequired();
    expect(document.querySelector('input[type=file]')).toBeNull();
  });
});
