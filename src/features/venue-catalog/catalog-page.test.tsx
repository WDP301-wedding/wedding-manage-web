import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../lib/api/client';
import type { VenueCatalogGateway } from './catalog-api';
import { VenueCatalogWorkspace } from './catalog-page';

const hallId = '00000000-0000-4000-8000-000000000011';

function snapshot() {
  return {
    restaurant: {
      id: '00000000-0000-4000-8000-000000000001',
      displayName: 'Wedding Estate',
      description: 'Không gian tiệc cưới',
      address: '01 Đại lộ Lễ Hội',
      publicPhone: '028 1234 5678',
      publicEmail: 'hello@example.com',
      revision: 4,
    },
    shifts: [
      {
        code: 'LUNCH' as const,
        startTime: '10:00',
        endTime: '14:00',
        isActive: true,
        revision: 2,
      },
      {
        code: 'DINNER' as const,
        startTime: '17:00',
        endTime: '22:00',
        isActive: false,
        revision: 5,
      },
    ],
    halls: [
      {
        id: hallId,
        name: 'Sảnh Ánh Dương',
        description: 'Sảnh chính',
        maxGuests: 320,
        displayOrder: 1,
        lifecycle: 'ACTIVE' as const,
        revision: 3,
        retiredAt: null,
      },
      {
        id: '00000000-0000-4000-8000-000000000012',
        name: 'Sảnh Hoa Hồng',
        description: 'Đã ngừng nhận tiệc',
        maxGuests: 120,
        displayOrder: 2,
        lifecycle: 'RETIRED' as const,
        revision: 7,
        retiredAt: '2026-10-01T00:00:00.000Z',
      },
    ],
  };
}

function gateway(overrides: Partial<VenueCatalogGateway> = {}): VenueCatalogGateway {
  return {
    loadVenue: vi.fn(() => Promise.resolve(snapshot())),
    updateRestaurant: vi.fn(() => Promise.resolve()),
    updateShift: vi.fn(() => Promise.resolve()),
    createHall: vi.fn(() => Promise.resolve()),
    updateHall: vi.fn(() => Promise.resolve()),
    changeHallLifecycle: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

const authorize = <T,>(operation: (accessToken: string) => Promise<T>) =>
  operation('manager-token');

describe('VC-18 venue catalog workspace', () => {
  it('switches four catalog tabs with keyboard support and preserves unsaved venue fields', async () => {
    render(<VenueCatalogWorkspace role="MANAGER" gateway={gateway()} authorize={authorize} />);
    await screen.findByRole('heading', { name: 'Danh mục địa điểm' });
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), {
      target: { value: 'Chỉnh sửa chưa lưu' },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Bố cục bàn' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'catalog-panel-layout');
    expect(screen.queryByRole('textbox', { name: 'Tên hiển thị' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Bố cục bàn' }), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'Nhà hàng & sảnh' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText('Tên hiển thị')).toHaveValue('Chỉnh sửa chưa lưu');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Nhà hàng & sảnh' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'catalog-panel-food');
  });
  it('loads Manager venue state and submits the server revision without inventing authority', async () => {
    const updateRestaurant = vi.fn(() => Promise.resolve());
    const api = gateway({ updateRestaurant });
    render(<VenueCatalogWorkspace role="MANAGER" gateway={api} authorize={authorize} />);

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải danh mục');
    expect(await screen.findByRole('heading', { name: 'Danh mục địa điểm' })).toBeVisible();

    fireEvent.change(screen.getByLabelText('Tên hiển thị'), {
      target: { value: 'Wedding Estate Riverside' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ nhà hàng' }));

    await waitFor(() =>
      expect(updateRestaurant).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({
          displayName: 'Wedding Estate Riverside',
          expectedRevision: 4,
        }),
      ),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu hồ sơ nhà hàng');
  });

  it('filters lifecycle records and reports a recoverable hall capacity conflict', async () => {
    const api = gateway({
      updateHall: vi.fn(() =>
        Promise.reject(
          new ApiClientError({
            kind: 'api',
            code: 'CATALOG_HALL_CAPACITY_CONFLICT',
            message: 'capacity conflict',
            requestId: '00000000-0000-4000-8000-000000000099',
            status: 409,
          }),
        ),
      ),
    });
    render(<VenueCatalogWorkspace role="MANAGER" gateway={api} authorize={authorize} />);

    await screen.findByText('Sảnh Ánh Dương');
    fireEvent.change(screen.getByLabelText('Lọc trạng thái sảnh'), {
      target: { value: 'RETIRED' },
    });
    expect(screen.queryByText('Sảnh Ánh Dương')).not.toBeInTheDocument();
    expect(screen.getByText('Sảnh Hoa Hồng')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Lọc trạng thái sảnh'), {
      target: { value: 'ACTIVE' },
    });
    const row = screen.getByRole('row', { name: /Sảnh Ánh Dương/u });
    fireEvent.click(within(row).getByRole('button', { name: 'Chỉnh sửa Sảnh Ánh Dương' }));
    fireEvent.change(screen.getByLabelText('Sức chứa tối đa'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi sảnh' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sức chứa mới thấp hơn bố cục đang được công bố',
    );
    expect(screen.getByRole('button', { name: 'Lưu thay đổi sảnh' })).toBeEnabled();
  });

  it('does not load data or expose mutations to Staff presentation', () => {
    const loadVenue = vi.fn(() => Promise.resolve(snapshot()));
    const api = gateway({ loadVenue });
    render(<VenueCatalogWorkspace role="STAFF" gateway={api} authorize={authorize} />);

    expect(screen.getByRole('alert')).toHaveTextContent('chỉ dành cho Quản lý');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(loadVenue).not.toHaveBeenCalled();
  });
});
