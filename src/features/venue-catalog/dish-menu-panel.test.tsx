import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CatalogGateway } from './catalog-api';
import { DishMenuPanel } from './dish-menu-panel';

const dishId = '00000000-0000-4000-8000-000000000021';
const publishedDishVersionId = '00000000-0000-4000-8000-000000000022';
const draftDishVersionId = '00000000-0000-4000-8000-000000000023';

const foodSnapshot = {
  dishes: [
    {
      id: dishId,
      lifecycle: 'ACTIVE' as const,
      displayOrder: 1,
      revision: 4,
      retiredAt: null,
      currentPublishedVersionId: publishedDishVersionId,
      draftVersionId: draftDishVersionId,
      versions: [
        {
          id: publishedDishVersionId,
          versionNumber: 1,
          revision: 2,
          state: 'PUBLISHED' as const,
          name: 'Gỏi ngó sen',
          description: 'Tôm và rau thơm',
          categoryLabel: 'Khai vị',
          priceVnd: 120_000,
          publishedAt: '2026-10-01T00:00:00.000Z',
          createdAt: '2026-09-30T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
        {
          id: draftDishVersionId,
          versionNumber: null,
          revision: 1,
          state: 'DRAFT' as const,
          name: 'Gỏi ngó sen mới',
          description: 'Bản nháp',
          categoryLabel: 'Khai vị',
          priceVnd: 130_000,
          publishedAt: null,
          createdAt: '2026-10-02T00:00:00.000Z',
          updatedAt: '2026-10-02T00:00:00.000Z',
        },
      ],
    },
  ],
  menus: [],
};

const authorize = <T,>(operation: (accessToken: string) => Promise<T>) =>
  operation('manager-token');

function gateway(overrides: Record<string, unknown> = {}): CatalogGateway {
  return {
    loadFood: vi.fn(() => Promise.resolve(foodSnapshot)),
    createDish: vi.fn(() => Promise.resolve()),
    updateDishDraft: vi.fn(() => Promise.resolve()),
    publishDish: vi.fn(() => Promise.resolve()),
    cloneDish: vi.fn(() => Promise.resolve()),
    changeDishLifecycle: vi.fn(() => Promise.resolve()),
    createMenu: vi.fn(() => Promise.resolve()),
    updateMenuDraft: vi.fn(() => Promise.resolve()),
    publishMenu: vi.fn(() => Promise.resolve()),
    cloneMenu: vi.fn(() => Promise.resolve()),
    changeMenuLifecycle: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as CatalogGateway;
}

describe('VC-19 dish and menu administration', () => {
  it('formats integer VND and creates a dish without floating-point calculation', async () => {
    const createDish = vi.fn(() => Promise.resolve());
    const api = gateway({ createDish });
    render(<DishMenuPanel gateway={api} authorize={authorize} />);

    expect(await screen.findByText(/120\.000/u)).toHaveTextContent('₫');
    const form = screen.getByRole('form', { name: 'Tạo món ăn' });
    fireEvent.change(within(form).getByLabelText('Tên món'), { target: { value: 'Súp bí đỏ' } });
    fireEvent.change(within(form).getByLabelText('Nhóm món'), { target: { value: 'Khai vị' } });
    fireEvent.change(within(form).getByLabelText('Mô tả món'), { target: { value: 'Ăn nóng' } });
    fireEvent.change(within(form).getByLabelText('Giá món (VND)'), {
      target: { value: '2500000' },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Tạo bản nháp món ăn' }));

    await waitFor(() =>
      expect(createDish).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({ name: 'Súp bí đỏ', priceVnd: 2_500_000 }),
      ),
    );
  });

  it('selects exact dish versions in deterministic order for a menu draft', async () => {
    const createMenu = vi.fn(() => Promise.resolve());
    const api = gateway({ createMenu });
    render(<DishMenuPanel gateway={api} authorize={authorize} />);
    expect((await screen.findAllByText('Gỏi ngó sen')).length).toBeGreaterThan(0);

    const form = screen.getByRole('form', { name: 'Tạo gói thực đơn' });
    fireEvent.change(within(form).getByLabelText('Tên gói'), {
      target: { value: 'Thực đơn Mùa Thu' },
    });
    fireEvent.change(within(form).getByLabelText('Mô tả gói'), {
      target: { value: 'Gói bàn 10 khách' },
    });
    fireEvent.change(within(form).getByLabelText('Giá mỗi bàn (VND)'), {
      target: { value: '4500000' },
    });
    fireEvent.change(within(form).getByLabelText('Món phiên bản'), {
      target: { value: publishedDishVersionId },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Thêm món vào gói' }));
    expect(within(form).getAllByText('Gỏi ngó sen · phiên bản 1')).toHaveLength(2);
    fireEvent.click(within(form).getByRole('button', { name: 'Tạo bản nháp thực đơn' }));

    await waitFor(() =>
      expect(createMenu).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({
          priceVndPerTable: 4_500_000,
          items: [{ dishVersionId: publishedDishVersionId, displayOrder: 1 }],
        }),
      ),
    );
  });

  it('keeps published history read-only and offers clone instead of in-place editing', async () => {
    const cloneDish = vi.fn(() => Promise.resolve());
    const api = gateway({
      cloneDish,
      loadFood: vi.fn(() =>
        Promise.resolve({
          ...foodSnapshot,
          dishes: [
            {
              ...foodSnapshot.dishes[0],
              draftVersionId: null,
              versions: [foodSnapshot.dishes[0]?.versions[0]],
            },
          ],
        }),
      ),
    });
    render(<DishMenuPanel gateway={api} authorize={authorize} />);

    const history = await screen.findByRole('region', { name: 'Lịch sử Gỏi ngó sen' });
    expect(within(history).getByText('Đã công bố · v1')).toBeVisible();
    expect(
      within(history).queryByRole('textbox', { name: /Gỏi ngó sen/u }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(history).getByRole('button', { name: 'Nhân bản phiên bản 1' }));

    await waitFor(() =>
      expect(cloneDish).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({ dishId, sourceVersionId: publishedDishVersionId }),
      ),
    );
  });
});
