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
  it('lists one row per dish with published price and a separate draft indicator', async () => {
    render(<DishMenuPanel gateway={gateway()} authorize={authorize} />);
    const table = await screen.findByRole('table', { name: 'Danh sách món ăn' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    const row = within(table).getByRole('row', { name: 'Gỏi ngó sen' });
    expect(within(row).getByText(/120\.000/u)).toBeVisible();
    expect(within(row).queryByText(/130\.000/u)).not.toBeInTheDocument();
    expect(within(row).getByText('Có bản nháp')).toBeVisible();
    expect(within(row).getByText('v1')).toBeVisible();
    expect(within(row).getByRole('button', { name: 'Tiếp tục bản nháp' })).toBeVisible();
  });

  it('reads historical prices and descriptions separately from publication and draft without mutations', async () => {
    const published = foodSnapshot.dishes[0]!.versions[0]!;
    const api = gateway({
      loadFood: vi.fn(() =>
        Promise.resolve({
          ...foodSnapshot,
          dishes: [
            {
              ...foodSnapshot.dishes[0],
              versions: [
                { ...published, versionNumber: 2 },
                foodSnapshot.dishes[0]!.versions[1],
                {
                  ...published,
                  id: 'historical-dish',
                  versionNumber: 1,
                  state: 'SUPERSEDED',
                  name: 'Gỏi công thức cũ',
                  description: 'Mô tả lịch sử',
                  priceVnd: 90000,
                },
              ],
            },
          ],
        }),
      ),
    });
    render(<DishMenuPanel gateway={api} authorize={authorize} />);
    const row = await screen.findByRole('row', { name: 'Gỏi ngó sen' });
    fireEvent.click(within(row).getByRole('button', { name: 'Chi tiết' }));
    const dialog = screen.getByRole('dialog', { name: 'Chi tiết Gỏi ngó sen' });
    expect(within(dialog).getByRole('region', { name: 'Bản đang công bố' })).toHaveTextContent(
      '120.000',
    );
    expect(within(dialog).getByRole('region', { name: 'Bản nháp' })).toHaveTextContent('130.000');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chi tiết phiên bản 1' }));
    const historical = within(dialog).getByRole('region', { name: 'Chi tiết phiên bản 1' });
    expect(historical).toHaveTextContent('Mô tả lịch sử');
    expect(historical).toHaveTextContent('90.000');
    expect(within(historical).queryByRole('textbox')).not.toBeInTheDocument();
    expect(api.cloneDish).not.toHaveBeenCalled();
    expect(api.updateDishDraft).not.toHaveBeenCalled();
  });

  it('keeps entered new-version content after a failed update and retries the same draft', async () => {
    const updateDishDraft = vi
      .fn()
      .mockRejectedValueOnce(new Error('Unavailable'))
      .mockResolvedValue(2);
    const cloneDish = vi.fn(() => Promise.resolve());
    const api = gateway({
      cloneDish,
      updateDishDraft,
      loadFood: vi.fn(() =>
        Promise.resolve({
          dishes: [
            {
              ...foodSnapshot.dishes[0],
              draftVersionId: null,
              versions: [foodSnapshot.dishes[0]!.versions[0]],
            },
          ],
          menus: [],
        }),
      ),
    });
    render(<DishMenuPanel gateway={api} authorize={authorize} />);
    const row = await screen.findByRole('row', { name: 'Gỏi ngó sen' });
    fireEvent.click(within(row).getByRole('button', { name: 'Tạo phiên bản mới' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên món bản nháp' }), {
      target: { value: 'Nội dung cần giữ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('textbox', { name: 'Tên món bản nháp' })).toHaveValue(
      'Nội dung cần giữ',
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(cloneDish).toHaveBeenCalledOnce();
    expect(updateDishDraft).toHaveBeenCalledTimes(2);
    expect(updateDishDraft.mock.calls[0]![1].versionId).toBe(
      updateDishDraft.mock.calls[1]![1].versionId,
    );
  });

  it.each([true, false])(
    'recovers a lost clone response without duplicating the save intent (draft visible: %s)',
    async (visible) => {
      let attempted: { versionId: string; sourceVersionId: string; idempotencyKey: string } | null =
        null;
      const cloneDish = vi.fn((_token: string, input: NonNullable<typeof attempted>) => {
        attempted = input;
        return cloneDish.mock.calls.length === 1
          ? Promise.reject(new Error('Response lost'))
          : Promise.resolve();
      });
      const updateDishDraft = vi.fn(() => Promise.resolve(2));
      const published = foodSnapshot.dishes[0]!.versions[0]!;
      const api = gateway({
        cloneDish,
        updateDishDraft,
        loadFood: vi.fn(() =>
          Promise.resolve({
            dishes: [
              {
                ...foodSnapshot.dishes[0],
                draftVersionId: attempted && visible ? attempted.versionId : null,
                versions: [
                  published,
                  ...(attempted && visible
                    ? [
                        {
                          ...published,
                          id: attempted.versionId,
                          state: 'DRAFT',
                          versionNumber: null,
                          revision: 1,
                        },
                      ]
                    : []),
                ],
              },
            ],
            menus: [],
          }),
        ),
      });
      render(<DishMenuPanel gateway={api} authorize={authorize} />);
      const row = await screen.findByRole('row', { name: 'Gỏi ngó sen' });
      fireEvent.click(within(row).getByRole('button', { name: 'Tạo phiên bản mới' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Tên món bản nháp' }), {
        target: { value: 'Nội dung sau mất phản hồi' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
      await screen.findByRole('alert');
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Lưu bản nháp' })).toBeEnabled(),
      );
      fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(updateDishDraft).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({
          versionId: cloneDish.mock.calls[0]![1].versionId,
          name: 'Nội dung sau mất phản hồi',
        }),
      );
      expect(cloneDish).toHaveBeenCalledTimes(visible ? 1 : 2);
      if (!visible) expect(cloneDish.mock.calls[1]![1]).toEqual(cloneDish.mock.calls[0]![1]);
    },
  );

  it('cancels a new version without creating or updating any server draft', async () => {
    const api = gateway({
      loadFood: vi.fn(() =>
        Promise.resolve({
          dishes: [
            {
              ...foodSnapshot.dishes[0],
              draftVersionId: null,
              versions: [foodSnapshot.dishes[0]!.versions[0]],
            },
          ],
          menus: [],
        }),
      ),
    });
    render(<DishMenuPanel gateway={api} authorize={authorize} />);
    const row = await screen.findByRole('row', { name: 'Gỏi ngó sen' });
    fireEvent.click(within(row).getByRole('button', { name: 'Tạo phiên bản mới' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên món bản nháp' }), {
      target: { value: 'Nội dung chưa lưu' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.cloneDish).not.toHaveBeenCalled();
    expect(api.updateDishDraft).not.toHaveBeenCalled();
    fireEvent.click(within(row).getByRole('button', { name: 'Tạo phiên bản mới' }));
    expect(screen.getByRole('textbox', { name: 'Tên món bản nháp' })).toHaveValue('Gỏi ngó sen');
  });
  it('confirms deletion before calling the real gateway and removes the record after refresh', async () => {
    const deleteDish = vi.fn(async () => {});
    const loadFood = vi
      .fn()
      .mockResolvedValueOnce(foodSnapshot)
      .mockResolvedValue({ dishes: [], menus: [] });
    render(<DishMenuPanel gateway={gateway({ deleteDish, loadFood })} authorize={authorize} />);
    const dish = await screen.findByRole('row', { name: 'Gỏi ngó sen' });
    fireEvent.click(within(dish).getByRole('button', { name: 'Xóa' }));
    expect(deleteDish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
    await waitFor(() =>
      expect(screen.queryByRole('row', { name: 'Gỏi ngó sen' })).not.toBeInTheDocument(),
    );
    expect(deleteDish).toHaveBeenCalledWith('manager-token', { id: dishId, expectedRevision: 4 });
  });

  it('saves the entered values before publishing with the revision returned by the server', async () => {
    const updateDishDraft = vi.fn(() => Promise.resolve(9));
    const publishDish = vi.fn(async () => {});
    render(
      <DishMenuPanel gateway={gateway({ updateDishDraft, publishDish })} authorize={authorize} />,
    );
    const dish = await screen.findByRole('row', { name: 'Gỏi ngó sen' });
    fireEvent.click(within(dish).getByRole('button', { name: 'Tiếp tục bản nháp' }));
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

    expect(await screen.findByText(/120\.000/u)).toHaveTextContent('₫');
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
    fireEvent.change(within(form).getByLabelText('Món phiên bản', { selector: 'select' }), {
      target: { value: publishedDishVersionId },
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Thêm món vào gói' }));
    const selectedDishes = within(form).getByRole('list', { name: 'Thứ tự món trong gói' });
    expect(within(selectedDishes).getAllByRole('listitem')).toHaveLength(1);
    expect(selectedDishes).toHaveTextContent('Gỏi ngó sen · phiên bản 1');
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

  it('creates a draft only when saving entered new-version content', async () => {
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

    const dish = await screen.findByRole('row', { name: 'Gỏi ngó sen' });
    expect(within(dish).queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(within(dish).getByRole('button', { name: 'Tạo phiên bản mới' }));
    expect(cloneDish).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tên món bản nháp' }), {
      target: { value: 'Tên đã nhập' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp' }));

    await waitFor(() =>
      expect(cloneDish).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({ dishId, sourceVersionId: publishedDishVersionId }),
      ),
    );
  });

  it('keeps publication visible and opens the existing draft without cloning', async () => {
    render(<DishMenuPanel gateway={gateway()} authorize={authorize} />);
    const dish = await screen.findByRole('row', { name: 'Gỏi ngó sen' });
    expect(within(dish).getByText('Gỏi ngó sen')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: 'Tên món bản nháp' })).not.toBeInTheDocument();
    fireEvent.click(within(dish).getByRole('button', { name: 'Tiếp tục bản nháp' }));
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
    const menu = await screen.findByRole('row', { name: 'Gói Mùa Thu' });
    fireEvent.click(within(menu).getByRole('button', { name: 'Chi tiết' }));
    const dialog = screen.getByRole('dialog', { name: 'Chi tiết Gói Mùa Thu' });
    expect(within(dialog).getByText('Gỏi ngó sen')).toBeVisible();
    expect(within(dialog).getByText('Tôm và rau thơm')).toBeVisible();
    expect(cloneMenu).not.toHaveBeenCalled();
  });
});
