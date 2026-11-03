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
    updateDishDraft: vi.fn(() => Promise.resolve(2)),
    deleteDish: vi.fn(() => Promise.resolve()),
    deleteMenu: vi.fn(() => Promise.resolve()),
    publishDish: vi.fn(() => Promise.resolve()),
    cloneDish: vi.fn(() => Promise.resolve()),
    changeDishLifecycle: vi.fn(() => Promise.resolve()),
    createMenu: vi.fn(() => Promise.resolve()),
    updateMenuDraft: vi.fn(() => Promise.resolve(2)),
    publishMenu: vi.fn(() => Promise.resolve()),
    cloneMenu: vi.fn(() => Promise.resolve()),
    changeMenuLifecycle: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as CatalogGateway;
}

describe('VC-19 dish and menu administration', () => {
  it('confirms deletion before calling the real gateway and removes the record after refresh', async () => {
    const deleteDish = vi.fn(async () => {});
    const loadFood = vi
      .fn()
      .mockResolvedValueOnce(foodSnapshot)
      .mockResolvedValue({ dishes: [], menus: [] });
    render(<DishMenuPanel gateway={gateway({ deleteDish, loadFood })} authorize={authorize} />);
    const dish = await screen.findByRole('article', { name: 'Gỏi ngó sen mới' });
    fireEvent.click(within(dish).getByRole('button', { name: 'Xóa' }));
    expect(deleteDish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Gỏi ngó sen mới' })).not.toBeInTheDocument(),
    );
    expect(deleteDish).toHaveBeenCalledWith('manager-token', { id: dishId, expectedRevision: 4 });
  });

  it('saves the entered values before publishing with the revision returned by the server', async () => {
    const updateDishDraft = vi.fn(() => Promise.resolve(9));
    const publishDish = vi.fn(async () => {});
    render(
      <DishMenuPanel gateway={gateway({ updateDishDraft, publishDish })} authorize={authorize} />,
    );
    const dish = await screen.findByRole('article', { name: 'Gỏi ngó sen mới' });
    fireEvent.click(within(dish).getByRole('button', { name: 'Chỉnh sửa' }));
    const input = await screen.findByRole('textbox', { name: 'Tên món bản nháp' });
    fireEvent.change(input, { target: { value: 'Gỏi ngó sen cập nhật' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và công bố' }));
    await waitFor(() =>
      expect(publishDish).toHaveBeenCalledWith('manager-token', {
        versionId: draftDishVersionId,
        expectedRevision: 9,
      }),
    );
    expect(updateDishDraft).toHaveBeenCalledWith(
      'manager-token',
      expect.objectContaining({ name: 'Gỏi ngó sen cập nhật', expectedRevision: 1 }),
    );
  });
  it('formats integer VND and creates a dish without floating-point calculation', async () => {
    const createDish = vi.fn(() => Promise.resolve());
    const api = gateway({ createDish });
    render(<DishMenuPanel gateway={api} authorize={authorize} />);

    expect(await screen.findByText(/130\.000/u)).toHaveTextContent('₫');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm món ăn' }));
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
    await screen.findByRole('button', { name: 'Thêm gói thực đơn' });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm gói thực đơn' }));

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

  it('offers edit on the latest published dish using a new draft behind the scenes', async () => {
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

    const dish = await screen.findByRole('article', { name: 'Gỏi ngó sen' });
    expect(within(dish).queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(within(dish).getByRole('button', { name: 'Chỉnh sửa' }));

    await waitFor(() =>
      expect(cloneDish).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({ dishId, sourceVersionId: publishedDishVersionId }),
      ),
    );
  });

  it('shows only the latest dish and keeps its draft editor closed until editing', async () => {
    render(<DishMenuPanel gateway={gateway()} authorize={authorize} />);
    const dish = await screen.findByRole('article', { name: 'Gỏi ngó sen mới' });
    expect(within(dish).queryByText('Gỏi ngó sen')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Tên món bản nháp' })).not.toBeInTheDocument();
    fireEvent.click(within(dish).getByRole('button', { name: 'Chỉnh sửa' }));
    expect(await screen.findByRole('textbox', { name: 'Tên món bản nháp' })).toHaveValue(
      'Gỏi ngó sen mới',
    );
  });

  it('opens menu details without creating a draft', async () => {
    const cloneMenu = vi.fn();
    render(
      <DishMenuPanel
        gateway={gateway({
          cloneMenu,
          loadFood: vi.fn(() =>
            Promise.resolve({
              ...foodSnapshot,
              menus: [
                {
                  id: 'menu-1',
                  lifecycle: 'ACTIVE',
                  revision: 2,
                  displayOrder: 1,
                  retiredAt: null,
                  draftVersionId: null,
                  currentPublishedVersionId: 'menu-v2',
                  versions: [
                    {
                      id: 'menu-v2',
                      state: 'PUBLISHED',
                      revision: 2,
                      versionNumber: 2,
                      name: 'Gói Mùa Thu',
                      description: 'Tiệc 10 khách',
                      priceVndPerTable: 4500000,
                      items: [
                        {
                          dishId,
                          dishVersionId: publishedDishVersionId,
                          dishVersionNumber: 1,
                          name: 'Gỏi ngó sen',
                          description: 'Tôm và rau thơm',
                          categoryLabel: 'Khai vị',
                          priceVnd: 120000,
                          displayOrder: 1,
                        },
                      ],
                      createdAt: '2026-10-01T00:00:00.000Z',
                      updatedAt: '2026-10-02T00:00:00.000Z',
                      publishedAt: '2026-10-02T00:00:00.000Z',
                    },
                  ],
                },
              ],
            }),
          ),
        })}
        authorize={authorize}
      />,
    );
    const menu = await screen.findByRole('article', { name: 'Gói Mùa Thu' });
    fireEvent.click(within(menu).getByRole('button', { name: 'Xem chi tiết' }));
    const dialog = screen.getByRole('dialog', { name: 'Chi tiết Gói Mùa Thu' });
    expect(within(dialog).getByText('Gỏi ngó sen')).toBeVisible();
    expect(within(dialog).getByText('Tôm và rau thơm')).toBeVisible();
    expect(cloneMenu).not.toHaveBeenCalled();
  });
});
