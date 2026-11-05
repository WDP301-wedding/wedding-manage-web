import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationProvider } from '../../design-system/notifications';
import { ApiClientError } from '../../lib/api/client';
import { StrictMode } from 'react';

import type { CatalogGateway } from './catalog-api';
import { LayoutPanel } from './layout-panel';

const templateId = '00000000-0000-4000-8000-000000000041';
const versionId = '00000000-0000-4000-8000-000000000042';
const hallId = '00000000-0000-4000-8000-000000000043';
const tableId = '00000000-0000-4000-8000-000000000044';
const secondTableId = '00000000-0000-4000-8000-000000000045';

const snapshot = {
  halls: [
    {
      id: hallId,
      name: 'Sảnh Hồng Ngọc',
      description: '',
      maxGuests: 120,
      displayOrder: 1,
      lifecycle: 'ACTIVE' as const,
      retiredAt: null,
      revision: 2,
    },
  ],
  layouts: [
    {
      id: templateId,
      hallId,
      displayOrder: 1,
      lifecycle: 'ACTIVE' as const,
      retiredAt: null,
      revision: 3,
      currentPublishedVersionId: null,
      draftVersionId: versionId,
      tables: [
        { id: tableId, retiredAt: null },
        { id: secondTableId, retiredAt: null },
      ],
      versions: [
        {
          id: versionId,
          versionNumber: null,
          revision: 4,
          state: 'DRAFT' as const,
          name: 'Bố trí tiệc ấm cúng',
          description: 'Bản nháp',
          minGuests: 10,
          maxGuests: 20,
          totalSeatCapacity: 20,
          publishedAt: null,
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          tables: [
            {
              tableId,
              label: 'Bàn 01',
              shape: 'ROUND' as const,
              seatCapacity: 10,
              x: 500,
              y: 500,
              width: 1000,
              height: 1000,
              rotationDegrees: 0,
              displayOrder: 1,
            },
            {
              tableId: secondTableId,
              label: 'Bàn 02',
              shape: 'RECTANGLE' as const,
              seatCapacity: 10,
              x: 2000,
              y: 500,
              width: 1200,
              height: 800,
              rotationDegrees: 0,
              displayOrder: 2,
            },
          ],
        },
      ],
    },
  ],
};

const authorize = <T,>(operation: (accessToken: string) => Promise<T>) =>
  operation('manager-token');

function gateway(overrides: Record<string, unknown> = {}): CatalogGateway {
  return {
    loadLayouts: vi.fn(() => Promise.resolve(snapshot)),
    createLayout: vi.fn(() => Promise.resolve()),
    updateLayoutDraft: vi.fn(() => Promise.resolve()),
    publishLayout: vi.fn(() => Promise.resolve()),
    cloneLayout: vi.fn(() => Promise.resolve()),
    changeLayoutLifecycle: vi.fn(() => Promise.resolve()),
    registerLayoutTable: vi.fn(() => Promise.resolve()),
    retireLayoutTable: vi.fn(() => Promise.resolve()),
    ...overrides,
  } as unknown as CatalogGateway;
}

describe('VC-21 layout template editor', () => {
  it.each([false, true])('shows one toast per lifecycle action (failure: %s)', async (fails) => {
    const changeLayoutLifecycle = vi.fn(() => {
      if (fails) {
        return Promise.reject(
          new ApiClientError({
            kind: 'api',
            code: 'VERSION_CONFLICT',
            message: 'Phiên bản đã thay đổi.',
            requestId: 'layout-request-001',
            status: 409,
          }),
        );
      }
      return Promise.resolve();
    });
    render(<LayoutPanel gateway={gateway({ changeLayoutLifecycle })} authorize={authorize} />, {
      wrapper: NotificationProvider,
    });

    const button = await screen.findByRole('button', { name: 'Ngừng' });
    await act(() => {
      fireEvent.click(button);
      return Promise.resolve();
    });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ngừng' })).toBeEnabled());
    expect(changeLayoutLifecycle).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole(fails ? 'alert' : 'status')).toHaveLength(1);
    if (fails) expect(screen.getByRole('alert')).toHaveTextContent('Mã yêu cầu: layout-r');
    else expect(screen.getByRole('status')).toHaveTextContent('Đã cập nhật trạng thái bố cục bàn.');
  });

  it('shows a toast when the initial layout load fails', async () => {
    const loadLayouts = vi.fn().mockRejectedValue(new Error('Lỗi tải bố trí.'));
    render(
      <StrictMode>
        <NotificationProvider>
          <LayoutPanel gateway={gateway({ loadLayouts })} authorize={authorize} />
        </NotificationProvider>
      </StrictMode>,
    );
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(loadLayouts).toHaveBeenCalledTimes(1);
  });

  it('shows capacity and canvas constraints and preserves a table UUID during numeric edits', async () => {
    const updateLayoutDraft = vi.fn<CatalogGateway['updateLayoutDraft']>(() => Promise.resolve());
    render(<LayoutPanel gateway={gateway({ updateLayoutDraft })} authorize={authorize} />, {
      wrapper: NotificationProvider,
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục bản nháp' }));
    expect(await screen.findByText('Canvas 10.000 × 10.000')).toBeVisible();
    expect(screen.getByText('20 / 120 ghế')).toBeVisible();
    expect(screen.getByText('Khoảng khách 10–20')).toBeVisible();

    const editor = screen.getByRole('form', { name: 'Bản nháp Bố trí tiệc ấm cúng' });
    fireEvent.change(within(editor).getByLabelText('Tọa độ X Bàn 01'), {
      target: { value: '700' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu bố trí nháp' }));

    await waitFor(() => expect(updateLayoutDraft).toHaveBeenCalled());
    const updateInput = updateLayoutDraft.mock.calls[0]?.[1];
    expect(updateInput).toMatchObject({ versionId, expectedRevision: 4 });
    expect(updateInput?.tables).toEqual(
      expect.arrayContaining([expect.objectContaining({ tableId, x: 700 })]),
    );
  });

  it('blocks geometry outside the canvas and totals above hall capacity before calling the API', async () => {
    const updateLayoutDraft = vi.fn(() => Promise.resolve());
    render(<LayoutPanel gateway={gateway({ updateLayoutDraft })} authorize={authorize} />, {
      wrapper: NotificationProvider,
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục bản nháp' }));
    const editor = await screen.findByRole('form', { name: 'Bản nháp Bố trí tiệc ấm cúng' });
    fireEvent.change(within(editor).getByLabelText('Tọa độ X Bàn 01'), {
      target: { value: '9501' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu bố trí nháp' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('vượt biên canvas');
    expect(updateLayoutDraft).not.toHaveBeenCalled();

    fireEvent.change(within(editor).getByLabelText('Tọa độ X Bàn 01'), {
      target: { value: '500' },
    });
    fireEvent.change(within(editor).getByLabelText('Số ghế Bàn 01'), {
      target: { value: '70' },
    });
    fireEvent.change(within(editor).getByLabelText('Số ghế Bàn 02'), {
      target: { value: '70' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu bố trí nháp' }));

    // Toast cảnh báo trước vẫn còn; toast mới nhất nói về sức chứa.
    await waitFor(() =>
      expect(screen.getAllByRole('alert').at(-1)).toHaveTextContent('sức chứa sảnh'),
    );
    expect(updateLayoutDraft).not.toHaveBeenCalled();
  });

  it('removes geometry and permanently retires its stable table identity on save', async () => {
    const updateLayoutDraft = vi.fn(() => Promise.resolve());
    const retireLayoutTable = vi.fn(() => Promise.resolve());
    render(
      <LayoutPanel
        gateway={gateway({ retireLayoutTable, updateLayoutDraft })}
        authorize={authorize}
      />,
      { wrapper: NotificationProvider },
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục bản nháp' }));
    const editor = await screen.findByRole('form', { name: 'Bản nháp Bố trí tiệc ấm cúng' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Bỏ và ngừng vĩnh viễn Bàn 01' }));
    fireEvent.change(within(editor).getByLabelText('Khách tối đa'), {
      target: { value: '10' },
    });
    fireEvent.click(within(editor).getByRole('button', { name: 'Lưu bố trí nháp' }));

    await waitFor(() =>
      expect(updateLayoutDraft).toHaveBeenCalledWith(
        'manager-token',
        expect.objectContaining({
          versionId,
          tables: [expect.objectContaining({ tableId: secondTableId, displayOrder: 1 })],
        }),
      ),
    );
    expect(retireLayoutTable).toHaveBeenCalledWith(
      'manager-token',
      expect.objectContaining({ templateId, tableId, idempotencyKey: expect.any(String) }),
    );
  });
  it('keeps add, batch and remove operations local until save, and discards them on cancel', async () => {
    const api = gateway();
    render(<LayoutPanel gateway={api} authorize={authorize} />, { wrapper: NotificationProvider });
    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục bản nháp' }));
    const editor = screen.getByRole('form', { name: 'Bản nháp Bố trí tiệc ấm cúng' });
    fireEvent.click(within(editor).getByRole('button', { name: 'Thêm bàn với UUID mới' }));
    expect(within(editor).getByLabelText('Tọa độ X Bàn 03')).toBeVisible();
    fireEvent.click(within(editor).getByRole('button', { name: 'Bỏ và ngừng vĩnh viễn Bàn 01' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'Mở công cụ tạo nhanh' }));
    fireEvent.click(within(editor).getByRole('button', { name: 'Tạo nhanh 5 bàn' }));
    expect(within(editor).getAllByRole('group')).toHaveLength(7);
    fireEvent.click(within(editor).getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    for (const method of [
      api.registerLayoutTable,
      api.retireLayoutTable,
      api.updateLayoutDraft,
      api.cloneLayout,
      api.publishLayout,
    ])
      expect(method).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục bản nháp' }));
    expect(screen.getByLabelText('Tọa độ X Bàn 01')).toHaveValue(500);
    expect(screen.queryByLabelText('Tọa độ X Bàn 03')).not.toBeInTheDocument();
  });

  it('registers only surviving new table identities when saving', async () => {
    const api = gateway();
    render(<LayoutPanel gateway={api} authorize={authorize} />, { wrapper: NotificationProvider });
    fireEvent.click(await screen.findByRole('button', { name: 'Tiếp tục bản nháp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm bàn với UUID mới' }));
    fireEvent.click(screen.getByRole('button', { name: 'Thêm bàn với UUID mới' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ và ngừng vĩnh viễn Bàn 03' }));
    expect(api.registerLayoutTable).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bố trí nháp' }));
    await waitFor(() => expect(api.updateLayoutDraft).toHaveBeenCalled());
    expect(api.registerLayoutTable).toHaveBeenCalledTimes(1);
    expect(api.retireLayoutTable).not.toHaveBeenCalled();
    const input = vi.mocked(api.updateLayoutDraft).mock.calls[0]![1];
    const surviving = input.tables.find((table) => table.label === 'Bàn 04');
    expect(api.registerLayoutTable).toHaveBeenCalledWith(
      'manager-token',
      expect.objectContaining({ templateId, tableId: surviving?.tableId }),
    );
  });
  it('creates a version only on save and publishes its edited geometry with the saved revision', async () => {
    const record = snapshot.layouts[0]!;
    const published = { ...record.versions[0]!, state: 'PUBLISHED' as const, versionNumber: 1 };
    const api = gateway({
      loadLayouts: vi.fn(() =>
        Promise.resolve({
          halls: snapshot.halls,
          layouts: [
            {
              ...record,
              currentPublishedVersionId: versionId,
              draftVersionId: null,
              versions: [published],
            },
          ],
        }),
      ),
    });
    render(<LayoutPanel gateway={api} authorize={authorize} />, { wrapper: NotificationProvider });
    fireEvent.click(await screen.findByRole('button', { name: 'Tạo phiên bản mới' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(api.cloneLayout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo phiên bản mới' }));
    fireEvent.change(screen.getByLabelText('Tọa độ X Bàn 01'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và công bố' }));
    await waitFor(() => expect(api.publishLayout).toHaveBeenCalled());
    const clone = vi.mocked(api.cloneLayout).mock.calls[0]![1];
    expect(clone).toMatchObject({ templateId, sourceVersionId: versionId });
    expect(api.updateLayoutDraft).toHaveBeenCalledWith(
      'manager-token',
      expect.objectContaining({
        versionId: clone.versionId,
        expectedRevision: 1,
        tables: expect.arrayContaining([expect.objectContaining({ tableId, x: 900 })]),
      }),
    );
    expect(api.publishLayout).toHaveBeenCalledWith('manager-token', {
      versionId: clone.versionId,
      expectedRevision: 2,
    });
    expect(api.registerLayoutTable).not.toHaveBeenCalled();
    expect(api.retireLayoutTable).not.toHaveBeenCalled();
  });
});
